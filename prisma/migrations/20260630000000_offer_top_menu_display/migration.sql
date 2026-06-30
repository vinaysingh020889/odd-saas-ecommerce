ALTER TABLE "OfferRule" ADD COLUMN "showInTopMenu" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OfferRule" ADD COLUMN "topMenuTitle" TEXT;
CREATE INDEX "OfferRule_tenantId_showInTopMenu_status_priority_idx" ON "OfferRule"("tenantId", "showInTopMenu", "status", "priority");
