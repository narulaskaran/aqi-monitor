import { describe, it, expect, vi, beforeEach } from "vitest";

const redisClient = {
  set: vi.fn(),
  incr: vi.fn(),
  del: vi.fn(),
};

vi.mock("@upstash/redis", () => {
  const Redis = vi.fn(() => redisClient) as any;
  Redis.fromEnv = vi.fn(() => redisClient);
  return { Redis };
});

import {
  MAX_VERIFY_ATTEMPTS,
  ATTEMPT_WINDOW_SECONDS,
  consumeVerifyAttempt,
  clearVerifyAttempts,
} from "../_lib/services/verifyAttempts.js";

describe("verifyAttempts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisClient.set.mockResolvedValue("OK");
    redisClient.incr.mockResolvedValue(1);
    redisClient.del.mockResolvedValue(1);
  });

  it("allows the first attempt and creates the counter with an atomic TTL", async () => {
    redisClient.incr.mockResolvedValue(1);

    const result = await consumeVerifyAttempt("a@b.com");

    expect(result).toEqual({
      allowed: true,
      attemptsUsed: 1,
      maxAttempts: MAX_VERIFY_ATTEMPTS,
    });
    // TTL must be set atomically with creation (SET NX EX) so an interrupted
    // sequence can never leave a permanent, non-expiring lockout key.
    expect(redisClient.set).toHaveBeenCalledWith(
      "verify-code:attempts:a@b.com",
      0,
      { ex: ATTEMPT_WINDOW_SECONDS, nx: true },
    );
    expect(ATTEMPT_WINDOW_SECONDS).toBe(600); // matches the 10-min OTP window
    expect(redisClient.incr).toHaveBeenCalledWith(
      "verify-code:attempts:a@b.com",
    );
  });

  it("allows up to MAX_VERIFY_ATTEMPTS then blocks further tries", async () => {
    redisClient.incr.mockResolvedValue(MAX_VERIFY_ATTEMPTS);
    const last = await consumeVerifyAttempt("a@b.com");
    expect(last.allowed).toBe(true);

    redisClient.incr.mockResolvedValue(MAX_VERIFY_ATTEMPTS + 1);
    const blocked = await consumeVerifyAttempt("a@b.com");
    expect(blocked.allowed).toBe(false);
    expect(blocked.attemptsUsed).toBe(MAX_VERIFY_ATTEMPTS + 1);
  });

  it("normalizes the email into a single counter key", async () => {
    await consumeVerifyAttempt("  User+AQI@Example.COM ");
    expect(redisClient.incr).toHaveBeenCalledWith(
      "verify-code:attempts:user+aqi@example.com",
    );
  });

  it("clears the counter on success", async () => {
    await clearVerifyAttempts("a@b.com");
    expect(redisClient.del).toHaveBeenCalledWith(
      "verify-code:attempts:a@b.com",
    );
  });

  it("propagates Redis failures (fail closed)", async () => {
    redisClient.set.mockRejectedValue(new Error("Redis connection refused"));
    await expect(consumeVerifyAttempt("a@b.com")).rejects.toThrow(
      "Redis connection refused",
    );
    expect(redisClient.incr).not.toHaveBeenCalled();
  });
});
