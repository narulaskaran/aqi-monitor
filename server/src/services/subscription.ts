/**
 * Subscription service for managing user subscriptions
 */
import { prisma } from "../db.js";
import { sendEmail } from "./email.js"; // Using the email service
import { airQualityEmail } from "../templates/email/index.js";
import jwt from "jsonwebtoken";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Subscription types
export interface Subscription {
  id: string;
  email: string;
  zipCode: string;
  createdAt: Date;
  active: boolean;
  activatedAt: Date | null;
  updatedAt: Date;
}

// Air quality alert thresholds
export enum AirQualityThreshold {
  MODERATE = 51, // AQI > 50: Moderate
  UNHEALTHY_SENSITIVE = 101, // AQI > 100: Unhealthy for Sensitive Groups
  UNHEALTHY = 151, // AQI > 150: Unhealthy
  VERY_UNHEALTHY = 201, // AQI > 200: Very Unhealthy
  HAZARDOUS = 301, // AQI > 300: Hazardous
}

// Initialize Upstash Redis and Ratelimit (2 requests per second)
const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(2, "1 s"),
  analytics: true,
  prefix: "resend:email:ratelimit",
});

/**
 * Creates a new subscription for the given email and ZIP code
 */
export async function createSubscription(
  email: string,
  zipCode: string,
): Promise<Subscription> {
  return await prisma.userSubscription.create({
    data: {
      email,
      zipCode,
      active: true,
      activatedAt: new Date(),
    },
  });
}

/**
 * Retrieves all subscriptions, sorted by most recent first
 */
export async function getAllSubscriptions(): Promise<Subscription[]> {
  return await prisma.userSubscription.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Activates a subscription after verification
 */
export async function activateSubscription(
  email: string,
  zipCode: string,
): Promise<Subscription | null> {
  return await prisma.userSubscription
    .updateMany({
      where: {
        email,
        zipCode,
      },
      data: {
        active: true,
        activatedAt: new Date(),
      },
    })
    .then(() => {
      return prisma.userSubscription.findFirst({
        where: {
          email,
          zipCode,
        },
      });
    });
}

/**
 * Generates an unsubscribe token for a subscription
 */
export function generateUnsubscribeToken(subscriptionId: string): string {
  // Create a JWT token with the subscription ID
  const token = jwt.sign(
    { subscriptionId },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "1y" }, // Token expires in 1 year
  );
  return token;
}

/**
 * Validates an unsubscribe token and returns the subscription ID
 */
export function validateUnsubscribeToken(token: string): string | null {
  try {
    console.log("Validating unsubscribe token");
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    ) as { subscriptionId: string };
    console.log("Token validated successfully:", {
      subscriptionId: decoded.subscriptionId,
    });
    return decoded.subscriptionId;
  } catch (error) {
    console.error("Token validation failed:", error);
    if (error instanceof Error) {
      console.error("Token validation error details:", {
        name: error.name,
        message: error.message,
      });
    }
    return null;
  }
}

/**
 * Deactivates a subscription (unsubscribe) using a token
 */
export async function deactivateSubscription(token: string): Promise<boolean> {
  console.log("Starting subscription deactivation process");
  const subscriptionId = validateUnsubscribeToken(token);

  if (!subscriptionId) {
    console.log("Failed to validate token, cannot deactivate subscription");
    return false;
  }

  try {
    console.log("Attempting to update subscription:", { subscriptionId });
    const result = await prisma.userSubscription.update({
      where: {
        id: subscriptionId,
      },
      data: {
        active: false,
      },
    });

    console.log("Subscription update result:", result);
    return !!result;
  } catch (error) {
    console.error("Error updating subscription:", error);
    if (error instanceof Error) {
      console.error("Subscription update error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
    return false;
  }
}

/**
 * Finds a subscription by email
 */
export async function findSubscriptionsForEmail(
  email: string,
): Promise<Subscription[] | []> {
  return await prisma.userSubscription.findMany({
    where: {
      email,
    },
  });
}

/**
 * Checks if a subscription already exists
 */
export async function subscriptionExists(
  email: string,
  zipCode: string,
): Promise<boolean> {
  const count = await prisma.userSubscription.count({
    where: {
      email,
      zipCode,
    },
  });

  return count > 0;
}

/**
 * Send air quality alerts to users based on current AQI
 */
export async function sendAirQualityAlerts(
  zipCode: string,
  aqi: number,
  category: string,
  dominantPollutant: string,
): Promise<number> {
  try {
    // Get all active subscriptions for this ZIP code
    const subscriptions = await prisma.userSubscription.findMany({
      where: {
        zipCode,
        active: true,
      },
    });

    if (subscriptions.length === 0) {
      console.log(`No active subscriptions found for ZIP code ${zipCode}`);
      return 0;
    } else {
      console.log(
        `Found ${subscriptions.length} active subscriptions for ZIP code ${zipCode}`,
      );
    }

    const emails: any[] = [];
    async function sendWithRetry(
      email: string,
      subject: string,
      html: string,
      maxRetries = 4,
    ) {
      let attempt = 0;
      while (attempt <= maxRetries) {
        // Wait until we're allowed to send an email
        let allowed = false;
        let counter = 0;
        while (!allowed) {
          const { success } = await ratelimit.limit("resend:email:global");
          if (success) {
            allowed = true;
          } else {
            // Exponential backoff
            counter += 1;
            await new Promise((resolve) => setTimeout(resolve, 100 ** counter));
          }
        }

        const result = await sendEmail(email, subject, html);
        if (
          result.error &&
          result.error.toLowerCase().includes("too many requests")
        ) {
          attempt++;
          if (attempt < maxRetries) {
            // Exponential backoff
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 ** attempt),
            );
          }
        } else {
          return result;
        }
      }
      return { success: false, error: "Max retries exceeded" };
    }

    // Determine which threshold the AQI value exceeds
    let alertLevel = "";
    let alertColor = "";
    let healthGuidance = "";
    if (aqi >= AirQualityThreshold.HAZARDOUS) {
      alertLevel = "HAZARDOUS";
      alertColor = "#7E0023"; // Maroon
      healthGuidance =
        "Everyone should avoid all outdoor physical activity and stay indoors with windows closed.";
    } else if (aqi >= AirQualityThreshold.VERY_UNHEALTHY) {
      alertLevel = "VERY UNHEALTHY";
      alertColor = "#8F3F97"; // Purple
      healthGuidance =
        "Everyone should avoid outdoor physical activity and sensitive groups should remain indoors with windows closed.";
    } else if (aqi >= AirQualityThreshold.UNHEALTHY) {
      alertLevel = "UNHEALTHY";
      alertColor = "#FF0000"; // Red
      healthGuidance =
        "Everyone should reduce prolonged or heavy exertion outdoors. Sensitive groups should avoid outdoor activities.";
    } else if (aqi >= AirQualityThreshold.UNHEALTHY_SENSITIVE) {
      alertLevel = "UNHEALTHY FOR SENSITIVE GROUPS";
      alertColor = "#FF7E00"; // Orange
      healthGuidance =
        "People with respiratory or heart disease, the elderly, and children should limit prolonged outdoor exertion.";
    } else if (aqi >= AirQualityThreshold.MODERATE) {
      alertLevel = "MODERATE";
      alertColor = "#FFFF00"; // Yellow
      healthGuidance =
        "People who are unusually sensitive to air pollution should consider reducing prolonged or heavy outdoor exertion.";
    } else {
      // For Good air quality (AQI < 51)
      alertLevel = "GOOD";
      alertColor = "#009966"; // Green
      healthGuidance =
        "Air quality is satisfactory and poses little or no risk.";
    }

    console.log(
      `Sending air quality updates to ${subscriptions.length} subscribers for ZIP code ${zipCode}`,
    );

    let results = [];
    for (const subscription of subscriptions) {
      const unsubscribeToken = generateUnsubscribeToken(subscription.id);
      const websiteUrl =
        process.env.NODE_ENV === "development"
          ? "http://localhost:5173"
          : process.env.VITE_API_URL;
      if (!websiteUrl) {
        throw new Error(
          "No website URL configured. Please set VITE_API_URL in environment variables.",
        );
      }
      const html = airQualityEmail({
        zipCode,
        aqi,
        isGoodAirQuality: aqi < 51,
        alertLevel,
        category,
        alertColor,
        healthGuidance,
        dominantPollutant,
        unsubscribeToken,
        websiteUrl,
      });
      const subject =
        aqi < 51
          ? `Daily AQI Update: Good Air Quality in Your Area`
          : `AQI Alert: ${alertLevel} Air Quality in Your Area`;
      results.push(sendWithRetry(subscription.email, subject, html));
    }

    // Count successful sends
    results = await Promise.all(results);
    const successCount = results.filter((result) => result.success).length;
    console.log(
      `Successfully sent ${successCount} of ${subscriptions.length} "air quality alerts"`,
    );

    return successCount;
  } catch (error) {
    console.error(
      `Error sending air quality updates for ZIP code ${zipCode}:`,
      error,
    );
    throw error;
  }
}

/**
 * Deletes expired authentication tokens from the Authentication table
 */
export async function deleteExpiredAuthTokens(): Promise<number> {
  const now = new Date();
  const result = await prisma.authentication.deleteMany({
    where: {
      expiresAt: { lt: now },
    },
  });
  return result.count;
}

/**
 * Deletes all authentication tokens for a given email
 */
export async function deleteAuthTokensForEmail(email: string): Promise<number> {
  const result = await prisma.authentication.deleteMany({
    where: { email },
  });
  return result.count;
}
