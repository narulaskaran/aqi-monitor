import { describe, it, expect, vi, beforeEach } from "vitest";
import handleForecast from "../air-quality-forecast.js";
import * as airQualityService from "../_lib/services/airQuality.js";
import { mockRes } from "./testUtils.js";

vi.mock("../_lib/services/airQuality.js", () => ({
  getCoordinatesForZipCode: vi
    .fn()
    .mockResolvedValue({ latitude: 37.77, longitude: -122.41 }),
  fetchAirQualityForecast: vi.fn().mockResolvedValue([
    {
      date: "2026-06-12",
      maxAqi: 42,
      category: "Good",
      dominantPollutant: "PM2.5",
    },
    {
      date: "2026-06-13",
      maxAqi: 78,
      category: "Moderate",
      dominantPollutant: "O3",
    },
  ]),
  getMockForecastData: vi.fn().mockReturnValue([
    {
      date: "2026-06-12",
      maxAqi: 42,
      category: "Good",
      dominantPollutant: "PM2.5",
    },
  ]),
}));

vi.mock("../_lib/db.js", () => ({
  prisma: {
    zipCoordinates: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Stub the subscription service so vi.importActual of the airQuality module
// below doesn't drag in the real Upstash Redis client (which requires env vars)
vi.mock("../_lib/services/subscription.js", () => ({
  sendAirQualityAlerts: vi.fn(),
}));

describe("handleForecast – validation errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 405 for non-GET methods", async () => {
    const req: any = { method: "POST", query: {} };
    const res = mockRes();
    await handleForecast(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it("returns 400 if zipCode is missing", async () => {
    const req: any = { method: "GET", query: { startDate: "2026-06-12" } };
    const res = mockRes();
    await handleForecast(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("ZIP code") }),
    );
  });

  it("returns 400 for invalid ZIP format", async () => {
    const req: any = {
      method: "GET",
      query: { zipCode: "123", startDate: "2026-06-12" },
    };
    const res = mockRes();
    await handleForecast(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("5-digit") }),
    );
  });

  it("returns 400 for non-5-digit junk", async () => {
    for (const zipCode of ["10001;DROP", "<script>"]) {
      const req: any = {
        method: "GET",
        query: { zipCode, startDate: "2026-06-12" },
      };
      const res = mockRes();
      await handleForecast(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "ZIP code must be a 5-digit number",
      });
      const body = JSON.stringify(res.json.mock.calls[0][0]);
      expect(body).not.toContain(zipCode);
    }
  });

  it("returns 400 for non-existent ZIPs 00000 and 99999 without echoing them", async () => {
    for (const zipCode of ["00000", "99999"]) {
      const req: any = {
        method: "GET",
        query: { zipCode, startDate: "2026-06-12" },
      };
      const res = mockRes();
      await handleForecast(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error:
          "Invalid or unsupported ZIP code. Please try a different ZIP code.",
      });
      const body = JSON.stringify(res.json.mock.calls[0][0]);
      expect(body).not.toContain(zipCode);
    }
  });

  it("returns a generic 400 when geocoding finds no location and does not echo zipCode", async () => {
    const zipCode = "94102";
    const today = new Date().toISOString().substring(0, 10);
    const req: any = {
      method: "GET",
      query: { zipCode, startDate: today },
    };
    const res = mockRes();
    const previousApiKey = process.env.GOOGLE_AIR_QUALITY_API_KEY;
    process.env.GOOGLE_AIR_QUALITY_API_KEY = "test-key";
    vi.mocked(airQualityService.getCoordinatesForZipCode).mockRejectedValueOnce(
      new Error("No locations found for this ZIP code"),
    );
    try {
      await handleForecast(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error:
          "Invalid or unsupported ZIP code. Please try a different ZIP code.",
      });
      const body = JSON.stringify(res.json.mock.calls[0][0]);
      expect(body).not.toContain(zipCode);
    } finally {
      if (previousApiKey === undefined) {
        delete process.env.GOOGLE_AIR_QUALITY_API_KEY;
      } else {
        process.env.GOOGLE_AIR_QUALITY_API_KEY = previousApiKey;
      }
    }
  });

  it("returns 400 if startDate is missing", async () => {
    const req: any = { method: "GET", query: { zipCode: "94102" } };
    const res = mockRes();
    await handleForecast(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("startDate") }),
    );
  });

  it("returns 400 if startDate is not a valid date", async () => {
    const req: any = {
      method: "GET",
      query: { zipCode: "94102", startDate: "notadate" },
    };
    const res = mockRes();
    await handleForecast(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("valid date") }),
    );
  });

  it("returns 400 if startDate is after endDate", async () => {
    const req: any = {
      method: "GET",
      query: { zipCode: "94102", startDate: "2026-06-15", endDate: "2026-06-12" },
    };
    const res = mockRes();
    await handleForecast(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("before") }),
    );
  });

  it("returns 400 if date range is entirely outside the 96-hour horizon", async () => {
    // A date far in the future, well past 96 hours
    const futureDate = new Date();
    futureDate.setUTCDate(futureDate.getUTCDate() + 10);
    const dateStr = futureDate.toISOString().substring(0, 10);

    const req: any = {
      method: "GET",
      query: { zipCode: "94102", startDate: dateStr },
    };
    const res = mockRes();
    await handleForecast(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("4 days"),
      }),
    );
  });
});

describe("handleForecast – happy path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mock data in dev mode without API key", async () => {
    const today = new Date().toISOString().substring(0, 10);
    const req: any = {
      method: "GET",
      query: { zipCode: "94102", startDate: today },
    };
    const res = mockRes();

    const savedEnv = process.env.NODE_ENV;
    const savedKey = process.env.GOOGLE_AIR_QUALITY_API_KEY;
    (process.env as any).NODE_ENV = "development";
    delete (process.env as any).GOOGLE_AIR_QUALITY_API_KEY;

    vi.spyOn(airQualityService, "getMockForecastData").mockReturnValue([
      {
        date: today,
        maxAqi: 42,
        category: "Good",
        dominantPollutant: "PM2.5",
      },
    ]);

    await handleForecast(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        zipCode: "94102",
        forecasts: expect.arrayContaining([
          expect.objectContaining({ date: today }),
        ]),
      }),
    );

    (process.env as any).NODE_ENV = savedEnv;
    if (savedKey !== undefined) {
      (process.env as any).GOOGLE_AIR_QUALITY_API_KEY = savedKey;
    }
  });

  it("groups by UTC date and returns max-AQI day (via mocked service)", async () => {
    const today = new Date().toISOString().substring(0, 10);
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = tomorrow.toISOString().substring(0, 10);

    const req: any = {
      method: "GET",
      query: { zipCode: "94102", startDate: today, endDate: tomorrowStr },
    };
    const res = mockRes();

    vi.spyOn(airQualityService, "fetchAirQualityForecast").mockResolvedValue([
      { date: today, maxAqi: 42, category: "Good", dominantPollutant: "PM2.5" },
      { date: tomorrowStr, maxAqi: 78, category: "Moderate", dominantPollutant: "O3" },
    ]);

    const savedKey = process.env.GOOGLE_AIR_QUALITY_API_KEY;
    (process.env as any).GOOGLE_AIR_QUALITY_API_KEY = "fake-key";
    (process.env as any).NODE_ENV = "production";

    await handleForecast(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        zipCode: "94102",
        forecasts: expect.arrayContaining([
          expect.objectContaining({ date: today, maxAqi: 42 }),
          expect.objectContaining({ date: tomorrowStr, maxAqi: 78 }),
        ]),
      }),
    );

    (process.env as any).GOOGLE_AIR_QUALITY_API_KEY = savedKey;
  });
});

describe("handleForecast – horizon clamping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (process.env as any).GOOGLE_AIR_QUALITY_API_KEY = "fake-key";
    (process.env as any).NODE_ENV = "production";
  });

  it("clamps endDate to the 96-hour horizon when endDate extends beyond it", async () => {
    // Start today, end in 10 days — should clamp to horizon end
    const today = new Date().toISOString().substring(0, 10);
    const farFuture = new Date();
    farFuture.setUTCDate(farFuture.getUTCDate() + 10);
    const farFutureStr = farFuture.toISOString().substring(0, 10);

    const req: any = {
      method: "GET",
      query: { zipCode: "94102", startDate: today, endDate: farFutureStr },
    };
    const res = mockRes();

    const fetchSpy = vi
      .spyOn(airQualityService, "fetchAirQualityForecast")
      .mockResolvedValue([]);

    const beforeMs = Date.now();
    await handleForecast(req, res);

    expect(fetchSpy).toHaveBeenCalled();
    const [, , calledStartTime, calledEndTime] = fetchSpy.mock.calls[0];
    const start = calledStartTime as Date;
    const end = calledEndTime as Date;

    // Hour-aligned: Google rounds down to the previous exact hour, so a
    // now+5min start would still fall in the current hour and 503.
    expect(start.getUTCMinutes()).toBe(0);
    expect(start.getUTCSeconds()).toBe(0);
    expect(start.getUTCMilliseconds()).toBe(0);
    expect(end.getUTCMinutes()).toBe(0);
    expect(end.getUTCSeconds()).toBe(0);

    const currentHour = beforeMs - (beforeMs % (60 * 60 * 1000));
    const nextHour = currentHour + 60 * 60 * 1000;
    expect(start.getTime()).toBeGreaterThanOrEqual(nextHour);
    expect(end.getTime()).toBeLessThanOrEqual(
      currentHour + 95 * 60 * 60 * 1000,
    );
  });

  it("sends the next UTC hour as start when the requested start is today", async () => {
    const today = new Date().toISOString().substring(0, 10);
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + 2);
    const endStr = end.toISOString().substring(0, 10);

    const fetchSpy = vi
      .spyOn(airQualityService, "fetchAirQualityForecast")
      .mockResolvedValue([]);

    const req: any = {
      method: "GET",
      query: { zipCode: "10001", startDate: today, endDate: endStr },
    };
    const res = mockRes();

    const beforeMs = Date.now();
    await handleForecast(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
    expect(fetchSpy).toHaveBeenCalled();
    const [, , calledStartTime] = fetchSpy.mock.calls[0];
    const start = calledStartTime as Date;
    const currentHour = beforeMs - (beforeMs % (60 * 60 * 1000));
    expect(start.getTime()).toBeGreaterThanOrEqual(currentHour + 60 * 60 * 1000);
    expect(start.getTime() % (60 * 60 * 1000)).toBe(0);
  });

  it("returns 400 without calling Google when no forecast hours remain", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-13T23:50:00.000Z"));

    const fetchSpy = vi
      .spyOn(airQualityService, "fetchAirQualityForecast")
      .mockResolvedValue([]);

    const req: any = {
      method: "GET",
      query: {
        zipCode: "10001",
        startDate: "2026-08-13",
        endDate: "2026-08-13",
      },
    };
    const res = mockRes();

    try {
      await handleForecast(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/No forecast hours remain|4 days/),
        }),
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("handleForecast – upstream errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (process.env as any).GOOGLE_AIR_QUALITY_API_KEY = "fake-key";
    (process.env as any).NODE_ENV = "production";
  });

  it("returns 400 (not 503) when Google rejects the time period", async () => {
    const today = new Date().toISOString().substring(0, 10);
    vi.spyOn(airQualityService, "fetchAirQualityForecast").mockRejectedValue(
      new Error(
        'Failed to fetch air quality forecast: 400 {"error":{"code":400,"message":"The specified time period is not supported."}}',
      ),
    );

    const req: any = {
      method: "GET",
      query: { zipCode: "10001", startDate: today },
    };
    const res = mockRes();
    await handleForecast(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("4 days"),
      }),
    );
  });

  it("returns 503 when the forecast upstream is actually unavailable", async () => {
    const today = new Date().toISOString().substring(0, 10);
    vi.spyOn(airQualityService, "fetchAirQualityForecast").mockRejectedValue(
      new Error("Failed to fetch air quality forecast: 503 backend error"),
    );

    const req: any = {
      method: "GET",
      query: { zipCode: "10001", startDate: today },
    };
    const res = mockRes();
    await handleForecast(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("temporarily unavailable"),
      }),
    );
  });
});

describe("getMockForecastData – real implementation", () => {
  it("returns one entry per UTC day across the requested range", async () => {
    // The module validates this env var at import time
    vi.stubEnv("GOOGLE_AIR_QUALITY_API_KEY", "test-key");
    const actual = await vi.importActual<typeof airQualityService>(
      "../_lib/services/airQuality.js",
    );

    const start = new Date("2026-06-12T00:00:00Z");
    const end = new Date("2026-06-14T23:59:59Z");
    const result = actual.getMockForecastData(start, end);

    expect(result.map((d) => d.date)).toEqual([
      "2026-06-12",
      "2026-06-13",
      "2026-06-14",
    ]);
    for (const day of result) {
      expect(day.maxAqi).toBeGreaterThan(0);
      expect(day.category).toBeTruthy();
      expect(day.dominantPollutant).toBeTruthy();
    }
  });

  it("caps the mock forecast at 4 days", async () => {
    vi.stubEnv("GOOGLE_AIR_QUALITY_API_KEY", "test-key");
    const actual = await vi.importActual<typeof airQualityService>(
      "../_lib/services/airQuality.js",
    );

    const start = new Date("2026-06-12T00:00:00Z");
    const end = new Date("2026-06-20T23:59:59Z");
    const result = actual.getMockForecastData(start, end);

    expect(result.length).toBe(4);
  });
});
