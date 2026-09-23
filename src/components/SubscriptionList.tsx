import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../lib/auth";
import { getSubscriptions, updateSubscription } from "../lib/api";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Modal } from "./ui/modal";

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
  minAlertAqi: number | null;
}

interface PendingToggle {
  id: string;
  currentActive: boolean;
}

export function SubscriptionList() {
  const { isSignedIn, token, signOut } = useAuth();
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
      const message =
        err instanceof Error ? err.message : "Failed to load subscriptions";
      // Expired/invalid session: clear it so the user can sign in again
      if (message.includes("401")) {
        signOut();
        return;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [token, signOut]);

  useEffect(() => {
    if (isSignedIn) {
      fetchSubscriptions();
    }
  }, [isSignedIn, fetchSubscriptions]);

  if (!isSignedIn) return null;

  const handleToggleClick = (sub: Subscription) => {
    setPendingToggle({ id: sub.id, currentActive: sub.active });
  };

  const handleThresholdChange = async (sub: Subscription, value: string) => {
    if (!token) return;
    setIsUpdating(true);
    try {
      await updateSubscription(
        token,
        sub.id,
        undefined,
        value === "" ? null : Number(value),
      );
      await fetchSubscriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update subscription");
    } finally {
      setIsUpdating(false);
    }
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
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Your subscriptions</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}

          {error && (
            <p className="text-sm text-red-500 mb-2">{error}</p>
          )}

          {!isLoading && !error && subscriptions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No subscriptions yet.
            </p>
          )}

          {!isLoading && subscriptions.length > 0 && (
            <ul className="space-y-2">
              {subscriptions.map((sub) => (
                <li
                  key={sub.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">
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
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="sr-only">Minimum AQI for {sub.zipCode}</span>
                      <select
                        aria-label={`Minimum AQI for ${sub.zipCode}`}
                        value={sub.minAlertAqi ?? ""}
                        onChange={(e) => void handleThresholdChange(sub, e.target.value)}
                        disabled={isUpdating}
                        className="h-8 rounded-md border border-input bg-card px-2 text-xs text-foreground"
                      >
                        <option value="">All updates</option>
                        <option value="51">Moderate (51+)</option>
                        <option value="101">Sensitive groups (101+)</option>
                        <option value="151">Unhealthy (151+)</option>
                      </select>
                    </label>
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
        </CardContent>
      </Card>

      {/* Confirmation modal (outside the Card so a card backdrop-filter can't
          become the containing block for the modal's fixed overlay) */}
      {pendingToggle && pendingSub && (
        <Modal>
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
        </Modal>
      )}
    </>
  );
}
