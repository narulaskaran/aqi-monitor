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
import { fetchAirQuality, getMockAirQualityData } from './services/airQuality.js';

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
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    console.log('REST API air-quality request:', { latitude, longitude });
    
    // Parse the coordinates
    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    
    // Use mock data in development mode if no API key is available
    if (process.env.NODE_ENV === 'development' && !process.env.GOOGLE_AIR_QUALITY_API_KEY) {
      console.log('Using mock air quality data in development mode');
      return res.json(getMockAirQualityData());
    }
    
    // Call the air quality service directly
    const result = await fetchAirQuality(lat, lng);
    return res.json(result);
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

// Start the server
const server = app.listen(port, () => {
  console.log(`✅ Server is running at http://localhost:${port}`);
  console.log(`🔍 API endpoints available at:`);
  console.log(`  - GET  http://localhost:${port}/api/air-quality`);
  console.log(`  - POST http://localhost:${port}/api/verify`);
  console.log(`  - POST http://localhost:${port}/api/verify-code`);
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