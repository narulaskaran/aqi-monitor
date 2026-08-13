/**
 * US ZIP code format and deliverability checks.
 *
 * Client-side validation only requires five digits, which lets fake ZIPs such
 * as 00000 / 99999 through. Nominatim's free-text search then matches those
 * against unrelated US places (or OSM's own bogus postcodes) and we return
 * live-looking AQI. This module rejects those before geocoding or cache lookup.
 *
 * Error messages never interpolate the raw input so attacker-controlled
 * strings cannot be reflected in API responses.
 */
import zipcodes from "zipcodes-us";

export const MAX_ZIP_CODE_LENGTH = 5;
export const ZIP_CODE_PATTERN = /^\d{5}$/;

/**
 * USPS ZIP prefixes for territories that GeoNames-based datasets often omit.
 * These are still valid USPS codes and are confirmed via structured geocoding.
 */
const TERRITORY_PREFIXES = new Set(["006", "007", "008", "009", "969"]);

/** American Samoa uses 96799 (prefix 967 is otherwise Hawaii). */
const TERRITORY_ZIPS = new Set(["96799"]);

export function isFiveDigitZipCode(zipCode: string): boolean {
  return (
    zipCode.length <= MAX_ZIP_CODE_LENGTH && ZIP_CODE_PATTERN.test(zipCode)
  );
}

/** Format-only check kept for callers that do not need deliverability. */
export function isValidZipCode(zipCode: string): boolean {
  return isFiveDigitZipCode(zipCode);
}

export function isUsTerritoryZipCode(zipCode: string): boolean {
  if (!isFiveDigitZipCode(zipCode)) {
    return false;
  }
  return (
    TERRITORY_PREFIXES.has(zipCode.slice(0, 3)) || TERRITORY_ZIPS.has(zipCode)
  );
}

/**
 * True when the ZIP is a known deliverable USPS code, or a US territory ZIP
 * that we verify later via geocoding.
 */
export function isDeliverableUsZipCode(zipCode: string): boolean {
  if (!isFiveDigitZipCode(zipCode)) {
    return false;
  }
  if (zipcodes.find(zipCode).isValid) {
    return true;
  }
  return isUsTerritoryZipCode(zipCode);
}

export function lookupUsZipCoordinates(
  zipCode: string,
): { latitude: number; longitude: number } | null {
  if (!isFiveDigitZipCode(zipCode)) {
    return null;
  }
  const result = zipcodes.find(zipCode);
  if (!result.isValid) {
    return null;
  }
  return { latitude: result.latitude, longitude: result.longitude };
}

export function validateUsZipCode(
  zipCode: unknown,
): { ok: true; zipCode: string } | { ok: false; error: string } {
  if (!zipCode || typeof zipCode !== "string") {
    return { ok: false, error: "ZIP code is required" };
  }
  if (!isFiveDigitZipCode(zipCode)) {
    return { ok: false, error: "ZIP code must be a 5-digit number" };
  }
  if (!isDeliverableUsZipCode(zipCode)) {
    return {
      ok: false,
      error:
        "Invalid or unsupported ZIP code. Please try a different ZIP code.",
    };
  }
  return { ok: true, zipCode };
}
