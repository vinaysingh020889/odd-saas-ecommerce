import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PrismaExecutor = Prisma.TransactionClient | typeof prisma;

export type AddressSnapshot = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  country: string;
  pincode: string;
  landmark?: string | null;
};

export type ShippingSnapshot = {
  shippingAmount: number;
  shippingEstimateDays: number | null;
  shippingServiceable: boolean | null;
  shippingNote: string | null;
};

export type TaxSnapshot = {
  taxPercent: number;
  taxableAmount: number;
  taxAmount: number;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function normalizePincode(value: string) {
  return value.trim().replace(/\s+/g, "");
}

export function buildAddressText(address: unknown) {
  const value = address as Partial<AddressSnapshot>;
  const legacyAddressLine = (value as { addressLine?: string }).addressLine;
  return [
    value.addressLine1 ?? legacyAddressLine,
    value.addressLine2,
    value.landmark ? `Landmark: ${value.landmark}` : null,
    value.city,
    value.state,
    value.pincode,
    value.country
  ]
    .filter(Boolean)
    .join(", ");
}

export function addressSnapshotFromRecord(address: AddressSnapshot): Prisma.InputJsonObject {
  return {
    fullName: address.fullName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? null,
    city: address.city,
    state: address.state,
    country: address.country || "India",
    pincode: normalizePincode(address.pincode),
    landmark: address.landmark ?? null
  };
}

export async function resolveShippingSnapshot(
  tenantId: string,
  pincode: string,
  client: PrismaExecutor = prisma
): Promise<ShippingSnapshot> {
  const zone = await client.serviceablePincode.findUnique({
    where: { tenantId_pincode: { tenantId, pincode: normalizePincode(pincode) } }
  });

  if (!zone) {
    return {
      shippingAmount: 0,
      shippingEstimateDays: null,
      shippingServiceable: false,
      shippingNote: "Delivery is not configured for this pincode yet."
    };
  }

  return {
    shippingAmount: zone.serviceable ? Number(zone.shippingCharge) : 0,
    shippingEstimateDays: zone.estimatedDays,
    shippingServiceable: zone.serviceable,
    shippingNote: zone.note ?? (zone.serviceable ? "Delivery is available for this pincode." : "Delivery is not available for this pincode.")
  };
}

export function taxPercentForItem(itemType: string, configuredTaxPercent?: unknown) {
  const configured = Number(configuredTaxPercent);
  if (configuredTaxPercent !== null && configuredTaxPercent !== undefined && configuredTaxPercent !== "" && Number.isFinite(configured) && configured >= 0 && configured <= 100) {
    return configured;
  }
  return itemType === "SERVICE" ? 18 : 5;
}

export function calculateInclusiveTax(lineTotal: number, taxPercent: number): TaxSnapshot {
  if (lineTotal <= 0 || taxPercent <= 0) {
    return { taxPercent, taxableAmount: lineTotal, taxAmount: 0 };
  }

  const taxableAmount = roundMoney(lineTotal / (1 + taxPercent / 100));
  return {
    taxPercent,
    taxableAmount,
    taxAmount: roundMoney(lineTotal - taxableAmount)
  };
}

export function invoiceNumberForOrder(orderNumber: string) {
  return `INV-${orderNumber.replace(/^ODD-/, "")}`;
}
export type CheckoutTaxLine = {
  itemId: string;
  taxPercent: number;
  taxableAmount: number;
  taxAmount: number;
  discountedLineTotal: number;
};

export function calculateCartInclusiveTax(
  items: Array<{ id: string; itemType: string; lineTotal: number; taxPercent?: unknown }>,
  discountTotal: number
) {
  const subtotal = items.reduce((total, item) => total + item.lineTotal, 0);
  const safeDiscount = Math.max(0, Math.min(subtotal, discountTotal));
  let allocatedDiscount = 0;
  const lines: CheckoutTaxLine[] = items.map((item, index) => {
    const itemDiscount = index === items.length - 1
      ? safeDiscount - allocatedDiscount
      : roundMoney(subtotal > 0 ? (safeDiscount * item.lineTotal) / subtotal : 0);
    allocatedDiscount += itemDiscount;
    const discountedLineTotal = roundMoney(Math.max(0, item.lineTotal - itemDiscount));
    const tax = calculateInclusiveTax(discountedLineTotal, taxPercentForItem(item.itemType, item.taxPercent));
    return { itemId: item.id, discountedLineTotal, ...tax };
  });
  return {
    lines,
    taxableAmount: roundMoney(lines.reduce((total, line) => total + line.taxableAmount, 0)),
    taxAmount: roundMoney(lines.reduce((total, line) => total + line.taxAmount, 0))
  };
}
