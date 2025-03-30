// Serverless API endpoint for air quality data
import { 
  getCoordinatesForZipCode, 
  fetchAirQuality, 
  getMockAirQualityData,
  getLatestAirQualityForZip,
  fetchAndStoreAirQualityForZip
} from '../server/dist/services/airQuality.js';

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
    const { zipCode } = req.query;
    
    // We now require zipCode for all requests
    if (!zipCode) {
      return res.status(400).json({ error: 'ZIP code is required' });
    }
    
    console.log(`Air quality request for ZIP code: ${zipCode}`);
    
    // Check if we have recent data in the database
    console.log(`Checking for cached air quality data for ZIP code: ${zipCode}`);
    const storedData = await getLatestAirQualityForZip(zipCode);
    
    if (storedData) {
      console.log(`Found cached air quality data for ZIP code: ${zipCode}`);
      return res.json(storedData);
    }
    
    // Use mock data if no API key is available
    if (!process.env.GOOGLE_AIR_QUALITY_API_KEY) {
      console.log('Using mock air quality data');
      return res.json(getMockAirQualityData());
    }
    
    try {
      // Get coordinates from ZIP code
      const coordinates = await getCoordinatesForZipCode(zipCode);
      console.log(`Resolved coordinates for ZIP ${zipCode}:`, coordinates);
      
      // Call the air quality service with the coordinates
      const result = await fetchAirQuality(coordinates.latitude, coordinates.longitude);
      
      // Also store this data in the database for future use
      try {
        await fetchAndStoreAirQualityForZip(zipCode);
        console.log(`Stored air quality data for future use for ZIP code: ${zipCode}`);
      } catch (storageError) {
        // Just log the error, don't fail the request
        console.error(`Failed to store air quality data for ZIP code ${zipCode}:`, storageError);
      }
      
      return res.json(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`Error processing air quality request for ZIP code ${zipCode}:`, error);
      
      if (error.message?.includes('No coordinates found') || 
          error.message?.includes('Invalid ZIP code')) {
        return res.status(400).json({ 
          error: `Invalid or unsupported ZIP code: ${zipCode}. Please try a different ZIP code.` 
        });
      }
      
      if (error.message?.includes('API responded with status')) {
        return res.status(503).json({ 
          error: 'Geocoding service temporarily unavailable. Please try again later.' 
        });
      }
      
      return res.status(500).json({ 
        error: 'An error occurred while retrieving air quality data. Please try again later.' 
      });
    }
  } catch (error) {
    console.error('Error in air quality API:', error);
    return res.status(500).json({ error: 'Failed to fetch air quality data' });
  }
}