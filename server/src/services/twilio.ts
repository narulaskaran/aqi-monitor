/**
 * Email service for sending verification codes and notifications via Resend
 */
import { Resend } from "resend";
import { z } from "zod";
import { prisma } from "../db.js";
import { verificationEmail } from "../templates/email/index.js";

// Validate environment variables
const envSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
});

// Parse environment variables with fallbacks for development
const env = envSchema.safeParse({
  RESEND_API_KEY: process.env.RESEND_API_KEY,
});

if (!env.success) {
  console.error("❌ Missing Resend credentials:", env.error.format());
  throw new Error("Missing required Resend environment variables");
}

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY!);

// Response types
export interface VerificationResult {
  success: boolean;
  status?: string;
  error?: string;
}

export interface VerificationCheckResult extends VerificationResult {
  valid?: boolean;
}

/**
 * Generate a random 6-digit verification code
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Cleans up expired verification codes
 */
async function cleanupExpiredCodes(): Promise<void> {
  try {
    // Delete codes that have expired
    await prisma.verificationCode.deleteMany({
      where: {
        expires: {
          lt: new Date(), // Codes that expired before now
        },
      },
    });
  } catch (error) {
    console.error("Error cleaning up expired verification codes:", error);
  }
}

/**
 * Invalidates any existing verification codes for an email
 */
async function invalidateExistingCodes(email: string): Promise<void> {
  try {
    // Mark existing codes as used
    await prisma.verificationCode.updateMany({
      where: {
        email,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error invalidating existing verification codes:", error);
  }
}

/**
 * Sends a verification code to the provided email
 */
export async function sendVerificationCode(
  email: string,
): Promise<VerificationResult> {
  try {
    // Clean up expired codes first
    await cleanupExpiredCodes();

    // Invalidate any existing codes for this email
    await invalidateExistingCodes(email);

    // Generate a verification code
    const code = generateVerificationCode();

    // Calculate expiration time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Store the verification code in the database
    await prisma.verificationCode.create({
      data: {
        email,
        code,
        expires: expiresAt,
      },
    });

    console.log("Sending verification code to:", email);
    console.log("Code is:", code);

    // Send the email with Resend
    const { data, error } = await resend.emails.send({
      from: "AQI Monitor <notifications@narula.xyz>",
      to: [email],
      subject: "Your AQI Monitor Verification Code",
      html: verificationEmail(code),
    });

    if (error) {
      console.error("Error sending email:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log("Email sent with ID:", data?.id);
    return {
      success: true,
      status: "pending",
    };
  } catch (error) {
    console.error("Error sending verification code:", error);

    // In development mode, return success even on error and use a fixed code
    if ((process.env.VERCEL_ENV || process.env.NODE_ENV) !== "production") {
      console.log("Returning mock success response in development mode");

      // Ensure a mock code exists in the database for testing
      try {
        // Calculate expiration time (10 minutes from now)
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        // Create a mock verification code
        await prisma.verificationCode.create({
          data: {
            email,
            code: "123456",
            expires: expiresAt,
          },
        });

        console.log("Created mock verification code 123456 for:", email);
      } catch (dbError) {
        console.error("Error creating mock verification code:", dbError);
      }

      return {
        success: true,
        status: "pending",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Verifies a code sent to an email
 */
export async function checkVerificationCode(
  email: string,
  code: string,
): Promise<VerificationCheckResult> {
  console.log("Checking verification code for:", email);
  console.log("Received code:", code);

  try {
    // Clean up expired codes first
    await cleanupExpiredCodes();

    // In development mode with no Resend API key, accept a known test code
    if (
      (process.env.VERCEL_ENV || process.env.NODE_ENV) !== "production" &&
      !process.env.RESEND_API_KEY
    ) {
      console.log(
        "In development mode with no API key - accepting code 123456",
      );

      if (code === "123456") {
        return {
          success: true,
          valid: true,
          status: "approved",
        };
      }
    }

    // Find the most recent unexpired and unused verification code for the email
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        email,
        code,
        expires: {
          gt: new Date(), // Not expired
        },
        usedAt: null, // Not used yet
      },
      orderBy: {
        createdAt: "desc", // Get the most recent one
      },
    });

    if (!verificationCode) {
      console.log("No valid verification code found for:", email);
      return {
        success: false,
        valid: false,
        error: "Invalid or expired verification code",
      };
    }

    // Mark the code as used
    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { usedAt: new Date() },
    });

    console.log("Verification successful for:", email);

    return {
      success: true,
      valid: true,
      status: "approved",
    };
  } catch (error) {
    console.error("Error checking verification code:", error);

    // In development mode, provide more flexibility
    if (
      (process.env.VERCEL_ENV || process.env.NODE_ENV) !== "production" &&
      !process.env.RESEND_API_KEY
    ) {
      // Check if the code exists in the database regardless of expiration
      try {
        const anyCode = await prisma.verificationCode.findFirst({
          where: {
            email,
            code,
          },
        });

        if (anyCode) {
          console.log("Found matching code in development mode, accepting it");
          return {
            success: true,
            valid: true,
            status: "approved",
          };
        }
      } catch (dbError) {
        console.error("Error checking for any matching code:", dbError);
      }
    }

    return {
      success: false,
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Send a generic email using Resend
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from: "AQI Monitor <notifications@narula.xyz>",
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("Error sending email:", error);
      return { success: false, error: error.message };
    }

    console.log("Email sent with ID:", data?.id);
    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error sending email",
    };
  }
}
