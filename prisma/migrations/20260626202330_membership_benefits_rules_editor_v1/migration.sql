-- AlterEnum
ALTER TYPE "MembershipBenefitScope" ADD VALUE 'SERVICE_BOOKING';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MembershipBenefitType" ADD VALUE 'PRIORITY_QUEUE';
ALTER TYPE "MembershipBenefitType" ADD VALUE 'SHIPPING_BENEFIT';

-- AlterEnum
ALTER TYPE "MembershipUsagePeriod" ADD VALUE 'WEEKLY';

-- AlterTable
ALTER TABLE "MembershipBenefit" ADD COLUMN     "customerVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "internalNote" TEXT,
ADD COLUMN     "validFrom" TIMESTAMP(3),
ADD COLUMN     "validUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MembershipPlan" ADD COLUMN     "cancellationRequestAllowed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "customerNote" TEXT,
ADD COLUMN     "internalNote" TEXT,
ADD COLUMN     "renewalAllowed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "upgradeAllowed" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "MembershipRule" ADD COLUMN     "minAmount" DECIMAL(12,2),
ADD COLUMN     "note" TEXT,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "usageLimit" INTEGER,
ADD COLUMN     "usagePeriod" "MembershipUsagePeriod",
ADD COLUMN     "validFrom" TIMESTAMP(3),
ADD COLUMN     "validUntil" TIMESTAMP(3),
ADD COLUMN     "valueDecimal" DECIMAL(12,2);
