-- Customer Event + Interest Tracking v1
-- Internal first-party analytics only. No external pixels/providers.

CREATE TABLE "CustomerEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "anonymousId" TEXT,
    "sessionId" TEXT,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "entitySlug" TEXT,
    "metadataJson" JSONB,
    "sourcePath" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerInterestProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topTagsJson" JSONB,
    "topCategoriesJson" JSONB,
    "topProductsJson" JSONB,
    "topServicesJson" JSONB,
    "topFestivalsJson" JSONB,
    "searchTermsJson" JSONB,
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerInterestProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnonymousInterestProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "anonymousId" TEXT NOT NULL,
    "topTagsJson" JSONB,
    "topCategoriesJson" JSONB,
    "topProductsJson" JSONB,
    "topServicesJson" JSONB,
    "topFestivalsJson" JSONB,
    "searchTermsJson" JSONB,
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnonymousInterestProfile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerEvent_tenantId_eventType_createdAt_idx" ON "CustomerEvent"("tenantId", "eventType", "createdAt");
CREATE INDEX "CustomerEvent_tenantId_entityType_entityId_idx" ON "CustomerEvent"("tenantId", "entityType", "entityId");
CREATE INDEX "CustomerEvent_tenantId_anonymousId_createdAt_idx" ON "CustomerEvent"("tenantId", "anonymousId", "createdAt");
CREATE INDEX "CustomerEvent_userId_createdAt_idx" ON "CustomerEvent"("userId", "createdAt");
CREATE UNIQUE INDEX "CustomerInterestProfile_tenantId_userId_key" ON "CustomerInterestProfile"("tenantId", "userId");
CREATE UNIQUE INDEX "CustomerInterestProfile_userId_key" ON "CustomerInterestProfile"("userId");
CREATE INDEX "CustomerInterestProfile_tenantId_lastActivityAt_idx" ON "CustomerInterestProfile"("tenantId", "lastActivityAt");
CREATE UNIQUE INDEX "AnonymousInterestProfile_tenantId_anonymousId_key" ON "AnonymousInterestProfile"("tenantId", "anonymousId");
CREATE INDEX "AnonymousInterestProfile_tenantId_lastActivityAt_idx" ON "AnonymousInterestProfile"("tenantId", "lastActivityAt");

ALTER TABLE "CustomerEvent" ADD CONSTRAINT "CustomerEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerEvent" ADD CONSTRAINT "CustomerEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerInterestProfile" ADD CONSTRAINT "CustomerInterestProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerInterestProfile" ADD CONSTRAINT "CustomerInterestProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnonymousInterestProfile" ADD CONSTRAINT "AnonymousInterestProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
