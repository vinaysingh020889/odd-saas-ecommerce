ALTER TABLE "Cart" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "Cart" ALTER COLUMN "userId" DROP NOT NULL;
CREATE INDEX "Cart_sessionId_status_idx" ON "Cart"("sessionId", "status");
