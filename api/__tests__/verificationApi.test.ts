import { describe, it, expect, vi, beforeEach } from "vitest";
import handleStartVerification from "../verify.js";
import handleVerifyCode from "../verify-code.js";
import { mockRes, mockSubscription } from "./testUtils.js";

// --- START FIX ---
vi.mock("../_lib/db.js", () => ({
  prisma: {
    userSubscription: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));
// --- END FIX ---

vi.mock("../_lib/middleware/auth.js", () => ({
  authenticate: vi.fn(),
}));

vi.mock("../_lib/services/email.js", () => ({
  sendVerificationCode: vi.fn().mockResolvedValue({ success: true }),
  checkVerificationCode: vi
    .fn()
    .mockResolvedValue({ success: true, valid: true }),
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("../_lib/services/subscription.js", () => ({
  createSubscription: vi.fn(),
  subscriptionExists: vi.fn(),
}));

describe("Verification API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handleStartVerification returns 400 if missing email/zipCode", async () => {
    const req: any = { method: 'POST', body: {} };
    const res = mockRes();
    await handleStartVerification(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Email and ZIP code are required",
    });
  });

  it("handleStartVerification returns 200 if valid", async () => {
    const req: any = { method: 'POST', body: { email: "a@b.com", zipCode: "12345" } };
    const res = mockRes();
    const mod = await import("../_lib/services/email.js");
    vi.spyOn(mod, "sendVerificationCode").mockResolvedValue({ success: true });
    const subMod = await import("../_lib/services/subscription.js");
    vi.spyOn(subMod, "subscriptionExists").mockResolvedValue(false);
    await handleStartVerification(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it("handleVerifyCode returns 400 if missing fields", async () => {
    const req: any = { method: 'POST', body: {} };
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
      method: 'POST',
      body: { email: "a@b.com", zipCode: "12345", code: "123456" },
    };
    const res = mockRes();
    const mod = await import("../_lib/services/email.js");
    vi.spyOn(mod, "checkVerificationCode").mockResolvedValue({
      success: true,
      valid: true,
    });
    const subMod = await import("../_lib/services/subscription.js");
    vi.spyOn(subMod, "subscriptionExists").mockResolvedValue(false);
    const createSubscription = (await import(
      "../_lib/services/subscription.js"
    )).createSubscription as any;
    createSubscription.mockResolvedValue(mockSubscription);
    
    await handleVerifyCode(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, valid: true });
    expect(createSubscription).toHaveBeenCalledWith(
      "a@b.com",
      "12345",
      undefined,
      undefined,
    );
  });

  it("creates a subscription from the authenticated session without an OTP", async () => {
    const auth = await import("../_lib/middleware/auth.js");
    (auth.authenticate as any).mockResolvedValue({ email: "signedin@example.com" });

    const subMod = await import("../_lib/services/subscription.js");
    (subMod.subscriptionExists as any).mockResolvedValue(false);
    (subMod.createSubscription as any).mockResolvedValue({
      ...mockSubscription,
      email: "signedin@example.com",
    });

    const req: any = {
      method: "POST",
      headers: { authorization: "Bearer session-token" },
      body: {
        email: "attacker@example.com",
        code: "wrong-code",
        zipCode: " 12345 ",
      },
    };
    const res = mockRes();
    await handleVerifyCode(req, res);

    expect(auth.authenticate).toHaveBeenCalledWith(req);
    expect(subMod.subscriptionExists).toHaveBeenCalledWith(
      "signedin@example.com",
      "12345",
    );
    expect(subMod.createSubscription).toHaveBeenCalledWith(
      "signedin@example.com",
      "12345",
      undefined,
      undefined,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      valid: true,
      subscription: expect.objectContaining({ email: "signedin@example.com" }),
    });

    const emailMod = await import("../_lib/services/email.js");
    expect(emailMod.checkVerificationCode).not.toHaveBeenCalled();
  });

  it("returns 400 when an authenticated request is missing the ZIP code", async () => {
    const auth = await import("../_lib/middleware/auth.js");
    (auth.authenticate as any).mockResolvedValue({ email: "signedin@example.com" });

    const req: any = {
      method: "POST",
      headers: { authorization: "Bearer session-token" },
      body: {},
    };
    const res = mockRes();
    await handleVerifyCode(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "ZIP code is required",
    });
  });

  it("returns 409 when an authenticated user is already subscribed", async () => {
    const auth = await import("../_lib/middleware/auth.js");
    (auth.authenticate as any).mockResolvedValue({ email: "signedin@example.com" });

    const subMod = await import("../_lib/services/subscription.js");
    (subMod.subscriptionExists as any).mockResolvedValue(true);

    const req: any = {
      method: "POST",
      headers: { authorization: "Bearer session-token" },
      body: { zipCode: " 12345 " },
    };
    const res = mockRes();
    await handleVerifyCode(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "This email is already subscribed for this ZIP code",
    });
  });

  it("validates dates for authenticated subscriptions before creating them", async () => {
    const auth = await import("../_lib/middleware/auth.js");
    (auth.authenticate as any).mockResolvedValue({ email: "signedin@example.com" });

    const req: any = {
      method: "POST",
      headers: { authorization: "Bearer session-token" },
      body: { zipCode: "12345", startsAt: "not-a-date" },
    };
    const res = mockRes();
    await handleVerifyCode(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Invalid start date",
    });
  });

  it("returns 401 when an authenticated request has an invalid session", async () => {
    const auth = await import("../_lib/middleware/auth.js");
    (auth.authenticate as any).mockRejectedValue(new Error("Unauthorized"));

    const req: any = {
      method: "POST",
      headers: { authorization: "Bearer expired-token" },
      body: { zipCode: "12345" },
    };
    const res = mockRes();
    await handleVerifyCode(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Unauthorized",
    });
  });
});

describe("Verification API edge cases", () => {
  it("handleStartVerification returns error if already subscribed", async () => {
    const req: any = { method: 'POST', body: { email: "a@b.com", zipCode: "12345" } };
    const res = mockRes();
    const subMod = await import("../_lib/services/subscription.js");
    vi.spyOn(subMod, "subscriptionExists").mockResolvedValue(true);
    await handleStartVerification(req, res);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "This email is already subscribed for this ZIP code",
    });
  });
  it("handleStartVerification returns 500 on DB error", async () => {
    const req: any = { method: 'POST', body: { email: "a@b.com", zipCode: "12345" } };
    const res = mockRes();
    const subMod = await import("../_lib/services/subscription.js");
    vi.spyOn(subMod, "subscriptionExists").mockRejectedValue(
      new Error("fail"),
    );
    await handleStartVerification(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
  it("handleVerifyCode returns 500 on DB error", async () => {
    const req: any = {
      method: 'POST',
      body: { email: "a@b.com", zipCode: "12345", code: "123456" },
    };
    const res = mockRes();
    const mod = await import("../_lib/services/email.js");
    vi.spyOn(mod, "checkVerificationCode").mockRejectedValue(new Error("fail"));
    await handleVerifyCode(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("Date-range subscription via handleVerifyCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores startsAt on the created subscription", async () => {
    const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const req: any = {
      method: "POST",
      body: { email: "a@b.com", zipCode: "12345", code: "123456", startsAt },
    };
    const res = mockRes();
    const emailMod = await import("../_lib/services/email.js");
    vi.spyOn(emailMod, "checkVerificationCode").mockResolvedValue({ success: true, valid: true });

    const subMod = await import("../_lib/services/subscription.js");
    const createSpy = subMod.createSubscription as any;
    createSpy.mockResolvedValue(mockSubscription);

    await handleVerifyCode(req, res);

    expect(createSpy).toHaveBeenCalledWith(
      "a@b.com",
      "12345",
      new Date(startsAt),
      undefined,
    );
    expect(res.json).toHaveBeenCalledWith({ success: true, valid: true });
  });

  it("returns 400 when startsAt is same as expiresAt", async () => {
    const date = "2026-07-01T00:00:00.000Z";
    const req: any = {
      method: "POST",
      body: { email: "a@b.com", zipCode: "12345", code: "123456", startsAt: date, expiresAt: date },
    };
    const res = mockRes();
    const emailMod = await import("../_lib/services/email.js");
    vi.spyOn(emailMod, "checkVerificationCode").mockResolvedValue({ success: true, valid: true });

    await handleVerifyCode(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Start date must be before end date" })
    );
  });

  it("returns 400 when startsAt is after expiresAt", async () => {
    const req: any = {
      method: "POST",
      body: {
        email: "a@b.com",
        zipCode: "12345",
        code: "123456",
        startsAt: "2026-08-01T00:00:00.000Z",
        expiresAt: "2026-07-01T00:00:00.000Z",
      },
    };
    const res = mockRes();
    const emailMod = await import("../_lib/services/email.js");
    vi.spyOn(emailMod, "checkVerificationCode").mockResolvedValue({ success: true, valid: true });

    await handleVerifyCode(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Start date must be before end date" })
    );
  });
});
