import { AirQualityResponse, AirQualityError } from '@/types/air-quality';

export async function getAirQuality(latitude: number, longitude: number): Promise<AirQualityResponse | AirQualityError> {
  try {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const response = await fetch(
      `${baseUrl}/api/air-quality?latitude=${latitude}&longitude=${longitude}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch air quality data');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching air quality data:', error);
    return { error: 'Failed to fetch air quality data' };
  }
} 