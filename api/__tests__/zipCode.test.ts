import { describe, it, expect } from "vitest";
import {
  isFiveDigitZipCode,
  isDeliverableUsZipCode,
  isUsTerritoryZipCode,
  isValidZipCode,
  lookupUsZipCoordinates,
  MAX_ZIP_CODE_LENGTH,
  validateUsZipCode,
} from "../_lib/zipCode.js";

describe("isFiveDigitZipCode / isValidZipCode", () => {
  it("accepts exactly five digits", () => {
    expect(isFiveDigitZipCode("94102")).toBe(true);
    expect(isValidZipCode("94102")).toBe(true);
    expect(isFiveDigitZipCode("00000")).toBe(true);
  });

  it("rejects non-5-digit junk", () => {
    expect(isFiveDigitZipCode("123")).toBe(false);
    expect(isFiveDigitZipCode("10001;DROP")).toBe(false);
    expect(isFiveDigitZipCode("<script>")).toBe(false);
    expect(isFiveDigitZipCode("94102-1234")).toBe(false);
    expect(isFiveDigitZipCode("")).toBe(false);
    expect(isValidZipCode("1234")).toBe(false);
    expect(isValidZipCode("1234a")).toBe(false);
  });

  it("rejects values longer than the max length", () => {
    expect(isValidZipCode("1".repeat(MAX_ZIP_CODE_LENGTH + 1))).toBe(false);
    expect(isValidZipCode("9".repeat(5000))).toBe(false);
  });

  it("rejects HTML/script-like payloads", () => {
    expect(isValidZipCode("<script>alert(1)</script>")).toBe(false);
  });
});

describe("isDeliverableUsZipCode", () => {
  it("rejects non-existent 5-digit ZIPs that previously returned AQI", () => {
    expect(isDeliverableUsZipCode("00000")).toBe(false);
    expect(isDeliverableUsZipCode("99999")).toBe(false);
  });

  it("accepts real USPS ZIP codes", () => {
    expect(isDeliverableUsZipCode("94102")).toBe(true);
    expect(isDeliverableUsZipCode("10001")).toBe(true);
    expect(isDeliverableUsZipCode("00501")).toBe(true);
  });

  it("allows USPS territory prefixes that local GeoNames data omits", () => {
    expect(isUsTerritoryZipCode("00601")).toBe(true);
    expect(isDeliverableUsZipCode("00601")).toBe(true);
  });

  it("rejects non-5-digit input", () => {
    expect(isDeliverableUsZipCode("10001;DROP")).toBe(false);
    expect(isDeliverableUsZipCode("<script>")).toBe(false);
  });
});

describe("lookupUsZipCoordinates", () => {
  it("returns coordinates for a real ZIP", () => {
    const coords = lookupUsZipCoordinates("94102");
    expect(coords).not.toBeNull();
    expect(coords!.latitude).toBeCloseTo(37.78, 1);
    expect(coords!.longitude).toBeCloseTo(-122.42, 1);
  });

  it("returns null for 00000 and 99999", () => {
    expect(lookupUsZipCoordinates("00000")).toBeNull();
    expect(lookupUsZipCoordinates("99999")).toBeNull();
  });
});

describe("validateUsZipCode", () => {
  it("requires a ZIP code", () => {
    expect(validateUsZipCode(undefined)).toEqual({
      ok: false,
      error: "ZIP code is required",
    });
    expect(validateUsZipCode("")).toEqual({
      ok: false,
      error: "ZIP code is required",
    });
  });

  it("requires a 5-digit number for junk input and does not echo it", () => {
    for (const zipCode of ["123", "10001;DROP", "<script>", "94102-1234"]) {
      const result = validateUsZipCode(zipCode);
      expect(result).toEqual({
        ok: false,
        error: "ZIP code must be a 5-digit number",
      });
      expect(JSON.stringify(result)).not.toContain(zipCode);
    }
  });

  it("rejects non-existent ZIPs 00000 and 99999 without echoing them", () => {
    for (const zipCode of ["00000", "99999"]) {
      const result = validateUsZipCode(zipCode);
      expect(result).toEqual({
        ok: false,
        error:
          "Invalid or unsupported ZIP code. Please try a different ZIP code.",
      });
      expect(JSON.stringify(result)).not.toContain(zipCode);
    }
  });

  it("accepts a real ZIP", () => {
    expect(validateUsZipCode("94102")).toEqual({
      ok: true,
      zipCode: "94102",
    });
  });
});
