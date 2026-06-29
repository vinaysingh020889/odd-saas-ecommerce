-- CreateEnum
CREATE TYPE "KundliOrderStatus" AS ENUM ('DRAFT', 'PAYMENT_PENDING', 'DETAILS_PENDING', 'SUBMITTED', 'ASSIGNED', 'IN_REVIEW', 'REPORT_READY', 'CONSULTATION_SCHEDULED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "KundliPaymentStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "KundliPackageStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "KundliDeliveryMode" AS ENUM ('DIGITAL_REPORT', 'HANDMADE_REPORT', 'CONSULTATION', 'MATCHMAKING', 'REPORT_AND_CONSULTATION');

-- CreateEnum
CREATE TYPE "KundliReportStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'UPLOADED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "KundliDocumentType" AS ENUM ('EXISTING_KUNDLI', 'SUPPORTING_DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "KundliDocumentStatus" AS ENUM ('PENDING_UPLOAD', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "KundliPackage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "deliveryMode" "KundliDeliveryMode" NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "estimatedDeliveryDays" INTEGER,
    "inclusionsJson" JSONB,
    "status" "KundliPackageStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KundliPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KundliOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderNo" TEXT,
    "userId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "status" "KundliOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" "KundliPaymentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "mockPaymentReference" TEXT,
    "applicantName" TEXT NOT NULL,
    "applicantPhone" TEXT NOT NULL,
    "applicantEmail" TEXT NOT NULL,
    "questionOrConcern" TEXT,
    "birthName" TEXT,
    "gender" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "timeOfBirth" TEXT,
    "placeOfBirth" TEXT,
    "languagePreference" TEXT,
    "partnerName" TEXT,
    "partnerDateOfBirth" TIMESTAMP(3),
    "partnerTimeOfBirth" TEXT,
    "partnerPlaceOfBirth" TEXT,
    "assignedTo" TEXT,
    "consultationDate" TIMESTAMP(3),
    "consultationMode" TEXT,
    "reportStatus" "KundliReportStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "reportUrl" TEXT,
    "reportNote" TEXT,
    "internalNote" TEXT,
    "customerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KundliOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KundliDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kundliOrderId" TEXT NOT NULL,
    "type" "KundliDocumentType" NOT NULL DEFAULT 'OTHER',
    "status" "KundliDocumentStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "filename" TEXT,
    "fileUrl" TEXT,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KundliDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KundliStatusHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kundliOrderId" TEXT NOT NULL,
    "fromStatus" "KundliOrderStatus",
    "toStatus" "KundliOrderStatus" NOT NULL,
    "note" TEXT,
    "actorLabel" TEXT,
    "customerVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KundliStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KundliPackage_tenantId_status_sortOrder_idx" ON "KundliPackage"("tenantId", "status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "KundliPackage_tenantId_slug_key" ON "KundliPackage"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "KundliOrder_orderNo_key" ON "KundliOrder"("orderNo");

-- CreateIndex
CREATE INDEX "KundliOrder_tenantId_status_idx" ON "KundliOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "KundliOrder_tenantId_paymentStatus_idx" ON "KundliOrder"("tenantId", "paymentStatus");

-- CreateIndex
CREATE INDEX "KundliOrder_userId_createdAt_idx" ON "KundliOrder"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "KundliOrder_packageId_idx" ON "KundliOrder"("packageId");

-- CreateIndex
CREATE INDEX "KundliOrder_orderNo_idx" ON "KundliOrder"("orderNo");

-- CreateIndex
CREATE INDEX "KundliDocument_tenantId_status_idx" ON "KundliDocument"("tenantId", "status");

-- CreateIndex
CREATE INDEX "KundliDocument_kundliOrderId_idx" ON "KundliDocument"("kundliOrderId");

-- CreateIndex
CREATE INDEX "KundliDocument_type_idx" ON "KundliDocument"("type");

-- CreateIndex
CREATE INDEX "KundliStatusHistory_tenantId_createdAt_idx" ON "KundliStatusHistory"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "KundliStatusHistory_kundliOrderId_createdAt_idx" ON "KundliStatusHistory"("kundliOrderId", "createdAt");

-- AddForeignKey
ALTER TABLE "KundliPackage" ADD CONSTRAINT "KundliPackage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KundliOrder" ADD CONSTRAINT "KundliOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KundliOrder" ADD CONSTRAINT "KundliOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KundliOrder" ADD CONSTRAINT "KundliOrder_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "KundliPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KundliDocument" ADD CONSTRAINT "KundliDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KundliDocument" ADD CONSTRAINT "KundliDocument_kundliOrderId_fkey" FOREIGN KEY ("kundliOrderId") REFERENCES "KundliOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KundliStatusHistory" ADD CONSTRAINT "KundliStatusHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KundliStatusHistory" ADD CONSTRAINT "KundliStatusHistory_kundliOrderId_fkey" FOREIGN KEY ("kundliOrderId") REFERENCES "KundliOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
