/**
 * AQI Monitor Server Entry Point
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectToDatabase, disconnectFromDatabase, prisma } from './db.js';
import { 
  sendVerificationCode, 
  checkVerificationCode
} from './services/twilio.js';
import { 
  fetchAirQuality, 
  getMockAirQualityData,
  getLatestAirQualityForZip,
  updateAirQualityForAllSubscriptions,
  getCoordinatesForZipCode,
  fetchAndStoreAirQualityForZip
} from './services/airQuality.js';

// Load environment variables
dotenv.config();

// Initialize database connection
connectToDatabase().catch((err) => {
  console.error('❌ Failed to connect to database:', err);
  process.exit(1);
});

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// CORS middleware for all routes
// In development, allow all origins for easier testing
const corsOptions = process.env.NODE_ENV === 'development' 
  ? { 
      origin: '*', // Allow all origins in development
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  : {
      origin: [
        /^http:\/\/localhost:\d+$/,  // All localhost origins
        'https://aqi-monitor.vercel.app', // Vercel deployment
        /\.vercel\.app$/,               // All Vercel subdomains
        'https://narula.xyz',           // Custom domain
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    };

// Apply CORS middleware
app.use(cors(corsOptions));

// Middleware for parsing JSON
app.use(express.json());

// Basic request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV });
});

// RESTful API routes

// Air quality data endpoint
app.get('/api/air-quality', async (req, res) => {
  try {
    const { zipCode } = req.query;
    
    // We now require zipCode for all requests
    if (!zipCode) {
      return res.status(400).json({ error: 'ZIP code is required' });
    }
    
    console.log(`Air quality request for ZIP code: ${zipCode}`);
    
    // Check if we have recent data in the database
    console.log(`Checking for cached air quality data for ZIP code: ${zipCode}`);
    const storedData = await getLatestAirQualityForZip(zipCode as string);
    
    if (storedData) {
      console.log(`Found cached air quality data for ZIP code: ${zipCode}`);
      return res.json(storedData);
    }
    
    // Use mock data in development mode if no API key is available
    if (process.env.NODE_ENV === 'development' && !process.env.GOOGLE_AIR_QUALITY_API_KEY) {
      console.log('Using mock air quality data in development mode');
      return res.json(getMockAirQualityData());
    }
    
    try {
      // Get coordinates from ZIP code
      const coordinates = await getCoordinatesForZipCode(zipCode as string);
      console.log(`Resolved coordinates for ZIP ${zipCode}:`, coordinates);
      
      // Call the air quality service with the coordinates
      const result = await fetchAirQuality(coordinates.latitude, coordinates.longitude);
      
      // Also store this data in the database for future use
      try {
        await fetchAndStoreAirQualityForZip(zipCode as string);
        console.log(`Stored air quality data for future use for ZIP code: ${zipCode}`);
      } catch (storageError) {
        // Just log the error, don't fail the request
        console.error(`Failed to store air quality data for ZIP code ${zipCode}:`, storageError);
      }
      
      return res.json(result);
    } catch (err) {
      const error = err as Error;
      console.error(`Error processing air quality request for ZIP code ${zipCode}:`, error);
      
      // Improved error handling with better messaging for different failure scenarios
      if (error.message?.includes('No locations found')) {
        return res.status(400).json({ 
          error: `Invalid or unsupported ZIP code: ${zipCode}. Please try a different ZIP code.` 
        });
      }
      
      if (error.message?.includes('API responded with status')) {
        return res.status(503).json({ 
          error: 'Location service temporarily unavailable. Please try again later.'
        });
      }
      
      if (error.message?.includes('Request timeout')) {
        return res.status(503).json({ 
          error: 'Location service timed out. Please try again later.'
        });
      }
      
      if (error.message?.includes('Failed to get coordinates')) {
        console.error(`Geocoding failed for ZIP ${zipCode}`);
        return res.status(500).json({ 
          error: 'Unable to determine location from this ZIP code. Please try a different ZIP code or contact support if the problem persists.'
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
});

// Start verification endpoint
app.post('/api/verify', async (req, res) => {
  try {
    const { email, zipCode } = req.body;
    
    if (!email || !zipCode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and ZIP code are required' 
      });
    }
    
    console.log('REST API verify request:', { email, zipCode });
    
    // Check if this email/zipCode combo already exists
    const existingSubscription = await prisma.userSubscription.findFirst({
      where: { 
        email,
        zipCode
      }
    });
    
    if (existingSubscription) {
      return res.json({
        success: false,
        error: 'This email is already subscribed for this ZIP code'
      });
    }
    
    // Send verification code
    const result = await sendVerificationCode(email);
    return res.json(result);
  } catch (error) {
    console.error('Error in verification API:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to start verification' 
    });
  }
});

// Verify code endpoint
app.post('/api/verify-code', async (req, res) => {
  try {
    const { email, zipCode, code } = req.body;
    
    if (!email || !zipCode || !code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, ZIP code, and verification code are required' 
      });
    }
    
    console.log('REST API verify-code request:', { email, zipCode, code });
    
    // Verify the code
    const result = await checkVerificationCode(email, code);
    
    // If verification is successful, create subscription
    if (result.success && result.valid) {
      try {
        // Create new subscription
        await prisma.userSubscription.create({
          data: {
            email,
            zipCode,
            active: true,
            activatedAt: new Date(),
          }
        });
      } catch (dbError) {
        console.error('Error creating subscription after verification:', dbError);
        return res.json({
          ...result,
          error: 'Verification successful but failed to create subscription'
        });
      }
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Error in code verification API:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to verify code' 
    });
  }
});

// Cron job endpoint to update air quality data
app.get('/api/cron/update-air-quality', async (req, res) => {
  try {
    // This endpoint should only be called by the Vercel cron job system
    // In production, this is automatically secured by Vercel cron
    
    // For extra security, you could add a verification token
    // For example, check the Authorization header against an env var
    const authHeader = req.headers.authorization || '';
    const cronSecret = process.env.CRON_SECRET;
    
    // If we're in production or a CRON_SECRET is set, validate it
    if (cronSecret || process.env.NODE_ENV === 'production') {
      if (!authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== cronSecret) {
        console.warn('Unauthorized cron job attempt detected');
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
    }
    
    console.log('Running scheduled air quality update...');
    
    // Update air quality data for all active subscriptions
    await updateAirQualityForAllSubscriptions();
    
    console.log('Air quality update completed successfully');
    return res.json({ success: true, message: 'Air quality data updated successfully' });
  } catch (error) {
    console.error('Error in cron job:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update air quality data' 
    });
  }
});

// Start the server
const server = app.listen(port, () => {
  console.log(`✅ Server is running at http://localhost:${port}`);
  console.log(`🔍 API endpoints available at:`);
  console.log(`  - GET  http://localhost:${port}/api/air-quality`);
  console.log(`  - POST http://localhost:${port}/api/verify`);
  console.log(`  - POST http://localhost:${port}/api/verify-code`);
  console.log(`  - GET  http://localhost:${port}/api/cron/update-air-quality`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    console.log('HTTP server closed');
    await disconnectFromDatabase();
    console.log('Database connections closed');
    process.exit(0);
  });
});

// Export the Express app for Vercel
export default app;