import { useEffect, useState } from "react";
import AdminControls from "../components/AdminControls";

/**
 * Admin page for triggering cron jobs and other administrative tasks
 */
export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Check admin authentication status
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Check if user is authenticated
  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/admin/check-auth", {
        credentials: "include", // Important for cookies
      });
      if (response.ok) {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
    }
  };

  // Handle admin authentication
  const handleAdminAuthentication = async () => {
    try {
      setError("");
      const response = await fetch("/api/admin-auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
        credentials: "include", // Important for cookies
      });

      const data = await response.json();

      if (response.ok) {
        setIsAuthenticated(true);
        setPassword(""); // Clear password field
      } else {
        setError(data.error || "Authentication failed");
      }
    } catch (error) {
      setError("An error occurred during authentication");
      console.error("Auth error:", error);
    }
  };

  // Handle keypress for password field
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdminAuthentication();
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">
        AQI Monitor Administration
      </h1>

      {isAuthenticated ? (
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Air Quality Data Update</h2>
            <p className="text-gray-600">
              Manually trigger the air quality data update for all subscribed
              ZIP codes. This is normally run daily via a scheduled cron job.
            </p>
            <AdminControls />
          </section>

          <section className="space-y-4 pt-4 border-t">
            <h2 className="text-xl font-semibold">System Information</h2>
            <p className="text-gray-600">
              The cron job is configured to run daily at midnight UTC. It
              updates air quality data for all active subscriptions and sends
              alerts if air quality thresholds are exceeded.
            </p>
          </section>
        </div>
      ) : (
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Admin Authentication</h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Enter admin password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter password"
              />
              {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            </div>
            <button
              onClick={handleAdminAuthentication}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Log In
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
