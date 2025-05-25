// Serverless API endpoint for cron job to update air quality data
import {
  corsMiddleware,
  validateMethod,
  validateCronSecret,
} from "./middleware.js";
import { handleUpdateAirQuality } from "../server/dist/handlers/airQuality.js";
import { deleteExpiredAuthTokens } from "../server/dist/services/subscription.js";

export default async function handler(req, res) {
  // Apply middleware
  corsMiddleware(req, res, () => {
    validateMethod("GET")(req, res, () => {
      validateCronSecret(req, res, async () => {
        await handleUpdateAirQuality(req, res);
        // Clean up expired auth tokens as part of the daily cron job
        try {
          const deleted = await deleteExpiredAuthTokens();
          console.log(`Deleted ${deleted} expired auth tokens.`);
        } catch (err) {
          console.error("Error deleting expired auth tokens:", err);
        }
      });
    });
  });
}
