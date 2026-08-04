import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHistoryForZip } from "../_lib/services/airQuality.js";
import { prisma } from "../_lib/db.js";

vi.mock("../_lib/db.js", () => ({
  prisma: {
    airQualityRecord: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../_lib/services/subscription.js", () => ({
  sendAirQualityAlerts: vi.fn(),
}));

describe("getHistoryForZip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.airQualityRecord.findMany).mockResolvedValue([]);
  });

  it("queries exactly the requested number of calendar days", async () => {
    await getHistoryForZip("94102", 7);

    const query = vi.mocked(prisma.airQualityRecord.findMany).mock.calls[0][0] as {
      where: { timestamp: { gte: Date } };
    };
    const since = query.where.timestamp.gte;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysBeforeToday = Math.round(
      (today.getTime() - since.getTime()) / (24 * 60 * 60 * 1000),
    );
    expect(daysBeforeToday).toBe(6);
  });
});
