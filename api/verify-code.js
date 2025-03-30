// Serverless API endpoint for verifying email codes
import { corsMiddleware, validateMethod } from "./middleware.js";
import { handleVerifyCode } from "../server/dist/handlers/verification.js";

export default async function handler(req, res) {
  // Apply middleware
  corsMiddleware(req, res, () => {
    validateMethod("POST")(req, res, async () => {
      await handleVerifyCode(req, res);
    });
  });
}
