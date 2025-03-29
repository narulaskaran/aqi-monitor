/**
 * Development entry point - simplified for debugging
 */
import { initTRPC } from "@trpc/server";
import express from "express";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";
import { z } from "zod";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { PrismaClient } from "@prisma/client";

// For development, define mocked functions instead of importing
// This prevents module resolution issues
const addSubscription = async (phone: string, zipCode: string) => {
  console.log("Mock addSubscription called with:", { phone, zipCode });
  return { id: "mock-id", phone, zipCode, createdAt: new Date() };
};

const getAllSubscriptions = async () => {
  console.log("Mock getAllSubscriptions called");
  return [];
};

const sendVerificationCode = async (phone: string) => {
  console.log("Mock sendVerificationCode called with:", phone);
  return { success: true, status: "pending" };
};

const checkVerificationCode = async (phone: string, code: string) => {
  console.log("Mock checkVerificationCode called with:", { phone, code });
  return { success: true, valid: true, status: "approved" };
};

const initializeVerificationService = async (name?: string) => {
  console.log("Mock initializeVerificationService called");
  return "mock-service-sid";
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

// Initialize Prisma client
const prisma = new PrismaClient();

console.log("Starting development server with mocked services...");

// Simple tRPC instance for development
const t = initTRPC.create();

const appRouter = t.router({
  fetchAirQuality: t.procedure
    .input(
      z.object({
        latitude: z.number(),
        longitude: z.number(),
      })
    )
    .query(async ({ input }) => {
      try {
        if (!process.env.GOOGLE_AIR_QUALITY_API_KEY) {
          throw new Error("GOOGLE_AIR_QUALITY_API_KEY is not set");
        }

        console.log("Making request to Google API with:", {
          latitude: input.latitude,
          longitude: input.longitude,
          apiKey: process.env.GOOGLE_AIR_QUALITY_API_KEY
            ? "Present"
            : "Missing",
        });

        const response = await fetch(
          `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${process.env.GOOGLE_AIR_QUALITY_API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              location: {
                latitude: input.latitude,
                longitude: input.longitude,
              },
              universalAqi: true,
              extraComputations: ["LOCAL_AQI"],
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Google API error response:", errorText);
          throw new Error(
            `Failed to fetch air quality data: ${response.status} ${errorText}`
          );
        }

        const data = await response.json();
        console.log(
          "Successfully fetched air quality data:",
          JSON.stringify(data, null, 2)
        );

        // Log available indexes
        if (data.indexes) {
          console.log(
            "Available indexes:",
            data.indexes.map((index: any) => index.code)
          );
        } else {
          console.log("No indexes found in response");
        }

        // Extract relevant data from the response
        // The API returns an array of indexes, we want the USA EPA AQI
        const epaIndex = data.indexes?.find(
          (index: any) => index.code === "usa_epa"
        );

        if (!epaIndex) {
          throw new Error("US EPA AQI data not available for this location");
        }

        return {
          index: epaIndex.aqi,
          category: epaIndex.category,
          dominantPollutant: epaIndex.dominantPollutant || "Unknown",
        };
      } catch (error) {
        console.error("Detailed error:", error);
        throw new Error(
          error instanceof Error
            ? error.message
            : "Failed to fetch air quality data"
        );
      }
    }),
  subscribe: t.procedure
    .input(z.object({ phone: z.string(), zipCode: z.string() }))
    .mutation(async ({ input }) => {
      return await addSubscription(input.phone, input.zipCode);
    }),

  getSubscriptions: t.procedure.query(async () => {
    return await getAllSubscriptions();
  }),

  startVerification: t.procedure
    .input(
      z.object({
        phone: z.string().min(1, "Phone number is required"),
        zipCode: z.string().min(1, "ZIP code is required")
      })
    )
    .mutation(async (opts) => {
      console.log("⚠️ Raw opts object:", JSON.stringify(opts, null, 2));
      console.log("⚠️ Input type:", typeof opts.input);
      
      // Try to extract input from opts
      let phone, zipCode;
      try {
        // Handle two possible input locations
        if (opts.input) {
          console.log("📞 Using opts.input:", opts.input);
          phone = opts.input.phone;
          zipCode = opts.input.zipCode;
        } else if (opts.rawInput) {
          console.log("📞 Using opts.rawInput:", opts.rawInput);
          phone = opts.rawInput.phone;
          zipCode = opts.rawInput.zipCode;
        } else {
          console.log("📞 Direct opts values:", opts);
          phone = opts.phone;
          zipCode = opts.zipCode;
        }
        
        // Check input values
        console.log("Phone:", phone, "ZipCode:", zipCode);
        
        // Fallback to dummy values if needed
        if (!phone) phone = "+12345678900";
        if (!zipCode) zipCode = "12345";
        
        // Simplified implementation for testing
        await sendVerificationCode(phone);
        
        return { 
          success: true, 
          status: "pending"
        };
      } catch (err) {
        console.error("Error in startVerification:", err);
        // Return success anyway for testing
        return { 
          success: true, 
          status: "pending" 
        };
      }
    }),

  verifyCode: t.procedure
    .input(z.object({ 
      phone: z.string(),
      zipCode: z.string(),
      code: z.string()
    }))
    .mutation(async ({ input }) => {
      console.log("📞 Verifying code:", input);
      
      // Call mocked verification service
      const result = await checkVerificationCode(input.phone, input.code);
      
      // Create subscription on success
      if (result.valid) {
        await addSubscription(input.phone, input.zipCode);
      }
      
      return result;
    }),
});

export type AppRouter = typeof appRouter;

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://aqi-monitor.vercel.app", // Default Vercel domain
      /\.vercel\.app$/, // Allow all vercel.app subdomains
      "https://narula.xyz", // Personal domain
    ],
    credentials: true,
  })
);

app.use(express.json());

// Enhanced logging middleware for debugging
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  
  if (req.path.includes('/trpc/startVerification')) {
    console.log('startVerification request received:');
    console.log('Headers:', req.headers);
    
    // Log raw request body if available
    if (req.body) {
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      // Specifically check for expected structure
      if (req.body.json?.input) {
        console.log('Input data:', req.body.json.input);
        console.log('Phone type:', typeof req.body.json.input.phone);
        console.log('ZipCode type:', typeof req.body.json.input.zipCode);
      } else {
        console.warn('Missing json.input in request body!');
      }
    } else {
      console.warn('No request body found!');
    }
  }
  
  next();
});

// Basic error handling
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
);

// tRPC middleware
app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: () => ({}),
  })
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Direct API endpoint for verification (bypassing tRPC)
app.post("/api/verify", (req, res) => {
  console.log("Direct API verification request received:", req.body);
  
  const { phone, zipCode } = req.body;
  
  if (!phone || !zipCode) {
    console.warn("Missing required fields in /api/verify request");
    console.log("Body:", req.body);
    
    // Return helpful error
    return res.status(400).json({
      success: false,
      error: "Missing required fields",
      receivedBody: req.body
    });
  }
  
  // Return success for testing
  res.json({
    success: true,
    status: "pending",
    message: "Verification code sent"
  });
});

// Start the server in development mode
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log("tRPC endpoint available at http://localhost:3000/trpc");
});