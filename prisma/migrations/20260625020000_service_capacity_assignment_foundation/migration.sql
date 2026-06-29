-- CreateTable
CREATE TABLE "ServiceCapacitySlot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "serviceId" TEXT,
    "productId" TEXT,
    "packageId" TEXT,
    "locationId" TEXT,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "capacityTotal" INTEGER NOT NULL,
    "capacityHeld" INTEGER NOT NULL DEFAULT 0,
    "capacityConfirmed" INTEGER NOT NULL DEFAULT 0,
    "capacityReleased" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCapacitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCapacityLedger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "reason" TEXT NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceCapacityLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workType" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "assignedRole" TEXT,
    "assignedUserId" TEXT,
    "assignmentLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "dueAt" TIMESTAMP(3),
    "internalNote" TEXT,
    "customerVisibleNote" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceCapacitySlot_tenantId_serviceType_date_idx" ON "ServiceCapacitySlot"("tenantId", "serviceType", "date");

-- CreateIndex
CREATE INDEX "ServiceCapacitySlot_tenantId_status_date_idx" ON "ServiceCapacitySlot"("tenantId", "status", "date");

-- CreateIndex
CREATE INDEX "ServiceCapacityLedger_tenantId_slotId_createdAt_idx" ON "ServiceCapacityLedger"("tenantId", "slotId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceCapacityLedger_tenantId_sourceType_sourceId_idx" ON "ServiceCapacityLedger"("tenantId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "Assignment_tenantId_workType_workId_idx" ON "Assignment"("tenantId", "workType", "workId");

-- CreateIndex
CREATE INDEX "Assignment_tenantId_status_priority_idx" ON "Assignment"("tenantId", "status", "priority");

-- CreateIndex
CREATE INDEX "Assignment_assignedUserId_status_idx" ON "Assignment"("assignedUserId", "status");

-- AddForeignKey
ALTER TABLE "ServiceCapacitySlot" ADD CONSTRAINT "ServiceCapacitySlot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCapacityLedger" ADD CONSTRAINT "ServiceCapacityLedger_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCapacityLedger" ADD CONSTRAINT "ServiceCapacityLedger_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ServiceCapacitySlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCapacityLedger" ADD CONSTRAINT "ServiceCapacityLedger_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
