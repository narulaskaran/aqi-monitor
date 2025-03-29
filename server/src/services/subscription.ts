/**
 * Subscription service for managing user subscriptions
 */
import { prisma } from '../db.js';

// Subscription types
export interface Subscription {
  id: string;
  phone: string;
  zipCode: string;
  createdAt: Date;
  active: boolean;
  activatedAt: Date | null;
  updatedAt: Date;
}

/**
 * Creates a new subscription for the given phone number and ZIP code
 */
export async function createSubscription(phone: string, zipCode: string): Promise<Subscription> {
  return await prisma.userSubscription.create({
    data: {
      phone,
      zipCode,
      active: true,
      activatedAt: new Date(),
    },
  });
}

/**
 * Retrieves all subscriptions, sorted by most recent first
 */
export async function getAllSubscriptions(): Promise<Subscription[]> {
  return await prisma.userSubscription.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Activates a subscription after verification
 */
export async function activateSubscription(phone: string, zipCode: string): Promise<Subscription | null> {
  return await prisma.userSubscription.updateMany({
    where: {
      phone,
      zipCode,
    },
    data: {
      active: true,
      activatedAt: new Date(),
    },
  }).then(() => {
    return prisma.userSubscription.findFirst({
      where: {
        phone,
        zipCode,
      },
    });
  });
}

/**
 * Deactivates a subscription (unsubscribe)
 */
export async function deactivateSubscription(id: string): Promise<boolean> {
  const result = await prisma.userSubscription.update({
    where: {
      id,
    },
    data: {
      active: false,
    },
  });
  
  return !!result;
}

/**
 * Finds a subscription by phone number
 */
export async function findSubscriptionByPhone(phone: string): Promise<Subscription | null> {
  return await prisma.userSubscription.findFirst({
    where: {
      phone,
    },
  });
}

/**
 * Checks if a subscription already exists
 */
export async function subscriptionExists(phone: string, zipCode: string): Promise<boolean> {
  const count = await prisma.userSubscription.count({
    where: {
      phone,
      zipCode,
    },
  });
  
  return count > 0;
}