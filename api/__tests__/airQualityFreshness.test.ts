import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

/**
 * Tests for the freshness window in getLatestAirQualityForZip.
 * We mock prisma + subscription/email so the real service function is exercised.
 */

const OLD_ENV = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...OLD_ENV, GOOGLE_AIR_QUALITY_API_KEY: "test-key" };
});

afterAll(() => {
  process.env = OLD_ENV;
});

function makeRecord(overrides: Partial<{ aqi: number; category: string; dominantPollutant: string; timestamp: Date; pollutantData: Record<string, { concentration: number; unit: string }> }> = {}) {
  return {
    id: "test-id",
    zipCode: "12345",
    aqi: 42,
    category: "Good",
    dominantPollutant: "PM2.5",
    timestamp: new Date(),
    pollutantData: null,
    ...overrides,
  };
}

describe("getLatestAirQualityForZip freshness window", () => {
  it("returns record when it is less than 15 minutes old", async () => {
    vi.doMock("../_lib/db.js", () => ({
      prisma: {
        airQualityRecord: {
          findFirst: vi.fn().mockResolvedValue(makeRecord({
            timestamp: new Date(), // now
          })),
        },
        zipCoordinates: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
        userSubscription: { findMany: vi.fn(), update: vi.fn() },
      },
    }));
    vi.doMock("../_lib/services/email.js", () => ({
      sendVerificationCode: vi.fn(),
      checkVerificationCode: vi.fn(),
      sendEmail: vi.fn(),
      sendAirQualityAlerts: vi.fn(),
    }));
    vi.doMock("../_lib/services/subscription.js", () => ({
      sendAirQualityAlerts: vi.fn(),
      deactivateExpiredSubscriptions: vi.fn(),
    }));

    const { getLatestAirQualityForZip } = await import("../_lib/services/airQuality.js");
    const result = await getLatestAirQualityForZip("12345");

    expect(result).not.toBeNull();
    expect(result!.index).toBe(42);
    expect(result!.category).toBe("Good");
    expect(result!.recordedAt).toBeDefined();
  });

  it("returns null when the latest record is older than 15 minutes (prisma finds nothing in window)", async () => {
    vi.doMock("../_lib/db.js", () => ({
      prisma: {
        airQualityRecord: {
          findFirst: vi.fn().mockResolvedValue(null), // no record within window
        },
        zipCoordinates: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
        userSubscription: { findMany: vi.fn(), update: vi.fn() },
      },
    }));
    vi.doMock("../_lib/services/email.js", () => ({
      sendVerificationCode: vi.fn(),
      checkVerificationCode: vi.fn(),
      sendEmail: vi.fn(),
      sendAirQualityAlerts: vi.fn(),
    }));
    vi.doMock("../_lib/services/subscription.js", () => ({
      sendAirQualityAlerts: vi.fn(),
      deactivateExpiredSubscriptions: vi.fn(),
    }));

    const { getLatestAirQualityForZip } = await import("../_lib/services/airQuality.js");
    const result = await getLatestAirQualityForZip("12345");
    expect(result).toBeNull();
  });

  it("returns null when no record exists at all", async () => {
    vi.doMock("../_lib/db.js", () => ({
      prisma: {
        airQualityRecord: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        zipCoordinates: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
        userSubscription: { findMany: vi.fn(), update: vi.fn() },
      },
    }));
    vi.doMock("../_lib/services/email.js", () => ({
      sendVerificationCode: vi.fn(),
      checkVerificationCode: vi.fn(),
      sendEmail: vi.fn(),
      sendAirQualityAlerts: vi.fn(),
    }));
    vi.doMock("../_lib/services/subscription.js", () => ({
      sendAirQualityAlerts: vi.fn(),
      deactivateExpiredSubscriptions: vi.fn(),
    }));

    const { getLatestAirQualityForZip } = await import("../_lib/services/airQuality.js");
    const result = await getLatestAirQualityForZip("12345");
    expect(result).toBeNull();
  });

  it("queries with gte filter for records within the last 15 minutes", async () => {
    const findFirstMock = vi.fn().mockResolvedValue(makeRecord());
    vi.doMock("../_lib/db.js", () => ({
      prisma: {
        airQualityRecord: {
          findFirst: findFirstMock,
        },
        zipCoordinates: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
        userSubscription: { findMany: vi.fn(), update: vi.fn() },
      },
    }));
    vi.doMock("../_lib/services/email.js", () => ({
      sendVerificationCode: vi.fn(),
      checkVerificationCode: vi.fn(),
      sendEmail: vi.fn(),
      sendAirQualityAlerts: vi.fn(),
    }));
    vi.doMock("../_lib/services/subscription.js", () => ({
      sendAirQualityAlerts: vi.fn(),
      deactivateExpiredSubscriptions: vi.fn(),
    }));

    const { getLatestAirQualityForZip } = await import("../_lib/services/airQuality.js");
    await getLatestAirQualityForZip("12345");

    const callArgs = findFirstMock.mock.calls[0][0];
    expect(callArgs.where.zipCode).toBe("12345");
    expect(callArgs.where.timestamp).toBeDefined();
    expect(callArgs.where.timestamp.gte).toBeInstanceOf(Date);

    // The gte filter should be roughly 15 minutes ago
    const now = Date.now();
    const gteTime = callArgs.where.timestamp.gte.getTime();
    const diffMs = now - gteTime;
    // Allow some tolerance for test execution time
    expect(diffMs).toBeGreaterThan(15 * 60 * 1000 - 5000); // within 5 seconds of 15 minutes
    expect(diffMs).toBeLessThan(15 * 60 * 1000 + 5000);
  });
});
