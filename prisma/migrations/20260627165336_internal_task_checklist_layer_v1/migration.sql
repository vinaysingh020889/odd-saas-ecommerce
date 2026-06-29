-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workType" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTemplateItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "defaultOwnerRole" TEXT,
    "customerVisibleMilestone" BOOLEAN NOT NULL DEFAULT false,
    "proofRequired" BOOLEAN NOT NULL DEFAULT false,
    "dueOffsetHours" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistInstance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "relatedType" TEXT NOT NULL,
    "relatedId" TEXT NOT NULL,
    "templateId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "requiredPendingCount" INTEGER NOT NULL DEFAULT 0,
    "overdueCount" INTEGER NOT NULL DEFAULT 0,
    "blockedCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdBySystem" BOOLEAN NOT NULL DEFAULT true,
    "overrideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistInstanceItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "checklistInstanceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assignedUserId" TEXT,
    "assignedRole" TEXT,
    "dueAt" TIMESTAMP(3),
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "skippedReason" TEXT,
    "blockedReason" TEXT,
    "internalNote" TEXT,
    "customerVisibleNote" TEXT,
    "customerVisibleMilestone" BOOLEAN NOT NULL DEFAULT false,
    "proofRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistInstanceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistActivity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "checklistInstanceId" TEXT NOT NULL,
    "itemId" TEXT,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "note" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistTemplate_tenantId_workType_status_sortOrder_idx" ON "ChecklistTemplate"("tenantId", "workType", "status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistTemplate_tenantId_workType_name_key" ON "ChecklistTemplate"("tenantId", "workType", "name");

-- CreateIndex
CREATE INDEX "ChecklistTemplateItem_tenantId_templateId_status_sortOrder_idx" ON "ChecklistTemplateItem"("tenantId", "templateId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "ChecklistInstance_tenantId_relatedType_relatedId_idx" ON "ChecklistInstance"("tenantId", "relatedType", "relatedId");

-- CreateIndex
CREATE INDEX "ChecklistInstance_tenantId_status_requiredPendingCount_idx" ON "ChecklistInstance"("tenantId", "status", "requiredPendingCount");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistInstance_tenantId_relatedType_relatedId_templateId_key" ON "ChecklistInstance"("tenantId", "relatedType", "relatedId", "templateId");

-- CreateIndex
CREATE INDEX "ChecklistInstanceItem_tenantId_status_dueAt_idx" ON "ChecklistInstanceItem"("tenantId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "ChecklistInstanceItem_checklistInstanceId_sortOrder_idx" ON "ChecklistInstanceItem"("checklistInstanceId", "sortOrder");

-- CreateIndex
CREATE INDEX "ChecklistInstanceItem_assignedUserId_status_idx" ON "ChecklistInstanceItem"("assignedUserId", "status");

-- CreateIndex
CREATE INDEX "ChecklistActivity_tenantId_createdAt_idx" ON "ChecklistActivity"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ChecklistActivity_checklistInstanceId_createdAt_idx" ON "ChecklistActivity"("checklistInstanceId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplateItem" ADD CONSTRAINT "ChecklistTemplateItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplateItem" ADD CONSTRAINT "ChecklistTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistInstance" ADD CONSTRAINT "ChecklistInstance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistInstance" ADD CONSTRAINT "ChecklistInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistInstance" ADD CONSTRAINT "ChecklistInstance_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistInstanceItem" ADD CONSTRAINT "ChecklistInstanceItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistInstanceItem" ADD CONSTRAINT "ChecklistInstanceItem_checklistInstanceId_fkey" FOREIGN KEY ("checklistInstanceId") REFERENCES "ChecklistInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistInstanceItem" ADD CONSTRAINT "ChecklistInstanceItem_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistInstanceItem" ADD CONSTRAINT "ChecklistInstanceItem_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistActivity" ADD CONSTRAINT "ChecklistActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistActivity" ADD CONSTRAINT "ChecklistActivity_checklistInstanceId_fkey" FOREIGN KEY ("checklistInstanceId") REFERENCES "ChecklistInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistActivity" ADD CONSTRAINT "ChecklistActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
