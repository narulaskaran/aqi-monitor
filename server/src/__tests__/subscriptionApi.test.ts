import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleUnsubscribe } from "../handlers/subscription.js";

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("Unsubscribe API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if user missing", async () => {
    const req: any = { body: { subscription_id: "id" } };
    const res = mockRes();
    await handleUnsubscribe(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Unauthorized",
    });
  });

  it("returns 400 if subscription_id missing", async () => {
    const req: any = { body: {}, user: { email: "a@b.com" } };
    const res = mockRes();
    await handleUnsubscribe(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Missing subscription_id",
    });
  });

  it("returns 404 if subscription not found or not owned by user", async () => {
    const req: any = {
      body: { subscription_id: "id" },
      user: { email: "a@b.com" },
    };
    const res = mockRes();
    const mod = await import("../db.js");
    vi.spyOn(mod.prisma.userSubscription, "findUnique").mockResolvedValue(null);
    await handleUnsubscribe(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Subscription not found",
    });
  });

  it("returns 200 if successful", async () => {
    const req: any = {
      body: { subscription_id: "id" },
      user: { email: "a@b.com" },
    };
    const res = mockRes();
    const mod = await import("../db.js");
    vi.spyOn(mod.prisma.userSubscription, "findUnique").mockResolvedValue({
      id: "id",
      email: "a@b.com",
      zipCode: "12345",
      createdAt: new Date(),
      active: true,
      activatedAt: new Date(),
      updatedAt: new Date(),
      lastEmailSentAt: null,
    });
    vi.spyOn(mod.prisma.userSubscription, "update").mockResolvedValue({
      id: "id",
      email: "a@b.com",
      zipCode: "12345",
      createdAt: new Date(),
      active: false,
      activatedAt: new Date(),
      updatedAt: new Date(),
      lastEmailSentAt: null,
    });
    const subMod = await import("../services/subscription.js");
    vi.spyOn(subMod, "deleteAuthTokensForEmail").mockResolvedValue(1);
    await handleUnsubscribe(req, res);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Successfully unsubscribed from air quality alerts",
    });
  });
});
