import * as api from "./api";

describe("api utils", () => {
  it("should be defined", () => {
    expect(api).toBeDefined();
  });

  describe("getAirQuality", () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("should throw an error when response is not ok", async () => {
      const mockError = { error: "Invalid or unsupported ZIP code" };
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue(mockError),
      });

      await expect(api.getAirQuality("00000")).rejects.toThrow(
        "Invalid or unsupported ZIP code"
      );
    });

    it("should throw a generic error when response is not ok and JSON has no error field", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({}),
      });

      await expect(api.getAirQuality("00000")).rejects.toThrow(
        "Failed to fetch air quality data: 500"
      );
    });

    it("should throw a generic error when JSON parsing fails on error response", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
      });

      await expect(api.getAirQuality("00000")).rejects.toThrow(
        "Failed to fetch air quality data: 503"
      );
    });

    it("should return air quality data on success", async () => {
      const mockData = {
        index: 42,
        category: "Moderate",
        dominantPollutant: "pm2.5",
      };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await api.getAirQuality("90210");
      expect(result).toEqual(mockData);
    });
  });
});
