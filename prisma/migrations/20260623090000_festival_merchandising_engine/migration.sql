-- Festival Campaign + Merchandising Control Engine

ALTER TABLE "Category"
ADD COLUMN "showOnHomepageIntent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "homepageIntentTitle" TEXT,
ADD COLUMN "homepageIntentDescription" TEXT,
ADD COLUMN "homepageIntentImage" TEXT,
ADD COLUMN "homepageIntentSortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "FestivalCampaign" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "shortDescription" TEXT,
  "longDescription" TEXT,
  "heroImage" TEXT,
  "cardImage" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "showOnHomepage" BOOLEAN NOT NULL DEFAULT false,
  "showInHero" BOOLEAN NOT NULL DEFAULT false,
  "showInAnnouncementStrip" BOOLEAN NOT NULL DEFAULT false,
  "ctaLabel" TEXT,
  "ctaUrl" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FestivalCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FestivalCampaignProduct" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FestivalCampaignProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FestivalCampaignCategory" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FestivalCampaignCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FestivalCampaignService" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FestivalCampaignService_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PromotionPlacement" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "placementKey" TEXT NOT NULL,
  "surface" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "image" TEXT,
  "ctaLabel" TEXT,
  "ctaUrl" TEXT,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "priority" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PromotionPlacement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FestivalCampaign_tenantId_slug_key" ON "FestivalCampaign"("tenantId", "slug");
CREATE UNIQUE INDEX "FestivalCampaignProduct_campaignId_productId_key" ON "FestivalCampaignProduct"("campaignId", "productId");
CREATE UNIQUE INDEX "FestivalCampaignCategory_campaignId_categoryId_key" ON "FestivalCampaignCategory"("campaignId", "categoryId");
CREATE UNIQUE INDEX "FestivalCampaignService_campaignId_serviceId_key" ON "FestivalCampaignService"("campaignId", "serviceId");

CREATE INDEX "Category_tenantId_showOnHomepageIntent_homepageIntentSortOrder_idx" ON "Category"("tenantId", "showOnHomepageIntent", "homepageIntentSortOrder");
CREATE INDEX "FestivalCampaign_tenantId_status_startDate_endDate_idx" ON "FestivalCampaign"("tenantId", "status", "startDate", "endDate");
CREATE INDEX "FestivalCampaign_tenantId_showOnHomepage_priority_idx" ON "FestivalCampaign"("tenantId", "showOnHomepage", "priority");
CREATE INDEX "FestivalCampaign_tenantId_showInHero_priority_idx" ON "FestivalCampaign"("tenantId", "showInHero", "priority");
CREATE INDEX "FestivalCampaignProduct_tenantId_campaignId_sortOrder_idx" ON "FestivalCampaignProduct"("tenantId", "campaignId", "sortOrder");
CREATE INDEX "FestivalCampaignProduct_productId_idx" ON "FestivalCampaignProduct"("productId");
CREATE INDEX "FestivalCampaignCategory_tenantId_campaignId_sortOrder_idx" ON "FestivalCampaignCategory"("tenantId", "campaignId", "sortOrder");
CREATE INDEX "FestivalCampaignCategory_categoryId_idx" ON "FestivalCampaignCategory"("categoryId");
CREATE INDEX "FestivalCampaignService_tenantId_campaignId_sortOrder_idx" ON "FestivalCampaignService"("tenantId", "campaignId", "sortOrder");
CREATE INDEX "FestivalCampaignService_serviceId_idx" ON "FestivalCampaignService"("serviceId");
CREATE INDEX "PromotionPlacement_tenantId_placementKey_status_idx" ON "PromotionPlacement"("tenantId", "placementKey", "status");
CREATE INDEX "PromotionPlacement_tenantId_surface_status_priority_idx" ON "PromotionPlacement"("tenantId", "surface", "status", "priority");
CREATE INDEX "PromotionPlacement_targetType_targetId_idx" ON "PromotionPlacement"("targetType", "targetId");

ALTER TABLE "FestivalCampaign" ADD CONSTRAINT "FestivalCampaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FestivalCampaignProduct" ADD CONSTRAINT "FestivalCampaignProduct_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FestivalCampaignProduct" ADD CONSTRAINT "FestivalCampaignProduct_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "FestivalCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FestivalCampaignProduct" ADD CONSTRAINT "FestivalCampaignProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FestivalCampaignCategory" ADD CONSTRAINT "FestivalCampaignCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FestivalCampaignCategory" ADD CONSTRAINT "FestivalCampaignCategory_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "FestivalCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FestivalCampaignCategory" ADD CONSTRAINT "FestivalCampaignCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FestivalCampaignService" ADD CONSTRAINT "FestivalCampaignService_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FestivalCampaignService" ADD CONSTRAINT "FestivalCampaignService_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "FestivalCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FestivalCampaignService" ADD CONSTRAINT "FestivalCampaignService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionPlacement" ADD CONSTRAINT "PromotionPlacement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
