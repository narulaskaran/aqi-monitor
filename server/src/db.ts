import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })
}

export const prisma = global.prisma || prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

// Test the connection and retry if needed
async function testConnection(retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect()
      console.log('✅ Database connected successfully')
      return true
    } catch (error) {
      console.error(`❌ Database connection attempt ${i + 1} failed:`, error)
      if (i < retries - 1) {
        console.log(`Retrying in ${delay/1000} seconds...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  return false
}

// Initialize connection
testConnection()
  .catch((e) => {
    console.error('Failed to establish database connection after retries:', e)
    process.exit(1)
  })

export async function addSubscription(phone: string, zipCode: string) {
  return await prisma.userSubscription.create({
    data: {
      phone,
      zipCode,
    }
  });
}

export async function getAllSubscriptions() {
  return await prisma.userSubscription.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  });
}
