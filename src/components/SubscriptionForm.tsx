import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { startVerification, verifyCode } from "../lib/api";
import { isValidEmail } from "../lib/utils";
import { useCodeInput } from "../lib/useCodeInput";

interface SubscriptionFormProps {
  zipCode: string;
}

export function SubscriptionForm({ zipCode }: SubscriptionFormProps) {
  const [email, setEmail] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastZipCode, setLastZipCode] = useState(zipCode);

  const verifyButtonRef = useRef<HTMLButtonElement>(null);
  const {
    code: verificationCode,
    setCode: setVerificationCode,
    inputRefs,
    handleDigitChange,
    handleKeyDown,
    handlePaste,
  } = useCodeInput(6, () => verifyButtonRef.current?.click());

  // Reset form when ZIP code changes
  useEffect(() => {
    if (zipCode !== lastZipCode) {
      // Reset the form state when ZIP code changes
      setLastZipCode(zipCode);
      setSuccess(false);
      setIsVerifying(false);
      setError(null);
      setVerificationCode(["", "", "", "", "", ""]);
      setRetryCount(0);
    }
  }, [zipCode, lastZipCode]);

  // Check if all digits are filled when code changes
  useEffect(() => {
    // If all digits are filled and not currently loading, verify the code
    if (verificationCode.every((digit) => digit !== "") && !isLoading) {
      handleVerify();
    }
  }, [verificationCode]);

  const handleSubscribe = async () => {
    try {
      if (!isValidEmail(email)) {
        setError(
          "Please enter a valid email address (e.g., example@domain.com)"
        );
        return;
      }

      if (!zipCode) {
        setError("ZIP code is required");
        return;
      }

      setError(null);
      setIsLoading(true);

      console.log("Starting verification for:", { email, zipCode });

      const result = await startVerification(email, zipCode);
      console.log("Verification response:", result);

      if (result.success) {
        setIsVerifying(true);
        setVerificationStatus(result.status || "pending");
        // Reset retry count when starting a new verification
        setRetryCount(0);
        // Clear any existing verification code
        setVerificationCode(["", "", "", "", "", ""]);
        // Focus the first input
        setTimeout(() => {
          inputRefs[0].current?.focus();
        }, 100);
      } else {
        throw new Error(result.error || "Failed to send verification code");
      }
    } catch (err) {
      console.error("Verification error:", err);
      // Log more details about the error
      if (err instanceof Error) {
        console.error("Error details:", {
          message: err.message,
          name: err.name,
          stack: err.stack,
        });
      } else {
        console.error("Unknown error type:", err);
      }
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    // Join the digits to form the complete code
    const completeCode = verificationCode.join("");

    // Validate code format
    if (completeCode.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      const result = await verifyCode(email, zipCode, completeCode);
      console.log("Code verification response:", result);

      if (result.success && result.valid) {
        setSuccess(true);
        setVerificationStatus("approved");
      } else {
        // Increment retry count
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);

        // Clear the verification code
        setVerificationCode(["", "", "", "", "", ""]);

        // If too many failed attempts, offer to resend
        if (newRetryCount >= 3) {
          throw new Error(
            "Too many invalid attempts. Try requesting a new code."
          );
        } else {
          throw new Error(
            result.error || "Invalid verification code. Please try again."
          );
        }
      }
    } catch (err) {
      console.error("Code verification error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again."
      );
      // Focus the first input after error
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 100);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = () => {
    // Reset verification state
    setVerificationCode(["", "", "", "", "", ""]);
    setIsVerifying(false);
    setError(null);

    // Trigger new verification
    handleSubscribe();
  };

  if (success) {
    return (
      <div className="mt-4 p-4 bg-green-100 rounded-lg text-green-800">
        <p className="font-semibold">Verification successful! 🎉</p>
        <p className="mt-2">
          You will now receive email alerts about air quality changes for your
          area.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">
        Get Air Quality Alerts via Email
      </h3>
      {!isVerifying ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubscribe();
          }}
          className="space-y-4"
        >
          <Input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Sending..." : "Sign Up for Alerts"}
          </Button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify();
          }}
          className="space-y-4"
        >
          {verificationStatus && (
            <p className="text-sm text-gray-600">
              We've sent a verification code to <strong>{email}</strong>. Please
              check your inbox.
            </p>
          )}

          {/* Verification code input */}
          <div className="flex flex-col items-center space-y-3">
            <label className="text-sm font-medium text-gray-600">
              Enter verification code
            </label>
            <div
              className="flex gap-2 w-full justify-center"
              onPaste={handlePaste}
            >
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="w-10 h-12">
                  <input
                    ref={inputRefs[index]}
                    className="w-full h-full text-center text-lg font-medium border rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700"
                    type="text"
                    maxLength={1}
                    value={verificationCode[index]}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={isLoading}
                    autoComplete="one-time-code"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
            <Button
              type="submit"
              className="flex-1"
              disabled={
                isLoading || verificationCode.some((digit) => digit === "")
              }
              ref={verifyButtonRef}
            >
              {isLoading ? "Verifying..." : "Verify Code"}
            </Button>
            <Button
              onClick={handleResendCode}
              className="sm:w-auto"
              variant="outline"
              disabled={isLoading}
              type="button"
            >
              Resend Code
            </Button>
          </div>
        </form>
      )}
      {error && <div className="mt-2 text-red-500">{error}</div>}
    </div>
  );
}
