// Serverless API endpoint for admin authentication
import { corsMiddleware, validateMethod } from "./middleware.js";

export default async function handler(req, res) {
  // Apply middleware
  corsMiddleware(req, res, () => {
    validateMethod("POST")(req, res, async () => {
      try {
        const { password } = req.body;

        if (!password) {
          return res.status(400).json({
            success: false,
            error: "Password is required",
          });
        }

        // Validate against CRON_SECRET
        if (password !== process.env.CRON_SECRET) {
          return res.status(401).json({
            success: false,
            error: "Invalid credentials",
          });
        }

        // Set a secure HTTP-only cookie with a session token
        // In a real app, you'd want to use a proper session management system
        res.setHeader(
          "Set-Cookie",
          `admin_session=${process.env.CRON_SECRET}; HttpOnly; Secure; SameSite=Strict`
        );

        return res.json({
          success: true,
          message: "Authentication successful",
        });
      } catch (error) {
        console.error("Error in admin authentication:", error);
        return res.status(500).json({
          success: false,
          error: "Internal server error",
        });
      }
    });
  });
}
