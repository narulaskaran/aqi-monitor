import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

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
