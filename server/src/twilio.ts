import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  throw new Error('Missing Twilio credentials');
}

const client = twilio(accountSid, authToken);
const verificationServiceSid = process.env.TWILIO_VERIFICATION_SERVICE_SID;

// Initialize verification service if not already created
export async function initializeVerificationService(friendlyName: string = "AQI Monitor Verify Service") {
  try {
    if (!verificationServiceSid) {
      // Create a new verification service
      const service = await client.verify.v2.services.create({
        friendlyName: friendlyName,
        codeLength: 6, // Standard length for SMS codes
      });
      
      console.log('Created new verification service with SID:', service.sid);
      return service.sid;
    }
    return verificationServiceSid;
  } catch (error) {
    console.error('Error creating verification service:', error);
    throw error;
  }
}

export async function sendVerificationCode(phoneNumber: string): Promise<{
  success: boolean;
  status?: string;
  error?: string;
}> {
  try {
    if (!verificationServiceSid) {
      throw new Error('Verification service not initialized');
    }

    const verification = await client.verify.v2
      .services(verificationServiceSid)
      .verifications.create({
        to: phoneNumber,
        channel: 'sms'
      });
    
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
    if (!verificationServiceSid) {
      throw new Error('Verification service not initialized');
    }

    const verificationCheck = await client.verify.v2
      .services(verificationServiceSid)
      .verificationChecks.create({
        to: phoneNumber,
        code: code
      });

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