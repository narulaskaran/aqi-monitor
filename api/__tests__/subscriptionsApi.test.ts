import { describe, it, expect, vi, beforeEach } from "vitest";
import handler from "../subscriptions.js";
import { mockRes, mockSubscription } from "./testUtils.js";

// Mock auth middleware
vi.mock("../_lib/middleware/auth.js", () => ({
  authenticate: vi.fn(),
}));

// Mock subscription service
vi.mock("../_lib/services/subscription.js", () => ({
  getSubscriptionsForEmailSorted: vi.fn(),
  setSubscriptionActive: vi.fn(),
}));

// Mock prisma
vi.mock("../_lib/db.js", () => ({
  prisma: {
    userSubscription: {
      findUnique: vi.fn(),
    },
  },
}));

describe("GET /api/subscriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when auth fails", async () => {
    const { authenticate } = await import("../_lib/middleware/auth.js");
    (authenticate as any).mockRejectedValue(new Error("Unauthorized"));

    const req: any = { method: "GET", headers: {} };
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("returns subscriptions sorted correctly", async () => {
    const { authenticate } = await import("../_lib/middleware/auth.js");
    (authenticate as any).mockResolvedValue({ email: "user@example.com" });

    const { getSubscriptionsForEmailSorted } = await import(
      "../_lib/services/subscription.js"
    );
    const sorted = [
      { ...mockSubscription, active: true, zipCode: "11111" },
      { ...mockSubscription, active: false, zipCode: "22222" },
    ];
    (getSubscriptionsForEmailSorted as any).mockResolvedValue(sorted);

    const req: any = { method: "GET", headers: {} };
    const res = mockRes();
    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      subscriptions: sorted,
    });
    expect(getSubscriptionsForEmailSorted).toHaveBeenCalledWith("user@example.com");
  });
});

describe("PATCH /api/subscriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when auth fails", async () => {
    const { authenticate } = await import("../_lib/middleware/auth.js");
    (authenticate as any).mockRejectedValue(new Error("Unauthorized"));

    const req: any = { method: "PATCH", headers: {}, body: { id: "sub-1", active: false } };
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 404 when subscription not found", async () => {
    const { authenticate } = await import("../_lib/middleware/auth.js");
    (authenticate as any).mockResolvedValue({ email: "user@example.com" });

    const db = await import("../_lib/db.js");
    (db.prisma.userSubscription.findUnique as any).mockResolvedValue(null);

    const req: any = {
      method: "PATCH",
      headers: {},
      body: { id: "nonexistent", active: false },
    };
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Subscription not found" });
  });

  it("returns 403 when subscription belongs to another user", async () => {
    const { authenticate } = await import("../_lib/middleware/auth.js");
    (authenticate as any).mockResolvedValue({ email: "user@example.com" });

    const db = await import("../_lib/db.js");
    (db.prisma.userSubscription.findUnique as any).mockResolvedValue({
      ...mockSubscription,
      email: "other@example.com",
    });

    const req: any = {
      method: "PATCH",
      headers: {},
      body: { id: "sub-1", active: false },
    };
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("updates subscription active status successfully", async () => {
    const { authenticate } = await import("../_lib/middleware/auth.js");
    (authenticate as any).mockResolvedValue({ email: "user@example.com" });

    const db = await import("../_lib/db.js");
    (db.prisma.userSubscription.findUnique as any).mockResolvedValue({
      ...mockSubscription,
      email: "user@example.com",
    });

    const { setSubscriptionActive } = await import(
      "../_lib/services/subscription.js"
    );
    const updatedSub = { ...mockSubscription, active: false, email: "user@example.com" };
    (setSubscriptionActive as any).mockResolvedValue(updatedSub);

    const req: any = {
      method: "PATCH",
      headers: {},
      body: { id: mockSubscription.id, active: false },
    };
    const res = mockRes();
    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      subscription: updatedSub,
    });
    expect(setSubscriptionActive).toHaveBeenCalledWith(mockSubscription.id, false);
  });
});

describe("Unsupported methods", () => {
  it("returns 405 for DELETE", async () => {
    const { authenticate } = await import("../_lib/middleware/auth.js");
    (authenticate as any).mockResolvedValue({ email: "user@example.com" });

    const req: any = { method: "DELETE", headers: {}, body: {} };
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
  });
});
