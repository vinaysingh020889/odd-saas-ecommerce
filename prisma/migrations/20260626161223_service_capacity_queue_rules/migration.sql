-- AlterTable
ALTER TABLE "ServiceBooking" ADD COLUMN     "capacityRuleId" TEXT,
ADD COLUMN     "queueJoinedAt" TIMESTAMP(3),
ADD COLUMN     "queuePosition" INTEGER,
ADD COLUMN     "queuePrioritizedById" TEXT,
ADD COLUMN     "queuePriority" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "queuePriorityAt" TIMESTAMP(3),
ADD COLUMN     "queuePriorityReason" TEXT,
ADD COLUMN     "queueReason" TEXT;

-- CreateTable
CREATE TABLE "ServiceCapacityRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceId" TEXT,
    "variantId" TEXT,
    "locationText" TEXT,
    "specificDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "dailyLimit" INTEGER,
    "weeklyLimit" INTEGER,
    "monthlyLimit" INTEGER,
    "totalLimit" INTEGER,
    "manualReviewFallback" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCapacityRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceCapacityRule_tenantId_active_idx" ON "ServiceCapacityRule"("tenantId", "active");

-- CreateIndex
CREATE INDEX "ServiceCapacityRule_tenantId_serviceId_variantId_active_idx" ON "ServiceCapacityRule"("tenantId", "serviceId", "variantId", "active");

-- CreateIndex
CREATE INDEX "ServiceCapacityRule_tenantId_specificDate_idx" ON "ServiceCapacityRule"("tenantId", "specificDate");

-- CreateIndex
CREATE INDEX "ServiceCapacityRule_tenantId_startDate_endDate_idx" ON "ServiceCapacityRule"("tenantId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ServiceBooking_tenantId_serviceId_status_queuePriority_queu_idx" ON "ServiceBooking"("tenantId", "serviceId", "status", "queuePriority", "queueJoinedAt");

-- CreateIndex
CREATE INDEX "ServiceBooking_capacityRuleId_idx" ON "ServiceBooking"("capacityRuleId");

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_capacityRuleId_fkey" FOREIGN KEY ("capacityRuleId") REFERENCES "ServiceCapacityRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCapacityRule" ADD CONSTRAINT "ServiceCapacityRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCapacityRule" ADD CONSTRAINT "ServiceCapacityRule_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCapacityRule" ADD CONSTRAINT "ServiceCapacityRule_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
