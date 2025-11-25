import { useState, useRef, useCallback } from "react";

export function useCodeInput(
  length = 6,
  onComplete?: (code: string[]) => void
) {
  const [code, setCode] = useState(Array(length).fill(""));
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert string value to array format for backward compatibility
  const stringToCodeArray = useCallback(
    (value: string): string[] => {
      const digits = value.replace(/\D/g, "").slice(0, length);
      const codeArray = Array(length).fill("");
      digits.split("").forEach((digit, index) => {
        if (index < length) {
          codeArray[index] = digit;
        }
      });
      return codeArray;
    },
    [length]
  );

  // Convert array format to string value
  const codeArrayToString = useCallback(
    (codeArray: string[]): string => {
      return codeArray.join("");
    },
    []
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Only allow digits
      const digitsOnly = value.replace(/\D/g, "");
      // Limit to length
      const limitedValue = digitsOnly.slice(0, length);
      const newCode = stringToCodeArray(limitedValue);
      setCode(newCode);

      // Trigger onComplete when code is fully entered
      if (onComplete && limitedValue.length === length) {
        onComplete(newCode);
      }
    },
    [length, onComplete, stringToCodeArray]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData("text");
      const digits = pastedData.replace(/\D/g, "").slice(0, length);
      if (digits.length > 0) {
        const newCode = stringToCodeArray(digits);
        setCode(newCode);
        // Update the input value directly
        if (inputRef.current) {
          inputRef.current.value = digits;
        }
        // Trigger onComplete if code is complete
        if (onComplete && digits.length === length) {
          onComplete(newCode);
        }
      }
    },
    [length, onComplete, stringToCodeArray]
  );

  // Maintain backward compatibility: setCode accepts array
  const setCodeWrapper = useCallback(
    (newCode: string[] | ((prev: string[]) => string[])) => {
      if (typeof newCode === "function") {
        setCode((prev) => {
          const updated = newCode(prev);
          // Sync input value
          if (inputRef.current) {
            inputRef.current.value = codeArrayToString(updated);
          }
          return updated;
        });
      } else {
        setCode(newCode);
        // Sync input value
        if (inputRef.current) {
          inputRef.current.value = codeArrayToString(newCode);
        }
      }
    },
    [codeArrayToString]
  );

  // For backward compatibility, return array of refs (but only first one is used)
  const inputRefs = Array.from({ length }, (_, idx) =>
    idx === 0 ? inputRef : { current: null }
  );

  // For backward compatibility, provide handleDigitChange (no-op for single input)
  const handleDigitChange = useCallback(() => {
    // No-op: single input handles changes via handleChange
  }, []);

  // For backward compatibility, provide handleKeyDown (no-op for single input)
  const handleKeyDown = useCallback(() => {
    // No-op: single input handles keyboard events natively
  }, []);

  return {
    code,
    setCode: setCodeWrapper,
    inputRef,
    inputRefs, // For backward compatibility
    handleChange,
    handlePaste,
    handleDigitChange, // For backward compatibility
    handleKeyDown, // For backward compatibility
  };
}
