/**
 * Subscription service for managing user subscriptions
 */
import { prisma } from '../db.js';

// Subscription types
export interface Subscription {
  id: string;
  email: string;
  zipCode: string;
  createdAt: Date;
  active: boolean;
  activatedAt: Date | null;
  updatedAt: Date;
}

/**
 * Creates a new subscription for the given email and ZIP code
 */
export async function createSubscription(email: string, zipCode: string): Promise<Subscription> {
  return await prisma.userSubscription.create({
    data: {
      email,
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
export async function activateSubscription(email: string, zipCode: string): Promise<Subscription | null> {
  return await prisma.userSubscription.updateMany({
    where: {
      email,
      zipCode,
    },
    data: {
      active: true,
      activatedAt: new Date(),
    },
  }).then(() => {
    return prisma.userSubscription.findFirst({
      where: {
        email,
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
 * Finds a subscription by email
 */
export async function findSubscriptionByEmail(email: string): Promise<Subscription | null> {
  return await prisma.userSubscription.findFirst({
    where: {
      email,
    },
  });
}

/**
 * Checks if a subscription already exists
 */
export async function subscriptionExists(email: string, zipCode: string): Promise<boolean> {
  const count = await prisma.userSubscription.count({
    where: {
      email,
      zipCode,
    },
  });
  
  return count > 0;
}