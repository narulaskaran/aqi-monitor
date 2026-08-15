import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getMockForecastData,
  getCoordinatesForZipCode,
  fetchAirQualityForecast,
} from './_lib/services/airQuality.js';
import { validateUsZipCode } from './_lib/zipCode.js';
import {
  clampToForecastWindow,
  getUsableForecastWindow,
} from '../src/lib/forecastWindow.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { startDate, endDate } = req.query;

    const parsedZip = validateUsZipCode(req.query.zipCode);
    if (!parsedZip.ok) {
      return res.status(400).json({ error: parsedZip.error });
    }
    const { zipCode } = parsedZip;

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

    const now = new Date();
    const usable = getUsableForecastWindow(now);

    // Check that the requested range overlaps the available horizon
    if (parsedStart > usable.end || parsedEnd < usable.start) {
      return res.status(400).json({
        error: 'Forecasts are only available up to 4 days ahead. Please choose a date range within the next 4 days.',
      });
    }

    // Google rounds period timestamps down to the previous exact hour and
    // rejects a start in the current (already-started) hour. A 5-minute pad
    // still lands in that hour and 503s every "today" request. Clamp to the
    // next UTC hour through a conservative hour-aligned 96h end instead.
    const clamped = clampToForecastWindow(parsedStart, parsedEnd, now);
    if (!clamped) {
      return res.status(400).json({
        error: 'No forecast hours remain in the selected date range. Please choose a later end date.',
      });
    }
    const { start: clampedStart, end: clampedEnd } = clamped;

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
          error:
            'Invalid or unsupported ZIP code. Please try a different ZIP code.',
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
        // Google 400s an invalid period; that is a client/window issue, not an
        // outage. Keep 503 for genuine upstream failures (5xx / network).
        if (
          error.message.includes(': 400 ') ||
          error.message.includes('time period is not supported')
        ) {
          return res.status(400).json({
            error: 'Forecasts are only available up to 4 days ahead. Please choose a date range within the next 4 days.',
          });
        }
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
