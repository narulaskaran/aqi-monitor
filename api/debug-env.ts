import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    HAS_DATABASE_URL: !!process.env.DATABASE_URL,
    HAS_POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
    HAS_POSTGRES_URL: !!process.env.POSTGRES_URL,
    HAS_GOOGLE_API_KEY: !!process.env.GOOGLE_AIR_QUALITY_API_KEY,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_REGION: process.env.VERCEL_REGION,
  };

  res.status(200).json(envVars);
}
