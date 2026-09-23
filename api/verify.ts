import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendVerificationCode } from "./_lib/services/email.js";
import { subscriptionExists } from "./_lib/services/subscription.js";
import { checkVerifySendRateLimit } from "./_lib/services/verifySendRateLimit.js";
import { clearVerifyAttempts } from "./_lib/services/verifyAttempts.js";
import { validateUsZipCode } from "./_lib/zipCode.js";

// Vercel puts the connecting client first in `x-forwarded-for`; fall back to
// the socket address for local/dev requests that skip the proxy.
function getClientIp(req: VercelRequest): string {
  const forwardedFor = req.headers?.["x-forwarded-for"];
  const first = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  if (first) {
    return first.split(",")[0].trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, zipCode } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email and ZIP code are required",
      });
    }

    // zipCode is required for subscription signup, but omitted for sign-in
    // (AuthWidget only needs an email OTP). Validate when present so fake
    // ZIPs never start a subscription flow.
    let normalizedZipCode: string | undefined;
    if (zipCode) {
      const parsedZip = validateUsZipCode(
        typeof zipCode === "string" ? zipCode.trim() : zipCode,
      );
      if (!parsedZip.ok) {
        return res.status(400).json({
          success: false,
          error: parsedZip.error,
        });
      }
      normalizedZipCode = parsedZip.zipCode;
    }

    console.log("REST API verify request:", { email, zipCode: normalizedZipCode });

    const rateLimit = await checkVerifySendRateLimit(email, getClientIp(req));
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: "Too many verification requests. Please try again later.",
      });
    }

    if (normalizedZipCode) {
      const exists = await subscriptionExists(email, normalizedZipCode);
      if (exists) {
        return res.json({
          success: false,
          error: "This email is already subscribed for this ZIP code",
        });
      }
    }

    // Send verification code
    const result = await sendVerificationCode(email);
    if (result.success) {
      // A successful send invalidates the previous code and starts a fresh
      // OTP window. The endpoint's send limiter still caps new-code requests.
      await clearVerifyAttempts(email);
    }
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
