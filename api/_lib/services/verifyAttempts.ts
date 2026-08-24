import { Redis } from "@upstash/redis";

/**
 * Per-email verification-attempt limiting.
 *
 * The 6-digit OTP is valid for 10 minutes; without a counter an attacker
 * could brute-force it within that window (10^6 combinations). We cap the
 * number of code submissions per email per validity window using Upstash
 * Redis, which this deployment already requires for email rate limiting.
 */

export const MAX_VERIFY_ATTEMPTS = 5;

// Matches the 10-minute OTP validity window set in sendVerificationCode.
export const ATTEMPT_WINDOW_SECONDS = 600;

let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    redisClient = Redis.fromEnv();
  }
  return redisClient;
}

function attemptsKey(email: string): string {
  return `verify-code:attempts:${email.trim().toLowerCase()}`;
}

export interface AttemptCheck {
  allowed: boolean;
  attemptsUsed: number;
  maxAttempts: number;
}

/**
 * Records one verification attempt for the given email and reports whether
 * the caller may still submit a code. The counter expires with the OTP's
 * 10-minute validity window. Errors propagate (fail closed) — the endpoint's
 * error handler turns them into a 500 rather than allowing unlimited guesses.
 */
export async function consumeVerifyAttempt(
  email: string,
): Promise<AttemptCheck> {
  const redis = getRedis();
  const key = attemptsKey(email);
  // Create the counter WITH its TTL atomically (SET NX EX) so an interrupted
  // sequence can never leave a permanent, non-expiring lockout key.
  await redis.set(key, 0, { ex: ATTEMPT_WINDOW_SECONDS, nx: true });
  const attemptsUsed = await redis.incr(key);
  return {
    allowed: attemptsUsed <= MAX_VERIFY_ATTEMPTS,
    attemptsUsed,
    maxAttempts: MAX_VERIFY_ATTEMPTS,
  };
}

/**
 * Clears the attempt counter after a successful verification so a legitimate
 * user who verifies one code is not penalized when requesting the next one.
 */
export async function clearVerifyAttempts(email: string): Promise<void> {
  const redis = getRedis();
  await redis.del(attemptsKey(email));
}
