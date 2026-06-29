-- Mock payment lifecycle foundation: provider-style attempts/events and membership activation records.

CREATE TABLE "PaymentAttempt" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'MOCK',
  "providerOrderId" TEXT NOT NULL,
  "providerPaymentId" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" TEXT NOT NULL DEFAULT 'created',
  "attemptNo" INTEGER NOT NULL,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "paymentAttemptId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'MOCK',
  "eventType" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "payloadJson" JSONB NOT NULL,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MembershipSubscription" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MembershipSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentAttempt_provider_providerOrderId_key" ON "PaymentAttempt"("provider", "providerOrderId");
CREATE INDEX "PaymentAttempt_tenantId_status_idx" ON "PaymentAttempt"("tenantId", "status");
CREATE INDEX "PaymentAttempt_orderId_createdAt_idx" ON "PaymentAttempt"("orderId", "createdAt");

CREATE UNIQUE INDEX "PaymentEvent_provider_providerEventId_key" ON "PaymentEvent"("provider", "providerEventId");
CREATE INDEX "PaymentEvent_tenantId_createdAt_idx" ON "PaymentEvent"("tenantId", "createdAt");
CREATE INDEX "PaymentEvent_paymentAttemptId_idx" ON "PaymentEvent"("paymentAttemptId");
CREATE INDEX "PaymentEvent_orderId_idx" ON "PaymentEvent"("orderId");

CREATE UNIQUE INDEX "MembershipSubscription_orderItemId_key" ON "MembershipSubscription"("orderItemId");
CREATE INDEX "MembershipSubscription_tenantId_status_idx" ON "MembershipSubscription"("tenantId", "status");
CREATE INDEX "MembershipSubscription_userId_status_idx" ON "MembershipSubscription"("userId", "status");
CREATE INDEX "MembershipSubscription_orderId_idx" ON "MembershipSubscription"("orderId");

ALTER TABLE "PaymentAttempt"
ADD CONSTRAINT "PaymentAttempt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentAttempt"
ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentEvent"
ADD CONSTRAINT "PaymentEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentEvent"
ADD CONSTRAINT "PaymentEvent_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentEvent"
ADD CONSTRAINT "PaymentEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MembershipSubscription"
ADD CONSTRAINT "MembershipSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MembershipSubscription"
ADD CONSTRAINT "MembershipSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MembershipSubscription"
ADD CONSTRAINT "MembershipSubscription_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MembershipSubscription"
ADD CONSTRAINT "MembershipSubscription_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MembershipSubscription"
ADD CONSTRAINT "MembershipSubscription_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MembershipSubscription"
ADD CONSTRAINT "MembershipSubscription_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
