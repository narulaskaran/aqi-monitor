import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Shared helper to handle pasting a 6-digit code into an array of inputs
 * @param e React.ClipboardEvent
 * @param code string[] (current code array)
 * @param setCode (setter for code array)
 * @param inputRefs array of refs for the input elements
 */
export function handlePasteCode(
  e: React.ClipboardEvent,
  code: string[],
  setCode: (code: string[]) => void,
  inputRefs: React.RefObject<HTMLInputElement>[]
) {
  e.preventDefault();
  const pastedData = e.clipboardData.getData("text");
  const digits = pastedData.replace(/\D/g, "").slice(0, 6);
  if (digits.length > 0) {
    const newCode = [...code];
    digits.split("").forEach((digit, index) => {
      if (index < 6) {
        newCode[index] = digit;
      }
    });
    setCode(newCode);
    if (digits.length < 6 && inputRefs[digits.length]) {
      inputRefs[digits.length].current?.focus();
    }
  }
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
