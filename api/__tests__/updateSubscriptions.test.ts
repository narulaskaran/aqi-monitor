import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

/**
 * Cron batch updates must not abort when one leftover invalid ZIP fails.
 */

const OLD_ENV = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...OLD_ENV, GOOGLE_AIR_QUALITY_API_KEY: "test-key" };
});

afterAll(() => {
  process.env = OLD_ENV;
});

async function loadService(findManyImpl: () => Promise<{ zipCode: string }[]>) {
  const upsert = vi.fn().mockResolvedValue({});
  vi.doMock("../_lib/db.js", () => ({
    prisma: {
      airQualityRecord: { findFirst: vi.fn(), upsert },
      zipCoordinates: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        update: vi.fn(),
      },
      userSubscription: {
        findMany: vi.fn().mockImplementation(findManyImpl),
        update: vi.fn(),
      },
    },
  }));
  vi.doMock("../_lib/services/email.js", () => ({
    sendVerificationCode: vi.fn(),
    checkVerificationCode: vi.fn(),
    sendEmail: vi.fn(),
    sendAirQualityAlerts: vi.fn(),
  }));
  vi.doMock("../_lib/services/subscription.js", () => ({
    sendAirQualityAlerts: vi.fn().mockResolvedValue(0),
    deactivateExpiredSubscriptions: vi.fn().mockResolvedValue(0),
  }));
  const service = await import("../_lib/services/airQuality.js");
  return { service, upsert };
}

function mockGoogleAqiFetch() {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      indexes: [
        {
          code: "usa_epa",
          aqi: 42,
          category: "Good",
          dominantPollutant: "PM2.5",
        },
      ],
      pollutants: [],
    }),
    text: async () => "",
  });
}

describe("updateAirQualityForAllSubscriptions", () => {
  it("continues updating healthy ZIPs when one invalid ZIP fails", async () => {
    const fetchSpy = mockGoogleAqiFetch();
    vi.stubGlobal("fetch", fetchSpy);
    const { service, upsert } = await loadService(async () => [
      { zipCode: "12345" },
      { zipCode: "00000" },
      { zipCode: "94102" },
    ]);

    const errors: unknown[] = [];
    const oldError = console.error;
    console.error = vi.fn((...args: unknown[]) => {
      errors.push(args);
    });

    await expect(
      service.updateAirQualityForAllSubscriptions(),
    ).resolves.toBeUndefined();

    console.error = oldError;

    expect(upsert).toHaveBeenCalledTimes(2);
    const upsertedZips = upsert.mock.calls.map(
      (call) => call[0].create.zipCode,
    );
    expect(upsertedZips).toEqual(expect.arrayContaining(["12345", "94102"]));
    expect(upsertedZips).not.toContain("00000");

    const batchLog = errors.find(
      (args) =>
        typeof (args as unknown[])[0] === "string" &&
        String((args as unknown[])[0]).includes(
          "Failed to update air quality for ZIP code 00000",
        ),
    );
    expect(batchLog).toBeDefined();
  });

  it("resolves when every ZIP in the batch fails", async () => {
    vi.stubGlobal("fetch", mockGoogleAqiFetch());
    const { service, upsert } = await loadService(async () => [
      { zipCode: "00000" },
      { zipCode: "99999" },
    ]);

    const oldError = console.error;
    console.error = vi.fn();

    await expect(
      service.updateAirQualityForAllSubscriptions(),
    ).resolves.toBeUndefined();

    console.error = oldError;
    expect(upsert).not.toHaveBeenCalled();
  });
});
