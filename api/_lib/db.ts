import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';

// Required for serverless environments
neonConfig.webSocketConstructor = ws;

// FIX: Explicitly pass the connection string to the Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaNeon(pool);

export const prisma = new PrismaClient({ adapter });