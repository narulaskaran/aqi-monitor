import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  throw new Error('Missing Twilio credentials');
}

const client = twilio(accountSid, authToken);
let verificationServiceSid = process.env.TWILIO_VERIFICATION_SERVICE_SID;

// Initialize verification service if not already created
export async function initializeVerificationService(friendlyName: string = "AQI Monitor Verify Service") {
  try {
    // If we already have a service SID, verify it's valid
    if (verificationServiceSid) {
      try {
        const service = await client.verify.v2.services(verificationServiceSid).fetch();
        console.log('Using existing verification service:', service.friendlyName);
        return verificationServiceSid;
      } catch (error) {
        console.warn('Existing verification service not found or invalid:', error);
        verificationServiceSid = undefined;
      }
    }

    // Create a new verification service
    const service = await client.verify.v2.services.create({
      friendlyName: friendlyName,
      codeLength: 6,
    });
    
    verificationServiceSid = service.sid;
    console.log('Created new verification service with SID:', service.sid);
    
    // Return the service SID so it can be saved in environment variables
    return service.sid;
  } catch (error) {
    console.error('Error initializing verification service:', error);
    throw error;
  }
}

// Helper function to ensure service is initialized
async function ensureServiceInitialized() {
  if (!verificationServiceSid) {
    verificationServiceSid = await initializeVerificationService();
  }
  return verificationServiceSid;
}

export async function sendVerificationCode(phoneNumber: string): Promise<{
  success: boolean;
  status?: string;
  error?: string;
}> {
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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function checkVerificationCode(phoneNumber: string, code: string): Promise<{
  success: boolean;
  valid?: boolean;
  status?: string;
  error?: string;
}> {
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
      valid: verificationCheck.valid,
      status: verificationCheck.status
    };
  } catch (error) {
    console.error('Error checking verification code:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Optional: Function to delete the verification service if needed
export async function deleteVerificationService(): Promise<boolean> {
  try {
    if (!verificationServiceSid) {
      return true; // Nothing to delete
    }

    await client.verify.v2.services(verificationServiceSid).remove();
    return true;
  } catch (error) {
    console.error('Error deleting verification service:', error);
    return false;
  }
} 