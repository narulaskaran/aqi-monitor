import type { VercelRequest, VercelResponse } from '@vercel/node';
import { updateAirQualityForAllSubscriptions } from "../_lib/services/airQuality.js";
import { deleteExpiredAuthTokens } from "../_lib/services/subscription.js";

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

    // Delete expired authentication tokens so the Authentication table
    // does not grow unboundedly. A cleanup failure must not fail the
    // (already successful) air-quality refresh, so log and continue.
    let deletedTokenCount: number | null = null;
    try {
      deletedTokenCount = await deleteExpiredAuthTokens();
    } catch (cleanupError) {
      console.error("Error deleting expired auth tokens:", cleanupError);
    }

    return res.json({
      success: true,
      message:
        deletedTokenCount === null
          ? "Air quality data updated successfully; expired auth token cleanup failed"
          : `Air quality data updated successfully; expired auth tokens deleted: ${deletedTokenCount}`,
    });
  } catch (error) {
    console.error("Error updating air quality data:", error);
    return res.status(500).json({ error: "Failed to update air quality data" });
  }
}
