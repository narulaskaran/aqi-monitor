import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleStartVerification,
  handleVerifyCode,
} from "../handlers/verification.js";
import { mockRes, mockSubscription } from "./testUtils.js";

vi.mock("../services/email.js", () => ({
  sendVerificationCode: vi.fn().mockResolvedValue({ success: true }),
  checkVerificationCode: vi
    .fn()
    .mockResolvedValue({ success: true, valid: true }),
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

describe("Verification API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handleStartVerification returns 400 if missing email/zipCode", async () => {
    const req: any = { body: {} };
    const res = mockRes();
    await handleStartVerification(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Email and ZIP code are required",
    });
  });

  it("handleStartVerification returns 200 if valid", async () => {
    const req: any = { body: { email: "a@b.com", zipCode: "12345" } };
    const res = mockRes();
    const mod = await import("../services/email.js");
    vi.spyOn(mod, "sendVerificationCode").mockResolvedValue({ success: true });
    const subMod = await import("../services/subscription.js");
    vi.spyOn(subMod, "findSubscriptionsForEmail").mockResolvedValue([]);
    await handleStartVerification(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it("handleVerifyCode returns 400 if missing fields", async () => {
    const req: any = { body: {} };
    const res = mockRes();
    await handleVerifyCode(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Email, ZIP code, and verification code are required",
    });
  });

  it("handleVerifyCode returns 200 if valid", async () => {
    const req: any = {
      body: { email: "a@b.com", zipCode: "12345", code: "123456" },
    };
    const res = mockRes();
    const mod = await import("../services/email.js");
    vi.spyOn(mod, "checkVerificationCode").mockResolvedValue({
      success: true,
      valid: true,
    });
    const subMod = await import("../services/subscription.js");
    vi.spyOn(subMod, "findSubscriptionsForEmail").mockResolvedValue([]);
    const dbMod = await import("../db.js");
    vi.spyOn(dbMod.prisma.userSubscription, "create").mockResolvedValue({
      id: "id",
      email: "a@b.com",
      zipCode: "12345",
      createdAt: new Date(),
      active: true,
      activatedAt: new Date(),
      updatedAt: new Date(),
      lastEmailSentAt: null,
    });
    await handleVerifyCode(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, valid: true });
  });
});

describe("Verification API edge cases", () => {
  it("handleStartVerification returns error if already subscribed", async () => {
    const req: any = { body: { email: "a@b.com", zipCode: "12345" } };
    const res = mockRes();
    const subMod = await import("../services/subscription.js");
    vi.spyOn(subMod, "findSubscriptionsForEmail").mockResolvedValue([
      mockSubscription,
    ]);
    await handleStartVerification(req, res);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "This email is already subscribed for this ZIP code",
    });
  });
  it("handleStartVerification returns 500 on DB error", async () => {
    const req: any = { body: { email: "a@b.com", zipCode: "12345" } };
    const res = mockRes();
    const subMod = await import("../services/subscription.js");
    vi.spyOn(subMod, "findSubscriptionsForEmail").mockRejectedValue(
      new Error("fail"),
    );
    await handleStartVerification(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
  it("handleVerifyCode returns 500 on DB error", async () => {
    const req: any = {
      body: { email: "a@b.com", zipCode: "12345", code: "123456" },
    };
    const res = mockRes();
    const mod = await import("../services/email.js");
    vi.spyOn(mod, "checkVerificationCode").mockRejectedValue(new Error("fail"));
    await handleVerifyCode(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
