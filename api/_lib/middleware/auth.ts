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
