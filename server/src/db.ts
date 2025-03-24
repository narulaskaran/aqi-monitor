import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
