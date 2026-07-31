-- Preserve historical inactive rows, but keep at most one active subscription
-- for each email/ZIP pair. Deactivate older active duplicates before creating
-- the index so this migration can be applied to existing data.
WITH ranked_active AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "email", "zipCode"
            ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
        ) AS row_number
    FROM "UserSubscription"
    WHERE "active" = true
)
UPDATE "UserSubscription"
SET "active" = false
WHERE "id" IN (
    SELECT "id"
    FROM ranked_active
    WHERE row_number > 1
);

CREATE UNIQUE INDEX "UserSubscription_active_email_zipCode_key"
ON "UserSubscription" ("email", "zipCode")
WHERE "active" = true;
