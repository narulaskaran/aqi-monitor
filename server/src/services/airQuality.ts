/**
 * Air Quality data service using Google Air Quality API
 */
import { prisma } from '../db.js';
import { z } from 'zod';
import { sendAirQualityAlerts } from './subscription.js';

// Validate environment variables
const envSchema = z.object({
  GOOGLE_AIR_QUALITY_API_KEY: z.string().min(1),
});

// Parse environment variables
const env = envSchema.safeParse({
  GOOGLE_AIR_QUALITY_API_KEY: process.env.GOOGLE_AIR_QUALITY_API_KEY,
});

if (!env.success) {
  console.error('❌ Missing Google Air Quality API key:', env.error.format());
  throw new Error('Missing required Google API environment variables');
}

// API key
const apiKey = process.env.GOOGLE_AIR_QUALITY_API_KEY!;

// Air Quality response types
export interface AirQualityData {
  index: number;
  category: string;
  dominantPollutant: string;
  pollutants?: Record<string, {
    concentration: number;
    unit: string;
  }>;
}

// Zip code to coordinates mapping function with database caching
export async function getCoordinatesForZipCode(zipCode: string): Promise<{ latitude: number; longitude: number }> {
  // Check if we have this ZIP code in our database cache
  const cachedCoordinates = await prisma.zipCoordinates.findUnique({
    where: { zipCode }
  });
  
  // If we have valid cached coordinates and they're not due for refresh, use them
  if (cachedCoordinates && cachedCoordinates.refreshAfter > new Date()) {
    console.log(`Using cached coordinates for ZIP code: ${zipCode}`);
    return {
      latitude: cachedCoordinates.latitude,
      longitude: cachedCoordinates.longitude
    };
  }
  
  // If we have expired cached coordinates, use them but refresh in the background
  if (cachedCoordinates) {
    console.log(`Using expired cached coordinates for ZIP code: ${zipCode} while refreshing`);
    
    // Start the refresh process (don't await it)
    fetchCoordinatesFromAPI(zipCode)
      .then(freshCoordinates => {
        // Update the cache with a 30-day refresh period
        const refreshDate = new Date();
        refreshDate.setDate(refreshDate.getDate() + 30);
        
        return prisma.zipCoordinates.update({
          where: { zipCode },
          data: {
            latitude: freshCoordinates.latitude,
            longitude: freshCoordinates.longitude,
            refreshAfter: refreshDate,
            updatedAt: new Date()
          }
        });
      })
      .then(() => console.log(`Background refresh completed for ZIP code: ${zipCode}`))
      .catch(error => console.error(`Background refresh failed for ZIP code: ${zipCode}:`, error));
    
    // Return the existing coordinates immediately
    return {
      latitude: cachedCoordinates.latitude,
      longitude: cachedCoordinates.longitude
    };
  }
  
  // No cache exists, we need to fetch from the API
  console.log(`Fetching coordinates for ZIP code: ${zipCode}`);
  const coordinates = await fetchCoordinatesFromAPI(zipCode);
  
  // Store the coordinates in the database with a 30-day refresh period
  const refreshDate = new Date();
  refreshDate.setDate(refreshDate.getDate() + 30);
  
  await prisma.zipCoordinates.create({
    data: {
      zipCode,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      refreshAfter: refreshDate
    }
  });
  
  return coordinates;
}

// Helper function to fetch coordinates using OpenStreetMap Nominatim API
async function fetchCoordinatesFromAPI(zipCode: string): Promise<{ latitude: number; longitude: number }> {
  try {
    const coordinates = await fetchFromNominatimAPI(zipCode);
    return coordinates;
  } catch (error: any) {
    console.error(`Nominatim API failed for ZIP ${zipCode}:`, error);
    throw new Error(`Failed to get coordinates for ZIP ${zipCode}: ${error.message || 'Unknown error'}`);
  }
}

// OpenStreetMap Nominatim API service
async function fetchFromNominatimAPI(zipCode: string): Promise<{ latitude: number; longitude: number }> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${zipCode}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout
  
  try {
    // Include a proper User-Agent header as recommended by OSM
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'AQI-Monitor/1.0 (https://aqi-monitor.vercel.app)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    
    
    // Check if we got any results
    if (data && data.length > 0) {
      const usLocation = data.find((location: any) => 
        location.display_name.endsWith(", United States")
      );
      
      if (usLocation) {
        // Nominatim returns lat/lon as strings
        return {
          latitude: parseFloat(usLocation.lat),
          longitude: parseFloat(usLocation.lon)
        };
      }
    }
    
    throw new Error('No locations found for this ZIP code');
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches air quality data from Google Air Quality API
 */
export async function fetchAirQuality(
  latitude: number,
  longitude: number
): Promise<AirQualityData> {
  try {
    console.log('Making request to Google Air Quality API with:', {
      latitude,
      longitude,
      apiKey: apiKey ? 'Present' : 'Missing',
    });

    const response = await fetch(
      `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: {
            latitude,
            longitude,
          },
          universalAqi: true,
          extraComputations: ['LOCAL_AQI'],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google API error response:', errorText);
      throw new Error(`Failed to fetch air quality data: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Successfully fetched air quality data:', JSON.stringify(data, null, 2));
    
    // Log available indexes
    if (data.indexes) {
      console.log('Available indexes:', data.indexes.map((index: any) => index.code));
    } else {
      console.log('No indexes found in response');
    }
    
    // Extract the relevant data from the response
    // The API returns an array of indexes, we want the USA EPA AQI
    const epaIndex = data.indexes?.find((index: any) => index.code === 'usa_epa');
    
    if (!epaIndex) {
      throw new Error('US EPA AQI data not available for this location');
    }
    
    // Extract pollutant data if available
    const pollutants: Record<string, { concentration: number; unit: string }> = {};
    
    if (data.pollutants) {
      for (const pollutant of data.pollutants) {
        pollutants[pollutant.code] = {
          concentration: pollutant.concentration.value,
          unit: pollutant.concentration.units,
        };
      }
    }
    
    return {
      index: epaIndex.aqi,
      category: epaIndex.category,
      dominantPollutant: epaIndex.dominantPollutant || 'Unknown',
      pollutants: Object.keys(pollutants).length > 0 ? pollutants : undefined
    };
  } catch (error) {
    console.error('Error fetching air quality data:', error);
    throw error;
  }
}

/**
 * Mocked air quality data for development/testing
 */
export function getMockAirQualityData(): AirQualityData {
  return {
    index: 42,
    category: 'Good',
    dominantPollutant: 'PM2.5',
    pollutants: {
      'PM2.5': {
        concentration: 10.2,
        unit: 'µg/m³',
      },
      'PM10': {
        concentration: 15.7,
        unit: 'µg/m³',
      },
      'O3': {
        concentration: 30.5,
        unit: 'ppb',
      },
    }
  };
}

/**
 * Fetches air quality data for a specific ZIP code and stores it in the database
 */
export async function fetchAndStoreAirQualityForZip(zipCode: string): Promise<void> {
  try {
    console.log(`Fetching air quality data for ZIP code: ${zipCode}`);
    
    // Get coordinates for the ZIP code
    const { latitude, longitude } = await getCoordinatesForZipCode(zipCode);
    
    // Fetch air quality data from the API
    const airQualityData = await fetchAirQuality(latitude, longitude);
    
    // Round the timestamp to the nearest hour to ensure we have only one record per hour
    const now = new Date();
    now.setMinutes(0, 0, 0); // Set minutes, seconds, and milliseconds to 0
    
    // Store the data in the database
    await prisma.airQualityRecord.upsert({
      where: {
        zipCode_timestamp: {
          zipCode,
          timestamp: now,
        },
      },
      update: {
        aqi: airQualityData.index,
        category: airQualityData.category,
        dominantPollutant: airQualityData.dominantPollutant,
        pollutantData: airQualityData.pollutants ? airQualityData.pollutants : undefined,
      },
      create: {
        zipCode,
        aqi: airQualityData.index,
        category: airQualityData.category,
        dominantPollutant: airQualityData.dominantPollutant,
        timestamp: now,
        pollutantData: airQualityData.pollutants ? airQualityData.pollutants : undefined,
      },
    });
    
    console.log(`Successfully stored air quality data for ZIP code: ${zipCode}`);
    
    // Always send air quality notifications (both good and poor air quality)
    try {
      const alertsSent = await sendAirQualityAlerts(
        zipCode, 
        airQualityData.index, 
        airQualityData.category,
        airQualityData.dominantPollutant
      );
      
      if (alertsSent > 0) {
        if (airQualityData.index < 51) {
          console.log(`Sent ${alertsSent} good air quality update emails for ZIP code ${zipCode}`);
        } else {
          console.log(`Sent ${alertsSent} air quality alert emails for ZIP code ${zipCode}`);
        }
      }
    } catch (alertError) {
      console.error(`Error sending air quality alerts for ZIP code ${zipCode}:`, alertError);
      // Do not rethrow, we don't want alert failures to break the data storage flow
    }
  } catch (error) {
    console.error(`Error processing air quality for ZIP code ${zipCode}:`, error);
    throw error;
  }
}

/**
 * Updates air quality data for all active subscriptions
 */
export async function updateAirQualityForAllSubscriptions(): Promise<void> {
  try {
    console.log('Starting to update air quality data for all subscriptions');
    
    // Get all unique ZIP codes from active subscriptions
    const subscriptions = await prisma.userSubscription.findMany({
      where: {
        active: true,
      },
      select: {
        zipCode: true,
      },
      distinct: ['zipCode'],
    });
    
    console.log(`Found ${subscriptions.length} unique ZIP codes with active subscriptions`);
    
    // Process each ZIP code
    const promises = subscriptions.map(({ zipCode }) => fetchAndStoreAirQualityForZip(zipCode));
    
    // Wait for all promises to resolve
    await Promise.all(promises);
    
    console.log('Finished updating air quality data for all subscriptions');
  } catch (error) {
    console.error('Error updating air quality data:', error);
    throw error;
  }
}

/**
 * Gets the latest air quality record for a specific ZIP code
 */
export async function getLatestAirQualityForZip(zipCode: string): Promise<AirQualityData | null> {
  try {
    const record = await prisma.airQualityRecord.findFirst({
      where: {
        zipCode,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
    
    if (!record) {
      return null;
    }
    
    // Need to cast the JSON data back to the correct type
    const pollutants = record.pollutantData 
      ? record.pollutantData as Record<string, { concentration: number; unit: string }>
      : undefined;

    return {
      index: record.aqi,
      category: record.category,
      dominantPollutant: record.dominantPollutant,
      pollutants,
    };
  } catch (error) {
    console.error(`Error getting latest air quality for ZIP code ${zipCode}:`, error);
    throw error;
  }
}