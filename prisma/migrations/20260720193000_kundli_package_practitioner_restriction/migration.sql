-- Eligibility links restrict internal assignment only when an administrator deliberately enables this flag.
ALTER TABLE "KundliPackage"
ADD COLUMN "restrictToSelectedPractitioners" BOOLEAN NOT NULL DEFAULT false;
