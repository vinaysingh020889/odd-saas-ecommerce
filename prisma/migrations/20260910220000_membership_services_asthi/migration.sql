ALTER TABLE "ServiceBooking"
ADD COLUMN "listAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "membershipSavingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "membershipBenefitId" TEXT,
ADD COLUMN "membershipRedemptionId" TEXT;
UPDATE "ServiceBooking" SET "listAmount" = "totalAmount";
ALTER TABLE "AsthiApplication"
ADD COLUMN "listAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "packageAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "addOnAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "membershipSavingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "membershipBenefitId" TEXT,
ADD COLUMN "membershipRedemptionId" TEXT;
UPDATE "AsthiApplication" SET "listAmount" = "totalAmount", "packageAmount" = "totalAmount";
CREATE INDEX "ServiceBooking_tenantId_membershipBenefitId_idx" ON "ServiceBooking"("tenantId", "membershipBenefitId");
CREATE INDEX "AsthiApplication_tenantId_membershipBenefitId_idx" ON "AsthiApplication"("tenantId", "membershipBenefitId");
