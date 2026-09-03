-- CreateEnum
CREATE TYPE "KundliPractitionerSelectionMode" AS ENUM ('INTERNAL_ASSIGNMENT', 'CUSTOMER_SELECTS_GURUJI');

-- CreateEnum
CREATE TYPE "KundliAssignmentState" AS ENUM ('NOT_READY', 'AWAITING_ASSIGNMENT', 'ASSIGNED', 'REASSIGNED');

-- CreateEnum
CREATE TYPE "AssignmentSource" AS ENUM ('AUTO', 'CUSTOMER_SELECTION', 'ADMIN');

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "assignmentReason" TEXT,
ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source" "AssignmentSource" NOT NULL DEFAULT 'ADMIN';

-- AlterTable
ALTER TABLE "KundliOrder" ADD COLUMN     "assignmentQueuePosition" INTEGER,
ADD COLUMN     "assignmentQueuedAt" TIMESTAMP(3),
ADD COLUMN     "assignmentState" "KundliAssignmentState" NOT NULL DEFAULT 'NOT_READY',
ADD COLUMN     "deliveryPromiseChangedReason" TEXT,
ADD COLUMN     "deliveryPromiseSetAt" TIMESTAMP(3),
ADD COLUMN     "promisedDeliveryAt" TIMESTAMP(3),
ADD COLUMN     "requestedPractitionerProfileId" TEXT;

-- AlterTable
ALTER TABLE "KundliPackage" ADD COLUMN     "practitionerSelectionMode" "KundliPractitionerSelectionMode" NOT NULL DEFAULT 'INTERNAL_ASSIGNMENT';

-- CreateTable
CREATE TABLE "KundliPractitionerProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "photoUrl" TEXT,
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "bio" TEXT,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "credentialsAuthenticityText" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "publicVisible" BOOLEAN NOT NULL DEFAULT false,
    "acceptingWork" BOOLEAN NOT NULL DEFAULT true,
    "assignmentPriority" INTEGER NOT NULL DEFAULT 100,
    "standardDeliveryBusinessDays" INTEGER NOT NULL DEFAULT 3,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "dailyActiveOrderLimit" INTEGER NOT NULL DEFAULT 5,
    "weeklyActiveOrderLimit" INTEGER NOT NULL DEFAULT 20,
    "monthlyActiveOrderLimit" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KundliPractitionerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KundliPractitionerUnavailability" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "practitionerProfileId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KundliPractitionerUnavailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KundliPackagePractitioner" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "practitionerProfileId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KundliPackagePractitioner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KundliPractitionerProfile_userId_key" ON "KundliPractitionerProfile"("userId");

-- CreateIndex
CREATE INDEX "KundliPractitionerProfile_tenantId_active_acceptingWork_ass_idx" ON "KundliPractitionerProfile"("tenantId", "active", "acceptingWork", "assignmentPriority");

-- CreateIndex
CREATE INDEX "KundliPractitionerProfile_tenantId_publicVisible_active_idx" ON "KundliPractitionerProfile"("tenantId", "publicVisible", "active");

-- CreateIndex
CREATE INDEX "KundliPractitionerUnavailability_tenantId_practitionerProfi_idx" ON "KundliPractitionerUnavailability"("tenantId", "practitionerProfileId", "active", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "KundliPackagePractitioner_tenantId_packageId_active_idx" ON "KundliPackagePractitioner"("tenantId", "packageId", "active");

-- CreateIndex
CREATE INDEX "KundliPackagePractitioner_tenantId_practitionerProfileId_ac_idx" ON "KundliPackagePractitioner"("tenantId", "practitionerProfileId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "KundliPackagePractitioner_packageId_practitionerProfileId_key" ON "KundliPackagePractitioner"("packageId", "practitionerProfileId");

-- CreateIndex
CREATE INDEX "Assignment_tenantId_workType_workId_isPrimary_endedAt_idx" ON "Assignment"("tenantId", "workType", "workId", "isPrimary", "endedAt");

-- CreateIndex
CREATE INDEX "KundliOrder_tenantId_assignmentState_assignmentQueuedAt_idx" ON "KundliOrder"("tenantId", "assignmentState", "assignmentQueuedAt");

-- CreateIndex
CREATE INDEX "KundliOrder_requestedPractitionerProfileId_idx" ON "KundliOrder"("requestedPractitionerProfileId");

-- AddForeignKey
ALTER TABLE "KundliOrder" ADD CONSTRAINT "KundliOrder_requestedPractitionerProfileId_fkey" FOREIGN KEY ("requestedPractitionerProfileId") REFERENCES "KundliPractitionerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KundliPractitionerProfile" ADD CONSTRAINT "KundliPractitionerProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KundliPractitionerProfile" ADD CONSTRAINT "KundliPractitionerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KundliPractitionerUnavailability" ADD CONSTRAINT "KundliPractitionerUnavailability_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KundliPractitionerUnavailability" ADD CONSTRAINT "KundliPractitionerUnavailability_practitionerProfileId_fkey" FOREIGN KEY ("practitionerProfileId") REFERENCES "KundliPractitionerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KundliPackagePractitioner" ADD CONSTRAINT "KundliPackagePractitioner_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KundliPackagePractitioner" ADD CONSTRAINT "KundliPackagePractitioner_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "KundliPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KundliPackagePractitioner" ADD CONSTRAINT "KundliPackagePractitioner_practitionerProfileId_fkey" FOREIGN KEY ("practitionerProfileId") REFERENCES "KundliPractitionerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
