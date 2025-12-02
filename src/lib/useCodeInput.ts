import { useState, useRef } from "react";
import { handlePasteCode } from "./utils";

export function useCodeInput(
  length = 6,
  onComplete?: (code: string[]) => void
) {
  const [code, setCode] = useState(Array(length).fill(""));
  const inputRefs = Array.from({ length }, () =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useRef<HTMLInputElement>(null)
  );

  const handleDigitChange = (idx: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newCode = [...code];
    newCode[idx] = value;
    setCode(newCode);
    if (value && idx < length - 1) inputRefs[idx + 1].current?.focus();
    if (onComplete && newCode.every((d) => d !== "")) onComplete(newCode);
  };

  const handleKeyDown = (
    idx: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && code[idx] === "" && idx > 0)
      inputRefs[idx - 1].current?.focus();
    if (e.key === "ArrowLeft" && idx > 0) inputRefs[idx - 1].current?.focus();
    if (e.key === "ArrowRight" && idx < length - 1)
      inputRefs[idx + 1].current?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    handlePasteCode(e, code, setCode, inputRefs);
    setTimeout(() => {
      const latest = inputRefs.map((ref) => ref.current?.value || "");
      if (onComplete && latest.every((d) => d !== "")) onComplete(latest);
    }, 0);
  };

  return {
    code,
    setCode,
    inputRefs,
    handleDigitChange,
    handleKeyDown,
    handlePaste,
  };
}
