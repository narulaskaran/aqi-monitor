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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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
      setStatusMessage(`Minimum AQI threshold updated for ZIP code ${sub.zipCode}.`);
      await fetchSubscriptions();
    } catch (err) {
      setStatusMessage(null);
      setError(err instanceof Error ? err.message : "Failed to update subscription");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirm = async () => {
    if (!pendingToggle || !token) return;
    setIsUpdating(true);
    try {
      const nextActive = !pendingToggle.currentActive;
      const subscription = subscriptions.find((sub) => sub.id === pendingToggle.id);
      await updateSubscription(token, pendingToggle.id, nextActive);
      setPendingToggle(null);
      setStatusMessage(
        `Subscription for ZIP code ${subscription?.zipCode ?? ""} ${nextActive ? "reactivated" : "deactivated"}.`,
      );
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
        <CardContent aria-busy={isLoading}>
          {isLoading && (
            <p className="app-subscription-status-message" role="status" aria-live="polite">
              Loading your subscriptions…
            </p>
          )}

          {error && (
            <p className="app-subscription-error" role="alert" aria-live="polite">
              {error}
            </p>
          )}

          {statusMessage && (
            <p className="app-subscription-status-message" role="status" aria-live="polite">
              {statusMessage}
            </p>
          )}

          {!isLoading && !error && subscriptions.length === 0 && (
            <div className="app-subscription-empty">
              <p>No subscriptions yet.</p>
              <p>Sign up for email alerts from an air quality result to see them here.</p>
            </div>
          )}

          {!isLoading && subscriptions.length > 0 && (
            <ul className="app-subscription-list">
              {subscriptions.map((sub) => (
                <li key={sub.id} className="app-subscription-row">
                  <div className="app-subscription-details">
                    <span className="app-subscription-zip">{sub.zipCode}</span>
                    <span
                      className={`app-subscription-status ${sub.active ? "is-active" : "is-inactive"}`}
                      data-status={sub.active ? "active" : "inactive"}
                    >
                      {sub.active ? "Active" : "Inactive"}
                    </span>
                    <label className="app-subscription-threshold">
                      <span className="sr-only">Minimum AQI for {sub.zipCode}</span>
                      <select
                        aria-label={`Minimum AQI for ${sub.zipCode}`}
                        value={sub.minAlertAqi ?? ""}
                        onChange={(e) => void handleThresholdChange(sub, e.target.value)}
                        disabled={isUpdating}
                        className="app-subscription-select"
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
                    className="app-subscription-action"
                    variant={sub.active ? "destructive" : "default"}
                    onClick={() => handleToggleClick(sub)}
                    disabled={isUpdating}
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
        <Modal ariaLabelledBy="subscription-confirm-title" onClose={handleCancel}>
          <h3 id="subscription-confirm-title" className="app-confirmation-title">Confirm subscription change</h3>
          <p className="app-confirmation-copy">
            {pendingSub.active
              ? `Deactivate subscription for ZIP code ${pendingSub.zipCode}?`
              : `Reactivate subscription for ZIP code ${pendingSub.zipCode}?`}
          </p>
          <div className="app-confirmation-actions">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={isUpdating}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant={pendingSub.active ? "destructive" : "default"}
              onClick={handleConfirm}
              disabled={isUpdating}
            >
              {isUpdating ? "Saving…" : "Confirm"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
