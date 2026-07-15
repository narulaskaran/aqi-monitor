import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate } from "./_lib/middleware/auth.js";
import { prisma } from "./_lib/db.js";
import {
  createSubscription,
  getSubscriptionsForEmailSorted,
  setSubscriptionActive,
  subscriptionExists,
} from "./_lib/services/subscription.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Authenticate every request
  let email: string;
  try {
    const auth = await authenticate(req);
    email = auth.email;
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // GET /api/subscriptions — list all subscriptions for the authenticated user
  if (req.method === "GET") {
    try {
      const subscriptions = await getSubscriptionsForEmailSorted(email);
      return res.json({ success: true, subscriptions });
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      return res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  }

  // POST /api/subscriptions — create a subscription for the authenticated user
  if (req.method === "POST") {
    try {
      const { zipCode, startsAt, expiresAt } = req.body as {
        zipCode?: string;
        startsAt?: string;
        expiresAt?: string;
      };

      if (!zipCode) {
        return res.status(400).json({ error: "zipCode is required" });
      }

      let parsedStartsAt: Date | undefined;
      let parsedExpiresAt: Date | undefined;

      if (startsAt) {
        parsedStartsAt = new Date(startsAt);
        if (isNaN(parsedStartsAt.getTime())) {
          return res.status(400).json({ error: "Invalid start date" });
        }
      }

      if (expiresAt) {
        parsedExpiresAt = new Date(expiresAt);
        if (isNaN(parsedExpiresAt.getTime())) {
          return res.status(400).json({ error: "Invalid end date" });
        }
      }

      if (
        parsedStartsAt &&
        parsedExpiresAt &&
        parsedStartsAt >= parsedExpiresAt
      ) {
        return res
          .status(400)
          .json({ error: "Start date must be before end date" });
      }

      const exists = await subscriptionExists(email, zipCode);
      if (exists) {
        return res
          .status(409)
          .json({ error: "This email is already subscribed for this ZIP code" });
      }

      const subscription = await createSubscription(
        email,
        zipCode,
        parsedStartsAt,
        parsedExpiresAt,
      );
      return res.status(201).json({ success: true, subscription });
    } catch (error) {
      console.error("Error creating subscription:", error);
      return res.status(500).json({ error: "Failed to create subscription" });
    }
  }

  // PATCH /api/subscriptions — toggle active status for a subscription
  if (req.method === "PATCH") {
    try {
      const { id, active } = req.body as { id: string; active: boolean };

      if (!id || typeof active !== "boolean") {
        return res
          .status(400)
          .json({ error: "id (string) and active (boolean) are required" });
      }

      // Look up the subscription to verify ownership
      const subscription = await prisma.userSubscription.findUnique({
        where: { id },
      });

      if (!subscription) {
        return res.status(404).json({ error: "Subscription not found" });
      }

      if (subscription.email !== email) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const updated = await setSubscriptionActive(id, active);
      return res.json({ success: true, subscription: updated });
    } catch (error) {
      console.error("Error updating subscription:", error);
      return res.status(500).json({ error: "Failed to update subscription" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
