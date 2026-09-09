CREATE TYPE "MembershipBenefitMethod" AS ENUM ('AUTOMATIC', 'CLAIM');
CREATE TYPE "MembershipRedemptionStatus" AS ENUM ('RESERVED', 'CONSUMED', 'RELEASED', 'REVERSED');

ALTER TABLE "OrderItem"
  ADD COLUMN "membershipSavingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "membershipBenefitId" TEXT,
  ADD COLUMN "membershipRedemptionId" TEXT;

ALTER TABLE "MembershipPlanVersion"
  ADD COLUMN "targetsSnapshotJson" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "MembershipBenefit"
  ADD COLUMN "method" "MembershipBenefitMethod" NOT NULL DEFAULT 'AUTOMATIC',
  ADD COLUMN "maxDiscountAmount" DECIMAL(12,2),
  ADD COLUMN "stackWithCoupon" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stackWithAutomatic" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stackWithWallet" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "residualChargePolicy" TEXT NOT NULL DEFAULT 'CUSTOMER_PAYS',
  ADD COLUMN "fulfilmentInstructions" TEXT;

CREATE TABLE "MembershipBenefitTarget" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "benefitId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "labelSnapshot" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MembershipBenefitTarget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MembershipBenefitRedemption" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userMembershipId" TEXT NOT NULL,
  "planVersionId" TEXT,
  "benefitId" TEXT NOT NULL,
  "targetId" TEXT,
  "status" "MembershipRedemptionStatus" NOT NULL DEFAULT 'RESERVED',
  "scope" "MembershipBenefitScope" NOT NULL,
  "relatedType" TEXT,
  "relatedId" TEXT,
  "lineKey" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "originalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "savingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "finalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "periodKey" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "reservationExpiresAt" TIMESTAMP(3),
  "consumedAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "reversedAt" TIMESTAMP(3),
  "reason" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MembershipBenefitRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MembershipBenefitTarget_benefitId_targetType_targetId_key" ON "MembershipBenefitTarget"("benefitId", "targetType", "targetId");
CREATE INDEX "MembershipBenefitTarget_tenantId_targetType_targetId_idx" ON "MembershipBenefitTarget"("tenantId", "targetType", "targetId");
CREATE UNIQUE INDEX "MembershipBenefitRedemption_tenantId_idempotencyKey_key" ON "MembershipBenefitRedemption"("tenantId", "idempotencyKey");
CREATE INDEX "MembershipBenefitRedemption_userMembershipId_benefitId_periodKey_status_idx" ON "MembershipBenefitRedemption"("userMembershipId", "benefitId", "periodKey", "status");
CREATE INDEX "MembershipBenefitRedemption_tenantId_relatedType_relatedId_idx" ON "MembershipBenefitRedemption"("tenantId", "relatedType", "relatedId");
CREATE INDEX "MembershipBenefitRedemption_userId_createdAt_idx" ON "MembershipBenefitRedemption"("userId", "createdAt");

ALTER TABLE "MembershipBenefitTarget" ADD CONSTRAINT "MembershipBenefitTarget_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MembershipBenefitTarget" ADD CONSTRAINT "MembershipBenefitTarget_benefitId_fkey" FOREIGN KEY ("benefitId") REFERENCES "MembershipBenefit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MembershipBenefitRedemption" ADD CONSTRAINT "MembershipBenefitRedemption_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MembershipBenefitRedemption" ADD CONSTRAINT "MembershipBenefitRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MembershipBenefitRedemption" ADD CONSTRAINT "MembershipBenefitRedemption_userMembershipId_fkey" FOREIGN KEY ("userMembershipId") REFERENCES "UserMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MembershipBenefitRedemption" ADD CONSTRAINT "MembershipBenefitRedemption_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "MembershipPlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MembershipBenefitRedemption" ADD CONSTRAINT "MembershipBenefitRedemption_benefitId_fkey" FOREIGN KEY ("benefitId") REFERENCES "MembershipBenefit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MembershipBenefitRedemption" ADD CONSTRAINT "MembershipBenefitRedemption_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "MembershipBenefitTarget"("id") ON DELETE SET NULL ON UPDATE CASCADE;
