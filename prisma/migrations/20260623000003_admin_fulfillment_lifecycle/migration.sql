-- Admin fulfilment lifecycle shell. No courier API or real refund integration.

ALTER TABLE "Order"
ADD COLUMN "fulfillmentStatus" TEXT NOT NULL DEFAULT 'unfulfilled',
ADD COLUMN "refundStatus" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN "courierName" TEXT,
ADD COLUMN "trackingNumber" TEXT,
ADD COLUMN "shippedAt" TIMESTAMP(3),
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "fulfillmentNote" TEXT;
