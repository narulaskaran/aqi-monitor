/*
  Warnings:

  - You are about to drop the column `lastDailyEmailSentAt` on the `UserSubscription` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserSubscription" DROP COLUMN "lastDailyEmailSentAt",
ADD COLUMN     "lastEmailSentAt" TIMESTAMP(3);
