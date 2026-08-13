import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

/**
 * Tests for ZIP → coordinate resolution.
 * Invalid ZIPs must fail locally so Nominatim free-text matches cannot
 * produce live-looking AQI for 00000 / 99999.
 */

const OLD_ENV = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...OLD_ENV, GOOGLE_AIR_QUALITY_API_KEY: "test-key" };
});

afterAll(() => {
  process.env = OLD_ENV;
});

async function loadService() {
  vi.doMock("../_lib/db.js", () => ({
    prisma: {
      airQualityRecord: { findFirst: vi.fn(), upsert: vi.fn() },
      zipCoordinates: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        update: vi.fn(),
      },
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
  return import("../_lib/services/airQuality.js");
}

describe("getCoordinatesForZipCode", () => {
  it("throws for non-existent ZIPs 00000 and 99999 without calling Nominatim", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { getCoordinatesForZipCode } = await loadService();

    await expect(getCoordinatesForZipCode("00000")).rejects.toThrow(
      "No locations found for this ZIP code",
    );
    await expect(getCoordinatesForZipCode("99999")).rejects.toThrow(
      "No locations found for this ZIP code",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("throws for non-5-digit junk without calling Nominatim", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { getCoordinatesForZipCode } = await loadService();

    await expect(getCoordinatesForZipCode("10001;DROP")).rejects.toThrow(
      "No locations found for this ZIP code",
    );
    await expect(getCoordinatesForZipCode("<script>")).rejects.toThrow(
      "No locations found for this ZIP code",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns local coordinates for a real ZIP without Nominatim", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { getCoordinatesForZipCode } = await loadService();

    const coords = await getCoordinatesForZipCode("94102");
    expect(coords.latitude).toBeCloseTo(37.78, 1);
    expect(coords.longitude).toBeCloseTo(-122.42, 1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses structured Nominatim postalcode search for territory ZIPs", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          lat: "18.1691114",
          lon: "-66.7323795",
          addresstype: "postcode",
          type: "postcode",
          name: "00601",
          display_name: "00601, Adjuntas, Puerto Rico, United States",
          address: {
            postcode: "00601",
            state: "Puerto Rico",
            country: "United States",
            country_code: "us",
          },
        },
      ],
    });
    vi.stubGlobal("fetch", fetchSpy);
    const { getCoordinatesForZipCode } = await loadService();

    const coords = await getCoordinatesForZipCode("00601");
    expect(coords).toEqual({
      latitude: 18.1691114,
      longitude: -66.7323795,
    });
    expect(fetchSpy).toHaveBeenCalled();
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("postalcode=00601");
    expect(calledUrl).toContain("country=us");
    expect(calledUrl).not.toMatch(/[?&]q=/);
  });

  it("rejects Nominatim hits that are not a matching US postcode", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          lat: "38.5262930",
          lon: "-89.9753640",
          addresstype: "highway",
          type: "bus_stop",
          name: "827 Lebanon",
          display_name:
            "827 Lebanon, Belleville, Saint Clair County, Illinois, 62221, United States",
          address: {
            postcode: "62221",
            state: "Illinois",
            country: "United States",
            country_code: "us",
          },
        },
      ],
    });
    vi.stubGlobal("fetch", fetchSpy);
    const { getCoordinatesForZipCode } = await loadService();

    await expect(getCoordinatesForZipCode("00600")).rejects.toThrow(
      /No locations found|Failed to get coordinates/,
    );
  });
});
