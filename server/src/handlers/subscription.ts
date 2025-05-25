import { Request, Response } from "express";
import { prisma } from "../db.js";
// import { deactivateSubscription } from '../services/subscription.js';

// Authentication middleware (to be implemented in a separate file)
// import { authMiddleware } from '../middleware/auth';

// This endpoint requires authentication middleware. The middleware should set req.user = { email: ... } if the token is valid.

export async function handleUnsubscribe(req: Request, res: Response) {
  try {
    console.log("Received unsubscribe request:", {
      method: req.method,
      path: req.path,
      body: req.body,
    });

    // The auth middleware should have attached req.user
    const user = (req as any).user;
    const { subscription_id } = req.body;

    if (!user || !user.email) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
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
    // Delete all tokens for this user (single-use unsubscribe token logic)
    await import("../services/subscription.js").then((mod) =>
      mod.deleteAuthTokensForEmail(user.email),
    );
    return res.json({
      success: true,
      message: "Successfully unsubscribed from air quality alerts",
    });
  } catch (error) {
    console.error("Error in unsubscribe handler:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error("Unknown error type:", error);
    }
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to unsubscribe",
    });
  }
}
