-- Document / Proof / Report Upload Architecture Shell v1
-- Placeholder URL/storage-key architecture only. No binary storage or signed URL support.

CREATE TABLE "OperationalDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "storageKey" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "visibility" TEXT NOT NULL DEFAULT 'INTERNAL_ONLY',
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "rejectionReason" TEXT,
    "uploadedById" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentActivity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OperationalDocument_tenantId_ownerType_ownerId_idx" ON "OperationalDocument"("tenantId", "ownerType", "ownerId");
CREATE INDEX "OperationalDocument_tenantId_documentType_status_idx" ON "OperationalDocument"("tenantId", "documentType", "status");
CREATE INDEX "OperationalDocument_tenantId_visibility_status_idx" ON "OperationalDocument"("tenantId", "visibility", "status");
CREATE INDEX "DocumentActivity_tenantId_createdAt_idx" ON "DocumentActivity"("tenantId", "createdAt");
CREATE INDEX "DocumentActivity_documentId_createdAt_idx" ON "DocumentActivity"("documentId", "createdAt");

ALTER TABLE "OperationalDocument" ADD CONSTRAINT "OperationalDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OperationalDocument" ADD CONSTRAINT "OperationalDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OperationalDocument" ADD CONSTRAINT "OperationalDocument_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentActivity" ADD CONSTRAINT "DocumentActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentActivity" ADD CONSTRAINT "DocumentActivity_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "OperationalDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentActivity" ADD CONSTRAINT "DocumentActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
