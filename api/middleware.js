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
