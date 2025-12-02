import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure WebSocket for Neon serverless driver
neonConfig.webSocketConstructor = ws;

// Check for database connection string in common environment variables
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

// If running locally without env vars loaded by Vercel, try to load from .env
if (!connectionString && process.env.NODE_ENV !== 'production') {
  console.log('⚠️ No connection string found in process.env, checking if .env loading is needed...');
}

if (!connectionString) {
  console.error("❌ Database connection string missing. Environment variables:");
  console.error("DATABASE_URL: " + (process.env.DATABASE_URL ? "SET" : "MISSING"));
  console.error("POSTGRES_PRISMA_URL: " + (process.env.POSTGRES_PRISMA_URL ? "SET" : "MISSING"));
  console.error("POSTGRES_URL: " + (process.env.POSTGRES_URL ? "SET" : "MISSING"));
  
  // In local development, we can try to throw a more helpful error
  if (process.env.NODE_ENV !== 'production') {
    throw new Error(
      "Database connection string not found. Please create a .env file with DATABASE_URL set."
    );
  }
}

// Pass the connection string to the Pool
const pool = new Pool({
  connectionString: connectionString || undefined, // Pass undefined if empty to let driver error out naturally (or fallback)
});

const adapter = new PrismaNeon(pool);

export const prisma = new PrismaClient({ adapter });