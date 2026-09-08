CREATE TABLE "WalletAccount" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "externalWalletRef" TEXT,
  "syncStatus" TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WalletAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletTransaction" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "walletAccountId" TEXT NOT NULL,
  "orderId" TEXT,
  "type" TEXT NOT NULL,
  "bucket" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "idempotencyKey" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "availableAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "externalRef" TEXT,
  "syncStatus" TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WalletAccount_tenantId_userId_currency_key" ON "WalletAccount"("tenantId", "userId", "currency");
CREATE INDEX "WalletAccount_userId_status_idx" ON "WalletAccount"("userId", "status");
CREATE UNIQUE INDEX "WalletTransaction_idempotencyKey_key" ON "WalletTransaction"("idempotencyKey");
CREATE INDEX "WalletTransaction_walletAccountId_status_bucket_createdAt_idx" ON "WalletTransaction"("walletAccountId", "status", "bucket", "createdAt");
CREATE INDEX "WalletTransaction_tenantId_userId_createdAt_idx" ON "WalletTransaction"("tenantId", "userId", "createdAt");
CREATE INDEX "WalletTransaction_orderId_type_idx" ON "WalletTransaction"("orderId", "type");
ALTER TABLE "WalletAccount" ADD CONSTRAINT "WalletAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletAccount" ADD CONSTRAINT "WalletAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletAccountId_fkey" FOREIGN KEY ("walletAccountId") REFERENCES "WalletAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
