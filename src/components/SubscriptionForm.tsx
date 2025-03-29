import { useState, KeyboardEvent } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { startVerification, verifyCode } from "../lib/api";

interface SubscriptionFormProps {
  zipCode: string;
}

// Function to validate email
const isValidEmail = (email: string): boolean => {
  // Basic email validation using regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export function SubscriptionForm({ zipCode }: SubscriptionFormProps) {
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

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
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      
      const result = await verifyCode(email, zipCode, verificationCode);
      console.log("Code verification response:", result);
      
      if (result.success && result.valid) {
        setSuccess(true);
        setVerificationStatus("approved");
      } else {
        throw new Error(result.error || "Invalid verification code");
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
        <div className="space-y-4">
          <Input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
          <Button
            onClick={handleSubscribe}
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Sign Up for Alerts"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {verificationStatus && (
            <p className="text-sm text-gray-600">
              Verification status: {verificationStatus}
            </p>
          )}
          <Input
            type="text"
            placeholder="Enter 6-digit verification code"
            value={verificationCode}
            onChange={(e) =>
              setVerificationCode(e.target.value.replace(/\D/g, ""))
            }
            onKeyUp={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") {
                handleVerify();
              }
            }}
            maxLength={6}
            disabled={isLoading}
          />
          <Button
            onClick={handleVerify}
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Verifying..." : "Verify Code"}
          </Button>
        </div>
      )}
      {error && <div className="mt-2 text-red-500">{error}</div>}
    </div>
  );
}