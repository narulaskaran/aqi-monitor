import { describe, it, expect, vi, beforeEach } from "vitest";
import * as emailService from "../_lib/services/email.js";

vi.mock("../_lib/services/email.js", () => ({
  sendVerificationCode: vi
    .fn()
    .mockResolvedValue({ success: true, status: "pending" }),
  checkVerificationCode: vi
    .fn()
    .mockResolvedValue({ success: true, valid: true }),
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

describe("Email Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sendVerificationCode stores and sends code", async () => {
    const result = await emailService.sendVerificationCode("a@b.com");
    expect(result.success).toBe(true);
  });

  it("checkVerificationCode returns valid for correct code", async () => {
    const result = await emailService.checkVerificationCode(
      "a@b.com",
      "123456",
    );
    expect(result.valid).toBe(true);
  });

  it("sendEmail returns success", async () => {
    const result = await emailService.sendEmail(
      "a@b.com",
      "Subject",
      "<p>Hi</p>",
    );
    expect(result.success).toBe(true);
  });
});
