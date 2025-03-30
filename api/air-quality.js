// Serverless API endpoint for air quality data
import { fetchAirQuality, getMockAirQualityData } from '../server/dist/services/airQuality.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    console.log('REST API air-quality request:', { latitude, longitude });
    
    // Parse the coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    // Use mock data if no API key is available
    if (!process.env.GOOGLE_AIR_QUALITY_API_KEY) {
      console.log('Using mock air quality data');
      return res.json(getMockAirQualityData());
    }
    
    // Call the air quality service directly
    const result = await fetchAirQuality(lat, lng);
    return res.json(result);
  } catch (error) {
    console.error('Error in air quality API:', error);
    return res.status(500).json({ error: 'Failed to fetch air quality data' });
  }
}