-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('REQUESTING_UNIT', 'AMS', 'SO3_AIR_PREP', 'D_AIR', 'COMD', 'ADS', 'APPROVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtrRequest" (
    "id" TEXT NOT NULL,
    "refNumber" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'REQUESTING_UNIT',
    "formData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtrRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL,
    "atrRequestId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "imageBlob" TEXT NOT NULL,
    "signedBy" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "AtrRequest_refNumber_key" ON "AtrRequest"("refNumber");

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_atrRequestId_fkey" FOREIGN KEY ("atrRequestId") REFERENCES "AtrRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
