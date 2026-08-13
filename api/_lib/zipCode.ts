/**
 * US ZIP codes are 5 digits. Cap length before any I/O or logging so
 * oversized / attacker-controlled query values never reach error bodies.
 */
export const MAX_ZIP_CODE_LENGTH = 5;

const ZIP_CODE_PATTERN = /^\d{5}$/;

export function isValidZipCode(zipCode: string): boolean {
  return zipCode.length <= MAX_ZIP_CODE_LENGTH && ZIP_CODE_PATTERN.test(zipCode);
}
