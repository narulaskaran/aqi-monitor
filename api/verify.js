// Serverless API endpoint for phone verification
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
    const { phone, zipCode } = req.body;
    
    if (!phone || !zipCode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number and ZIP code are required' 
      });
    }
    
    console.log('REST API verify request:', { phone, zipCode });
    
    // Always use mock verification in serverless function
    // This is our simplified approach for Vercel deployment
    console.log('Using mock verification for serverless function:', phone);
    
    // Check if this phone/zipCode combo already exists
    try {
      const existingSubscription = await prisma.userSubscription.findFirst({
        where: { 
          phone,
          zipCode
        }
      });
      
      if (existingSubscription) {
        return res.json({
          success: false,
          error: 'This phone number is already subscribed for this ZIP code'
        });
      }
    } catch (dbError) {
      console.error('Database error checking subscription:', dbError);
      // Continue anyway to allow verification
    }
    
    // Send mock verification code
    return res.json({
      success: true,
      status: 'pending'
    });
  } catch (error) {
    console.error('Error in verification API:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to start verification' 
    });
  }
}