import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getMockHistoryData,
  getHistoryForZip,
} from './_lib/services/airQuality.js';
import { validateUsZipCode } from './_lib/zipCode.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const parsedZip = validateUsZipCode(req.query.zipCode);
    if (!parsedZip.ok) {
      return res.status(400).json({ error: parsedZip.error });
    }
    const { zipCode } = parsedZip;

    const { days } = req.query;

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

    const history = await getHistoryForZip(zipCode, daysNum);
    if (
      history.length === 0 &&
      process.env.NODE_ENV !== 'production' &&
      !process.env.GOOGLE_AIR_QUALITY_API_KEY
    ) {
      console.log('Using mock history data in development mode');
      return res.status(200).json({
        success: true,
        zipCode,
        history: getMockHistoryData(daysNum),
      });
    }

    return res.status(200).json({ success: true, zipCode, history });
  } catch (error) {
    console.error('Error in air quality history API:', error);
    return res.status(500).json({ error: 'Failed to fetch air quality history data' });
  }
}
