/**
 * Twilio service for sending verification codes via SMS
 */
import twilio from 'twilio';
import { z } from 'zod';

// Validate environment variables
const envSchema = z.object({
  TWILIO_ACCOUNT_SID: z.string().min(1),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_VERIFICATION_SERVICE_SID: z.string().optional(),
});

// Parse environment variables with fallbacks for development
const env = envSchema.safeParse({
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_VERIFICATION_SERVICE_SID: process.env.TWILIO_VERIFICATION_SERVICE_SID,
});

if (!env.success) {
  console.error('❌ Missing Twilio credentials:', env.error.format());
  throw new Error('Missing required Twilio environment variables');
}

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const client = twilio(accountSid, authToken);

// Track the verification service SID
let verificationServiceSid = process.env.TWILIO_VERIFICATION_SERVICE_SID;

// Response types
export interface VerificationResult {
  success: boolean;
  status?: string;
  error?: string;
}

export interface VerificationCheckResult extends VerificationResult {
  valid?: boolean;
}

/**
 * Initializes or retrieves the Twilio verification service
 */
export async function initializeVerificationService(friendlyName = 'AQI Monitor Verification Service'): Promise<string> {
  // Use mock service in development mode if not explicitly specified in env
  if (process.env.NODE_ENV === 'development' && !process.env.TWILIO_VERIFICATION_SERVICE_SID) {
    console.log('Using mock Twilio verification service in development mode');
    verificationServiceSid = 'VA00000000000000000000000000000000';
    return verificationServiceSid;
  }
  
  try {
    // Check if we already have a valid service SID
    if (verificationServiceSid) {
      try {
        const service = await client.verify.v2.services(verificationServiceSid).fetch();
        console.log('Using existing Twilio verification service:', service.friendlyName);
        return verificationServiceSid;
      } catch (error) {
        console.warn('Existing verification service not found or invalid:', error);
        verificationServiceSid = undefined;
      }
    }

    // Create a new verification service - ensure friendlyName is valid
    // Twilio requires friendlyName to contain only letters, numbers, spaces, and these characters: . , - _ @ +
    const sanitizedName = friendlyName.replace(/[^a-zA-Z0-9\s\.,\-_@+]/g, '');
    
    const service = await client.verify.v2.services.create({
      friendlyName: sanitizedName || 'AQI Monitor Service', // Fallback if sanitized is empty
      codeLength: 6,
    });
    
    verificationServiceSid = service.sid;
    console.log('Created new Twilio verification service with SID:', service.sid);
    
    return service.sid;
  } catch (error) {
    console.error('Error initializing Twilio verification service:', error);
    throw error;
  }
}

/**
 * Ensures the verification service is initialized before use
 */
async function ensureServiceInitialized(): Promise<string> {
  if (!verificationServiceSid) {
    verificationServiceSid = await initializeVerificationService();
  }
  return verificationServiceSid;
}

/**
 * Sends a verification code to the provided phone number
 */
export async function sendVerificationCode(phoneNumber: string): Promise<VerificationResult> {
  // Use mock response in development mode
  if (process.env.NODE_ENV === 'development' && !process.env.TWILIO_VERIFICATION_SERVICE_SID) {
    console.log('Using mock verification code in development mode for:', phoneNumber);
    console.log('Mock code is: 123456');
    
    return {
      success: true,
      status: 'pending'
    };
  }
  
  try {
    const serviceSid = await ensureServiceInitialized();
    
    console.log('Sending verification code to:', phoneNumber);
    const verification = await client.verify.v2
      .services(serviceSid)
      .verifications.create({
        to: phoneNumber,
        channel: 'sms'
      });
    
    console.log('Verification status:', verification.status);
    return {
      success: verification.status === 'pending',
      status: verification.status
    };
  } catch (error) {
    console.error('Error sending verification code:', error);
    
    // In development mode, return success even on error
    if (process.env.NODE_ENV === 'development') {
      console.log('Returning mock success response in development mode');
      return {
        success: true,
        status: 'pending'
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Verifies a code sent to a phone number
 */
export async function checkVerificationCode(
  phoneNumber: string, 
  code: string
): Promise<VerificationCheckResult> {
  // Use mock response in development mode
  if (process.env.NODE_ENV === 'development' && !process.env.TWILIO_VERIFICATION_SERVICE_SID) {
    console.log('Using mock verification check in development mode for:', phoneNumber);
    
    // In development mode, accept code "123456" as valid
    const isValid = code === '123456';
    console.log('Mock verification result:', isValid ? 'approved' : 'rejected');
    
    return {
      success: true,
      valid: isValid,
      status: isValid ? 'approved' : 'pending'
    };
  }
  
  try {
    const serviceSid = await ensureServiceInitialized();
    
    console.log('Checking verification code for:', phoneNumber);
    const verificationCheck = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: phoneNumber,
        code: code
      });

    console.log('Verification check status:', verificationCheck.status);
    return {
      success: true,
      valid: verificationCheck.status === 'approved',
      status: verificationCheck.status
    };
  } catch (error) {
    console.error('Error checking verification code:', error);
    
    // In development mode, return success if the code is "123456"
    if (process.env.NODE_ENV === 'development') {
      const isValid = code === '123456';
      console.log('Returning mock verification check in development mode:', isValid ? 'approved' : 'rejected');
      
      return {
        success: true,
        valid: isValid,
        status: isValid ? 'approved' : 'pending'
      };
    }
    
    return {
      success: false,
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Optional: Deletes the verification service if needed
 */
export async function deleteVerificationService(): Promise<boolean> {
  try {
    if (!verificationServiceSid) {
      return true; // Nothing to delete
    }

    await client.verify.v2.services(verificationServiceSid).remove();
    verificationServiceSid = undefined;
    return true;
  } catch (error) {
    console.error('Error deleting verification service:', error);
    return false;
  }
}