/*
  Warnings:

  - The `status` column on the `AsthiApplication` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `paymentStatus` column on the `AsthiApplication` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `AsthiDocument` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "AsthiServiceMode" AS ENUM ('REMOTE_ASSISTED', 'FAMILY_PRESENT', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "AsthiApplicationStatus" AS ENUM ('DRAFT', 'PAYMENT_PENDING', 'DETAILS_PENDING', 'SUBMITTED', 'DOCUMENTS_UNDER_REVIEW', 'DOCUMENTS_VERIFIED', 'RITUAL_SCHEDULED', 'IN_PROGRESS', 'PROOF_UPLOADED', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "AsthiPaymentStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "AsthiDocumentType" AS ENUM ('DEATH_CERTIFICATE', 'APPLICANT_ID', 'RELATION_PROOF', 'OTHER');

-- CreateEnum
CREATE TYPE "AsthiDocumentStatus" AS ENUM ('PENDING_UPLOAD', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "AsthiApplication" DROP CONSTRAINT "AsthiApplication_userId_fkey";

-- DropForeignKey
ALTER TABLE "AsthiDocument" DROP CONSTRAINT "AsthiDocument_uploadedById_fkey";

-- AlterTable
ALTER TABLE "AsthiApplication" ADD COLUMN     "assignedTo" TEXT,
ADD COLUMN     "certificateNote" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "familyDetails" TEXT,
ADD COLUMN     "internalNote" TEXT,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "mockPaymentReference" TEXT,
ADD COLUMN     "packageId" TEXT,
ADD COLUMN     "prasadDispatchNote" TEXT,
ADD COLUMN     "proofNote" TEXT,
ADD COLUMN     "proofUrl" TEXT,
ADD COLUMN     "relation" TEXT,
ADD COLUMN     "scheduledDate" TIMESTAMP(3),
ADD COLUMN     "selectedAddOnsJson" JSONB,
ADD COLUMN     "serviceMode" "AsthiServiceMode" NOT NULL DEFAULT 'REMOTE_ASSISTED',
ADD COLUMN     "specialInstructions" TEXT,
ADD COLUMN     "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ALTER COLUMN "applicationNo" DROP NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "preferredLocation" DROP NOT NULL,
ALTER COLUMN "deceasedName" DROP NOT NULL,
ALTER COLUMN "relationToDeceased" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "AsthiApplicationStatus" NOT NULL DEFAULT 'DRAFT',
DROP COLUMN "paymentStatus",
ADD COLUMN     "paymentStatus" "AsthiPaymentStatus" NOT NULL DEFAULT 'NOT_STARTED',
ALTER COLUMN "documentStatus" SET DEFAULT 'PENDING_UPLOAD';

-- AlterTable
ALTER TABLE "AsthiDocument" ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "filename" TEXT,
ADD COLUMN     "type" "AsthiDocumentType" NOT NULL DEFAULT 'OTHER',
ALTER COLUMN "documentType" DROP NOT NULL,
ALTER COLUMN "fileName" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "AsthiDocumentStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
ALTER COLUMN "uploadedById" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AsthiLocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AsthiLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsthiPackage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "inclusionsJson" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AsthiPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsthiAddOn" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AsthiAddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsthiStatusHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromStatus" "AsthiApplicationStatus",
    "toStatus" "AsthiApplicationStatus" NOT NULL,
    "note" TEXT,
    "actorLabel" TEXT,
    "customerVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsthiStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AsthiLocation_tenantId_active_sortOrder_idx" ON "AsthiLocation"("tenantId", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AsthiLocation_tenantId_slug_key" ON "AsthiLocation"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "AsthiPackage_tenantId_active_sortOrder_idx" ON "AsthiPackage"("tenantId", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AsthiPackage_tenantId_slug_key" ON "AsthiPackage"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "AsthiAddOn_tenantId_active_sortOrder_idx" ON "AsthiAddOn"("tenantId", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AsthiAddOn_tenantId_slug_key" ON "AsthiAddOn"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "AsthiStatusHistory_tenantId_createdAt_idx" ON "AsthiStatusHistory"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AsthiStatusHistory_applicationId_createdAt_idx" ON "AsthiStatusHistory"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "AsthiApplication_tenantId_status_idx" ON "AsthiApplication"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AsthiApplication_applicationNo_idx" ON "AsthiApplication"("applicationNo");

-- CreateIndex
CREATE INDEX "AsthiApplication_locationId_idx" ON "AsthiApplication"("locationId");

-- CreateIndex
CREATE INDEX "AsthiApplication_packageId_idx" ON "AsthiApplication"("packageId");

-- CreateIndex
CREATE INDEX "AsthiDocument_tenantId_status_idx" ON "AsthiDocument"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AsthiDocument_type_idx" ON "AsthiDocument"("type");

-- AddForeignKey
ALTER TABLE "AsthiLocation" ADD CONSTRAINT "AsthiLocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsthiPackage" ADD CONSTRAINT "AsthiPackage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsthiAddOn" ADD CONSTRAINT "AsthiAddOn_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsthiApplication" ADD CONSTRAINT "AsthiApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsthiApplication" ADD CONSTRAINT "AsthiApplication_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "AsthiLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsthiApplication" ADD CONSTRAINT "AsthiApplication_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "AsthiPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsthiDocument" ADD CONSTRAINT "AsthiDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsthiStatusHistory" ADD CONSTRAINT "AsthiStatusHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsthiStatusHistory" ADD CONSTRAINT "AsthiStatusHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "AsthiApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
