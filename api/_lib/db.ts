import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';

// 1. Keep the WebSocket configuration (Global setting for the library)
neonConfig.webSocketConstructor = ws;

// 2. Validate connection string
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Database connection string not found. Please set DATABASE_URL."
  );
}

// 3. FIX: Initialize PrismaNeon directly with the config object
// Do NOT create 'new Pool()' manually. The adapter handles this.
const adapter = new PrismaNeon({
  connectionString
});

export const prisma = new PrismaClient({ adapter });