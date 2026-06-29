-- Admin operations foundation: order activity timeline, kit composition, and configurable low-stock thresholds.

ALTER TABLE "ProductVariant"
ADD COLUMN "lowStockThreshold" INTEGER NOT NULL DEFAULT 5;

CREATE TABLE "OrderActivity" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "actorId" TEXT,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrderActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KitComponent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "kitProductId" TEXT NOT NULL,
  "componentProductId" TEXT NOT NULL,
  "componentVariantId" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "KitComponent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderActivity_tenantId_createdAt_idx" ON "OrderActivity"("tenantId", "createdAt");
CREATE INDEX "OrderActivity_orderId_createdAt_idx" ON "OrderActivity"("orderId", "createdAt");
CREATE INDEX "KitComponent_tenantId_kitProductId_idx" ON "KitComponent"("tenantId", "kitProductId");
CREATE INDEX "KitComponent_componentProductId_idx" ON "KitComponent"("componentProductId");

ALTER TABLE "OrderActivity"
ADD CONSTRAINT "OrderActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderActivity"
ADD CONSTRAINT "OrderActivity_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderActivity"
ADD CONSTRAINT "OrderActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "KitComponent"
ADD CONSTRAINT "KitComponent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KitComponent"
ADD CONSTRAINT "KitComponent_kitProductId_fkey" FOREIGN KEY ("kitProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KitComponent"
ADD CONSTRAINT "KitComponent_componentProductId_fkey" FOREIGN KEY ("componentProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "KitComponent"
ADD CONSTRAINT "KitComponent_componentVariantId_fkey" FOREIGN KEY ("componentVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
