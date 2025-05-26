import {
  corsMiddleware,
  validateMethod,
  validateAuthToken,
} from "./middleware.js";

export default async function handler(req, res) {
  corsMiddleware(req, res, () => {
    validateMethod("POST")(req, res, async () => {
      // Use validateAuthToken, and if valid, return { valid: true, email }
      await validateAuthToken(req, res, () => {
        return res.json({ valid: true, email: req.user.email });
      });
    });
  });
}
