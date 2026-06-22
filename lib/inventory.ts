import { revalidatePath } from "next/cache";
import type { InventoryMovementType, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import type { CartLineItem } from "@/lib/cart";
import { requireAdminUser } from "@/lib/admin-auth";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export const physicalProductTypes = new Set(["PHYSICAL"]);

export type VariantStockSummary = {
  variantId: string;
  initial: number;
  adjustment: number;
  reserved: number;
  released: number;
  currentReserved: number;
  available: number;
  status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  lastMovementDate: Date | null;
};

const movementTypes: InventoryMovementType[] = ["initial", "adjustment", "reserved", "released"];

export function isPhysicalInventoryType(type: string) {
  return physicalProductTypes.has(type);
}

function emptySummary(variantId: string): VariantStockSummary {
  return {
    variantId,
    initial: 0,
    adjustment: 0,
    reserved: 0,
    released: 0,
    currentReserved: 0,
    available: 0,
    status: "OUT_OF_STOCK",
    lastMovementDate: null
  };
}

function withDerivedStatus(summary: VariantStockSummary): VariantStockSummary {
  const currentReserved = Math.max(0, summary.reserved - summary.released);
  const available = summary.initial + summary.adjustment - currentReserved;
  const status = available <= 0 ? "OUT_OF_STOCK" : available <= 5 ? "LOW_STOCK" : "IN_STOCK";

  return {
    ...summary,
    currentReserved,
    available,
    status
  };
}

export async function getVariantStockSummaries(variantIds: string[], client: PrismaExecutor = prisma) {
  const uniqueVariantIds = [...new Set(variantIds.filter(Boolean))];
  const summaries = new Map<string, VariantStockSummary>();

  for (const variantId of uniqueVariantIds) {
    summaries.set(variantId, emptySummary(variantId));
  }

  if (uniqueVariantIds.length === 0) {
    return summaries;
  }

  const grouped = await client.inventoryLedger.groupBy({
    by: ["variantId", "movementType"],
    where: {
      variantId: { in: uniqueVariantIds },
      movementType: { in: movementTypes }
    },
    _sum: { quantity: true },
    _max: { createdAt: true }
  });

  for (const row of grouped) {
    const summary = summaries.get(row.variantId) ?? emptySummary(row.variantId);
    const quantity = row._sum.quantity ?? 0;

    if (row.movementType === "initial") summary.initial += quantity;
    if (row.movementType === "adjustment") summary.adjustment += quantity;
    if (row.movementType === "reserved") summary.reserved += quantity;
    if (row.movementType === "released") summary.released += quantity;

    if (!summary.lastMovementDate || (row._max.createdAt && row._max.createdAt > summary.lastMovementDate)) {
      summary.lastMovementDate = row._max.createdAt;
    }

    summaries.set(row.variantId, summary);
  }

  for (const [variantId, summary] of summaries) {
    summaries.set(variantId, withDerivedStatus(summary));
  }

  return summaries;
}

export async function getVariantStockSummary(variantId: string, client: PrismaExecutor = prisma) {
  const summaries = await getVariantStockSummaries([variantId], client);
  return summaries.get(variantId) ?? withDerivedStatus(emptySummary(variantId));
}

export async function getCartStockIssues(items: CartLineItem[], client: PrismaExecutor = prisma) {
  const physicalItems = items.filter((item) => isPhysicalInventoryType(item.product.type));
  const stock = await getVariantStockSummaries(
    physicalItems.map((item) => item.variantId).filter((variantId): variantId is string => Boolean(variantId)),
    client
  );

  return physicalItems
    .map((item) => {
      if (!item.variantId) {
        return {
          itemId: item.id,
          title: item.titleSnapshot,
          requested: item.quantity,
          available: 0,
          message: "Physical items require an inventory-tracked variant."
        };
      }

      const summary = stock.get(item.variantId) ?? withDerivedStatus(emptySummary(item.variantId));

      if (item.quantity <= summary.available) {
        return null;
      }

      return {
        itemId: item.id,
        title: item.titleSnapshot,
        requested: item.quantity,
        available: summary.available,
        message: `${item.titleSnapshot} has ${summary.available} available, but ${item.quantity} is in cart.`
      };
    })
    .filter((issue): issue is NonNullable<typeof issue> => Boolean(issue));
}

export async function createStockAdjustmentAction(formData: FormData) {
  const admin = await requireAdminUser();
  const tenantId = await getOmdTenantId();
  const variantId = String(formData.get("variantId") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();

  if (!variantId || !Number.isInteger(quantity) || quantity === 0) {
    throw new Error("Variant and non-zero whole quantity are required.");
  }

  if (!reason) {
    throw new Error("Stock adjustment reason is required.");
  }

  await prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.findFirst({
      where: { id: variantId, product: { tenantId, type: "PHYSICAL" } },
      include: { product: { select: { id: true, slug: true, title: true } } }
    });

    if (!variant) {
      throw new Error("Only physical product variants can receive stock adjustments.");
    }

    const stock = await getVariantStockSummary(variantId, tx);

    if (stock.available + quantity < 0) {
      throw new Error("Adjustment would make available stock negative.");
    }

    await tx.inventoryLedger.create({
      data: {
        tenantId,
        productId: variant.product.id,
        variantId,
        movementType: "adjustment",
        quantity,
        reason,
        actorId: admin.id
      }
    });
  });

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath("/shop");
}

export async function releaseReservedStockForOrderAction(formData: FormData) {
  const admin = await requireAdminUser();
  const tenantId = await getOmdTenantId();
  const orderId = String(formData.get("orderId") ?? "").trim();

  if (!orderId) {
    throw new Error("Order is required.");
  }

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, tenantId, status: "payment_pending" },
      include: { items: true }
    });

    if (!order) {
      throw new Error("Payment-pending order was not found.");
    }

    const reserved = await tx.inventoryLedger.groupBy({
      by: ["variantId", "productId", "orderItemId"],
      where: { tenantId, orderId, movementType: "reserved" },
      _sum: { quantity: true }
    });

    const released = await tx.inventoryLedger.groupBy({
      by: ["variantId", "productId", "orderItemId"],
      where: { tenantId, orderId, movementType: "released" },
      _sum: { quantity: true }
    });

    const releasedByKey = new Map(
      released.map((row) => [`${row.variantId}:${row.orderItemId ?? ""}`, row._sum.quantity ?? 0])
    );

    for (const row of reserved) {
      const key = `${row.variantId}:${row.orderItemId ?? ""}`;
      const remaining = (row._sum.quantity ?? 0) - (releasedByKey.get(key) ?? 0);

      if (remaining > 0) {
        await tx.inventoryLedger.create({
          data: {
            tenantId,
            productId: row.productId,
            variantId: row.variantId,
            orderId,
            orderItemId: row.orderItemId,
            movementType: "released",
            quantity: remaining,
            reason: "Manual admin release of payment-pending reservation.",
            actorId: admin.id
          }
        });
      }
    }
  });

  revalidatePath("/admin/inventory");
  revalidatePath(`/admin/orders/${orderId}`);
}

export function reservationSummaryFromMovements(
  movements: Array<{ movementType: InventoryMovementType; quantity: number }>
) {
  const reserved = movements
    .filter((movement) => movement.movementType === "reserved")
    .reduce((total, movement) => total + movement.quantity, 0);
  const released = movements
    .filter((movement) => movement.movementType === "released")
    .reduce((total, movement) => total + movement.quantity, 0);

  return {
    reserved,
    released,
    activeReserved: Math.max(0, reserved - released)
  };
}
