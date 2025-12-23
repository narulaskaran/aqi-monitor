import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from "./_lib/db.js";
import { checkVerificationCode } from "./_lib/services/email.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, zipCode, code, mode, expiresAt } = req.body;

    if (!email || !zipCode || !code) {
      return res.status(400).json({
        success: false,
        error: "Email, ZIP code, and verification code are required",
      });
    }

    console.log("REST API verify-code request:", {
      email,
      zipCode,
      code,
      mode,
      expiresAt,
    });

    // Verify the code
    const result = await checkVerificationCode(email, code);

    // If verification is successful
    if (result.success && result.valid) {
      // If mode is 'signin', issue an auth token
      if (mode === "signin") {
        // Generate a random token
        const token = [...Array(48)]
          .map(() => Math.random().toString(36)[2])
          .join("");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now
        
        await prisma.authentication.create({
          data: {
            email,
            token,
            expiresAt,
          },
        });
        
        return res.json({ ...result, token, expiresAt });
      } else {
        // Default: create subscription
        try {
          const subscriptionData: {
            email: string;
            zipCode: string;
            active: boolean;
            activatedAt: Date;
            expiresAt?: Date;
          } = {
            email,
            zipCode,
            active: true,
            activatedAt: new Date(),
          };

          // Add expiresAt if provided
          if (expiresAt) {
            subscriptionData.expiresAt = new Date(expiresAt);
          }

          await prisma.userSubscription.create({
            data: subscriptionData,
          });
        } catch (dbError) {
          console.error(
            "Error creating subscription after verification:",
            dbError,
          );
          return res.json({
            ...result,
            error: "Verification successful but failed to create subscription",
          });
        }
      }
    }

    return res.json(result);
  } catch (error) {
    console.error("Error in code verification API:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to verify code",
    });
  }
}
