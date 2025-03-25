import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { trpc } from "../lib/trpc";

interface SubscriptionFormProps {
  zipCode: string;
}

// Function to format phone number to E.164 format
const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // For US numbers, ensure it starts with +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  // If it already includes country code
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  return phone;
};

// Function to validate phone number
const isValidPhoneNumber = (phone: string): boolean => {
  // Basic US phone number validation (10 digits or 11 digits starting with 1)
  const digits = phone.replace(/\D/g, "");
  return (
    digits.length === 10 || (digits.length === 11 && digits.startsWith("1"))
  );
};

export function SubscriptionForm({ zipCode }: SubscriptionFormProps) {
  const [phone, setPhone] = useState("");
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
      if (!isValidPhoneNumber(phone)) {
        setError(
          "Please enter a valid US phone number (e.g., 1234567890 or +11234567890)"
        );
        return;
      }

      setError(null);
      setIsLoading(true);

      const formattedPhone = formatPhoneNumber(phone);
      console.log("Sending verification to:", formattedPhone); // Debug log

      const result = await trpc.startVerification.mutate({
        phone: formattedPhone,
        zipCode,
      });

      if (result.success) {
        setIsVerifying(true);
        setVerificationStatus(result.status || "pending");
      } else {
        setError(
          result.error || "Failed to send verification code. Please try again."
        );
      }
    } catch (err) {
      console.error("Verification error:", err); // Debug log
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
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      const formattedPhone = formatPhoneNumber(phone);
      const result = await trpc.verifyCode.mutate({
        phone: formattedPhone,
        zipCode,
        code: verificationCode,
      });

      if (result.success && result.valid) {
        setSuccess(true);
        setVerificationStatus("approved");
      } else {
        setError(
          result.error || "Invalid verification code. Please try again."
        );
      }
    } catch (err) {
      console.error("Code verification error:", err); // Debug log
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
          You will now receive text alerts about air quality changes for your
          area.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">
        Get Air Quality Alerts via Text
      </h3>
      {!isVerifying ? (
        <div className="space-y-4">
          <Input
            type="tel"
            placeholder="Enter your phone number (e.g., 1234567890)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
