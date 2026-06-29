-- CreateTable
CREATE TABLE "SearchQueryLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "query" TEXT NOT NULL,
    "normalizedQuery" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "sessionId" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchQueryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchQueryLog_tenantId_createdAt_idx" ON "SearchQueryLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "SearchQueryLog_tenantId_normalizedQuery_idx" ON "SearchQueryLog"("tenantId", "normalizedQuery");

-- CreateIndex
CREATE INDEX "SearchQueryLog_userId_idx" ON "SearchQueryLog"("userId");

-- AddForeignKey
ALTER TABLE "SearchQueryLog" ADD CONSTRAINT "SearchQueryLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchQueryLog" ADD CONSTRAINT "SearchQueryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
