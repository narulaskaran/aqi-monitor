// Serverless API endpoint for email verification
import { sendVerificationCode } from '../server/dist/services/twilio.js';
import { prisma } from '../server/dist/db.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { email, zipCode } = req.body;
    
    if (!email || !zipCode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and ZIP code are required' 
      });
    }
    
    console.log('REST API verify request:', { email, zipCode });
    
    // Check if this email/zipCode combo already exists
    try {
      const existingSubscription = await prisma.userSubscription.findFirst({
        where: { 
          email,
          zipCode,
          active: true
        }
      });
      
      if (existingSubscription) {
        return res.json({
          success: false,
          error: 'This email is already subscribed for this ZIP code'
        });
      }
    } catch (dbError) {
      console.error('Database error checking subscription:', dbError);
      // Continue anyway to allow verification
    }
    
    // Clean up any expired verification codes
    try {
      await prisma.verificationCode.deleteMany({
        where: {
          expires: {
            lt: new Date()
          }
        }
      });
    } catch (cleanupError) {
      console.error('Error cleaning up expired codes:', cleanupError);
      // Continue anyway
    }
    
    // Invalidate any existing verification codes for this email
    try {
      await prisma.verificationCode.updateMany({
        where: {
          email,
          usedAt: null
        },
        data: {
          usedAt: new Date()
        }
      });
    } catch (invalidateError) {
      console.error('Error invalidating existing codes:', invalidateError);
      // Continue anyway
    }
    
    // Send verification code via email
    const result = await sendVerificationCode(email);
    
    return res.json(result);
  } catch (error) {
    console.error('Error in verification API:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to start verification' 
    });
  }
}