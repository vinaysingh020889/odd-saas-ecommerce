ALTER TABLE "Product"
  ADD COLUMN "taxPercent" DECIMAL(5,2),
  ADD COLUMN "hsnCode" TEXT,
  ADD COLUMN "sacCode" TEXT;

UPDATE "Product"
SET "taxPercent" = CASE WHEN "type" = 'SERVICE' THEN 18 ELSE 5 END
WHERE "taxPercent" IS NULL;