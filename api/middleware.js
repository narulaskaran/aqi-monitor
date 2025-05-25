// Shared middleware for API endpoints

/**
 * CORS middleware for API endpoints
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
export function corsMiddleware(req, res, next) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle OPTIONS request (preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
}

/**
 * Validate request method
 * @param {string} allowedMethod - The allowed HTTP method
 * @returns {Function} Middleware function
 */
export function validateMethod(allowedMethod) {
  return (req, res, next) => {
    if (req.method !== allowedMethod) {
      return res.status(405).json({ error: "Method not allowed" });
    }
    next();
  };
}

/**
 * Validate CRON secret for protected endpoints
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
export function validateCronSecret(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const cronSecret = process.env.CRON_SECRET;

  // If in a dev environment, don't enforce secret validation unless provided
  if (cronSecret || process.env.NODE_ENV === "production") {
    if (
      !authHeader.startsWith("Bearer ") ||
      authHeader.split(" ")[1] !== cronSecret
    ) {
      console.warn("Unauthorized cron job attempt detected");
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
  }
  next();
}

/**
 * Validate admin authentication
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
export function validateAdminAuth(req, res, next) {
  const adminSession = req.cookies?.admin_session;
  const cronSecret = process.env.CRON_SECRET;

  if (!adminSession || adminSession !== cronSecret) {
    return res.status(401).json({
      success: false,
      error: "Admin authentication required",
    });
  }

  next();
}

/**
 * Validate authentication token for protected endpoints
 */
import { prisma } from "../server/dist/db.js";
export async function validateAuthToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid auth token" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const record = await prisma.authentication.findFirst({ where: { token } });
    if (!record || new Date(record.expiresAt) < new Date()) {
      return res.status(401).json({ error: "Token expired or invalid" });
    }
    req.user = { email: record.email };
    next();
  } catch (error) {
    console.error("Error in validateAuthToken middleware:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
