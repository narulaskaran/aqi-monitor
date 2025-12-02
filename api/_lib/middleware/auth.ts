import type { VercelRequest } from '@vercel/node';
import { prisma } from "../db.js";

export async function authenticate(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid auth token");
  }
  const token = authHeader.split(" ")[1];
  
  const record = await prisma.authentication.findFirst({ where: { token } });
  if (!record || new Date(record.expiresAt) < new Date()) {
    throw new Error("Token expired or invalid");
  }
  
  return { email: record.email };
}

export async function authenticateAdmin(req: VercelRequest) {
  // For now, we'll reuse the same logic but potentially check against an admin list
  // or a specific admin token in the future.
  // The original middleware just checked for a valid token.
  return authenticate(req);
}
