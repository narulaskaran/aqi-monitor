import {
  corsMiddleware,
  validateMethod,
  validateAuthToken,
} from "./middleware.js";
import { handleUnsubscribe } from "../server/dist/handlers/subscription.js";

export default async function handler(req, res) {
  corsMiddleware(req, res, () => {
    validateMethod("POST")(req, res, async () => {
      await validateAuthToken(req, res, async () => {
        await handleUnsubscribe(req, res);
      });
    });
  });
}
