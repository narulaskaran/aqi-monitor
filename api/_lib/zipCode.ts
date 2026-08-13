/**
 * US ZIP codes are 5 digits. The length cap is redundant with the regex but
 * rejects oversized input before pattern matching.
 */
export const MAX_ZIP_CODE_LENGTH = 5;

const ZIP_CODE_PATTERN = /^\d{5}$/;

export function isValidZipCode(zipCode: string): boolean {
  return zipCode.length <= MAX_ZIP_CODE_LENGTH && ZIP_CODE_PATTERN.test(zipCode);
}
