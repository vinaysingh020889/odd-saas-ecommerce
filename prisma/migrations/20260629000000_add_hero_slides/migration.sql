CREATE TYPE "HeroSlideLinkType" AS ENUM ('CUSTOM', 'PRODUCT', 'SERVICE', 'FESTIVAL', 'OFFER', 'MEMBERSHIP', 'ASTHI', 'KUNDLI');
CREATE TYPE "HeroSlideTheme" AS ENUM ('DARK_OVERLAY', 'LIGHT_OVERLAY', 'CREAM_CARD', 'SAFFRON_GOLD');
CREATE TYPE "HeroSlideTextAlign" AS ENUM ('LEFT', 'CENTER', 'RIGHT');
CREATE TYPE "HeroSlideOverlay" AS ENUM ('NONE', 'LIGHT', 'MEDIUM', 'STRONG');

CREATE TABLE "HeroSlide" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "eyebrow" TEXT,
    "badgeText" TEXT,
    "desktopImageUrl" TEXT NOT NULL,
    "mobileImageUrl" TEXT,
    "imageAlt" TEXT,
    "primaryCtaLabel" TEXT NOT NULL,
    "primaryCtaUrl" TEXT,
    "secondaryCtaLabel" TEXT,
    "secondaryCtaUrl" TEXT,
    "linkType" "HeroSlideLinkType" NOT NULL DEFAULT 'CUSTOM',
    "linkedProductId" TEXT,
    "linkedServiceId" TEXT,
    "linkedFestivalId" TEXT,
    "linkedOfferId" TEXT,
    "linkedMembershipId" TEXT,
    "themeVariant" "HeroSlideTheme" NOT NULL DEFAULT 'DARK_OVERLAY',
    "textAlign" "HeroSlideTextAlign" NOT NULL DEFAULT 'LEFT',
    "overlayStrength" "HeroSlideOverlay" NOT NULL DEFAULT 'MEDIUM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "HeroSlide_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HeroSlide_tenantId_isActive_sortOrder_idx" ON "HeroSlide"("tenantId", "isActive", "sortOrder");
CREATE INDEX "HeroSlide_startsAt_endsAt_idx" ON "HeroSlide"("startsAt", "endsAt");

ALTER TABLE "HeroSlide" ADD CONSTRAINT "HeroSlide_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;