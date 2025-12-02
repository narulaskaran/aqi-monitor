import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure WebSocket for Neon serverless driver
neonConfig.webSocketConstructor = ws;

// Create a connection pool
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });

// Instantiate the Prisma adapter
const adapter = new PrismaNeon(pool);

// Export the Prisma Client instance
export const prisma = new PrismaClient({ adapter });
