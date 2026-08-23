import { randomBytes } from "node:crypto";
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseDateRange } from "./_lib/dateRange.js";
import { prisma } from "./_lib/db.js";
import { authenticate } from "./_lib/middleware/auth.js";
import { checkVerificationCode } from "./_lib/services/email.js";
import {
  consumeVerifyAttempt,
  clearVerifyAttempts,
} from "./_lib/services/verifyAttempts.js";
import {
  createSubscription,
  subscriptionExists,
} from "./_lib/services/subscription.js";
import { validateUsZipCode } from "./_lib/zipCode.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, zipCode, code, mode, startsAt, expiresAt } = req.body;
    const hasAuthHeader = Boolean(req.headers?.authorization);
    let authenticatedEmail: string | undefined;

    if (hasAuthHeader) {
      try {
        authenticatedEmail = (await authenticate(req)).email;
      } catch {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }
    }

    if (!zipCode || (!authenticatedEmail && (!email || !code))) {
      return res.status(400).json({
        success: false,
        error: authenticatedEmail
          ? "ZIP code is required"
          : "Email, ZIP code, and verification code are required",
      });
    }

    const normalizedZipCode = zipCode.trim();
    const subscriptionEmail = authenticatedEmail ?? email;

    // Sign-in reuses this endpoint with a dummy ZIP and must not create a
    // subscription. Validate deliverability only when we are about to subscribe.
    if (mode !== "signin") {
      const parsedZip = validateUsZipCode(normalizedZipCode);
      if (!parsedZip.ok) {
        return res.status(400).json({
          success: false,
          error: parsedZip.error,
        });
      }
    }

    console.log("REST API verify-code request:", {
      email: subscriptionEmail,
      zipCode: normalizedZipCode,
      hasCode: Boolean(code),
      mode,
      startsAt,
      expiresAt,
    });

    // Parse and validate the optional date range BEFORE consuming the
    // one-time code, so invalid input doesn't burn the user's OTP.
    const dateRange = parseDateRange(startsAt, expiresAt);
    if (dateRange.error) {
      return res.status(400).json({
        success: false,
        error: dateRange.error,
      });
    }

    // A valid session already proves ownership of the email address, so the
    // authenticated caller can create the subscription without an OTP.
    if (authenticatedEmail) {
      const exists = await subscriptionExists(
        subscriptionEmail,
        normalizedZipCode,
      );
      if (exists) {
        return res.status(409).json({
          success: false,
          error: "This email is already subscribed for this ZIP code",
        });
      }

      try {
        // The pre-check gives ordinary duplicate requests a clear 409. If
        // another authenticated request wins between this check and the
        // activation write, the service returns that active winner
        // idempotently rather than creating a duplicate row.
        const subscription = await createSubscription(
          subscriptionEmail,
          normalizedZipCode,
          dateRange.dates?.startsAt,
          dateRange.dates?.expiresAt,
        );
        return res.status(201).json({
          success: true,
          valid: true,
          subscription,
        });
      } catch (dbError) {
        console.error(
          "Error creating authenticated subscription:",
          dbError,
        );
        return res.status(500).json({
          success: false,
          error: "Failed to create subscription",
        });
      }
    }

    // Per-email OTP attempt limiting: cap code submissions within the
    // 10-minute validity window so the 6-digit code cannot be brute-forced.
    const attempt = await consumeVerifyAttempt(subscriptionEmail);
    if (!attempt.allowed) {
      return res.status(429).json({
        success: false,
        error: "Too many verification attempts. Try again in 10 minutes.",
      });
    }

    // Verify the code
    const result = await checkVerificationCode(
      subscriptionEmail,
      code,
    );

    // If verification is successful
    if (result.success && result.valid) {
      // The code was used successfully, so reset the attempt counter.
      await clearVerifyAttempts(subscriptionEmail);

      // If mode is 'signin', issue an auth token
      if (mode === "signin") {
        // Generate a cryptographically secure random session token
        // (256 bits of entropy, URL-safe).
        const token = randomBytes(32).toString("base64url");
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
          await createSubscription(
            subscriptionEmail,
            normalizedZipCode,
            dateRange.dates?.startsAt,
            dateRange.dates?.expiresAt,
          );
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
