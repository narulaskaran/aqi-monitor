import { describe, expect, it, vi } from "vitest";
import { parseApiError, throwIfNotOk } from "./parseApiError";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("parseApiError", () => {
  it("returns the server error string when present", async () => {
    const response = jsonResponse(400, {
      error: "Invalid or unsupported ZIP code. Please try a different ZIP code.",
    });
    await expect(parseApiError(response, "fallback")).resolves.toBe(
      "Invalid or unsupported ZIP code. Please try a different ZIP code.",
    );
  });

  it("returns the fallback when error is missing or empty", async () => {
    await expect(
      parseApiError(jsonResponse(500, {}), "Failed: 500"),
    ).resolves.toBe("Failed: 500");
    await expect(
      parseApiError(jsonResponse(500, { error: "" }), "Failed: 500"),
    ).resolves.toBe("Failed: 500");
    await expect(
      parseApiError(jsonResponse(500, { error: 12 }), "Failed: 500"),
    ).resolves.toBe("Failed: 500");
  });

  it("returns the fallback when the body is not JSON", async () => {
    const response = {
      ok: false,
      status: 503,
      json: vi.fn().mockRejectedValue(new Error("invalid json")),
    } as unknown as Response;
    await expect(parseApiError(response, "Failed: 503")).resolves.toBe(
      "Failed: 503",
    );
  });
});

describe("throwIfNotOk", () => {
  it("does not throw for a successful response", async () => {
    await expect(throwIfNotOk(jsonResponse(200, { ok: true }), "nope")).resolves.toBeUndefined();
  });

  it("throws the parsed server error for a failed response", async () => {
    await expect(
      throwIfNotOk(jsonResponse(409, { error: "An active subscription already exists" }), "Failed: 409"),
    ).rejects.toThrow("An active subscription already exists");
  });
});
