-- Index for the daily expired-token cleanup (deleteExpiredAuthTokens), which
-- queries Authentication WHERE "expiresAt" < now(). Without it, each daily run
-- scans the full table.
CREATE INDEX "Authentication_expiresAt_idx" ON "Authentication"("expiresAt");
