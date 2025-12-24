import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { startVerification, verifyCode } from "../lib/api";
import { isValidEmail } from "../lib/utils";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "./ui/input-otp";

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
  const [otp, setOtp] = useState("");
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState("");

  const verifyButtonRef = useRef<HTMLButtonElement>(null);

  // Reset form when ZIP code changes
  useEffect(() => {
    if (zipCode !== lastZipCode) {
      // Reset the form state when ZIP code changes
      setLastZipCode(zipCode);
      setSuccess(false);
      setIsVerifying(false);
      setError(null);
      setOtp("");
      setRetryCount(0);
      setHasEndDate(false);
      setEndDate("");
    }

  }, [zipCode, lastZipCode]);

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
        setOtp("");
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
    // Validate code format
    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }

    // Validate end date if provided
    if (hasEndDate && endDate) {
      const selectedDate = new Date(endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        setError("End date must be today or in the future");
        return;
      }
    }

    try {
      setError(null);
      setIsLoading(true);

      // Pass expiresAt if end date is set
      const expiresAt = hasEndDate && endDate ? new Date(endDate).toISOString() : undefined;
      const result = await verifyCode(email, zipCode, otp, expiresAt);
      console.log("Code verification response:", result);

      if (result.success && result.valid) {
        setSuccess(true);
        setVerificationStatus("approved");
      } else {
        // Increment retry count
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);

        // Clear the verification code
        setOtp("");

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
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = () => {
    // Reset verification state
    setOtp("");
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

          {/* Optional end date section */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={hasEndDate}
                onChange={(e) => {
                  setHasEndDate(e.target.checked);
                  if (!e.target.checked) {
                    setEndDate("");
                  }
                }}
                disabled={isLoading}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-700">Set an end date for this subscription (optional)</span>
            </label>

            {hasEndDate && (
              <div className="ml-6 space-y-1">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  disabled={isLoading}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Your subscription will automatically end on this date
                </p>
              </div>
            )}
          </div>

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
            <div className="flex justify-center w-full">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => {
                  setOtp(value);
                }}
                onComplete={() => verifyButtonRef.current?.click()}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="w-10 h-12 text-lg" />
                  <InputOTPSlot index={1} className="w-10 h-12 text-lg" />
                  <InputOTPSlot index={2} className="w-10 h-12 text-lg" />
                  <InputOTPSlot index={3} className="w-10 h-12 text-lg" />
                  <InputOTPSlot index={4} className="w-10 h-12 text-lg" />
                  <InputOTPSlot index={5} className="w-10 h-12 text-lg" />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
            <Button
              type="submit"
              className="flex-1"
              disabled={
                isLoading || otp.length !== 6
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
