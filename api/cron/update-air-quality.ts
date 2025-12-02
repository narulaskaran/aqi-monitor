import type { VercelRequest, VercelResponse } from '@vercel/node';
import { updateAirQualityForAllSubscriptions } from "../_lib/services/airQuality.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Validate CRON_SECRET
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.split(" ")[1];
    if (token !== process.env.CRON_SECRET) {
      return res.status(403).json({ error: "Invalid CRON_SECRET" });
    }

    // Update air quality data for all subscriptions
    await updateAirQualityForAllSubscriptions();
    return res.json({
      success: true,
      message: "Air quality data updated successfully",
    });
  } catch (error) {
    console.error("Error updating air quality data:", error);
    return res.status(500).json({ error: "Failed to update air quality data" });
  }
}
