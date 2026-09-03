-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "endedReason" TEXT;

-- Enforce one current primary assignment per Kundli order while retaining ended history.
CREATE UNIQUE INDEX "Assignment_one_active_primary_kundli_order_key"
ON "Assignment" ("tenantId", "workId")
WHERE "workType" = 'KUNDLI_ORDER' AND "isPrimary" = true AND "endedAt" IS NULL;
