CREATE TYPE "SystemEventSeverity" AS ENUM ('SUCCESS', 'WARNING', 'ERROR');
CREATE TYPE "HeroSlideBannerType" AS ENUM ('TEMPLATE', 'IMAGE_ONLY');

ALTER TABLE "HeroSlide" ALTER COLUMN "primaryCtaLabel" DROP NOT NULL;
ALTER TABLE "HeroSlide" ADD COLUMN "bannerType" "HeroSlideBannerType" NOT NULL DEFAULT 'TEMPLATE';

CREATE TABLE "SystemEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "severity" "SystemEventSeverity" NOT NULL,
  "module" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "actorId" TEXT,
  "actorRole" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "errorRef" TEXT,
  "metadata" JSONB,
  "auditLogId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "destination" TEXT,
  "sourceModule" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "sourceEventId" TEXT,
  "dedupeKey" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SystemEvent_tenantId_createdAt_idx" ON "SystemEvent"("tenantId", "createdAt");
CREATE INDEX "SystemEvent_tenantId_severity_createdAt_idx" ON "SystemEvent"("tenantId", "severity", "createdAt");
CREATE INDEX "SystemEvent_tenantId_module_action_createdAt_idx" ON "SystemEvent"("tenantId", "module", "action", "createdAt");
CREATE INDEX "SystemEvent_tenantId_errorRef_idx" ON "SystemEvent"("tenantId", "errorRef");
CREATE UNIQUE INDEX "Notification_tenantId_recipientId_dedupeKey_key" ON "Notification"("tenantId", "recipientId", "dedupeKey");
CREATE INDEX "Notification_tenantId_recipientId_readAt_createdAt_idx" ON "Notification"("tenantId", "recipientId", "readAt", "createdAt");
CREATE INDEX "Notification_tenantId_type_createdAt_idx" ON "Notification"("tenantId", "type", "createdAt");

ALTER TABLE "SystemEvent" ADD CONSTRAINT "SystemEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemEvent" ADD CONSTRAINT "SystemEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SystemEvent" ADD CONSTRAINT "SystemEvent_auditLogId_fkey" FOREIGN KEY ("auditLogId") REFERENCES "AuditLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_sourceEventId_fkey" FOREIGN KEY ("sourceEventId") REFERENCES "SystemEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
