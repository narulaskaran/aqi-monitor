-- CreateTable
CREATE TABLE "UserSubscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "activatedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSubscription_email_zipCode_idx" ON "UserSubscription"("email", "zipCode");
