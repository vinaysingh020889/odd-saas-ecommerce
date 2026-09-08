ALTER TABLE "PaymentAttempt" ALTER COLUMN "orderId" DROP NOT NULL;
ALTER TABLE "PaymentAttempt" ADD COLUMN "userId" TEXT;
ALTER TABLE "PaymentAttempt" ADD COLUMN "subjectType" TEXT NOT NULL DEFAULT 'ORDER';
ALTER TABLE "PaymentAttempt" ADD COLUMN "subjectId" TEXT;
UPDATE "PaymentAttempt" AS pa SET "userId" = o."userId", "subjectId" = pa."orderId" FROM "Order" AS o WHERE pa."orderId" = o."id";
ALTER TABLE "PaymentAttempt" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "PaymentAttempt" ALTER COLUMN "subjectId" SET NOT NULL;
CREATE INDEX "PaymentAttempt_tenantId_subjectType_subjectId_createdAt_idx" ON "PaymentAttempt"("tenantId", "subjectType", "subjectId", "createdAt");
CREATE INDEX "PaymentAttempt_userId_createdAt_idx" ON "PaymentAttempt"("userId", "createdAt");

ALTER TABLE "PaymentEvent" ALTER COLUMN "orderId" DROP NOT NULL;
ALTER TABLE "PaymentEvent" ADD COLUMN "subjectType" TEXT NOT NULL DEFAULT 'ORDER';
ALTER TABLE "PaymentEvent" ADD COLUMN "subjectId" TEXT;
UPDATE "PaymentEvent" AS pe SET "subjectType" = pa."subjectType", "subjectId" = pa."subjectId" FROM "PaymentAttempt" AS pa WHERE pe."paymentAttemptId" = pa."id";
ALTER TABLE "PaymentEvent" ALTER COLUMN "subjectId" SET NOT NULL;
CREATE INDEX "PaymentEvent_tenantId_subjectType_subjectId_createdAt_idx" ON "PaymentEvent"("tenantId", "subjectType", "subjectId", "createdAt");
