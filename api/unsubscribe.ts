import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from "./_lib/db.js";
import { validateUnsubscribeToken, deleteAuthTokensForEmail } from "./_lib/services/subscription.js";

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

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
       return res.status(401).json({ success: false, error: "Missing or invalid auth token" });
    }
    const token = authHeader.split(" ")[1];

    const subscriptionId = validateUnsubscribeToken(token);
    if (!subscriptionId) {
       return res.status(401).json({ success: false, error: "Invalid or expired unsubscribe token" });
    }

    const { subscription_id: bodyId } = req.body;
    // Security check: ensure the token matches the requested subscription ID
    if (bodyId && bodyId !== subscriptionId) {
        return res.status(400).json({ success: false, error: "Subscription ID mismatch" });
    }

    const subscription = await prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
    });
    
    if (!subscription) {
      return res.status(404).json({ success: false, error: "Subscription not found" });
    }
    
    await prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: { active: false },
    });
    
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