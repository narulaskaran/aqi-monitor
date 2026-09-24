import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { startVerification, verifyCode } from "../lib/api";
import { isValidEmail, normalizeOtpCode, OTP_LENGTH } from "../lib/utils";
import { useAuth } from "../lib/auth";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "./ui/input-otp";

interface SubscriptionFormProps {
  zipCode: string;
}

export function SubscriptionForm({ zipCode }: SubscriptionFormProps) {
  const { isSignedIn, email: authEmail, token, isValidating } = useAuth();
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
  const [hasDateRange, setHasDateRange] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAlertAqi, setMinAlertAqi] = useState<number | null>(null);

  // Prevents duplicate / overlapping verify calls (onComplete + form submit,
  // or onComplete firing more than once while a request is in flight).
  const verifyingRef = useRef(false);
  const handleVerifyRef = useRef<(code?: string) => Promise<void>>(
    async () => undefined
  );

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
      setHasDateRange(false);
      setStartDate("");
      setEndDate("");
      setMinAlertAqi(null);
      verifyingRef.current = false;
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

  // Validates the optional date range, returning an error message or null
  const validateDateRange = (): string | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (hasDateRange && startDate) {
      const selectedStart = new Date(startDate);
      if (selectedStart < today) {
        return "Start date must be today or in the future";
      }
    }

    if (hasDateRange && endDate) {
      const selectedEnd = new Date(endDate);
      if (selectedEnd < today) {
        return "End date must be today or in the future";
      }
      if (startDate) {
        const selectedStart = new Date(startDate);
        if (selectedStart >= selectedEnd) {
          return "Start date must be before end date";
        }
      }
    }

    return null;
  };

  // Creates a subscription directly for an already-authenticated user,
  // bypassing the email + OTP flow since their session already proves
  // ownership of the email address.
  const handleSubscribeAuthenticated = async () => {
    if (!zipCode) {
      setError("ZIP code is required");
      return;
    }

    const dateRangeError = validateDateRange();
    if (dateRangeError) {
      setError(dateRangeError);
      return;
    }

    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      const startsAt = hasDateRange && startDate ? new Date(startDate).toISOString() : undefined;
      const expiresAt = hasDateRange && endDate ? new Date(endDate).toISOString() : undefined;
      const result =
        minAlertAqi === null
          ? await verifyCode(undefined, zipCode, undefined, expiresAt, startsAt, token)
          : await verifyCode(
              undefined,
              zipCode,
              undefined,
              expiresAt,
              startsAt,
              token,
              minAlertAqi,
            );
      if (!result.success || !result.valid) {
        throw new Error(result.error || "Failed to create subscription");
      }
      setSuccess(true);
    } catch (err) {
      console.error("Error creating subscription:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (codeOverride?: string) => {
    const code = normalizeOtpCode(codeOverride ?? otp);

    // Never hit the API (or the client-side attempt counter) until all
    // 6 digits are present. Partial onComplete / Enter submits used to
    // burn attempts and lock the user out of a still-valid code.
    if (code.length !== OTP_LENGTH) {
      if (codeOverride === undefined) {
        setError("Please enter a valid 6-digit verification code");
      }
      return;
    }

    if (verifyingRef.current || isLoading) {
      return;
    }

    const dateRangeError = validateDateRange();
    if (dateRangeError) {
      setError(dateRangeError);
      return;
    }

    verifyingRef.current = true;

    try {
      setError(null);
      setIsLoading(true);

      // Pass startsAt and expiresAt if date range is set
      const startsAt = hasDateRange && startDate ? new Date(startDate).toISOString() : undefined;
      const expiresAt = hasDateRange && endDate ? new Date(endDate).toISOString() : undefined;
      const result =
        minAlertAqi === null
          ? await verifyCode(email, zipCode, code, expiresAt, startsAt)
          : await verifyCode(email, zipCode, code, expiresAt, startsAt, undefined, minAlertAqi);
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
      verifyingRef.current = false;
      setIsLoading(false);
    }
  };

  handleVerifyRef.current = handleVerify;

  // Stable callback so input-otp's onComplete effect does not re-fire
  // just because the parent re-rendered with a new function identity.
  const handleOtpComplete = useCallback((value: string) => {
    const code = normalizeOtpCode(value);
    if (code.length !== OTP_LENGTH) {
      return;
    }
    void handleVerifyRef.current(code);
  }, []);

  const handleOtpChange = (value: string) => {
    setOtp(normalizeOtpCode(value));
    setError(null);
  };

  const handleResendCode = () => {
    // Reset verification state
    setOtp("");
    setIsVerifying(false);
    setError(null);
    verifyingRef.current = false;

    // Trigger new verification
    handleSubscribe();
  };

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{isSignedIn ? "Subscribed" : "Verification successful"}</CardTitle>
        </CardHeader>
        <CardContent className="app-alert-success text-sm" role="status" aria-live="polite">
          You'll get an email when air quality changes for {zipCode}.
        </CardContent>
      </Card>
    );
  }

  const dateRangeSection = (
    <div className="app-alert-options">
      <div className="app-alert-field">
        <label htmlFor="min-alert-aqi" className="app-alert-label">
          Only email me when AQI is at least…
        </label>
        <p id="min-alert-aqi-help" className="app-alert-helper">
          Choose the lowest AQI category that should send an email.
        </p>
        <select
          id="min-alert-aqi"
          aria-label="Minimum AQI threshold"
          aria-describedby="min-alert-aqi-help"
          value={minAlertAqi ?? ""}
          onChange={(e) => setMinAlertAqi(e.target.value ? Number(e.target.value) : null)}
          disabled={isLoading}
          className="app-alert-select"
        >
          <option value="">All updates</option>
          <option value="51">Moderate (51+)</option>
          <option value="101">Unhealthy for Sensitive Groups (101+)</option>
          <option value="151">Unhealthy (151+)</option>
        </select>
      </div>
      <label className="app-alert-checkbox-label">
        <input
          type="checkbox"
          checked={hasDateRange}
          onChange={(e) => {
            setHasDateRange(e.target.checked);
            if (!e.target.checked) {
              setStartDate("");
              setEndDate("");
            }
          }}
          disabled={isLoading}
          className="app-alert-checkbox"
        />
        <span>Schedule this subscription (optional)</span>
      </label>

      {hasDateRange && (
        <div className="app-alert-date-range">
          <div className="app-alert-field">
            <label htmlFor="alert-start-date" className="app-alert-label-small">
              Start date
            </label>
            <p className="app-alert-helper">
              Alerts begin on this date; leave empty to start immediately.
            </p>
            <Input
              id="alert-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              disabled={isLoading}
              className="w-full"
              aria-label="Start date"
            />
          </div>
          <div className="app-alert-field">
            <label htmlFor="alert-end-date" className="app-alert-label-small">
              End date
            </label>
            <p className="app-alert-helper">
              Alerts stop on this date; leave empty to never expire.
            </p>
            <Input
              id="alert-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || new Date().toISOString().split("T")[0]}
              disabled={isLoading}
              className="w-full"
              aria-label="End date"
            />
          </div>
        </div>
      )}
    </div>
  );

  if (isValidating) {
    return (
      <Card>
        <CardContent className="app-alert-status text-sm" role="status" aria-live="polite">
          Checking sign-in status...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {isSignedIn ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubscribeAuthenticated();
            }}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">
              Signed in as <strong>{authEmail}</strong>
            </p>

            {dateRangeSection}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Subscribing..." : "Sign up for alerts"}
            </Button>
          </form>
        ) : !isVerifying ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubscribe();
            }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <label
                htmlFor="alert-email"
                className="text-sm font-medium text-muted-foreground"
              >
                Email address
              </label>
              <Input
                id="alert-email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {dateRangeSection}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending..." : "Sign up for alerts"}
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
              <p className="text-sm text-muted-foreground">
                We've sent a verification code to <strong>{email}</strong>. Please
                check your inbox.
              </p>
            )}

            {/* Verification code input */}
            <div className="flex flex-col items-center space-y-3">
              <label
                id="verification-code-label"
                className="text-sm font-medium text-muted-foreground"
              >
                Enter verification code
              </label>
              <div className="flex justify-center w-full">
                <InputOTP
                  maxLength={OTP_LENGTH}
                  value={otp}
                  onChange={handleOtpChange}
                  onComplete={handleOtpComplete}
                  autoFocus
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  disabled={isLoading}
                  aria-labelledby="verification-code-label"
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
                  isLoading || otp.length !== OTP_LENGTH
                }
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
        {error && (
          <div
            id="alert-form-error"
            className="app-alert-error"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
