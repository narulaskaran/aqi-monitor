import { describe, it, expect, vi, beforeEach } from "vitest";

const redisClient = {
  incr: vi.fn(),
  expire: vi.fn(),
  del: vi.fn(),
};

vi.mock("@upstash/redis", () => {
  const Redis = vi.fn(() => redisClient) as any;
  Redis.fromEnv = vi.fn(() => redisClient);
  return { Redis };
});

import {
  MAX_VERIFY_ATTEMPTS,
  consumeVerifyAttempt,
  clearVerifyAttempts,
} from "../_lib/services/verifyAttempts.js";

describe("verifyAttempts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisClient.incr.mockResolvedValue(1);
    redisClient.expire.mockResolvedValue(1);
    redisClient.del.mockResolvedValue(1);
  });

  it("allows the first attempt and sets the expiry window once", async () => {
    redisClient.incr.mockResolvedValue(1);

    const result = await consumeVerifyAttempt("a@b.com");

    expect(result).toEqual({
      allowed: true,
      attemptsUsed: 1,
      maxAttempts: MAX_VERIFY_ATTEMPTS,
    });
    expect(redisClient.incr).toHaveBeenCalledWith(
      "verify-code:attempts:a@b.com",
    );
    expect(redisClient.expire).toHaveBeenCalledTimes(1);
    expect(redisClient.expire).toHaveBeenCalledWith(
      "verify-code:attempts:a@b.com",
      600, // matches the 10-minute OTP validity window
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
    // No second expiry set on subsequent increments
    expect(redisClient.expire).not.toHaveBeenCalled();
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
});
