import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../lib/auth";
import { getSubscriptions, updateSubscription } from "../lib/api";
import { Button } from "./ui/button";

interface Subscription {
  id: string;
  zipCode: string;
  active: boolean;
  email: string;
  createdAt: string;
  updatedAt: string;
  activatedAt: string | null;
  lastEmailSentAt: string | null;
  expiresAt: string | null;
}

interface PendingToggle {
  id: string;
  currentActive: boolean;
}

export function SubscriptionList() {
  const { isSignedIn, token } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingToggle, setPendingToggle] = useState<PendingToggle | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSubscriptions(token);
      setSubscriptions(data.subscriptions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subscriptions");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isSignedIn) {
      fetchSubscriptions();
    }
  }, [isSignedIn, fetchSubscriptions]);

  if (!isSignedIn) return null;

  const handleToggleClick = (sub: Subscription) => {
    setPendingToggle({ id: sub.id, currentActive: sub.active });
  };

  const handleConfirm = async () => {
    if (!pendingToggle || !token) return;
    setIsUpdating(true);
    try {
      await updateSubscription(token, pendingToggle.id, !pendingToggle.currentActive);
      setPendingToggle(null);
      await fetchSubscriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update subscription");
      setPendingToggle(null);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setPendingToggle(null);
  };

  const pendingSub = pendingToggle
    ? subscriptions.find((s) => s.id === pendingToggle.id)
    : null;

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Your Subscriptions
      </h2>

      {isLoading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      )}

      {error && (
        <p className="text-sm text-red-500 mb-2">{error}</p>
      )}

      {!isLoading && !error && subscriptions.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No subscriptions yet.
        </p>
      )}

      {subscriptions.length > 0 && (
        <ul className="space-y-2">
          {subscriptions.map((sub) => (
            <li
              key={sub.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                  {sub.zipCode}
                </span>
                {sub.active ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900 px-2 py-0.5 text-xs font-medium text-green-800 dark:text-green-200">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                    Inactive
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant={sub.active ? "destructive" : "default"}
                onClick={() => handleToggleClick(sub)}
              >
                {sub.active ? "Deactivate" : "Reactivate"}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Confirmation modal */}
      {pendingToggle && pendingSub && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg shadow-lg p-6 w-80 relative">
            <h3 className="text-lg font-semibold mb-3">Confirm</h3>
            <p className="text-sm mb-5">
              {pendingSub.active
                ? `Deactivate subscription for ZIP code ${pendingSub.zipCode}?`
                : `Reactivate subscription for ZIP code ${pendingSub.zipCode}?`}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isUpdating}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant={pendingSub.active ? "destructive" : "default"}
                onClick={handleConfirm}
                disabled={isUpdating}
              >
                {isUpdating ? "Saving..." : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
