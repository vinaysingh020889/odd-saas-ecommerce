"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentCart, itemSubtotal } from "@/lib/cart";
import { requireCurrentUser } from "@/lib/auth/session";
import { getCartStockIssues, getVariantStockSummary, isPhysicalInventoryType } from "@/lib/inventory";
import { createMockPaymentAttempt } from "@/lib/mock-payment-provider";
import { trackCheckoutStarted } from "@/lib/customer-events";
import { quoteCartPricing } from "@/lib/pricing";
import {
  addressSnapshotFromRecord,
  calculateInclusiveTax,
  normalizePincode,
  resolveShippingSnapshot,
  taxPercentForItem,
  type AddressSnapshot
} from "@/lib/checkout-maturity";

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

  const customerEmail = field(formData, "customerEmail") || user.email || "";
  const addressId = field(formData, "addressId");

  const quote = await quoteCartPricing(cart, cart.couponCode, user);
  const subtotal = quote.subtotal;
  const currency = cart.items[0]?.product.currency ?? "INR";

  const order = await prisma.$transaction(async (tx) => {
    const stockIssues = await getCartStockIssues(cart.items, tx);

    if (stockIssues.length > 0) {
      throw new Error(stockIssues[0].message);
    }

    const selectedAddress =
      addressId && addressId !== "new"
        ? await tx.customerAddress.findFirstOrThrow({
            where: { id: addressId, tenantId: cart.tenantId, userId: user.id }
          })
        : null;
    const addressSnapshot = selectedAddress
      ? addressSnapshotFromRecord(selectedAddress)
      : addressSnapshotFromRecord({
          fullName: field(formData, "fullName") || field(formData, "customerName") || user.name || "Customer",
          phone: field(formData, "phone") || field(formData, "customerPhone"),
          addressLine1: field(formData, "addressLine1") || field(formData, "addressLine"),
          addressLine2: field(formData, "addressLine2") || null,
          city: field(formData, "city"),
          state: field(formData, "state"),
          country: field(formData, "country") || "India",
          pincode: normalizePincode(field(formData, "pincode")),
          landmark: field(formData, "landmark") || null
        } satisfies AddressSnapshot);

    if (!addressSnapshot.fullName || !addressSnapshot.phone || !addressSnapshot.addressLine1 || !addressSnapshot.city || !addressSnapshot.state || !addressSnapshot.pincode) {
      throw new Error("Contact and shipping address fields are required.");
    }

    if (!selectedAddress && formData.get("saveAddress") === "on") {
      const existingAddressCount = await tx.customerAddress.count({ where: { tenantId: cart.tenantId, userId: user.id } });
      const makeDefault = existingAddressCount === 0;
      if (makeDefault) {
        await tx.customerAddress.updateMany({ where: { tenantId: cart.tenantId, userId: user.id }, data: { isDefault: false } });
      }
      await tx.customerAddress.create({
        data: {
          tenantId: cart.tenantId,
          userId: user.id,
          fullName: String(addressSnapshot.fullName),
          phone: String(addressSnapshot.phone),
          addressLine1: String(addressSnapshot.addressLine1),
          addressLine2: typeof addressSnapshot.addressLine2 === "string" ? addressSnapshot.addressLine2 : null,
          city: String(addressSnapshot.city),
          state: String(addressSnapshot.state),
          country: String(addressSnapshot.country ?? "India"),
          pincode: String(addressSnapshot.pincode),
          landmark: typeof addressSnapshot.landmark === "string" ? addressSnapshot.landmark : null,
          isDefault: makeDefault
        }
      });
    }

    const shipping = await resolveShippingSnapshot(cart.tenantId, String(addressSnapshot.pincode), tx);
    const taxByCartItem = new Map<string, ReturnType<typeof calculateInclusiveTax>>();
    let taxableAmount = 0;
    let taxAmount = 0;
    const taxPercents = new Set<number>();

    for (const item of cart.items) {
      const itemTax = calculateInclusiveTax(itemSubtotal(item), taxPercentForItem(item.itemType));
      taxByCartItem.set(item.id, itemTax);
      taxableAmount += itemTax.taxableAmount;
      taxAmount += itemTax.taxAmount;
      taxPercents.add(itemTax.taxPercent);
    }

    const totalAmount = Math.max(0, quote.total + shipping.shippingAmount);
    const basePricingSnapshot = (typeof quote.snapshot === "object" && quote.snapshot && !Array.isArray(quote.snapshot) ? quote.snapshot : {}) as Prisma.InputJsonObject;
    const pricingSnapshotJson: Prisma.InputJsonObject = {
      ...basePricingSnapshot,
      shippingTotal: shipping.shippingAmount,
      taxTotal: taxAmount,
      total: totalAmount,
      shipping,
      taxMode: "inclusive_snapshot"
    };

    const createdOrder = await tx.order.create({
      data: {
        tenantId: cart.tenantId,
        userId: user.id,
        orderNumber: await nextOrderNumber(tx),
        status: "payment_pending",
        paymentStatus: "not_started",
        subtotalAmount: subtotal,
        discountAmount: quote.discountTotal,
        shippingAmount: shipping.shippingAmount,
        taxAmount,
        taxableAmount,
        taxPercent: taxPercents.size === 1 ? [...taxPercents][0] : null,
        totalAmount,
        couponCode: quote.couponCode,
        pricingSnapshotJson,
        cashbackPromiseAmount: quote.cashbackPromiseTotal,
        currency,
        customerName: String(addressSnapshot.fullName),
        customerEmail,
        customerPhone: String(addressSnapshot.phone),
        shippingAddressJson: addressSnapshot,
        shippingEstimateDays: shipping.shippingEstimateDays,
        shippingServiceable: shipping.shippingServiceable,
        shippingNote: shipping.shippingNote
      }
    });

    for (const item of cart.items) {
      let metadataJson = item.metadataJson as Prisma.InputJsonValue | undefined;
      const kitComponents =
        item.product.type === "KIT"
          ? await tx.kitComponent.findMany({
              where: { tenantId: cart.tenantId, kitProductId: item.productId },
              include: {
                componentProduct: { select: { id: true, title: true, type: true } },
                componentVariant: { select: { id: true, sku: true, title: true } }
              },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
            })
          : [];

      if (item.product.type === "KIT") {
        metadataJson = {
          ...(typeof metadataJson === "object" && metadataJson && !Array.isArray(metadataJson) ? metadataJson : {}),
          kitInventoryMode: kitComponents.length > 0 ? "component_snapshot" : "kit_only_todo",
          kitComponents: kitComponents.map((component) => ({
            componentProductId: component.componentProductId,
            componentProductTitle: component.componentProduct.title,
            componentProductType: component.componentProduct.type,
            componentVariantId: component.componentVariantId,
            componentVariantSku: component.componentVariant?.sku ?? null,
            componentVariantTitle: component.componentVariant?.title ?? null,
            quantityPerKit: component.quantity
          }))
        };
      }

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
          taxPercent: taxByCartItem.get(item.id)?.taxPercent ?? null,
          taxableAmount: taxByCartItem.get(item.id)?.taxableAmount ?? 0,
          taxAmount: taxByCartItem.get(item.id)?.taxAmount ?? 0,
          metadataJson
        }
      });

      if (kitComponents.length > 0) {
        for (const component of kitComponents) {
          if (!component.componentVariantId || !isPhysicalInventoryType(component.componentProduct.type)) {
            continue;
          }

          const requiredQuantity = item.quantity * component.quantity;
          const stock = await getVariantStockSummary(component.componentVariantId, tx);

          if (stock.available < requiredQuantity) {
            throw new Error(`${component.componentProduct.title} has ${stock.available} available, but ${requiredQuantity} is needed for this kit.`);
          }

          await tx.inventoryLedger.create({
            data: {
              tenantId: cart.tenantId,
              productId: component.componentProductId,
              variantId: component.componentVariantId,
              orderId: createdOrder.id,
              orderItemId: orderItem.id,
              movementType: "reserved",
              quantity: requiredQuantity,
              reason: "Reserved component stock for kit order draft.",
              metadataJson: {
                source: "kit_component",
                kitProductId: item.productId,
                componentQuantity: component.quantity
              }
            }
          });
        }
      } else if (isPhysicalInventoryType(item.product.type)) {
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

    for (const line of quote.discountLines) {
      await tx.offerRedemption.create({
        data: {
          tenantId: cart.tenantId,
          offerRuleId: line.offerRuleId,
          orderId: createdOrder.id,
          userId: user.id,
          code: line.code,
          discountAmount: line.amount,
          cashbackAmount: 0,
          metadataJson: {
            title: line.title,
            targetSubtotal: line.targetSubtotal,
            couponCode: quote.couponCode
          }
        }
      });
    }

    for (const line of quote.cashbackLines) {
      await tx.offerRedemption.create({
        data: {
          tenantId: cart.tenantId,
          offerRuleId: line.offerRuleId,
          orderId: createdOrder.id,
          userId: user.id,
          code: line.code,
          discountAmount: 0,
          cashbackAmount: line.amount,
          metadataJson: {
            title: line.title,
            targetSubtotal: line.targetSubtotal,
            couponCode: quote.couponCode,
            walletLedger: "not_created"
          }
        }
      });
    }

    await tx.cart.update({
      where: { id: cart.id },
      data: { status: "CONVERTED", pricingSnapshotJson }
    });

    await tx.orderActivity.create({
      data: {
        tenantId: cart.tenantId,
        orderId: createdOrder.id,
        actorId: user.id,
        type: "checkout_snapshot_created",
        message: "Checkout address, shipping estimate, and tax snapshot were captured.",
        metadataJson: { shipping, taxAmount, taxableAmount }
      }
    });

    return createdOrder;
  });

  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/orders");
  revalidatePath("/admin/orders");
  await createMockPaymentAttempt(order.id, user);
  await trackCheckoutStarted({
    entityId: cart.id,
    sourcePath: "/checkout",
    userId: user.id,
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      itemCount: cart.items.length,
      subtotal,
      total: Number(order.totalAmount)
    }
  });
  redirect(`/orders/${order.id}?pay=1`);
}
