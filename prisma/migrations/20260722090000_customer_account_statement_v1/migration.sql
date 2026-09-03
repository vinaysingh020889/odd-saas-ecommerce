CREATE TYPE "CustomerAccountCategory" AS ENUM (
  'PRODUCT_ORDER',
  'KIT_ORDER',
  'SERVICE_BOOKING',
  'ASTHI_APPLICATION',
  'KUNDLI_ORDER',
  'PUJA_BOOKING',
  'MEMBERSHIP',
  'PAYMENT',
  'CANCELLATION',
  'RETURN',
  'REFUND',
  'WALLET',
  'ADJUSTMENT'
);

CREATE TYPE "CustomerAccountVisibility" AS ENUM ('CUSTOMER_VISIBLE', 'INTERNAL_ONLY');
CREATE TYPE "CustomerAccountActorType" AS ENUM ('CUSTOMER', 'SYSTEM', 'ADMIN', 'SUPPORT', 'GURUJI');

CREATE TABLE "CustomerAccountEntry" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "entryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "relatedEntityType" TEXT,
  "relatedEntityId" TEXT,
  "category" "CustomerAccountCategory" NOT NULL,
  "actionType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "visibility" "CustomerAccountVisibility" NOT NULL DEFAULT 'CUSTOMER_VISIBLE',
  "grossAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "shippingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "refundedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "walletAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "netAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "referenceNumber" TEXT,
  "customerVisibleNote" TEXT,
  "actorType" "CustomerAccountActorType" NOT NULL DEFAULT 'SYSTEM',
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerAccountEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerAccountEntry_tenantId_idempotencyKey_key" ON "CustomerAccountEntry"("tenantId", "idempotencyKey");
CREATE INDEX "CustomerAccountEntry_tenantId_userId_entryAt_idx" ON "CustomerAccountEntry"("tenantId", "userId", "entryAt");
CREATE INDEX "CustomerAccountEntry_userId_category_entryAt_idx" ON "CustomerAccountEntry"("userId", "category", "entryAt");
CREATE INDEX "CustomerAccountEntry_tenantId_sourceType_sourceId_idx" ON "CustomerAccountEntry"("tenantId", "sourceType", "sourceId");
CREATE INDEX "CustomerAccountEntry_tenantId_relatedEntityType_relatedEntityId_idx" ON "CustomerAccountEntry"("tenantId", "relatedEntityType", "relatedEntityId");
ALTER TABLE "CustomerAccountEntry" ADD CONSTRAINT "CustomerAccountEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerAccountEntry" ADD CONSTRAINT "CustomerAccountEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
