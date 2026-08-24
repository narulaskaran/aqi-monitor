import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limits for the verification-code send endpoint (`/api/verify`).
 *
 * Without a limit here, anyone can trigger unlimited Resend sends to an
 * arbitrary address (email-bombing / cost abuse) or spray codes across many
 * addresses from one source. Limit per email (tight) and per IP (looser,
 * since NAT/shared IPs are common) using the same Upstash Redis instance
 * already required for OTP attempt limiting and outbound email throttling.
 */

const EMAIL_LIMIT = 3;
const EMAIL_WINDOW = "1 h";
const IP_LIMIT = 10;
const IP_WINDOW = "1 h";

let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    redisClient = Redis.fromEnv();
  }
  return redisClient;
}

let emailLimiter: Ratelimit | null = null;
let ipLimiter: Ratelimit | null = null;

function getEmailLimiter(): Ratelimit {
  if (!emailLimiter) {
    emailLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(EMAIL_LIMIT, EMAIL_WINDOW),
      analytics: true,
      prefix: "verify-send:email",
    });
  }
  return emailLimiter;
}

function getIpLimiter(): Ratelimit {
  if (!ipLimiter) {
    ipLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(IP_LIMIT, IP_WINDOW),
      analytics: true,
      prefix: "verify-send:ip",
    });
  }
  return ipLimiter;
}

export interface SendRateLimitResult {
  allowed: boolean;
  limitedBy?: "email" | "ip";
}

/**
 * Checks both the per-email and per-IP send limits. Both checks always run
 * (never short-circuited) so each counter accurately reflects usage
 * regardless of which limit trips first.
 */
export async function checkVerifySendRateLimit(
  email: string,
  ip: string,
): Promise<SendRateLimitResult> {
  const [emailResult, ipResult] = await Promise.all([
    getEmailLimiter().limit(email.trim().toLowerCase()),
    getIpLimiter().limit(ip),
  ]);

  if (!emailResult.success) {
    return { allowed: false, limitedBy: "email" };
  }
  if (!ipResult.success) {
    return { allowed: false, limitedBy: "ip" };
  }
  return { allowed: true };
}
