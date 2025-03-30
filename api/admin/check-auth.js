// Serverless API endpoint for checking admin authentication status
import {
  corsMiddleware,
  validateMethod,
  validateAdminAuth,
} from "../middleware.js";

export default async function handler(req, res) {
  // Apply middleware
  corsMiddleware(req, res, () => {
    validateMethod("GET")(req, res, () => {
      validateAdminAuth(req, res, () => {
        return res.json({
          success: true,
          message: "Admin authenticated",
        });
      });
    });
  });
}
