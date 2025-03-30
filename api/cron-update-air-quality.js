// Serverless API endpoint for cron job to update air quality data
import { updateAirQualityForAllSubscriptions } from "../server/dist/services/airQuality.js";

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle OPTIONS request (preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // This endpoint should only be called by the Vercel cron job system
    // In production, this is automatically secured by Vercel

    // For extra security, verify a secret if one is configured
    // This is useful if you want to be able to trigger the job manually
    const authHeader = req.headers.authorization || "";
    const cronSecret = process.env.CRON_SECRET;

    // If in a dev environment, don't enforce secret validation unless provided
    if (cronSecret || process.env.NODE_ENV === "production") {
      if (
        !authHeader.startsWith("Bearer ") ||
        authHeader.split(" ")[1] !== cronSecret
      ) {
        console.warn("Unauthorized cron job attempt detected");
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }
    }
    console.log("Running scheduled air quality update...");

    // Update air quality data for all active subscriptions
    await updateAirQualityForAllSubscriptions();

    console.log("Air quality update completed successfully");
    return res.json({
      success: true,
      message: "Air quality data updated successfully",
    });
  } catch (error) {
    console.error("Error in cron job:", error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update air quality data",
    });
  }
}
