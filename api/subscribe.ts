import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from "./_lib/db.js";
import { authenticate } from "./_lib/middleware/auth.js";
import { deleteAuthTokensForEmail } from "./_lib/services/subscription.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("Received unsubscribe request:", {
      method: req.method,
      path: req.url,
      body: req.body,
    });

    // Authenticate user
    let user;
    try {
      user = await authenticate(req);
    } catch (error) {
      return res.status(401).json({ success: false, error: (error as Error).message });
    }

    const { subscription_id } = req.body;

    if (!subscription_id || typeof subscription_id !== "string") {
      return res
        .status(400)
        .json({ success: false, error: "Missing subscription_id" });
    }

    // Find the subscription and set active to false if it belongs to the user
    const subscription = await prisma.userSubscription.findUnique({
      where: { id: subscription_id },
    });
    
    if (!subscription || subscription.email !== user.email) {
      return res
        .status(404)
        .json({ success: false, error: "Subscription not found" });
    }
    
    await prisma.userSubscription.update({
      where: { id: subscription_id },
      data: { active: false },
    });
    
    // Delete all tokens for this user
    await deleteAuthTokensForEmail(user.email);
    
    return res.json({
      success: true,
      message: "Successfully unsubscribed from air quality alerts",
    });
  } catch (error) {
    console.error("Error in unsubscribe handler:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to unsubscribe",
    });
  }
}
