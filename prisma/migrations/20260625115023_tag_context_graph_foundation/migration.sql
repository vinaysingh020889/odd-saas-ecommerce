-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagAlias" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "locale" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'search',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TagAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagRelation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "context" TEXT NOT NULL DEFAULT 'default',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TagRelation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tag_tenantId_type_status_sortOrder_idx" ON "Tag"("tenantId", "type", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "Tag_tenantId_status_idx" ON "Tag"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_tenantId_slug_key" ON "Tag"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "TagAlias_tenantId_value_idx" ON "TagAlias"("tenantId", "value");

-- CreateIndex
CREATE INDEX "TagAlias_tagId_idx" ON "TagAlias"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "TagAlias_tenantId_tagId_value_key" ON "TagAlias"("tenantId", "tagId", "value");

-- CreateIndex
CREATE INDEX "TagRelation_tenantId_targetType_targetId_idx" ON "TagRelation"("tenantId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "TagRelation_tenantId_tagId_idx" ON "TagRelation"("tenantId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "TagRelation_tenantId_tagId_targetType_targetId_context_key" ON "TagRelation"("tenantId", "tagId", "targetType", "targetId", "context");

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagAlias" ADD CONSTRAINT "TagAlias_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagAlias" ADD CONSTRAINT "TagAlias_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagRelation" ADD CONSTRAINT "TagRelation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagRelation" ADD CONSTRAINT "TagRelation_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
