-- CreateTable
CREATE TABLE "AsthiApplication" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "applicationNo" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "packageProductId" TEXT,
    "packageVariantId" TEXT,
    "preferredLocation" TEXT NOT NULL,
    "preferredDate" TIMESTAMP(3),
    "deceasedName" TEXT NOT NULL,
    "deceasedAge" INTEGER,
    "dateOfDeath" TIMESTAMP(3),
    "gotra" TEXT,
    "relationToDeceased" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "applicantPhone" TEXT NOT NULL,
    "applicantEmail" TEXT NOT NULL,
    "applicantAddress" TEXT,
    "familyNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "paymentStatus" TEXT NOT NULL DEFAULT 'payment_pending',
    "documentStatus" TEXT NOT NULL DEFAULT 'pending_upload',
    "proofStatus" TEXT NOT NULL DEFAULT 'not_available',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AsthiApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsthiDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "adminNote" TEXT,
    "uploadedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AsthiDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsthiActivity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "customerVisible" BOOLEAN NOT NULL DEFAULT true,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsthiActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AsthiApplication_applicationNo_key" ON "AsthiApplication"("applicationNo");

-- CreateIndex
CREATE UNIQUE INDEX "AsthiApplication_orderId_key" ON "AsthiApplication"("orderId");

-- CreateIndex
CREATE INDEX "AsthiApplication_tenantId_status_idx" ON "AsthiApplication"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AsthiApplication_userId_createdAt_idx" ON "AsthiApplication"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AsthiApplication_orderId_idx" ON "AsthiApplication"("orderId");

-- CreateIndex
CREATE INDEX "AsthiDocument_tenantId_status_idx" ON "AsthiDocument"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AsthiDocument_applicationId_idx" ON "AsthiDocument"("applicationId");

-- CreateIndex
CREATE INDEX "AsthiActivity_tenantId_createdAt_idx" ON "AsthiActivity"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AsthiActivity_applicationId_createdAt_idx" ON "AsthiActivity"("applicationId", "createdAt");

-- AddForeignKey
ALTER TABLE "AsthiApplication" ADD CONSTRAINT "AsthiApplication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsthiApplication" ADD CONSTRAINT "AsthiApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsthiApplication" ADD CONSTRAINT "AsthiApplication_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsthiApplication" ADD CONSTRAINT "AsthiApplication_packageProductId_fkey" FOREIGN KEY ("packageProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsthiApplication" ADD CONSTRAINT "AsthiApplication_packageVariantId_fkey" FOREIGN KEY ("packageVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsthiDocument" ADD CONSTRAINT "AsthiDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsthiDocument" ADD CONSTRAINT "AsthiDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "AsthiApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsthiDocument" ADD CONSTRAINT "AsthiDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsthiDocument" ADD CONSTRAINT "AsthiDocument_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsthiActivity" ADD CONSTRAINT "AsthiActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsthiActivity" ADD CONSTRAINT "AsthiActivity_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "AsthiApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsthiActivity" ADD CONSTRAINT "AsthiActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
