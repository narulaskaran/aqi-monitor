import { describe, it, expect, vi, beforeEach } from "vitest";
import handler from "../cron/update-air-quality.js";
import {
  updateAirQualityForAllSubscriptions,
} from "../_lib/services/airQuality.js";
import { deleteExpiredAuthTokens } from "../_lib/services/subscription.js";

/**
 * The daily cron must invoke the expired-auth-token cleanup alongside the
 * air-quality refresh so the Authentication table does not grow unboundedly.
 */

vi.mock("../_lib/services/airQuality.js", () => ({
  updateAirQualityForAllSubscriptions: vi.fn(),
}));

vi.mock("../_lib/services/subscription.js", () => ({
  deleteExpiredAuthTokens: vi.fn(),
}));

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function mockReq(authorization?: string) {
  return {
    method: "GET",
    headers: authorization ? { authorization } : {},
  } as any;
}

const VALID_AUTH = "Bearer test-cron-secret";

describe("update-air-quality cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
    vi.mocked(updateAirQualityForAllSubscriptions).mockResolvedValue();
    vi.mocked(deleteExpiredAuthTokens).mockResolvedValue(0);
  });

  it("returns 401 when authorization header is missing", async () => {
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(updateAirQualityForAllSubscriptions).not.toHaveBeenCalled();
    expect(deleteExpiredAuthTokens).not.toHaveBeenCalled();
  });

  it("returns 403 when CRON_SECRET is wrong", async () => {
    const res = mockRes();
    await handler(mockReq("Bearer wrong-secret"), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(updateAirQualityForAllSubscriptions).not.toHaveBeenCalled();
    expect(deleteExpiredAuthTokens).not.toHaveBeenCalled();
  });

  it("invokes deleteExpiredAuthTokens alongside the air-quality refresh", async () => {
    vi.mocked(deleteExpiredAuthTokens).mockResolvedValue(7);
    const res = mockRes();
    await handler(mockReq(VALID_AUTH), res);

    expect(updateAirQualityForAllSubscriptions).toHaveBeenCalledTimes(1);
    expect(deleteExpiredAuthTokens).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: expect.stringContaining("deleted 7 expired authentication token(s)"),
      }),
    );
  });

  it("returns 500 when the refresh fails", async () => {
    vi.mocked(updateAirQualityForAllSubscriptions).mockRejectedValue(
      new Error("google api down"),
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = mockRes();
    await handler(mockReq(VALID_AUTH), res);

    expect(res.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });
});
