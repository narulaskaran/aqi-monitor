import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAirQuality } from "./api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAirQuality", () => {
  it("returns air quality data on successful response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          index: 42,
          category: "Good",
          dominantPollutant: "PM2.5",
        }),
    });

    const data = await getAirQuality("10001");
    expect(data.index).toBe(42);
    expect(data.category).toBe("Good");
    expect(data.dominantPollutant).toBe("PM2.5");
  });

  it("throws the server error message when API responds with error JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          error: "Invalid or unsupported ZIP code: 00000. Please try a different ZIP code.",
        }),
    });

    await expect(getAirQuality("00000")).rejects.toThrow(
      "Invalid or unsupported ZIP code: 00000. Please try a different ZIP code.",
    );
  });

  it("throws a generic message when API error has no parseable body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: () => Promise.reject(new Error("invalid json")),
    });

    await expect(getAirQuality("10001")).rejects.toThrow(
      "Failed to fetch air quality data: 503",
    );
  });

  it("throws a generic message when API error JSON has no error field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    await expect(getAirQuality("10001")).rejects.toThrow(
      "Failed to fetch air quality data: 500",
    );
  });
});
