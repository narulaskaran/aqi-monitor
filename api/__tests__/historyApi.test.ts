import { describe, it, expect, vi, beforeEach } from "vitest";
import handleHistory from "../air-quality-history.js";
import * as airQualityService from "../_lib/services/airQuality.js";
import { mockRes } from "./testUtils.js";

vi.mock("../_lib/services/airQuality.js", () => {
  const mockHistory = [
    { timestamp: "2026-06-20T12:00:00.000Z", aqi: 42, category: "Good" },
    { timestamp: "2026-06-21T12:00:00.000Z", aqi: 78, category: "Moderate" },
    { timestamp: "2026-06-22T12:00:00.000Z", aqi: 55, category: "Moderate" },
  ];

  return {
    getHistoryForZip: vi.fn().mockResolvedValue(mockHistory),
    getMockHistoryData: vi.fn().mockReturnValue(mockHistory),
    // Other exports needed by import side effects in airQuality.ts
    getCoordinatesForZipCode: vi.fn(),
    fetchAirQuality: vi.fn(),
    fetchAndStoreAirQualityForZip: vi.fn(),
    getLatestAirQualityForZip: vi.fn(),
  };
});

vi.mock("../_lib/db.js", () => ({
  prisma: {
    airQualityRecord: {
      findMany: vi.fn(),
    },
    zipCoordinates: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../_lib/services/subscription.js", () => ({
  sendAirQualityAlerts: vi.fn(),
}));

describe("handleHistory – validation errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 405 for non-GET methods", async () => {
    const req: any = { method: "POST", query: {} };
    const res = mockRes();
    await handleHistory(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it("returns 400 if zipCode is missing", async () => {
    const req: any = { method: "GET", query: {} };
    const res = mockRes();
    await handleHistory(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("ZIP code") }),
    );
  });

  it("returns 400 for invalid ZIP format", async () => {
    const req: any = {
      method: "GET",
      query: { zipCode: "123" },
    };
    const res = mockRes();
    await handleHistory(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("5-digit") }),
    );
  });

  it("returns 400 if days is not a number", async () => {
    const req: any = {
      method: "GET",
      query: { zipCode: "94102", days: "abc" },
    };
    const res = mockRes();
    await handleHistory(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("positive integer") }),
    );
  });

  it("returns 400 if days is < 1", async () => {
    const req: any = {
      method: "GET",
      query: { zipCode: "94102", days: "0" },
    };
    const res = mockRes();
    await handleHistory(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("between 1 and 90") }),
    );
  });

  it("returns 400 if days is > 90", async () => {
    const req: any = {
      method: "GET",
      query: { zipCode: "94102", days: "91" },
    };
    const res = mockRes();
    await handleHistory(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("between 1 and 90") }),
    );
  });
});

describe("handleHistory – happy path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mock data in dev mode without API key", async () => {
    const req: any = {
      method: "GET",
      query: { zipCode: "94102", days: "7" },
    };
    const res = mockRes();
    await handleHistory(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      zipCode: "94102",
      history: [
        { timestamp: "2026-06-20T12:00:00.000Z", aqi: 42, category: "Good" },
        { timestamp: "2026-06-21T12:00:00.000Z", aqi: 78, category: "Moderate" },
        { timestamp: "2026-06-22T12:00:00.000Z", aqi: 55, category: "Moderate" },
      ],
    });
  });

  it("defaults days to 7 when not provided", async () => {
    const req: any = {
      method: "GET",
      query: { zipCode: "94102" },
    };
    const res = mockRes();
    await handleHistory(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        zipCode: "94102",
        history: expect.any(Array),
      }),
    );
  });

  it("returns empty history array when no data exists", async () => {
    vi.mocked(airQualityService.getMockHistoryData).mockReturnValueOnce([]);

    const req: any = {
      method: "GET",
      query: { zipCode: "99999", days: "7" },
    };
    const res = mockRes();
    await handleHistory(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      zipCode: "99999",
      history: [],
    });
  });
});
