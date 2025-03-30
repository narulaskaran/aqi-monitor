// Serverless API endpoint for email verification
import { corsMiddleware, validateMethod } from "./middleware.js";
import { handleStartVerification } from "../server/dist/handlers/verification.js";

export default async function handler(req, res) {
  // Apply middleware
  corsMiddleware(req, res, () => {
    validateMethod("POST")(req, res, async () => {
      await handleStartVerification(req, res);
    });
  });
}
