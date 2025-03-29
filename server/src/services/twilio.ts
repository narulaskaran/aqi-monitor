/**
 * Email service for sending verification codes via Resend
 */
import { Resend } from 'resend';
import { z } from 'zod';

// Validate environment variables
const envSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
});

// Parse environment variables with fallbacks for development
const env = envSchema.safeParse({
  RESEND_API_KEY: process.env.RESEND_API_KEY,
});

if (!env.success) {
  console.error('❌ Missing Resend credentials:', env.error.format());
  throw new Error('Missing required Resend environment variables');
}

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY!);

// Response types
export interface VerificationResult {
  success: boolean;
  status?: string;
  error?: string;
}

export interface VerificationCheckResult extends VerificationResult {
  valid?: boolean;
}

// Store verification codes in memory (in production, use a database)
const verificationCodes: Record<string, { code: string; expires: Date; email: string }> = {};

/**
 * Generate a random 6-digit verification code
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Creates a verification code that expires in 10 minutes
 */
function createVerificationCode(email: string): string {
  const code = generateVerificationCode();
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + 10); // Expire in 10 minutes
  
  // Store the code with the email
  verificationCodes[email] = { code, expires, email };
  
  return code;
}

/**
 * Sends a verification code to the provided email
 */
export async function sendVerificationCode(email: string): Promise<VerificationResult> {
  // Use mock response in development mode
  if (process.env.NODE_ENV === 'development' && !process.env.RESEND_API_KEY) {
    console.log('Using mock verification code in development mode for:', email);
    console.log('Mock code is: 123456');
    
    // Store the mock verification code
    verificationCodes[email] = {
      code: '123456',
      expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      email
    };
    
    return {
      success: true,
      status: 'pending'
    };
  }
  
  try {
    // Generate a verification code
    const code = createVerificationCode(email);
    
    console.log('Sending verification code to:', email);
    
    // Send the email with Resend
    const { data, error } = await resend.emails.send({
      from: 'AQI Monitor <notifications@narula.xyz>',
      to: [email],
      subject: 'Your AQI Monitor Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a5568;">AQI Monitor Verification</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; font-size: 24px; text-align: center; letter-spacing: 2px; font-weight: bold;">
            ${code}
          </div>
          <p style="color: #718096; font-size: 14px; margin-top: 20px;">
            This code will expire in 10 minutes. If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
      `
    });
    
    if (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        error: error.message
      };
    }
    
    console.log('Email sent with ID:', data?.id);
    return {
      success: true,
      status: 'pending'
    };
  } catch (error) {
    console.error('Error sending verification code:', error);
    
    // In development mode, return success even on error
    if (process.env.NODE_ENV === 'development') {
      console.log('Returning mock success response in development mode');
      verificationCodes[email] = {
        code: '123456',
        expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        email
      };
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
 * Verifies a code sent to an email
 */
export async function checkVerificationCode(
  email: string, 
  code: string
): Promise<VerificationCheckResult> {
  // Use mock response in development mode
  if (process.env.NODE_ENV === 'development' && !process.env.RESEND_API_KEY) {
    console.log('Using mock verification check in development mode for:', email);
    
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
    console.log('Checking verification code for:', email);
    
    // Check if we have a code for this email
    const verification = verificationCodes[email];
    
    if (!verification) {
      console.log('No verification code found for:', email);
      return {
        success: false,
        valid: false,
        error: 'No verification pending for this email'
      };
    }
    
    // Check if code is expired
    if (verification.expires < new Date()) {
      console.log('Verification code expired for:', email);
      // Clean up the expired code
      delete verificationCodes[email];
      return {
        success: false,
        valid: false,
        error: 'Verification code has expired'
      };
    }
    
    // Check if code matches
    const isValid = verification.code === code;
    console.log('Verification check result:', isValid ? 'approved' : 'rejected');
    
    // Clean up the used code if valid
    if (isValid) {
      delete verificationCodes[email];
    }
    
    return {
      success: true,
      valid: isValid,
      status: isValid ? 'approved' : 'pending'
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