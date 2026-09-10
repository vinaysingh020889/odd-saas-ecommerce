ALTER TYPE "MembershipBenefitScope" ADD VALUE 'OFFERINGS';

CREATE TYPE "OfferingRequestStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'COLLECTION_SCHEDULED', 'COLLECTED', 'RECEIVED', 'PROCESSING', 'REWARD_SELECTION', 'REWARD_ORDERED', 'CLOSED', 'CANCELLED', 'REJECTED');
CREATE TYPE "OfferingTransferMethod" AS ENUM ('PICKUP', 'DROP_OFF', 'COURIER');

CREATE TABLE "OfferingRequest" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "userId" TEXT NOT NULL, "requestNumber" TEXT NOT NULL,
  "status" "OfferingRequestStatus" NOT NULL DEFAULT 'SUBMITTED', "materialDescription" TEXT NOT NULL,
  "photoUrlsJson" JSONB, "transferMethod" "OfferingTransferMethod" NOT NULL, "pickupAddressJson" JSONB,
  "courierTrackingNumber" TEXT, "customerNote" TEXT, "operationsNote" TEXT, "rejectionReason" TEXT,
  "priorityScore" INTEGER NOT NULL DEFAULT 0, "membershipAccessBenefitId" TEXT, "pickupBenefitId" TEXT,
  "pickupRedemptionId" TEXT, "pickupListAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "pickupSavingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0, "acceptedAt" TIMESTAMP(3),
  "collectionScheduledAt" TIMESTAMP(3), "collectedAt" TIMESTAMP(3), "receivedAt" TIMESTAMP(3),
  "processingDueAt" TIMESTAMP(3), "processedAt" TIMESTAMP(3), "rewardSelectionDueAt" TIMESTAMP(3),
  "rewardProductId" TEXT, "rewardVariantId" TEXT, "rewardCreditAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "rewardShippingSavingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0, "rewardOrderId" TEXT,
  "closedAt" TIMESTAMP(3), "cancelledAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "OfferingRequest_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OfferingActivity" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "offeringId" TEXT NOT NULL, "actorId" TEXT,
  "action" TEXT NOT NULL, "fromStatus" TEXT, "toStatus" TEXT, "note" TEXT,
  "customerVisible" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfferingActivity_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OfferingRequest_requestNumber_key" ON "OfferingRequest"("requestNumber");
CREATE INDEX "OfferingRequest_tenantId_status_createdAt_idx" ON "OfferingRequest"("tenantId", "status", "createdAt");
CREATE INDEX "OfferingRequest_tenantId_processingDueAt_idx" ON "OfferingRequest"("tenantId", "processingDueAt");
CREATE INDEX "OfferingRequest_tenantId_rewardSelectionDueAt_idx" ON "OfferingRequest"("tenantId", "rewardSelectionDueAt");
CREATE INDEX "OfferingRequest_userId_createdAt_idx" ON "OfferingRequest"("userId", "createdAt");
CREATE INDEX "OfferingRequest_rewardOrderId_idx" ON "OfferingRequest"("rewardOrderId");
CREATE INDEX "OfferingActivity_offeringId_createdAt_idx" ON "OfferingActivity"("offeringId", "createdAt");
CREATE INDEX "OfferingActivity_tenantId_action_createdAt_idx" ON "OfferingActivity"("tenantId", "action", "createdAt");
ALTER TABLE "OfferingRequest" ADD CONSTRAINT "OfferingRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferingRequest" ADD CONSTRAINT "OfferingRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferingActivity" ADD CONSTRAINT "OfferingActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferingActivity" ADD CONSTRAINT "OfferingActivity_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "OfferingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferingActivity" ADD CONSTRAINT "OfferingActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
