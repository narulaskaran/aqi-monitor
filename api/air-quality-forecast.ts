import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getMockForecastData,
  getCoordinatesForZipCode,
  fetchAirQualityForecast,
} from './_lib/services/airQuality.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { zipCode, startDate, endDate } = req.query;

    // Validate zipCode
    if (!zipCode || typeof zipCode !== 'string') {
      return res.status(400).json({ error: 'ZIP code is required' });
    }
    if (!/^\d{5}$/.test(zipCode)) {
      return res.status(400).json({ error: 'ZIP code must be a 5-digit number' });
    }

    // Validate startDate
    if (!startDate || typeof startDate !== 'string') {
      return res.status(400).json({ error: 'startDate is required (YYYY-MM-DD)' });
    }
    const parsedStart = new Date(`${startDate}T00:00:00Z`);
    if (isNaN(parsedStart.getTime())) {
      return res.status(400).json({ error: 'startDate is not a valid date (use YYYY-MM-DD)' });
    }

    // Validate optional endDate (defaults to startDate)
    const endDateStr = typeof endDate === 'string' ? endDate : startDate;
    const parsedEnd = new Date(`${endDateStr}T23:59:59Z`);
    if (isNaN(parsedEnd.getTime())) {
      return res.status(400).json({ error: 'endDate is not a valid date (use YYYY-MM-DD)' });
    }

    if (parsedStart > parsedEnd) {
      return res.status(400).json({ error: 'startDate must be on or before endDate' });
    }

    // Forecast horizon: [now, now + 96 hours]
    const now = new Date();
    const horizonEnd = new Date(now.getTime() + 96 * 60 * 60 * 1000);

    // Check that the requested range overlaps the available horizon
    if (parsedStart > horizonEnd || parsedEnd < now) {
      return res.status(400).json({
        error: 'Forecasts are only available up to 4 days ahead. Please choose a date range within the next 4 days.',
      });
    }

    // Google's API rejects a period whose start/end sits exactly on "now" or
    // the 96-hour horizon: by the time our request reaches Google (after the
    // coordinates lookup + network latency), its own clock has moved past our
    // computed `now`/`horizonEnd`, making the boundary invalid ("The specified
    // time period is not supported"). Pad both edges inward so the period we
    // actually send stays safely within Google's window.
    const BOUNDARY_BUFFER_MS = 5 * 60 * 1000;
    const usableStart = new Date(now.getTime() + BOUNDARY_BUFFER_MS);
    const usableEnd = new Date(horizonEnd.getTime() - BOUNDARY_BUFFER_MS);

    // Clamp requested window to the available horizon
    const clampedStart = parsedStart < usableStart ? usableStart : parsedStart;
    const clampedEndRaw = parsedEnd > usableEnd ? usableEnd : parsedEnd;
    const clampedEnd = clampedEndRaw < clampedStart ? clampedStart : clampedEndRaw;

    console.log(`Forecast request for ZIP: ${zipCode}, ${startDate} – ${endDateStr}`);

    // Use mock data in development mode if no API key is available
    if (
      process.env.NODE_ENV !== 'production' &&
      !process.env.GOOGLE_AIR_QUALITY_API_KEY
    ) {
      console.log('Using mock forecast data in development mode');
      const forecasts = getMockForecastData(clampedStart, clampedEnd);
      return res.json({ success: true, zipCode, forecasts });
    }

    try {
      const coordinates = await getCoordinatesForZipCode(zipCode);
      console.log(`Resolved coordinates for ZIP ${zipCode}:`, coordinates);

      const forecasts = await fetchAirQualityForecast(
        coordinates.latitude,
        coordinates.longitude,
        clampedStart,
        clampedEnd,
      );

      return res.json({ success: true, zipCode, forecasts });
    } catch (err) {
      const error = err as Error;
      console.error(`Error processing forecast request for ZIP ${zipCode}:`, error);

      if (error.message?.includes('No locations found')) {
        return res.status(400).json({
          error: `Invalid or unsupported ZIP code: ${zipCode}. Please try a different ZIP code.`,
        });
      }

      if (error.message?.includes('API responded with status')) {
        return res.status(503).json({
          error: 'Location service temporarily unavailable. Please try again later.',
        });
      }

      if (error.message?.includes('Request timeout')) {
        return res.status(503).json({
          error: 'Location service timed out. Please try again later.',
        });
      }

      if (error.message?.includes('Failed to fetch air quality forecast')) {
        return res.status(503).json({
          error: 'Forecast service temporarily unavailable. Please try again later.',
        });
      }

      if (error.message?.includes('Failed to get coordinates')) {
        return res.status(500).json({
          error: 'Unable to determine location from this ZIP code. Please try a different ZIP code or contact support if the problem persists.',
        });
      }

      return res.status(500).json({
        error: 'An error occurred while retrieving forecast data. Please try again later.',
      });
    }
  } catch (error) {
    console.error('Error in air quality forecast API:', error);
    return res.status(500).json({ error: 'Failed to fetch air quality forecast' });
  }
}
