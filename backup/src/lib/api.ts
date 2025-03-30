import { AirQualityResponse, AirQualityError } from '@/types/air-quality';

export async function getAirQuality(latitude: number, longitude: number): Promise<AirQualityResponse | AirQualityError> {
  try {
    // Always use localhost:3000 for development
    const baseUrl = 'http://localhost:3000';
    console.log(`Fetching air quality data from: ${baseUrl}/api/air-quality?latitude=${latitude}&longitude=${longitude}`);
    
    const response = await fetch(
      `${baseUrl}/api/air-quality?latitude=${latitude}&longitude=${longitude}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to fetch air quality data: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Air quality data received:', data);
    return data;
  } catch (error) {
    console.error('Error fetching air quality data:', error);
    return { error: 'Failed to fetch air quality data' };
  }
} 