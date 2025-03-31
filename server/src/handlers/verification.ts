import { Request, Response } from 'express';
import { prisma } from '../db.js';
import { sendVerificationCode, checkVerificationCode } from '../services/twilio.js';
import { findSubscriptionsForEmail } from '../services/subscription.js';

export async function handleStartVerification(req: Request, res: Response) {
  try {
    const { email, zipCode } = req.body;
    
    if (!email || !zipCode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and ZIP code are required' 
      });
    }
    
    console.log('REST API verify request:', { email, zipCode });
    
    // Check if subscription already exists
    const subscriptions = await findSubscriptionsForEmail(email);
    const existingSubscription = subscriptions.find(sub => sub.zipCode === zipCode);

    if (existingSubscription && existingSubscription.active) {
      return res.json({
        success: false,
        error: 'This email is already subscribed for this ZIP code'
      });
    }

    // Send verification code
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

export async function handleVerifyCode(req: Request, res: Response) {
  try {
    const { email, zipCode, code } = req.body;
    
    if (!email || !zipCode || !code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, ZIP code, and verification code are required' 
      });
    }
    
    console.log('REST API verify-code request:', { email, zipCode, code });
    
    // Verify the code
    const result = await checkVerificationCode(email, code);
    
    // If verification is successful, create subscription
    if (result.success && result.valid) {
      try {
        // Create new subscription
        await prisma.userSubscription.create({
          data: {
            email,
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