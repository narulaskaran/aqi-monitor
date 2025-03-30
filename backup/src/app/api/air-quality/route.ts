import { NextResponse } from 'next/server';

const GOOGLE_AIR_QUALITY_API_KEY = process.env.GOOGLE_AIR_QUALITY_API_KEY;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${GOOGLE_AIR_QUALITY_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch air quality data');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching air quality data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch air quality data' },
      { status: 500 }
    );
  }
} 