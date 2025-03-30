// Serverless API endpoint for cron job to update air quality data
import {
  corsMiddleware,
  validateMethod,
  validateCronSecret,
} from "./middleware.js";
import { handleUpdateAirQuality } from "../server/dist/handlers/airQuality.js";

export default async function handler(req, res) {
  // Apply middleware
  corsMiddleware(req, res, () => {
    validateMethod("GET")(req, res, () => {
      validateCronSecret(req, res, async () => {
        await handleUpdateAirQuality(req, res);
      });
    });
  });
}
