import { describe, it, expect } from "vitest";
import { isValidZipCode, MAX_ZIP_CODE_LENGTH } from "../_lib/zipCode.js";

describe("isValidZipCode", () => {
  it("accepts a 5-digit ZIP code", () => {
    expect(isValidZipCode("94102")).toBe(true);
  });

  it("rejects values longer than the max length", () => {
    expect(isValidZipCode("1".repeat(MAX_ZIP_CODE_LENGTH + 1))).toBe(false);
    expect(isValidZipCode("9".repeat(5000))).toBe(false);
  });

  it("rejects HTML/script-like payloads", () => {
    expect(isValidZipCode("<script>alert(1)</script>")).toBe(false);
  });

  it("rejects non-digit and short values", () => {
    expect(isValidZipCode("1234")).toBe(false);
    expect(isValidZipCode("1234a")).toBe(false);
    expect(isValidZipCode("")).toBe(false);
  });
});
