import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from "./_lib/middleware/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await authenticate(req);
    return res.json({ valid: true, email: user.email });
  } catch (error) {
    return res.status(401).json({ valid: false, error: (error as Error).message });
  }
}
