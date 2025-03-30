// Serverless API endpoint for verifying email codes
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
    const { email, zipCode, code } = req.body;
    
    if (!email || !zipCode || !code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, ZIP code, and verification code are required' 
      });
    }
    
    console.log('REST API verify-code request:', { email, zipCode, code });
    
    // Clean up expired codes
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
    
    // Find a matching verification code
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        email,
        code,
        expires: {
          gt: new Date() // Not expired
        },
        usedAt: null // Not used yet
      },
      orderBy: {
        createdAt: 'desc' // Get the most recent one
      }
    });
    
    // For development fallback
    let isValid = !!verificationCode;
    
    // In development, accept code 123456 as fallback
    if (!isValid && process.env.NODE_ENV === 'development' && code === '123456') {
      console.log('Using development fallback for code 123456');
      isValid = true;
    }
    
    // If verification is successful, create subscription
    if (isValid) {
      try {
        // Mark the code as used if it exists
        if (verificationCode) {
          await prisma.verificationCode.update({
            where: { id: verificationCode.id },
            data: { usedAt: new Date() }
          });
        }
        
        // Create new subscription
        await prisma.userSubscription.create({
          data: {
            email,
            zipCode,
            active: true,
            activatedAt: new Date(),
          }
        });
        
        console.log('Successfully created subscription for:', email);
      } catch (dbError) {
        console.error('Error creating subscription after verification:', dbError);
        return res.json({
          success: true,
          valid: isValid,
          status: 'approved',
          error: 'Verification successful but failed to create subscription'
        });
      }
    } else {
      console.log('Invalid verification code for:', email);
    }
    
    return res.json({
      success: true,
      valid: isValid,
      status: isValid ? 'approved' : 'rejected'
    });
  } catch (error) {
    console.error('Error in code verification API:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to verify code' 
    });
  }
}