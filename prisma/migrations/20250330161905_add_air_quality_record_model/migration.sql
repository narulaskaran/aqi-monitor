-- CreateTable
CREATE TABLE "AirQualityRecord" (
    "id" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "aqi" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "dominantPollutant" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pollutantData" JSONB,

    CONSTRAINT "AirQualityRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AirQualityRecord_zipCode_timestamp_idx" ON "AirQualityRecord"("zipCode", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "AirQualityRecord_zipCode_timestamp_key" ON "AirQualityRecord"("zipCode", "timestamp");
