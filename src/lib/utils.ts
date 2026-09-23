import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns a Tailwind background color class for a given AQI index value.
 * Matches the EPA AQI color scale.
 */
export function getAQIColor(index: number): string {
  if (index <= 50) return "bg-green-100";
  if (index <= 100) return "bg-yellow-100";
  if (index <= 150) return "bg-orange-100";
  if (index <= 200) return "bg-red-100";
  if (index <= 300) return "bg-purple-100";
  return "bg-maroon-100";
}

/** Length of email verification OTP codes. */
export const OTP_LENGTH = 6;

/**
 * Keep only the leading digits of an OTP, capped at {@link OTP_LENGTH}.
 * Strips spaces, dashes, and other characters that email clients insert
 * when a user copies a code.
 */
export function normalizeOtpCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
