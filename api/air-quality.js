// Serverless API endpoint for air quality data
import { corsMiddleware, validateMethod } from "./middleware.js";
import { handleGetAirQuality } from "../server/dist/handlers/airQuality.js";

export default async function handler(req, res) {
  // Apply middleware
  corsMiddleware(req, res, () => {
    validateMethod("GET")(req, res, async () => {
      await handleGetAirQuality(req, res);
    });
  });
}
