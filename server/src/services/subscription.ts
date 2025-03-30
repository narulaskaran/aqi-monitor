/**
 * Subscription service for managing user subscriptions
 */
import { prisma } from '../db.js';
import { sendEmail } from './twilio.js'; // Using the existing email service
import { airQualityAlertEmail, goodAirQualityEmail } from '../templates/email/index.js';

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

// Air quality alert thresholds
export enum AirQualityThreshold {
  MODERATE = 51,   // AQI > 50: Moderate
  UNHEALTHY_SENSITIVE = 101,  // AQI > 100: Unhealthy for Sensitive Groups
  UNHEALTHY = 151, // AQI > 150: Unhealthy
  VERY_UNHEALTHY = 201, // AQI > 200: Very Unhealthy
  HAZARDOUS = 301  // AQI > 300: Hazardous
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

/**
 * Send air quality alerts to users based on current AQI
 * Send alerts for both poor air quality (>= Moderate) and good air quality (Good category)
 */
export async function sendAirQualityAlerts(zipCode: string, aqi: number, category: string, dominantPollutant: string = 'PM2.5'): Promise<number> {
  try {
    // Get all active subscriptions for this ZIP code
    const subscriptions = await prisma.userSubscription.findMany({
      where: {
        zipCode,
        active: true
      }
    });
    
    if (subscriptions.length === 0) {
      console.log(`No active subscriptions for ZIP code ${zipCode} to send alerts to`);
      return 0;
    }
    
    // For Good air quality (AQI < 51)
    if (aqi < 51) {
      console.log(`Sending good air quality updates to ${subscriptions.length} subscribers for ZIP code ${zipCode}`);
      
      // Send email to each subscriber
      const emailPromises = subscriptions.map(subscription => {
        // Generate the email HTML using the template for good air quality
        const html = goodAirQualityEmail({
          zipCode,
          aqi,
          dominantPollutant
        });
        
        // Send the email
        return sendEmail(
          subscription.email,
          `Daily AQI Update: Good Air Quality in Your Area`,
          html
        );
      });
      
      // Wait for all emails to be sent
      const results = await Promise.all(emailPromises);
      
      // Count successful sends
      const successCount = results.filter(result => result.success).length;
      console.log(`Successfully sent ${successCount} of ${subscriptions.length} good air quality updates`);
      
      return successCount;
    }
    
    // For poor air quality (AQI >= 51)
    // Determine which threshold the AQI value exceeds
    let alertLevel = '';
    let alertColor = '';
    let healthGuidance = '';
    
    if (aqi >= AirQualityThreshold.HAZARDOUS) {
      alertLevel = 'HAZARDOUS';
      alertColor = '#7E0023'; // Maroon
      healthGuidance = 'Everyone should avoid all outdoor physical activity and stay indoors with windows closed.';
    } else if (aqi >= AirQualityThreshold.VERY_UNHEALTHY) {
      alertLevel = 'VERY UNHEALTHY';
      alertColor = '#8F3F97'; // Purple
      healthGuidance = 'Everyone should avoid outdoor physical activity and sensitive groups should remain indoors with windows closed.';
    } else if (aqi >= AirQualityThreshold.UNHEALTHY) {
      alertLevel = 'UNHEALTHY';
      alertColor = '#FF0000'; // Red
      healthGuidance = 'Everyone should reduce prolonged or heavy exertion outdoors. Sensitive groups should avoid outdoor activities.';
    } else if (aqi >= AirQualityThreshold.UNHEALTHY_SENSITIVE) {
      alertLevel = 'UNHEALTHY FOR SENSITIVE GROUPS';
      alertColor = '#FF7E00'; // Orange
      healthGuidance = 'People with respiratory or heart disease, the elderly, and children should limit prolonged outdoor exertion.';
    } else if (aqi >= AirQualityThreshold.MODERATE) {
      alertLevel = 'MODERATE';
      alertColor = '#FFFF00'; // Yellow
      healthGuidance = 'People who are unusually sensitive to air pollution should consider reducing prolonged or heavy outdoor exertion.';
    }
    
    console.log(`Sending air quality alerts to ${subscriptions.length} subscribers for ZIP code ${zipCode}`);
    
    // Send email to each subscriber
    const emailPromises = subscriptions.map(subscription => {
      // Generate the email HTML using the template
      const html = airQualityAlertEmail({
        zipCode,
        aqi,
        alertLevel,
        category,
        alertColor,
        healthGuidance
      });
      
      // Send the email
      return sendEmail(
        subscription.email,
        `AQI Alert: ${alertLevel} Air Quality in Your Area`,
        html
      );
    });
    
    // Wait for all emails to be sent
    const results = await Promise.all(emailPromises);
    
    // Count successful sends
    const successCount = results.filter(result => result.success).length;
    console.log(`Successfully sent ${successCount} of ${subscriptions.length} air quality alerts`);
    
    return successCount;
  } catch (error) {
    console.error('Error sending air quality alerts:', error);
    return 0;
  }
}