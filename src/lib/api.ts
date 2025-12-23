/**
 * API utilities for client-side requests
 */
import { AirQualityData } from '../types/air-quality';

/**
 * Gets the base URL for API requests based on environment
 */
export const getBaseUrl = () => {
  // Check if we're running on Vercel
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return window.location.origin;
  }
  
  // In development (localhost)
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3000';
  }
  
  // Fallback to current origin
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
};

// Export a helper to get full API URLs
export const getApiUrl = (path: string) => {
  const baseUrl = getBaseUrl();
  // Remove any leading slash from path
  const cleanPath = path.replace(/^\/+/, '');
  // Ensure path starts with /api/
  const apiPath = cleanPath.startsWith('api/') ? `/${cleanPath}` : `/api/${cleanPath}`;
  return `${baseUrl}${apiPath}`;
};

/**
 * Fetches air quality data from REST API using ZIP code
 */
export async function getAirQuality(zipCode: string): Promise<AirQualityData> {
  try {
    const baseUrl = getBaseUrl();
    console.log(`Fetching air quality data from API: ${baseUrl}/api/air-quality?zipCode=${zipCode}`);
    
    const response = await fetch(
      `${baseUrl}/api/air-quality?zipCode=${zipCode}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch air quality data: ${response.status}`);
    }

    const data = await response.json();
    console.log('Air quality data received:', data);
    return data;
  } catch (error) {
    console.error('Error fetching air quality data:', error);
    
    // Return mock data as last resort
    return {
      index: 0,
      category: 'Unknown',
      dominantPollutant: 'Unknown',
      error: 'Failed to fetch air quality data'
    };
  }
}

/**
 * Sends verification code to email
 */
export async function startVerification(email: string, zipCode: string) {
  try {
    const baseUrl = getBaseUrl();
    console.log(`Starting verification: ${baseUrl}/api/verify`);
    
    const response = await fetch(`${baseUrl}/api/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        zipCode
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Verification API error (${response.status}):`, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error starting verification:', error);
    throw error;
  }
}

/**
 * Verifies code sent to email
 */
export async function verifyCode(
  email: string,
  zipCode: string,
  code: string,
  expiresAt?: string
) {
  try {
    const baseUrl = getBaseUrl();
    console.log(`Verifying code: ${baseUrl}/api/verify-code`);

    const body: {
      email: string;
      zipCode: string;
      code: string;
      expiresAt?: string;
    } = {
      email,
      zipCode,
      code
    };

    // Add expiresAt if provided
    if (expiresAt) {
      body.expiresAt = expiresAt;
    }

    const response = await fetch(`${baseUrl}/api/verify-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Code verification API error (${response.status}):`, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error verifying code:', error);
    throw error;
  }
}