-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "pincode" TEXT NOT NULL,
    "landmark" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ServiceablePincode" ADD COLUMN "shippingCharge" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "taxableAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "taxPercent" DECIMAL(5,2),
ADD COLUMN "shippingEstimateDays" INTEGER,
ADD COLUMN "shippingServiceable" BOOLEAN,
ADD COLUMN "shippingNote" TEXT,
ADD COLUMN "invoiceNumber" TEXT,
ADD COLUMN "invoiceDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "taxPercent" DECIMAL(5,2),
ADD COLUMN "taxableAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "hsnCode" TEXT,
ADD COLUMN "sacCode" TEXT;

-- CreateIndex
CREATE INDEX "CustomerAddress_tenantId_userId_idx" ON "CustomerAddress"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "CustomerAddress_userId_isDefault_idx" ON "CustomerAddress"("userId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "Order_invoiceNumber_key" ON "Order"("invoiceNumber");

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
