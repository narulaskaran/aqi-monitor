import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { startVerification, verifyCode } from "../lib/api";
import { isValidEmail } from "../lib/utils";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  REGEXP_ONLY_DIGITS,
} from "@/components/ui/input-otp";

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

  const verifyButtonRef = useRef<HTMLButtonElement>(null);

    const handleSubscribe = useCallback(async () => {

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

            } catch (err: unknown) {

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

    }, [email, zipCode, setIsLoading, setError, setIsVerifying, setVerificationStatus, setRetryCount, setOtp]);

  

    const handleVerify = useCallback(async () => {

      // Validate code format

      if (otp.length !== 6) {

        setError("Please enter a valid 6-digit verification code");

        return;

      }

  

      try {

        setError(null);

        setIsLoading(true);

  

        const result = await verifyCode(email, zipCode, otp);

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

      } catch (err: unknown) {

        console.error("Code verification error:", err);

        setError(

          err instanceof Error

            ? err.message

            : "An error occurred. Please try again."

        );

      } finally {

        setIsLoading(false);

      }

    }, [email, zipCode, otp, retryCount, setIsLoading, setError, setRetryCount, setOtp, setSuccess, setVerificationStatus]);

  

    const handleResendCode = useCallback(() => {

      // Reset verification state

      setOtp("");

      setIsVerifying(false);

      setError(null);

  

      // Trigger new verification

      handleSubscribe();

    }, [setOtp, setIsVerifying, setError, handleSubscribe]);

  

    useEffect(() => {

      // If all digits are filled and not currently loading, verify the code

      if (otp.length === 6 && !isLoading) {

        handleVerify();

      }

    }, [otp, handleVerify, isLoading]);

  

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

      }

    }, [zipCode, lastZipCode, setSuccess, setIsVerifying, setError, setOtp, setRetryCount]);

  

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
            <InputOTP
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              value={otp}
              onChange={(value) => setOtp(value)}
              autoFocus
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || otp.length < 6}
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
