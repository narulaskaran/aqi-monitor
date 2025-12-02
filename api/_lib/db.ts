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

if (!connectionString) {
  console.error("❌ CRITICAL ERROR: Database connection string missing.");
  console.error("Debug Info:");
  console.error("- NODE_ENV:", process.env.NODE_ENV);
  console.error("- DATABASE_URL:", process.env.DATABASE_URL ? "SET (starts with " + process.env.DATABASE_URL.substring(0, 10) + "...)" : "MISSING");
  console.error("- POSTGRES_PRISMA_URL:", process.env.POSTGRES_PRISMA_URL ? "SET" : "MISSING");
  console.error("- POSTGRES_URL:", process.env.POSTGRES_URL ? "SET" : "MISSING");
  
  throw new Error(
    "Database connection string not found. The application cannot start. Please ensure DATABASE_URL is set in your Vercel Project Settings."
  );
}

// Pass the connection string to the Pool
const pool = new Pool({
  connectionString,
});

// Instantiate the Prisma adapter
const adapter = new PrismaNeon(pool);

// Export the Prisma Client instance
export const prisma = new PrismaClient({ adapter });
