import { useState, useEffect, useRef, useCallback } from "react";
import { isValidEmail } from "../lib/utils";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  REGEXP_ONLY_DIGITS,
} from "@/components/ui/input-otp";

const AUTH_TOKEN_KEY = "aqi_auth_token";

export default function AuthWidget() {
  const [email, setEmail] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [otp, setOtp] = useState("");

  const verifyButtonRef = useRef<HTMLButtonElement>(null);

  // DEV ONLY: Force signed-in state for UI testing without a server
  // useEffect(() => {
  //   setIsSignedIn(true);
  //   setEmail("narulaskaran@gmail.com");
  //   setIsValidatingToken(false);
  // }, []);

  // Restore original useEffect for token validation
  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setIsValidatingToken(false);
      return;
    }
    setIsValidatingToken(true);
    fetch("/api/validate-token", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid token");
        return res.json();
      })
      .then((data) => {
        if (data.valid) {
          setIsSignedIn(true);
          if (data.email) setEmail(data.email);
        } else {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setIsSignedIn(false);
          setEmail("");
        }
      })
      .catch(() => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setIsSignedIn(false);
        setEmail("");
      })
      .finally(() => {
        setIsValidatingToken(false);
      });
  }, []);

  const handleSignIn = () => {
    setShowModal(true);
    setStep("email");
    setEmail("");
    setOtp("");
    setError(null);
  };

  const handleSendCode = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!isValidEmail(email)) throw new Error("Invalid email format");
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, zipCode: "00000" }), // zipCode required by API, dummy for sign-in
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to send code");
    } catch (err: unknown) {
      setError(err.message || "Failed to send code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (otp.length !== 6) throw new Error("Enter 6-digit code");
      const res = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          zipCode: "00000",
          code: otp,
          mode: "signin",
        }),
      });
      const data = await res.json();
      if (!data.success || !data.token)
        throw new Error(data.error || "Invalid code");
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      setIsSignedIn(true);
      setShowModal(false);
    } catch (err: unknown) {
      setError(err.message || "Failed to verify code");
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  }, [otp, email, setIsLoading, setError, setOtp, setIsSignedIn, setShowModal]);

  useEffect(() => {
    if (otp.length === 6) {
      handleVerifyCode();
    }
  }, [otp, handleVerifyCode]);

  const handleSignOut = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setIsSignedIn(false);
    setEmail("");
  };

  return (
    <div className="flex items-center space-x-2">
      {isValidatingToken ? (
        <span className="text-gray-500 dark:text-gray-400 text-sm">
          Loading...
        </span>
      ) : !isSignedIn ? (
        <>
          <button
            className="px-3 py-1 rounded bg-blue-600 text-white"
            onClick={handleSignIn}
          >
            Sign In
          </button>
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg shadow-lg p-6 w-80 relative">
                <button
                  className="absolute top-2 right-2 text-gray-400 dark:text-gray-500"
                  onClick={() => setShowModal(false)}
                >
                  &times;
                </button>
                {step === "email" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendCode();
                    }}
                    className="space-y-4"
                  >
                    <h3 className="text-lg font-semibold">Sign In</h3>
                    <input
                      type="email"
                      className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white rounded py-2 hover:bg-blue-700 focus:outline-none"
                      disabled={isLoading}
                    >
                      {isLoading ? "Sending..." : "Send Code"}
                    </button>
                    {error && (
                      <div className="text-red-500 text-sm">{error}</div>
                    )}
                  </form>
                )}
                {step === "code" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleVerifyCode();
                    }}
                    className="space-y-4"
                  >
                    <h3 className="text-lg font-semibold">
                      Enter Verification Code
                    </h3>
                    <div
                      className="flex gap-2 justify-center"
                    >
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
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white rounded py-2"
                      disabled={isLoading || otp.length < 6}
                      ref={verifyButtonRef}
                    >
                      {isLoading ? "Verifying..." : "Verify Code"}
                    </button>
                    {error && (
                      <div className="text-red-500 text-sm">{error}</div>
                    )}
                  </form>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1 shadow-sm border border-gray-200 dark:border-gray-700">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-500 text-white mr-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 1115 0v.208a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25v-.208z"
              />
            </svg>
          </span>
          <div className="flex flex-col mr-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
              Signed in as
            </span>
            <span
              className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight truncate max-w-[120px]"
              title={email}
            >
              {email}
            </span>
          </div>
          <button
            className="ml-2 px-2 py-1 text-xs rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            onClick={handleSignOut}
            title="Sign Out"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
