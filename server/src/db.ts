/**
 * Prisma client singleton for database access
 */
import { PrismaClient } from "@prisma/client";

// Global type declaration for the Prisma instance in development
declare global {
  var prisma: PrismaClient | undefined;
}

// Create a singleton instance of PrismaClient
const createPrismaClient = () => {
  return new PrismaClient({
    log: ["error", "warn"],
  });
};

// Use the existing client in development to avoid too many connections
export const prisma = global.prisma || createPrismaClient();

// Save the client reference in development to enable hot reloading
if ((process.env.VERCEL_ENV || process.env.NODE_ENV) !== "production") {
  global.prisma = prisma;
}

/**
 * Connects to the database and tests the connection
 * Will retry up to 3 times with a 2-second delay between attempts
 */
export async function connectToDatabase() {
  const retries = 3;
  const delay = 2000;

  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      console.log("✅ Database connected successfully");
      return true;
    } catch (error) {
      console.error(`❌ Database connection attempt ${i + 1} failed:`, error);

      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error(
    "Failed to establish database connection after multiple retries",
  );
  return false;
}

// Database cleanup function to call on server shutdown
export async function disconnectFromDatabase() {
  await prisma.$disconnect();
}
