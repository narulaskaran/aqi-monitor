/**
 * Air Quality data service using Google Air Quality API
 */
import { z } from 'zod';

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
    
    // Extract the relevant data from the response
    const indexes = data.indexes || [];
    const epaIndex = indexes.find((index: any) => index.code === 'usa_epa');

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
      pollutants: Object.keys(pollutants).length > 0 ? pollutants : undefined,
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
    },
  };
}