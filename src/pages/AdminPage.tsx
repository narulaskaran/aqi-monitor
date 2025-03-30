import { useEffect, useState } from 'react';
import AdminControls from "../components/AdminControls";

/**
 * Admin page for triggering cron jobs and other administrative tasks
 */
export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  
  // Simplified admin authentication
  // In a real app, this should be a proper authentication flow
  const handleAdminAuthentication = () => {
    // Check against a simple password (this is NOT secure, just for demo)
    // A real system would use proper auth
    if (password === 'aqiadmin') {
      setIsAuthenticated(true);
      // Store in session storage so it persists during the session
      sessionStorage.setItem('aqi-admin-auth', 'true');
    } else {
      alert('Invalid password');
    }
  };
  
  // Check for existing authentication
  useEffect(() => {
    const existingAuth = sessionStorage.getItem('aqi-admin-auth');
    if (existingAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);
  
  // Handle keypress for password field
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdminAuthentication();
    }
  };
  
  return (
    <div className="container max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">AQI Monitor Administration</h1>
      
      {isAuthenticated ? (
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Air Quality Data Update</h2>
            <p className="text-gray-600">
              Manually trigger the air quality data update for all subscribed ZIP codes.
              This is normally run daily via a scheduled cron job.
            </p>
            <AdminControls />
          </section>
          
          <section className="space-y-4 pt-4 border-t">
            <h2 className="text-xl font-semibold">System Information</h2>
            <p className="text-gray-600">
              The cron job is configured to run daily at midnight UTC. It updates air quality data
              for all active subscriptions and sends alerts if air quality thresholds are exceeded.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800">Troubleshooting Tips</h3>
              <ul className="list-disc pl-5 mt-2 text-blue-700 text-sm">
                <li>If the cron job fails, check the server logs for error details</li>
                <li>Make sure CRON_SECRET is properly set in the environment variables</li>
                <li>Verify that the API key entered matches the CRON_SECRET value</li>
                <li>Confirm database connection is working properly</li>
              </ul>
            </div>
          </section>
        </div>
      ) : (
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Admin Authentication</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
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