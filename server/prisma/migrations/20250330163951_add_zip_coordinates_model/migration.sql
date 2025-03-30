-- CreateTable
CREATE TABLE "ZipCoordinates" (
    "zipCode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "refreshAfter" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZipCoordinates_pkey" PRIMARY KEY ("zipCode")
);
