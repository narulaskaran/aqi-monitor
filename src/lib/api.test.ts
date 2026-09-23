import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "./api";
import { getAirQuality } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api utils", () => {
  it("should be defined", () => {
    expect(api).toBeDefined();
  });

  it("surfaces the API error when updating a subscription fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: vi
          .fn()
          .mockResolvedValue({ error: "An active subscription already exists" }),
      }),
    );

    await expect(api.updateSubscription("token", "subscription-id", true))
      .rejects.toThrow("An active subscription already exists");
  });
});

describe("getAirQuality", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns air quality data on successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            index: 42,
            category: "Good",
            dominantPollutant: "PM2.5",
            recordedAt: "2026-08-24T14:34:00.000Z",
          }),
      }),
    );

    const data = await getAirQuality("10001");
    expect(data.index).toBe(42);
    expect(data.category).toBe("Good");
    expect(data.dominantPollutant).toBe("PM2.5");
    expect(data.recordedAt).toBe("2026-08-24T14:34:00.000Z");
  });

  it("throws the server error message when API responds with error JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error:
              "Invalid or unsupported ZIP code. Please try a different ZIP code.",
          }),
      }),
    );

    await expect(getAirQuality("00000")).rejects.toThrow(
      "Invalid or unsupported ZIP code. Please try a different ZIP code.",
    );
  });

  it("throws a generic message when API error has no parseable body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.reject(new Error("invalid json")),
      }),
    );

    await expect(getAirQuality("10001")).rejects.toThrow(
      "Failed to fetch air quality data: 503",
    );
  });

  it("throws a generic message when API error JSON has no error field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      }),
    );

    await expect(getAirQuality("10001")).rejects.toThrow(
      "Failed to fetch air quality data: 500",
    );
  });
});
