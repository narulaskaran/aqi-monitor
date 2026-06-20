import { describe, it, expect, vi } from "vitest";

// Mock db to prevent "Cannot find module '.prisma/client/default'" error
vi.mock("../_lib/db.js", () => ({
  prisma: {},
}));

// Mock email service to prevent Resend initialization
vi.mock("../_lib/services/email.js", () => ({
  sendVerificationCode: vi.fn().mockResolvedValue({ success: true }),
  checkVerificationCode: vi.fn().mockResolvedValue({ success: true, valid: true }),
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock Upstash services that are imported in subscription.ts
vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: vi.fn().mockReturnValue({}) },
}));
vi.mock("@upstash/ratelimit", () => {
  const RatelimitMock = vi.fn().mockImplementation(() => ({
    limit: vi.fn().mockResolvedValue({ success: true }),
  })) as any;
  RatelimitMock.slidingWindow = vi.fn().mockReturnValue("sliding-window-config");
  return { Ratelimit: RatelimitMock };
});

import { backoff } from "../_lib/services/subscription.js";

describe("backoff", () => {
  it("returns a number between 0 and maxMs", () => {
    for (let i = 0; i < 100; i++) {
      const delay = backoff(i);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(5000);
    }
  });

  it("respects a custom maxMs cap", () => {
    for (let i = 0; i < 50; i++) {
      const delay = backoff(i, { maxMs: 2000 });
      expect(delay).toBeLessThanOrEqual(2000);
    }
  });

  it("respects a custom baseMs", () => {
    // With baseMs=100, attempt=0: delay = min(100, 5000) * random = at most 100
    for (let i = 0; i < 50; i++) {
      const delay = backoff(0, { baseMs: 100 });
      expect(delay).toBeLessThanOrEqual(100);
    }
  });

  it("grows with attempt index (non-jittered ceiling)", () => {
    // Without jitter, backoff(0) ≤ 500, backoff(1) ≤ 1000, backoff(2) ≤ 2000
    // With jitter, check that the ceiling grows: 2^0 * 500 = 500, 2^1 * 500 = 1000, etc.
    const ceilings = [0, 1, 2, 3].map((i) => {
      // Force Math.random() to 1.0 so we see the ceiling
      const spy = vi.spyOn(Math, "random").mockReturnValue(1.0);
      const d = backoff(i, { maxMs: 5000, baseMs: 500 });
      spy.mockRestore();
      return d;
    });
    expect(ceilings[0]).toBe(500);   // 500 * 2^0
    expect(ceilings[1]).toBe(1000);  // 500 * 2^1
    expect(ceilings[2]).toBe(2000);  // 500 * 2^2
    expect(ceilings[3]).toBe(4000);  // 500 * 2^3
  });

  it("caps at maxMs for high attempt counts", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(1.0);
    // attempt=10 would be baseMs * 2^10 = 500 * 1024 = 512000, but capped at 5000
    const d = backoff(10, { maxMs: 5000, baseMs: 500 });
    spy.mockRestore();
    expect(d).toBe(5000);
  });

  it("applies jitter (value <= deterministic ceiling)", () => {
    // With random() returning a fixed value, the jitter should be multiplicative
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.5);
    const d = backoff(1, { maxMs: 5000, baseMs: 500 });
    spy.mockRestore();
    // baseMs * 2^1 = 1000, * 0.5 jitter = 500
    expect(d).toBe(500);
  });

  it("produces strictly bounded sequence for realistic retry loop", () => {
    // Simulate a retry loop: attempt 0..4 with baseMs=1000, maxMs=10000 (high enough to not cap)
    const delays: number[] = [];
    let call = 0;
    const origRandom = Math.random;
    // Sequence: 1.0, 0.8, 0.6, 0.4, 0.2 — deterministic jitter for assertion
    const values = [1.0, 0.8, 0.6, 0.4, 0.2];
    Math.random = () => values[call++ % values.length];
    try {
      for (let i = 0; i < 5; i++) {
        delays.push(backoff(i, { baseMs: 1000, maxMs: 10000 }));
      }
    } finally {
      Math.random = origRandom;
    }
    // Expected: 1000 * 1.0=1000, 2000*0.8=1600, 4000*0.6=2400, 8000*0.4=3200, 16000→capped at 10000*0.2=2000
    expect(delays[0]).toBe(1000);
    expect(delays[1]).toBe(1600);
    expect(delays[2]).toBe(2400);
    expect(delays[3]).toBe(3200);
    // attempt=4 would be 1000*2^4=16000 → capped at 10000 * 0.2 = 2000
    expect(delays[4]).toBe(2000);
    // All delays are strictly ≤ 10000 (the configured maxMs)
    for (const d of delays) {
      expect(d).toBeLessThanOrEqual(10000);
    }
  });
});
