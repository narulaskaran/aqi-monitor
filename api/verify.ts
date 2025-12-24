import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendVerificationCode } from "./_lib/services/email.js";
import { subscriptionExists } from "./_lib/services/subscription.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, zipCode } = req.body;

    if (!email || !zipCode) {
      return res.status(400).json({
        success: false,
        error: "Email and ZIP code are required",
      });
    }

    console.log("REST API verify request:", { email, zipCode });

    // Check if subscription already exists
    const exists = await subscriptionExists(email, zipCode);

    if (exists) {
      return res.json({
        success: false,
        error: "This email is already subscribed for this ZIP code",
      });
    }

    // Send verification code
    const result = await sendVerificationCode(email);
    return res.json(result);
  } catch (error) {
    console.error("Error in verification API:", error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to start verification",
    });
  }
}
