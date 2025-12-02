-- CreateTable
CREATE TABLE "Authentication" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Authentication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Authentication_email_idx" ON "Authentication"("email");

-- CreateIndex
CREATE INDEX "Authentication_token_idx" ON "Authentication"("token");
