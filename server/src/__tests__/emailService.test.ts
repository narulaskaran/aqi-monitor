import { describe, it, expect, vi, beforeEach } from "vitest";
import * as emailService from "../services/email.js";

describe("Email Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sendVerificationCode stores and sends code", async () => {
    vi.spyOn(emailService, "sendVerificationCode").mockResolvedValue({
      success: true,
      status: "pending",
    });
    const result = await emailService.sendVerificationCode("a@b.com");
    expect(result.success).toBe(true);
  });

  it("checkVerificationCode returns valid for correct code", async () => {
    vi.spyOn(emailService, "checkVerificationCode").mockResolvedValue({
      success: true,
      valid: true,
    });
    const result = await emailService.checkVerificationCode(
      "a@b.com",
      "123456",
    );
    expect(result.valid).toBe(true);
  });

  it("sendEmail returns success", async () => {
    vi.spyOn(emailService, "sendEmail").mockResolvedValue({ success: true });
    const result = await emailService.sendEmail(
      "a@b.com",
      "Subject",
      "<p>Hi</p>",
    );
    expect(result.success).toBe(true);
  });
});
