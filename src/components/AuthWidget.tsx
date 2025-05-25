import { useState, useEffect, useRef } from "react";
import { isValidEmail } from "../lib/utils";
import { useCodeInput } from "../lib/useCodeInput";

const AUTH_TOKEN_KEY = "aqi_auth_token";

export default function AuthWidget() {
  const [email, setEmail] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyButtonRef = useRef<HTMLButtonElement>(null);
  const {
    code,
    setCode,
    inputRefs,
    handleDigitChange,
    handleKeyDown,
    handlePaste,
  } = useCodeInput(6, () => verifyButtonRef.current?.click());

  // On mount, check for token and (optionally) fetch user info
  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      // Optionally decode token to get email, or fetch from backend
      // For sketch, just mark as signed in
      setIsSignedIn(true);
      // setEmail(decodedEmail);
    }
  }, []);

  const handleSignIn = () => {
    setShowModal(true);
    setStep("email");
    setEmail("");
    setCode(["", "", "", "", "", ""]);
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
      setStep("code");
      setTimeout(() => inputRefs[0].current?.focus(), 100);
    } catch (err: any) {
      setError(err.message || "Failed to send code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const codeStr = code.join("");
      if (codeStr.length !== 6) throw new Error("Enter 6-digit code");
      const res = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          zipCode: "00000",
          code: codeStr,
          mode: "signin",
        }),
      });
      const data = await res.json();
      if (!data.success || !data.token)
        throw new Error(data.error || "Invalid code");
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      setIsSignedIn(true);
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || "Failed to verify code");
      setCode(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs[0].current?.focus(), 100);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setIsSignedIn(false);
    setEmail("");
  };

  return (
    <div className="flex items-center space-x-2">
      {!isSignedIn ? (
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
                      onPaste={handlePaste}
                    >
                      {[0, 1, 2, 3, 4, 5].map((idx) => (
                        <input
                          key={idx}
                          ref={inputRefs[idx]}
                          className="w-10 h-12 text-center text-lg font-medium border rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700"
                          type="text"
                          maxLength={1}
                          value={code[idx]}
                          onChange={(e) =>
                            handleDigitChange(idx, e.target.value)
                          }
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          disabled={isLoading}
                          autoComplete="one-time-code"
                        />
                      ))}
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white rounded py-2"
                      disabled={isLoading || code.some((d) => d === "")}
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
        <>
          <span className="text-sm text-gray-700">
            Signed in{email && ` as ${email}`}
          </span>
          <button
            className="px-3 py-1 rounded bg-gray-200 text-gray-800"
            onClick={handleSignOut}
          >
            Sign Out
          </button>
        </>
      )}
    </div>
  );
}
