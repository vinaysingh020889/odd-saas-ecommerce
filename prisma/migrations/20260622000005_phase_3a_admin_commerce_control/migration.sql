ALTER TABLE "Product" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductVariant" ADD COLUMN "stockStatus" TEXT NOT NULL DEFAULT 'IN_STOCK';
CREATE INDEX "Product_tenantId_featured_sortOrder_idx" ON "Product"("tenantId", "featured", "sortOrder");
