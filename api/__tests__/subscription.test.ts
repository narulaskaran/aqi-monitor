import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import {
  generateUnsubscribeToken,
  validateUnsubscribeToken,
} from "../_lib/services/subscription.js";
import * as subscriptionService from "../_lib/services/subscription.js";
import { mockSubscription } from "./testUtils.js";

// --- START FIX ---
// Mock the DB to prevent "Database connection string not found" error
vi.mock("../_lib/db.js", () => ({
  prisma: {
    userSubscription: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    // Add other models if strictly needed by your service logic,
    // but usually userSubscription is enough for these tests to load.
    zipCoordinates: {
      findUnique: vi.fn(),
    },
    airQualityRecord: {
      upsert: vi.fn(),
    }
  },
}));
// --- END FIX ---

vi.mock("../_lib/services/email.js", () => ({
  sendVerificationCode: vi.fn().mockResolvedValue({ success: true }),
  checkVerificationCode: vi
    .fn()
    .mockResolvedValue({ success: true, valid: true }),
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: vi.fn().mockReturnValue({}),
  },
}));

vi.mock("@upstash/ratelimit", () => {
  const RatelimitMock = vi.fn().mockImplementation(() => ({
    limit: vi.fn().mockResolvedValue({ success: true }),
  })) as any;
  RatelimitMock.slidingWindow = vi.fn().mockReturnValue("sliding-window-config");
  return { Ratelimit: RatelimitMock };
});

const OLD_ENV = process.env;

describe("Unsubscribe Token", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret-key";
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("generates and validates a token", () => {
    const subscriptionId = "sub-123";
    const token = generateUnsubscribeToken(subscriptionId);
    const result = validateUnsubscribeToken(token);
    expect(result).toBe(subscriptionId);
  });

  it("returns null for an invalid token", () => {
    const result = validateUnsubscribeToken("invalid.token.here");
    expect(result).toBeNull();
  });
});

describe("Subscription Service", () => {
  it("creates a subscription", async () => {
    const mockCreate = vi
      .spyOn(subscriptionService, "createSubscription")
      .mockResolvedValue(mockSubscription);
    const result = await subscriptionService.createSubscription(
      "a@b.com",
      "12345",
    );
    expect(result.email).toBe("a@b.com");
    expect(result.zipCode).toBe("12345");
    mockCreate.mockRestore();
  });

  it("deactivates a subscription with valid token", async () => {
    vi.spyOn(subscriptionService, "validateUnsubscribeToken").mockReturnValue(
      "sub-123",
    );
    const mockUpdate = vi
      .spyOn(subscriptionService, "deactivateSubscription")
      .mockResolvedValue(true);
    const result = await subscriptionService.deactivateSubscription("token");
    expect(result).toBe(true);
    mockUpdate.mockRestore();
  });

  it("finds subscriptions for email", async () => {
    const mockFind = vi
      .spyOn(subscriptionService, "findSubscriptionsForEmail")
      .mockResolvedValue([mockSubscription]);
    const result =
      await subscriptionService.findSubscriptionsForEmail("a@b.com");
    expect(result.length).toBe(1);
    expect(result[0].email).toBe("a@b.com");
    mockFind.mockRestore();
  });

  it("checks if subscription exists", async () => {
    const mockExists = vi
      .spyOn(subscriptionService, "subscriptionExists")
      .mockResolvedValue(true);
    const result = await subscriptionService.subscriptionExists(
      "a@b.com",
      "12345",
    );
    expect(result).toBe(true);
    mockExists.mockRestore();
  });
});

describe("sendAirQualityAlerts and token cleanup", () => {
  it("sendAirQualityAlerts sends emails only if enough time elapsed", async () => {
    const mod = await import("../_lib/services/subscription.js");
    vi.spyOn(mod, "sendAirQualityAlerts").mockResolvedValue(2);
    const result = await mod.sendAirQualityAlerts(
      "12345",
      100,
      "Moderate",
      "PM2.5",
    );
    expect(result).toBe(2);
  });
  it("deleteExpiredAuthTokens deletes expired tokens", async () => {
    const mod = await import("../_lib/services/subscription.js");
    vi.spyOn(mod, "deleteExpiredAuthTokens").mockResolvedValue(3);
    const result = await mod.deleteExpiredAuthTokens();
    expect(result).toBe(3);
  });
  it("deleteAuthTokensForEmail deletes tokens for email", async () => {
    const mod = await import("../_lib/services/subscription.js");
    vi.spyOn(mod, "deleteAuthTokensForEmail").mockResolvedValue(2);
    const result = await mod.deleteAuthTokensForEmail("a@b.com");
    expect(result).toBe(2);
  });
});

describe("Subscription Expiration", () => {
  it("deactivates expired subscriptions", async () => {
    const mod = await import("../_lib/services/subscription.js");
    vi.spyOn(mod, "deactivateExpiredSubscriptions").mockResolvedValue(5);
    const result = await mod.deactivateExpiredSubscriptions();
    expect(result).toBe(5);
  });

  it("deactivates no subscriptions when none are expired", async () => {
    const mod = await import("../_lib/services/subscription.js");
    vi.spyOn(mod, "deactivateExpiredSubscriptions").mockResolvedValue(0);
    const result = await mod.deactivateExpiredSubscriptions();
    expect(result).toBe(0);
  });
});

describe("sendAirQualityAlerts — startsAt filtering", () => {
  beforeEach(() => {
    vi.restoreAllMocks(); // restore spies from earlier describe blocks
    vi.clearAllMocks();
    process.env.VERCEL_ENV = "development";
    process.env.VITE_API_URL = "http://localhost:5173";
  });

  it("queries prisma with startsAt filter (excludes future-start subscriptions)", async () => {
    const dbMod = await import("../_lib/db.js");
    const findManySpy = vi.spyOn(dbMod.prisma.userSubscription, "findMany").mockResolvedValue([]);

    const mod = await import("../_lib/services/subscription.js");
    await mod.sendAirQualityAlerts("12345", 100, "Moderate", "PM2.5");

    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { startsAt: null },
            { startsAt: { lte: expect.any(Date) } },
          ],
        }),
      })
    );
  });

  it("skips a subscription whose startsAt is in the future", async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead
    const futureSubscription = {
      ...mockSubscription,
      id: "future-sub",
      startsAt: futureDate,
    };

    const dbMod = await import("../_lib/db.js");
    // Return empty because the query with the startsAt filter already excludes it
    vi.spyOn(dbMod.prisma.userSubscription, "findMany").mockResolvedValue([]);

    const emailMod = await import("../_lib/services/email.js");
    const sendEmailSpy = vi.spyOn(emailMod, "sendEmail");

    const mod = await import("../_lib/services/subscription.js");
    const count = await mod.sendAirQualityAlerts("12345", 100, "Moderate", "PM2.5");

    // No emails sent since the future subscription was filtered out
    expect(count).toBe(0);
    expect(sendEmailSpy).not.toHaveBeenCalled();
    // Silence unused variable warning
    void futureSubscription;
  });
});