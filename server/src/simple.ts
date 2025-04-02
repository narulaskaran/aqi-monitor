/**
 * Minimal development server for debugging with Resend email test
 */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Resend } from "resend";
import { getMockAirQualityData } from "./services/airQuality.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Test email endpoint
app.get("/api/test-email", async (req, res) => {
  try {
    const testEmail = req.query.email;
    
    if (!testEmail) {
      return res.status(400).json({ error: "Email parameter is required" });
    }
    
    console.log(`Sending test email to ${testEmail}...`);
    
    const { data, error } = await resend.emails.send({
      from: "AQI Monitor <notifications@narula.xyz>",
      to: [testEmail as string],
      subject: "Test Email from AQI Monitor",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a5568;">Test Email from AQI Monitor</h2>
          <p>This is a test email to verify that Resend is working correctly.</p>
          <p>If you're seeing this, the email system is working!</p>
          <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; font-size: 24px; text-align: center; letter-spacing: 2px; font-weight: bold; margin: 20px 0;">
            123456
          </div>
          <p style="color: #718096; font-size: 14px; margin-top: 20px;">
            Sent from AQI Monitor using Resend
          </p>
        </div>
      `
    });
    
    if (error) {
      console.error("Error sending email:", error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log("Email sent successfully!");
    console.log("Email ID:", data?.id);
    
    return res.json({
      success: true,
      message: "Test email sent successfully",
      id: data?.id
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ 
      error: err instanceof Error ? err.message : "An unknown error occurred" 
    });
  }
});

// Direct API endpoint for verification
app.post("/api/verify", (req, res) => {
  console.log("Verification request received:", req.body);
  
  const { email, zipCode } = req.body;
  
  if (!email || !zipCode) {
    return res.status(400).json({ 
      success: false, 
      error: "Email and ZIP code are required" 
    });
  }
  
  // Return success for testing
  res.json({
    success: true,
    status: "pending",
    message: "Verification code sent"
  });
});

// Air quality API endpoint
app.get("/api/air-quality", (req, res) => {
  console.log("Air quality request received:", req.query);
  
  const latitude = req.query.latitude;
  const longitude = req.query.longitude;
  
  if (!latitude || !longitude) {
    return res.status(400).json({ 
      error: "Latitude and longitude are required" 
    });
  }
  
  // Use the mock data function from the service instead of duplicating the data
  res.json(getMockAirQualityData());
});

// Start the server
app.listen(port, () => {
  console.log(`Simple development server running at http://localhost:${port}`);
  console.log(`Test email endpoint: http://localhost:${port}/api/test-email?email=your@email.com`);
});