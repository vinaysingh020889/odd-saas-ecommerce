-- CreateTable
CREATE TABLE "ServiceBooking" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "variantId" TEXT,
    "slotId" TEXT,
    "bookingNo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "capacityStatus" TEXT NOT NULL DEFAULT 'MANUAL_REVIEW',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "participantCount" INTEGER NOT NULL DEFAULT 1,
    "preferredDate" TIMESTAMP(3),
    "preferredTime" TEXT,
    "locationText" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "specialInstructions" TEXT,
    "internalNote" TEXT,
    "customerVisibleNote" TEXT,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "mockPaymentReference" TEXT,
    "proofStatus" TEXT NOT NULL DEFAULT 'not_available',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceBookingActivity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceBookingId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "customerVisible" BOOLEAN NOT NULL DEFAULT true,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceBookingActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceBooking_bookingNo_key" ON "ServiceBooking"("bookingNo");

-- CreateIndex
CREATE INDEX "ServiceBooking_tenantId_status_idx" ON "ServiceBooking"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ServiceBooking_tenantId_paymentStatus_idx" ON "ServiceBooking"("tenantId", "paymentStatus");

-- CreateIndex
CREATE INDEX "ServiceBooking_userId_createdAt_idx" ON "ServiceBooking"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceBooking_serviceId_status_idx" ON "ServiceBooking"("serviceId", "status");

-- CreateIndex
CREATE INDEX "ServiceBooking_slotId_idx" ON "ServiceBooking"("slotId");

-- CreateIndex
CREATE INDEX "ServiceBooking_bookingNo_idx" ON "ServiceBooking"("bookingNo");

-- CreateIndex
CREATE INDEX "ServiceBookingActivity_tenantId_createdAt_idx" ON "ServiceBookingActivity"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceBookingActivity_serviceBookingId_createdAt_idx" ON "ServiceBookingActivity"("serviceBookingId", "createdAt");

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ServiceCapacitySlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBookingActivity" ADD CONSTRAINT "ServiceBookingActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBookingActivity" ADD CONSTRAINT "ServiceBookingActivity_serviceBookingId_fkey" FOREIGN KEY ("serviceBookingId") REFERENCES "ServiceBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBookingActivity" ADD CONSTRAINT "ServiceBookingActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
