import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';

// Required for serverless environments
neonConfig.webSocketConstructor = ws;

// Check for database connection string in common environment variables
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("❌ Database connection string missing. Environment variables:");
  console.error("DATABASE_URL: " + (process.env.DATABASE_URL ? "SET" : "MISSING"));
  console.error("POSTGRES_PRISMA_URL: " + (process.env.POSTGRES_PRISMA_URL ? "SET" : "MISSING"));
  console.error("POSTGRES_URL: " + (process.env.POSTGRES_URL ? "SET" : "MISSING"));
  throw new Error(
    "Database connection string not found. Please set DATABASE_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL environment variable."
  );
}

// Pass the connection string to the Pool
const pool = new Pool({
  connectionString,
});

const adapter = new PrismaNeon(pool);

export const prisma = new PrismaClient({ adapter });
