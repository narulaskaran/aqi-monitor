import { Request, Response } from "express";
import {
  fetchAirQuality,
  getMockAirQualityData,
  getLatestAirQualityForZip,
  getCoordinatesForZipCode,
  fetchAndStoreAirQualityForZip,
  updateAirQualityForAllSubscriptions,
} from "../services/airQuality.js";

export async function handleGetAirQuality(req: Request, res: Response) {
  try {
    const { zipCode } = req.query;

    // We now require zipCode for all requests
    if (!zipCode) {
      return res.status(400).json({ error: "ZIP code is required" });
    }

    console.log(`Air quality request for ZIP code: ${zipCode}`);

    // Check if we have recent data in the database
    console.log(
      `Checking for cached air quality data for ZIP code: ${zipCode}`,
    );
    const storedData = await getLatestAirQualityForZip(zipCode as string);

    if (storedData) {
      console.log(`Found cached air quality data for ZIP code: ${zipCode}`);
      return res.json(storedData);
    }

    // Use mock data in development mode if no API key is available
    if (
      process.env.NODE_ENV === "development" &&
      !process.env.GOOGLE_AIR_QUALITY_API_KEY
    ) {
      console.log("Using mock air quality data in development mode");
      return res.json(getMockAirQualityData());
    }

    try {
      // Get coordinates from ZIP code
      const coordinates = await getCoordinatesForZipCode(zipCode as string);
      console.log(`Resolved coordinates for ZIP ${zipCode}:`, coordinates);

      // Call the air quality service with the coordinates
      const result = await fetchAirQuality(
        coordinates.latitude,
        coordinates.longitude,
      );

      // Also store this data in the database for future use
      try {
        await fetchAndStoreAirQualityForZip(zipCode as string);
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

      // Improved error handling with better messaging for different failure scenarios
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

export async function handleUpdateAirQuality(req: Request, res: Response) {
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
