-- CreateEnum
CREATE TYPE "MembershipPlanStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "UserMembershipStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MembershipBenefitType" AS ENUM ('DISCOUNT_PERCENT', 'DISCOUNT_AMOUNT', 'FREE_USAGE', 'PRIORITY_SUPPORT', 'ACCESS', 'WALLET_BONUS_PLACEHOLDER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MembershipBenefitScope" AS ENUM ('SHOP', 'PUJA', 'KUNDLI', 'ASTHI', 'FESTIVAL', 'CONTENT', 'SUPPORT', 'SHIPPING', 'GLOBAL');

-- CreateEnum
CREATE TYPE "MembershipUsagePeriod" AS ENUM ('ONCE', 'DAILY', 'MONTHLY', 'YEARLY', 'LIFETIME');

-- CreateTable
CREATE TABLE "MembershipPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "durationDays" INTEGER NOT NULL,
    "status" "MembershipPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipBenefit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "MembershipBenefitType" NOT NULL,
    "scope" "MembershipBenefitScope" NOT NULL,
    "valueDecimal" DECIMAL(12,2),
    "valueText" TEXT,
    "usageLimit" INTEGER,
    "usagePeriod" "MembershipUsagePeriod",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "benefitId" TEXT,
    "scope" "MembershipBenefitScope" NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "ruleValueJson" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "UserMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "activatedByOrderRef" TEXT,
    "mockPaymentReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipBenefitUsage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userMembershipId" TEXT NOT NULL,
    "benefitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" "MembershipBenefitScope" NOT NULL,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 1,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadataJson" JSONB,

    CONSTRAINT "MembershipBenefitUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipStatusHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userMembershipId" TEXT NOT NULL,
    "fromStatus" "UserMembershipStatus",
    "toStatus" "UserMembershipStatus" NOT NULL,
    "note" TEXT,
    "actorLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MembershipPlan_tenantId_status_sortOrder_idx" ON "MembershipPlan"("tenantId", "status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPlan_tenantId_slug_key" ON "MembershipPlan"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "MembershipBenefit_tenantId_scope_active_idx" ON "MembershipBenefit"("tenantId", "scope", "active");

-- CreateIndex
CREATE INDEX "MembershipBenefit_planId_sortOrder_idx" ON "MembershipBenefit"("planId", "sortOrder");

-- CreateIndex
CREATE INDEX "MembershipRule_tenantId_scope_active_idx" ON "MembershipRule"("tenantId", "scope", "active");

-- CreateIndex
CREATE INDEX "MembershipRule_planId_idx" ON "MembershipRule"("planId");

-- CreateIndex
CREATE INDEX "MembershipRule_benefitId_idx" ON "MembershipRule"("benefitId");

-- CreateIndex
CREATE INDEX "UserMembership_tenantId_status_idx" ON "UserMembership"("tenantId", "status");

-- CreateIndex
CREATE INDEX "UserMembership_userId_status_idx" ON "UserMembership"("userId", "status");

-- CreateIndex
CREATE INDEX "UserMembership_planId_status_idx" ON "UserMembership"("planId", "status");

-- CreateIndex
CREATE INDEX "MembershipBenefitUsage_tenantId_scope_usedAt_idx" ON "MembershipBenefitUsage"("tenantId", "scope", "usedAt");

-- CreateIndex
CREATE INDEX "MembershipBenefitUsage_userMembershipId_benefitId_idx" ON "MembershipBenefitUsage"("userMembershipId", "benefitId");

-- CreateIndex
CREATE INDEX "MembershipBenefitUsage_userId_usedAt_idx" ON "MembershipBenefitUsage"("userId", "usedAt");

-- CreateIndex
CREATE INDEX "MembershipStatusHistory_tenantId_createdAt_idx" ON "MembershipStatusHistory"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "MembershipStatusHistory_userMembershipId_createdAt_idx" ON "MembershipStatusHistory"("userMembershipId", "createdAt");

-- AddForeignKey
ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipBenefit" ADD CONSTRAINT "MembershipBenefit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipBenefit" ADD CONSTRAINT "MembershipBenefit_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipRule" ADD CONSTRAINT "MembershipRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipRule" ADD CONSTRAINT "MembershipRule_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipRule" ADD CONSTRAINT "MembershipRule_benefitId_fkey" FOREIGN KEY ("benefitId") REFERENCES "MembershipBenefit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMembership" ADD CONSTRAINT "UserMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMembership" ADD CONSTRAINT "UserMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMembership" ADD CONSTRAINT "UserMembership_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipBenefitUsage" ADD CONSTRAINT "MembershipBenefitUsage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipBenefitUsage" ADD CONSTRAINT "MembershipBenefitUsage_userMembershipId_fkey" FOREIGN KEY ("userMembershipId") REFERENCES "UserMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipBenefitUsage" ADD CONSTRAINT "MembershipBenefitUsage_benefitId_fkey" FOREIGN KEY ("benefitId") REFERENCES "MembershipBenefit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipBenefitUsage" ADD CONSTRAINT "MembershipBenefitUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipStatusHistory" ADD CONSTRAINT "MembershipStatusHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipStatusHistory" ADD CONSTRAINT "MembershipStatusHistory_userMembershipId_fkey" FOREIGN KEY ("userMembershipId") REFERENCES "UserMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
