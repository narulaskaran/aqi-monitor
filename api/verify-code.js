// Serverless API endpoint for verifying SMS codes
import { checkVerificationCode } from '../server/dist/services/twilio.js';
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
    const { phone, zipCode, code } = req.body;
    
    if (!phone || !zipCode || !code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number, ZIP code, and verification code are required' 
      });
    }
    
    console.log('REST API verify-code request:', { phone, zipCode, code });
    
    // Verify the code
    const result = await checkVerificationCode(phone, code);
    
    // If verification is successful, create subscription
    if (result.success && result.valid) {
      try {
        // Create new subscription
        await prisma.userSubscription.create({
          data: {
            phone,
            zipCode,
            active: true,
            activatedAt: new Date(),
          }
        });
      } catch (dbError) {
        console.error('Error creating subscription after verification:', dbError);
        return res.json({
          ...result,
          error: 'Verification successful but failed to create subscription'
        });
      }
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Error in code verification API:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to verify code' 
    });
  }
}