import { Request, Response, NextFunction } from "express";
import { prisma } from "../db.js";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
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
    // Attach user info to request
    (req as any).user = { email: record.email };
    next();
  } catch (error) {
    console.error("Error in auth middleware:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
