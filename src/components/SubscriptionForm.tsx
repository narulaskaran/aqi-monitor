import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { trpc } from "../lib/trpc";

interface SubscriptionFormProps {
  zipCode: string;
}

export function SubscriptionForm({ zipCode }: SubscriptionFormProps) {
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(
    null
  );

  const handleSubscribe = async () => {
    try {
      setError(null);
      const result = await trpc.startVerification.mutate({ phone, zipCode });
      if (result.success) {
        setIsVerifying(true);
        setVerificationStatus(result.status || "pending");
      } else {
        setError(
          result.error || "Failed to send verification code. Please try again."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again."
      );
    }
  };

  const handleVerify = async () => {
    try {
      setError(null);
      const result = await trpc.verifyCode.mutate({
        phone,
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
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again."
      );
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
            placeholder="Enter your phone number (e.g., +1234567890)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Button onClick={handleSubscribe} className="w-full">
            Sign Up for Alerts
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
            onChange={(e) => setVerificationCode(e.target.value)}
            maxLength={6}
          />
          <Button onClick={handleVerify} className="w-full">
            Verify Code
          </Button>
        </div>
      )}
      {error && <div className="mt-2 text-red-500">{error}</div>}
    </div>
  );
}
