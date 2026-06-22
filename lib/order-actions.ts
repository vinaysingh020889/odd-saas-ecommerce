"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cartSubtotal, getCurrentCart, itemSubtotal } from "@/lib/cart";
import { requireCurrentUser } from "@/lib/auth/session";
import { getCartStockIssues, isPhysicalInventoryType } from "@/lib/inventory";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

async function nextOrderNumber(client: Prisma.TransactionClient | typeof prisma = prisma) {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const count = await client.order.count({
    where: {
      orderNumber: {
        startsWith: `ODD-${datePart}`
      }
    }
  });

  return `ODD-${datePart}-${String(count + 1).padStart(5, "0")}`;
}

export async function createOrderDraftAction(formData: FormData) {
  const user = await requireCurrentUser();
  const cart = await getCurrentCart();

  if (!cart || cart.items.length === 0) {
    throw new Error("Cart is empty.");
  }

  const customerName = field(formData, "customerName") || user.name || "Customer";
  const customerEmail = field(formData, "customerEmail") || user.email || "";
  const customerPhone = field(formData, "customerPhone");
  const addressLine = field(formData, "addressLine");
  const city = field(formData, "city");
  const state = field(formData, "state");
  const pincode = field(formData, "pincode");
  const country = field(formData, "country") || "India";

  if (!customerName || !customerEmail || !customerPhone || !addressLine || !city || !state || !pincode) {
    throw new Error("Contact and shipping address fields are required.");
  }

  const subtotal = cartSubtotal(cart);
  const currency = cart.items[0]?.product.currency ?? "INR";

  const order = await prisma.$transaction(async (tx) => {
    const stockIssues = await getCartStockIssues(cart.items, tx);

    if (stockIssues.length > 0) {
      throw new Error(stockIssues[0].message);
    }

    const createdOrder = await tx.order.create({
      data: {
        tenantId: cart.tenantId,
        userId: user.id,
        orderNumber: await nextOrderNumber(tx),
        status: "payment_pending",
        paymentStatus: "not_started",
        subtotalAmount: subtotal,
        discountAmount: 0,
        shippingAmount: 0,
        taxAmount: 0,
        totalAmount: subtotal,
        currency,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddressJson: {
          addressLine,
          city,
          state,
          pincode,
          country
        }
      }
    });

    for (const item of cart.items) {
      const orderItem = await tx.orderItem.create({
        data: {
          orderId: createdOrder.id,
          productId: item.productId,
          variantId: item.variantId,
          titleSnapshot: item.titleSnapshot,
          skuSnapshot: item.variant?.sku ?? null,
          itemType: item.itemType,
          quantity: item.quantity,
          unitPrice: item.priceSnapshot,
          lineTotal: itemSubtotal(item),
          metadataJson: item.metadataJson ?? undefined
        }
      });

      if (isPhysicalInventoryType(item.product.type)) {
        if (!item.variantId) {
          throw new Error("Physical items require an inventory-tracked variant.");
        }

        await tx.inventoryLedger.create({
          data: {
            tenantId: cart.tenantId,
            productId: item.productId,
            variantId: item.variantId,
            orderId: createdOrder.id,
            orderItemId: orderItem.id,
            movementType: "reserved",
            quantity: item.quantity,
            reason: "Reserved for payment-pending order draft."
          }
        });
      }
    }

    await tx.cart.update({
      where: { id: cart.id },
      data: { status: "CONVERTED" }
    });

    return createdOrder;
  });

  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/orders");
  revalidatePath("/admin/orders");
  redirect(`/orders/${order.id}`);
}
