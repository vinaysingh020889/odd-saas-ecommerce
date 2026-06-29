ALTER TABLE "Cart"
ADD COLUMN "couponCode" TEXT,
ADD COLUMN "pricingSnapshotJson" JSONB;

ALTER TABLE "Order"
ADD COLUMN "couponCode" TEXT,
ADD COLUMN "pricingSnapshotJson" JSONB,
ADD COLUMN "cashbackPromiseAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE "ProductSpec" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "groupName" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductSpec_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductFaq" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductFaq_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductContentBlock" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "blockType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "itemsJson" JSONB,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductContentBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WishlistItem" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceablePincode" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "pincode" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "serviceable" BOOLEAN NOT NULL DEFAULT true,
  "estimatedDays" INTEGER,
  "codAvailable" BOOLEAN NOT NULL DEFAULT false,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceablePincode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OfferRule" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "code" TEXT,
  "ruleType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "targetScope" TEXT NOT NULL DEFAULT 'ALL',
  "discountKind" TEXT NOT NULL DEFAULT 'PERCENT',
  "discountValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "minCartValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "maxDiscountAmount" DECIMAL(12,2),
  "cashbackKind" TEXT,
  "cashbackValue" DECIMAL(12,2),
  "usageLimit" INTEGER,
  "perUserLimit" INTEGER,
  "stackWithAutomatic" BOOLEAN NOT NULL DEFAULT true,
  "stackWithCoupon" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OfferRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OfferTarget" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "offerRuleId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfferTarget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OfferRedemption" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "offerRuleId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "code" TEXT,
  "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "cashbackAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfferRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WishlistItem_userId_productId_variantId_key" ON "WishlistItem"("userId", "productId", "variantId");
CREATE UNIQUE INDEX "ServiceablePincode_tenantId_pincode_key" ON "ServiceablePincode"("tenantId", "pincode");
CREATE UNIQUE INDEX "OfferRule_tenantId_code_key" ON "OfferRule"("tenantId", "code");
CREATE UNIQUE INDEX "OfferTarget_offerRuleId_targetType_targetId_key" ON "OfferTarget"("offerRuleId", "targetType", "targetId");

CREATE INDEX "ProductSpec_tenantId_productId_sortOrder_idx" ON "ProductSpec"("tenantId", "productId", "sortOrder");
CREATE INDEX "ProductFaq_tenantId_productId_status_sortOrder_idx" ON "ProductFaq"("tenantId", "productId", "status", "sortOrder");
CREATE INDEX "ProductContentBlock_tenantId_productId_status_sortOrder_idx" ON "ProductContentBlock"("tenantId", "productId", "status", "sortOrder");
CREATE INDEX "WishlistItem_tenantId_userId_idx" ON "WishlistItem"("tenantId", "userId");
CREATE INDEX "ServiceablePincode_tenantId_serviceable_idx" ON "ServiceablePincode"("tenantId", "serviceable");
CREATE INDEX "OfferRule_tenantId_status_ruleType_priority_idx" ON "OfferRule"("tenantId", "status", "ruleType", "priority");
CREATE INDEX "OfferRule_tenantId_startDate_endDate_idx" ON "OfferRule"("tenantId", "startDate", "endDate");
CREATE INDEX "OfferTarget_tenantId_targetType_targetId_idx" ON "OfferTarget"("tenantId", "targetType", "targetId");
CREATE INDEX "OfferRedemption_tenantId_offerRuleId_idx" ON "OfferRedemption"("tenantId", "offerRuleId");
CREATE INDEX "OfferRedemption_orderId_idx" ON "OfferRedemption"("orderId");
CREATE INDEX "OfferRedemption_userId_createdAt_idx" ON "OfferRedemption"("userId", "createdAt");

ALTER TABLE "ProductSpec" ADD CONSTRAINT "ProductSpec_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductSpec" ADD CONSTRAINT "ProductSpec_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductFaq" ADD CONSTRAINT "ProductFaq_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductFaq" ADD CONSTRAINT "ProductFaq_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductContentBlock" ADD CONSTRAINT "ProductContentBlock_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductContentBlock" ADD CONSTRAINT "ProductContentBlock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceablePincode" ADD CONSTRAINT "ServiceablePincode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferRule" ADD CONSTRAINT "OfferRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferTarget" ADD CONSTRAINT "OfferTarget_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferTarget" ADD CONSTRAINT "OfferTarget_offerRuleId_fkey" FOREIGN KEY ("offerRuleId") REFERENCES "OfferRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferRedemption" ADD CONSTRAINT "OfferRedemption_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferRedemption" ADD CONSTRAINT "OfferRedemption_offerRuleId_fkey" FOREIGN KEY ("offerRuleId") REFERENCES "OfferRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferRedemption" ADD CONSTRAINT "OfferRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferRedemption" ADD CONSTRAINT "OfferRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
