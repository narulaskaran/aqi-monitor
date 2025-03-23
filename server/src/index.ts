import { initTRPC } from '@trpc/server';
import express from 'express';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { z } from 'zod';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const t = initTRPC.create();

const appRouter = t.router({
  fetchAirQuality: t.procedure
    .input(z.object({
      latitude: z.number(),
      longitude: z.number(),
    }))
    .query(async ({ input }) => {
      try {
        console.log("GOOGLE_AIR_QUALITY_API_KEY", process.env.GOOGLE_AIR_QUALITY_API_KEY)
        if (!process.env.GOOGLE_AIR_QUALITY_API_KEY) {
          throw new Error('GOOGLE_AIR_QUALITY_API_KEY is not set');
        }

        console.log('Making request to Google API with:', {
          latitude: input.latitude,
          longitude: input.longitude,
          apiKey: process.env.GOOGLE_AIR_QUALITY_API_KEY ? 'Present' : 'Missing'
        });

        const response = await fetch(
          `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${process.env.GOOGLE_AIR_QUALITY_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify( {
              location: {
                latitude: input.latitude,
                longitude: input.longitude
              },
              universalAqi: true,
              extraComputations: [
                'LOCAL_AQI'
              ]
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

        // Extract relevant data from the response
        // The API returns an array of indexes, we want the USA EPA AQI
        const epaIndex = data.indexes?.find((index: any) => index.code === 'usa_epa');
        
        if (!epaIndex) {
          throw new Error('US EPA AQI data not available for this location');
        }

        return {
          index: epaIndex.aqi,
          category: epaIndex.category,
          dominantPollutant: epaIndex.dominantPollutant || 'Unknown',
        };
      } catch (error) {
        console.error('Detailed error:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to fetch air quality data');
      }
    }),
});

export type AppRouter = typeof appRouter;

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://aqi-monitor.vercel.app',  // Default Vercel domain
    'https://narula.xyz'  // Personal domain
  ],
  credentials: true
}));

app.use(express.json());

// Add error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// tRPC middleware
app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: () => ({})
  })
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Only start the server if we're explicitly in development mode
if (process.env.NODE_ENV === 'development') {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('tRPC endpoint available at http://localhost:3000/trpc');
  });
}

// Export the app for Vercel
export default app; 