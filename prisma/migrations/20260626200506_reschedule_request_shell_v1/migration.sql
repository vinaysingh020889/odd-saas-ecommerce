-- CreateTable
CREATE TABLE "RescheduleRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestNo" TEXT,
    "relatedType" TEXT NOT NULL,
    "relatedId" TEXT NOT NULL,
    "serviceBookingId" TEXT,
    "currentDate" TIMESTAMP(3),
    "currentTime" TEXT,
    "currentSlotId" TEXT,
    "currentLocation" TEXT,
    "requestedDate" TIMESTAMP(3),
    "requestedTime" TEXT,
    "requestedSlotId" TEXT,
    "requestedLocation" TEXT,
    "customerReason" TEXT,
    "adminDecision" TEXT,
    "adminNote" TEXT,
    "customerVisibleNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "capacityDecision" TEXT,
    "capacityReason" TEXT,
    "queuePosition" INTEGER,
    "requestedById" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RescheduleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RescheduleRequestActivity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rescheduleRequestId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RescheduleRequestActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RescheduleRequest_requestNo_key" ON "RescheduleRequest"("requestNo");

-- CreateIndex
CREATE INDEX "RescheduleRequest_tenantId_status_relatedType_idx" ON "RescheduleRequest"("tenantId", "status", "relatedType");

-- CreateIndex
CREATE INDEX "RescheduleRequest_tenantId_serviceBookingId_status_idx" ON "RescheduleRequest"("tenantId", "serviceBookingId", "status");

-- CreateIndex
CREATE INDEX "RescheduleRequest_relatedType_relatedId_idx" ON "RescheduleRequest"("relatedType", "relatedId");

-- CreateIndex
CREATE INDEX "RescheduleRequest_requestedById_createdAt_idx" ON "RescheduleRequest"("requestedById", "createdAt");

-- CreateIndex
CREATE INDEX "RescheduleRequestActivity_tenantId_createdAt_idx" ON "RescheduleRequestActivity"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "RescheduleRequestActivity_rescheduleRequestId_createdAt_idx" ON "RescheduleRequestActivity"("rescheduleRequestId", "createdAt");

-- AddForeignKey
ALTER TABLE "RescheduleRequest" ADD CONSTRAINT "RescheduleRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescheduleRequest" ADD CONSTRAINT "RescheduleRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescheduleRequest" ADD CONSTRAINT "RescheduleRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescheduleRequest" ADD CONSTRAINT "RescheduleRequest_serviceBookingId_fkey" FOREIGN KEY ("serviceBookingId") REFERENCES "ServiceBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescheduleRequestActivity" ADD CONSTRAINT "RescheduleRequestActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescheduleRequestActivity" ADD CONSTRAINT "RescheduleRequestActivity_rescheduleRequestId_fkey" FOREIGN KEY ("rescheduleRequestId") REFERENCES "RescheduleRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescheduleRequestActivity" ADD CONSTRAINT "RescheduleRequestActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
