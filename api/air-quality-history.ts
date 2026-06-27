import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getMockHistoryData,
  getHistoryForZip,
} from './_lib/services/airQuality.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { zipCode, days } = req.query;

    // Validate zipCode
    if (!zipCode || typeof zipCode !== 'string') {
      return res.status(400).json({ error: 'ZIP code is required' });
    }
    if (!/^\d{5}$/.test(zipCode)) {
      return res.status(400).json({ error: 'ZIP code must be a 5-digit number' });
    }

    // Validate days (optional, default 7)
    let daysNum = 7;
    if (days !== undefined) {
      if (typeof days !== 'string' || !/^\d+$/.test(days)) {
        return res.status(400).json({ error: 'days must be a positive integer' });
      }
      daysNum = parseInt(days, 10);
      if (daysNum < 1 || daysNum > 90) {
        return res.status(400).json({ error: 'days must be between 1 and 90' });
      }
    }

    console.log(`History request for ZIP: ${zipCode}, days: ${daysNum}`);

    // Use mock data in development mode if no API key is available
    if (
      process.env.NODE_ENV !== 'production' &&
      !process.env.GOOGLE_AIR_QUALITY_API_KEY
    ) {
      console.log('Using mock history data in development mode');
      const history = getMockHistoryData(daysNum);
      return res.status(200).json({ success: true, zipCode, history });
    }

    // Real data from the database
    const history = await getHistoryForZip(zipCode, daysNum);
    return res.status(200).json({ success: true, zipCode, history });
  } catch (error) {
    console.error('Error in air quality history API:', error);
    return res.status(500).json({ error: 'Failed to fetch air quality history data' });
  }
}
