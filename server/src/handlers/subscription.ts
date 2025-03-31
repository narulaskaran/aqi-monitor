import { Request, Response } from 'express';
import { deactivateSubscription } from '../services/subscription.js';

export async function handleUnsubscribe(req: Request, res: Response) {
  try {
    console.log('Received unsubscribe request:', {
      method: req.method,
      path: req.path,
      body: req.body
    });

    const { token } = req.body;
    
    if (!token || typeof token !== 'string') {
      console.log('Invalid token received:', { token });
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid unsubscribe token' 
      });
    }
    
    console.log('Attempting to deactivate subscription with token');
    const success = await deactivateSubscription(token);
    
    if (!success) {
      console.log('Failed to deactivate subscription - invalid or expired token');
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or expired unsubscribe token' 
      });
    }
    
    console.log('Successfully unsubscribed user');
    return res.json({ 
      success: true, 
      message: 'Successfully unsubscribed from air quality alerts' 
    });
  } catch (error) {
    console.error('Error in unsubscribe handler:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    } else {
      console.error('Unknown error type:', error);
    }
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to unsubscribe' 
    });
  }
} 