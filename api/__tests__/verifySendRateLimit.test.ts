import { describe, it, expect, vi, beforeEach } from "vitest";

const limitMock = vi.fn();

vi.mock("@upstash/redis", () => {
  const Redis = vi.fn() as any;
  Redis.fromEnv = vi.fn(() => ({}));
  return { Redis };
});

vi.mock("@upstash/ratelimit", () => {
  // Must be a real constructable function: the service does `new Ratelimit(...)`.
  const Ratelimit: any = function (this: any) {
    this.limit = limitMock;
  };
  Ratelimit.slidingWindow = vi.fn((limit: number, window: string) => ({
    limit,
    window,
  }));
  return { Ratelimit };
});

import { checkVerifySendRateLimit } from "../_lib/services/verifySendRateLimit.js";

describe("checkVerifySendRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    limitMock.mockResolvedValue({ success: true });
  });

  it("allows the request when both the email and IP limits pass", async () => {
    const result = await checkVerifySendRateLimit("a@b.com", "1.2.3.4");
    expect(result).toEqual({ allowed: true });
    expect(limitMock).toHaveBeenCalledWith("a@b.com");
    expect(limitMock).toHaveBeenCalledWith("1.2.3.4");
  });

  it("normalizes the email before checking its limiter", async () => {
    await checkVerifySendRateLimit("  User@Example.COM ", "1.2.3.4");
    expect(limitMock).toHaveBeenCalledWith("user@example.com");
  });

  it("blocks and reports 'email' when the per-email limit is exceeded", async () => {
    limitMock.mockImplementation(async (key: string) => ({
      success: key !== "a@b.com",
    }));

    const result = await checkVerifySendRateLimit("a@b.com", "1.2.3.4");
    expect(result).toEqual({ allowed: false, limitedBy: "email" });
  });

  it("blocks and reports 'ip' when only the per-IP limit is exceeded", async () => {
    limitMock.mockImplementation(async (key: string) => ({
      success: key !== "1.2.3.4",
    }));

    const result = await checkVerifySendRateLimit("a@b.com", "1.2.3.4");
    expect(result).toEqual({ allowed: false, limitedBy: "ip" });
  });

  it("checks both limiters even though only one result is reported", async () => {
    await checkVerifySendRateLimit("a@b.com", "1.2.3.4");
    expect(limitMock).toHaveBeenCalledTimes(2);
  });
});
