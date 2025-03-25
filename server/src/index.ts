import { initTRPC } from "@trpc/server";
import express from "express";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";
import { z } from "zod";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { addSubscription, getAllSubscriptions } from "./db.js";
import { PrismaClient } from "@prisma/client";
import { sendVerificationCode, checkVerificationCode, initializeVerificationService } from "./twilio.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize services
async function initializeServices() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    // Initialize Twilio Verification Service
    const verificationServiceSid = await initializeVerificationService();
    console.log("✅ Twilio Verification Service initialized with SID:", verificationServiceSid);
  } catch (err) {
    console.error("❌ Service initialization failed:", err);
    throw err;
  }
}

// Initialize all services
initializeServices().catch((err) => {
  console.error("Failed to initialize services:", err);
  process.exit(1);
});

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
    .mutation(async ({ input }) => {
      console.log("Received verification request:", input);

      try {
        // Ensure verification service is initialized
        await initializeVerificationService();

        if (!input || !input.phone || !input.zipCode) {
          console.error("Invalid input received:", input);
          throw new Error("Invalid input: phone and zipCode are required");
        }

        const result = await sendVerificationCode(input.phone);
        console.log("Verification result:", result);

        if (!result.success) {
          throw new Error(result.error || 'Failed to send verification code');
        }
        return result;
      } catch (error) {
        console.error("Error in startVerification:", error);
        throw error;
      }
    }),

  verifyCode: t.procedure
    .input(z.object({ 
      phone: z.string(),
      zipCode: z.string(),
      code: z.string()
    }))
    .mutation(async ({ input }) => {
      try {
        // Ensure verification service is initialized
        await initializeVerificationService();

        const result = await checkVerificationCode(input.phone, input.code);
        if (!result.success) {
          throw new Error(result.error || 'Failed to verify code');
        }
        
        if (result.valid) {
          // Create subscription if verification successful
          await addSubscription(input.phone, input.zipCode);
        }
        
        return result;
      } catch (error) {
        console.error("Error in verifyCode:", error);
        throw error;
      }
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

// Add error handling middleware
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

// Only start the server if we're explicitly in development mode
if (process.env.NODE_ENV === "development") {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log("tRPC endpoint available at http://localhost:3000/trpc");
  });
}

// Export the app for Vercel
export default app;
