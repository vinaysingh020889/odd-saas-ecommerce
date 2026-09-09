ALTER TABLE "KundliOrder"
  ADD COLUMN "listAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "membershipSavingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "membershipBenefitId" TEXT,
  ADD COLUMN "membershipRedemptionId" TEXT;

UPDATE "KundliOrder"
SET "listAmount" = "totalAmount"
WHERE "listAmount" = 0;

CREATE INDEX "KundliOrder_tenantId_membershipBenefitId_idx" ON "KundliOrder"("tenantId", "membershipBenefitId");
CREATE INDEX "KundliOrder_membershipRedemptionId_idx" ON "KundliOrder"("membershipRedemptionId");
