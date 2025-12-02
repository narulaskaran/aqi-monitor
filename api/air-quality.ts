import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getMockAirQualityData,
  getLatestAirQualityForZip,
  getCoordinatesForZipCode,
  fetchAirQuality,
  fetchAndStoreAirQualityForZip,
} from './_lib/services/airQuality.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS (optional, usually handled by Vercel config or middleware wrapper)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { zipCode } = req.query;

    // We now require zipCode for all requests
    if (!zipCode || typeof zipCode !== 'string') {
      return res.status(400).json({ error: "ZIP code is required" });
    }

    console.log(`Air quality request for ZIP code: ${zipCode}`);

    // Check if we have recent data in the database
    console.log(
      `Checking for cached air quality data for ZIP code: ${zipCode}`,
    );
    const storedData = await getLatestAirQualityForZip(zipCode);

    if (storedData) {
      console.log(`Found cached air quality data for ZIP code: ${zipCode}`);
      return res.json(storedData);
    }

    // Use mock data in development mode if no API key is available
    if (
      process.env.NODE_ENV !== "production" &&
      !process.env.GOOGLE_AIR_QUALITY_API_KEY
    ) {
      console.log("Using mock air quality data in development mode");
      return res.json(getMockAirQualityData());
    }

    try {
      // Get coordinates from ZIP code
      const coordinates = await getCoordinatesForZipCode(zipCode);
      console.log(`Resolved coordinates for ZIP ${zipCode}:`, coordinates);

      // Call the air quality service with the coordinates
      const result = await fetchAirQuality(
        coordinates.latitude,
        coordinates.longitude,
      );

      // Also store this data in the database for future use
      try {
        await fetchAndStoreAirQualityForZip(zipCode);
        console.log(
          `Stored air quality data for future use for ZIP code: ${zipCode}`,
        );
      } catch (storageError) {
        // Just log the error, don't fail the request
        console.error(
          `Failed to store air quality data for ZIP code ${zipCode}:`,
          storageError,
        );
      }

      return res.json(result);
    } catch (err) {
      const error = err as Error;
      console.error(
        `Error processing air quality request for ZIP code ${zipCode}:`,
        error,
      );

      if (error.message?.includes("No locations found")) {
        return res.status(400).json({
          error: `Invalid or unsupported ZIP code: ${zipCode}. Please try a different ZIP code.`,
        });
      }

      if (error.message?.includes("API responded with status")) {
        return res.status(503).json({
          error:
            "Location service temporarily unavailable. Please try again later.",
        });
      }

      if (error.message?.includes("Request timeout")) {
        return res.status(503).json({
          error: "Location service timed out. Please try again later.",
        });
      }

      if (error.message?.includes("Failed to get coordinates")) {
        console.error(`Geocoding failed for ZIP ${zipCode}`);
        return res.status(500).json({
          error:
            "Unable to determine location from this ZIP code. Please try a different ZIP code or contact support if the problem persists.",
        });
      }

      return res.status(500).json({
        error:
          "An error occurred while retrieving air quality data. Please try again later.",
      });
    }
  } catch (error) {
    console.error("Error in air quality API:", error);
    return res.status(500).json({ error: "Failed to fetch air quality data" });
  }
}
