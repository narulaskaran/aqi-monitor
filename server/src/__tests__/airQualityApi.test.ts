import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import {
  handleGetAirQuality,
  handleUpdateAirQuality,
} from "../handlers/airQuality.js";
import * as airQualityService from "../services/airQuality.js";
import {
  mockRes,
    mockAirQualityRecord,
} from "./testUtils.js";
import * as subscriptionService from "../services/subscription.js";

vi.mock("../services/airQuality.js", () => ({
  getCoordinatesForZipCode: vi
    .fn()
    .mockResolvedValue({ latitude: 1, longitude: 2 }),
  fetchAirQuality: vi.fn().mockResolvedValue({
    index: 50,
    category: "Good",
    dominantPollutant: "PM2.5",
    pollutants: {},
  }),
  fetchAndStoreAirQualityForZip: vi.fn().mockResolvedValue(undefined),
  updateAirQualityForAllSubscriptions: vi.fn().mockResolvedValue(undefined),
  getMockAirQualityData: vi.fn().mockReturnValue({
    index: 50,
    category: "Good",
    dominantPollutant: "PM2.5",
    pollutants: {},
  }),
  getLatestAirQualityForZip: vi.fn().mockResolvedValue(null),
}));

vi.mock("../services/email.js", () => ({
  sendVerificationCode: vi.fn().mockResolvedValue({ success: true }),
  checkVerificationCode: vi
    .fn()
    .mockResolvedValue({ success: true, valid: true }),
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

describe("handleGetAirQuality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 if zipCode is missing", async () => {
    const req: any = { query: {} };
    const res = mockRes();
    await handleGetAirQuality(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "ZIP code is required" });
  });

  it("returns 200 with mock data in dev mode and no API key", async () => {
    const req: any = { query: { zipCode: "12345" } };
    const res = mockRes();
    const oldEnv = process.env;
    process.env.VERCEL_ENV = "development";
    process.env.GOOGLE_AIR_QUALITY_API_KEY = "";
    const mod = await import("../services/airQuality.js");
    vi.spyOn(mod, "getMockAirQualityData").mockReturnValue(
      mockAirQualityRecord,
    );
    await handleGetAirQuality(req, res);
    expect(res.json).toHaveBeenCalledWith(mockAirQualityRecord);
    process.env = oldEnv;
  });

  it("returns 500 on thrown error", async () => {
    const req: any = { query: { zipCode: "12345" } };
    const res = mockRes();
    const old = console.error;
    console.error = vi.fn();
    const mod = await import("../services/airQuality.js");
    vi.spyOn(mod, "getLatestAirQualityForZip").mockImplementation(() => {
      throw new Error("fail");
    });
    await handleGetAirQuality(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Failed to fetch air quality data",
    });
    console.error = old;
  });
});

describe("handleUpdateAirQuality", () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...OLD_ENV, CRON_SECRET: "secret" };
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });
  function mockRes() {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  }
  it("returns 401 if no auth header", async () => {
    const req: any = { headers: {} };
    const res = mockRes();
    await handleUpdateAirQuality(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
  it("returns 403 if wrong secret", async () => {
    const req: any = { headers: { authorization: "Bearer wrong" } };
    const res = mockRes();
    await handleUpdateAirQuality(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
  it("returns 200 if correct secret and updates", async () => {
    const req: any = { headers: { authorization: "Bearer secret" } };
    const res = mockRes();
    vi.spyOn(
      airQualityService,
      "updateAirQualityForAllSubscriptions",
    ).mockResolvedValue();
    await handleUpdateAirQuality(req, res);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: expect.any(String),
    });
  });
  it("returns 500 on error", async () => {
    const req: any = { headers: { authorization: "Bearer secret" } };
    const res = mockRes();
    vi.spyOn(
      airQualityService,
      "updateAirQualityForAllSubscriptions",
    ).mockRejectedValue(new Error("fail"));
    await handleUpdateAirQuality(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("getMockAirQualityData", () => {
  it("returns valid mock data structure", () => {
    const data = airQualityService.getMockAirQualityData();
    expect(data).toHaveProperty("index");
    expect(data).toHaveProperty("category");
    expect(data).toHaveProperty("dominantPollutant");
    expect(data).toHaveProperty("pollutants");
  });
});

describe("airQuality service direct", () => {
  it("fetchAndStoreAirQualityForZip stores data", async () => {
    const prisma = (await import("../db.js")).prisma;
    vi.spyOn(prisma.airQualityRecord, "upsert").mockResolvedValue({
      zipCode: "12345",
      category: "Good",
      dominantPollutant: "PM2.5",
      id: "aq-1",
      aqi: 50,
      timestamp: new Date(),
      pollutantData: {},
    });
    vi.spyOn(subscriptionService, "sendAirQualityAlerts").mockResolvedValue(
      1 as any,
    );
    await airQualityService.fetchAndStoreAirQualityForZip("12345", true);
  });
});
