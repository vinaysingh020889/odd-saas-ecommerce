CREATE TABLE "MembershipPlanVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "durationDays" INTEGER NOT NULL,
    "renewalAllowed" BOOLEAN NOT NULL DEFAULT true,
    "upgradeAllowed" BOOLEAN NOT NULL DEFAULT true,
    "cancellationRequestAllowed" BOOLEAN NOT NULL DEFAULT true,
    "customerNote" TEXT,
    "benefitsSnapshotJson" JSONB NOT NULL,
    "rulesSnapshotJson" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MembershipPlanVersion_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "UserMembership" ADD COLUMN "planVersionId" TEXT;

INSERT INTO "MembershipPlanVersion" (
    "id", "tenantId", "planId", "versionNumber", "status", "name", "description",
    "price", "currency", "durationDays", "renewalAllowed", "upgradeAllowed",
    "cancellationRequestAllowed", "customerNote", "benefitsSnapshotJson",
    "rulesSnapshotJson", "publishedAt", "createdAt"
)
SELECT
    'mpv_' || substr(md5(p."id" || clock_timestamp()::text || random()::text), 1, 24),
    p."tenantId",
    p."id",
    1,
    'PUBLISHED',
    p."name",
    p."description",
    p."price",
    p."currency",
    p."durationDays",
    p."renewalAllowed",
    p."upgradeAllowed",
    p."cancellationRequestAllowed",
    p."customerNote",
    COALESCE((
        SELECT jsonb_agg(to_jsonb(b) ORDER BY b."sortOrder", b."title")
        FROM "MembershipBenefit" b
        WHERE b."planId" = p."id"
    ), '[]'::jsonb),
    COALESCE((
        SELECT jsonb_agg(to_jsonb(r) ORDER BY r."priority" DESC, r."createdAt")
        FROM "MembershipRule" r
        WHERE r."planId" = p."id"
    ), '[]'::jsonb),
    COALESCE(p."updatedAt", p."createdAt"),
    COALESCE(p."createdAt", CURRENT_TIMESTAMP)
FROM "MembershipPlan" p;

UPDATE "UserMembership" um
SET "planVersionId" = v."id"
FROM "MembershipPlanVersion" v
WHERE v."planId" = um."planId" AND v."versionNumber" = 1;

CREATE UNIQUE INDEX "MembershipPlanVersion_planId_versionNumber_key" ON "MembershipPlanVersion"("planId", "versionNumber");
CREATE INDEX "MembershipPlanVersion_tenantId_status_publishedAt_idx" ON "MembershipPlanVersion"("tenantId", "status", "publishedAt");
CREATE INDEX "MembershipPlanVersion_planId_status_versionNumber_idx" ON "MembershipPlanVersion"("planId", "status", "versionNumber");
CREATE INDEX "UserMembership_planVersionId_idx" ON "UserMembership"("planVersionId");

ALTER TABLE "MembershipPlanVersion"
ADD CONSTRAINT "MembershipPlanVersion_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MembershipPlanVersion"
ADD CONSTRAINT "MembershipPlanVersion_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserMembership"
ADD CONSTRAINT "UserMembership_planVersionId_fkey"
FOREIGN KEY ("planVersionId") REFERENCES "MembershipPlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;