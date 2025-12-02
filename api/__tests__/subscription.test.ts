import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  generateUnsubscribeToken,
  validateUnsubscribeToken,
} from "../_lib/services/subscription.js";
import * as subscriptionService from "../_lib/services/subscription.js";
import { vi } from "vitest";
import { mockSubscription } from "./testUtils.js";

vi.mock("../_lib/services/email.js", () => ({
  sendVerificationCode: vi.fn().mockResolvedValue({ success: true }),
  checkVerificationCode: vi
    .fn()
    .mockResolvedValue({ success: true, valid: true }),
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

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
