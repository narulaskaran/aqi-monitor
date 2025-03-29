/**
 * Minimal development server for debugging
 */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

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

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Direct API endpoint for verification
app.post("/api/verify", (req, res) => {
  console.log("Verification request received:", req.body);
  
  const { phone, zipCode } = req.body;
  
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
  
  // Return mock data for testing
  res.json({
    index: 42,
    category: "Good",
    dominantPollutant: "PM2.5",
    pollutants: {
      "PM2.5": {
        concentration: 10.2,
        unit: "µg/m³"
      },
      "PM10": {
        concentration: 15.7,
        unit: "µg/m³"
      },
      "O3": {
        concentration: 30.5,
        unit: "ppb"
      }
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Simple development server running at http://localhost:${port}`);
});