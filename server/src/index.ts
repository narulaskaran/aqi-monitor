/**
 * AQI Monitor Server Entry Point
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectToDatabase, disconnectFromDatabase } from './db.js';
import { handleGetAirQuality, handleUpdateAirQuality } from './handlers/airQuality.js';
import { handleStartVerification, handleVerifyCode } from './handlers/verification.js';
import { handleUnsubscribe } from './handlers/subscription.js';

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
const corsOptions = process.env.NODE_ENV === 'development' 
  ? { 
      origin: 'http://localhost:5173', // Allow only the frontend origin in development
      credentials: true,
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
app.get('/api/air-quality', handleGetAirQuality);
app.get('/api/cron/update-air-quality', handleUpdateAirQuality);
app.post('/api/verify', handleStartVerification);
app.post('/api/verify-code', handleVerifyCode);
app.post('/api/unsubscribe', handleUnsubscribe);

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await disconnectFromDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await disconnectFromDatabase();
  process.exit(0);
});