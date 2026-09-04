import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { getCatalogItemBySlug, getOmdTenantId } from "./catalog";
import { commerceMembershipGateDestination } from "./commerce-membership-gate";
import { getVariantStockSummary, getCartStockIssues } from "./inventory";
import { getActiveFestivalCampaigns } from "./merchandising";
import { createMockPaymentAttempt, simulateMockPaymentCancel, simulateMockPaymentFailure, simulateMockPaymentSuccess } from "./mock-payment-provider";
import { quoteCartPricing } from "./pricing";
import { projectCommerceOrder } from "./customer-account";

const describeUat = process.env.RUN_FESTIVAL_COMMERCE_UAT === "true" ? describe : describe.skip;

describeUat("Gate 3 selected festival commerce persisted UAT", () => {
  const runId = randomUUID().slice(0, 12);
  const prefix = `festival-uat-${runId}`;
  let tenantId = "";
  let customerId = "";
  let otherId = "";
  let productId = "";
  let inactiveProductId = "";
  let variantId = "";
  let categoryId = "";
  let inactiveCategoryId = "";
  let membershipPlanId = "";
  let offerRuleId = "";

  beforeAll(async () => {
    tenantId = await getOmdTenantId();
    const [customer, other, category, inactiveCategory] = await Promise.all([
      prisma.user.create({ data: { tenantId, email: `${prefix}-customer@example.invalid`, name: "Synthetic Festival Customer", verifiedEmail: true } }),
      prisma.user.create({ data: { tenantId, email: `${prefix}-other@example.invalid`, name: "Synthetic Other Customer", verifiedEmail: true } }),
      prisma.category.create({ data: { tenantId, name: "Synthetic Festival Hampers", slug: `${prefix}-category`, type: "KIT", status: "ACTIVE" } }),
      prisma.category.create({ data: { tenantId, name: "Synthetic Inactive Category", slug: `${prefix}-inactive-category`, type: "KIT", status: "INACTIVE" } })
    ]);
    customerId = customer.id;
    otherId = other.id;
    categoryId = category.id;
    inactiveCategoryId = inactiveCategory.id;

    const [product, inactiveProduct] = await Promise.all([
      prisma.product.create({
        data: {
          tenantId, categoryId, type: "PHYSICAL", title: "Synthetic Festival Hamper", slug: `${prefix}-hamper`, status: "ACTIVE", basePrice: 500, currency: "INR",
          variants: { create: { sku: `UAT-${runId}-ACTIVE`, title: "Standard", price: 500, active: true, lowStockThreshold: 2 } },
          media: { create: { tenantId, url: "https://example.invalid/synthetic-hamper.jpg", altText: "Synthetic hamper", role: "primary", isPrimary: true } }
        },
        include: { variants: true }
      }),
      prisma.product.create({
        data: { tenantId, categoryId, type: "PHYSICAL", title: "Synthetic Inactive Hamper", slug: `${prefix}-inactive-hamper`, status: "INACTIVE", basePrice: 700, currency: "INR", variants: { create: { sku: `UAT-${runId}-INACTIVE`, price: 700, active: true } } }
      })
    ]);
    productId = product.id;
    inactiveProductId = inactiveProduct.id;
    variantId = product.variants[0].id;
    await prisma.inventoryLedger.create({ data: { tenantId, productId, variantId, movementType: "initial", quantity: 5, reason: "Synthetic Gate 3 opening stock" } });

    const campaign = await prisma.festivalCampaign.create({
      data: {
        tenantId, title: "Synthetic Upcoming Festival", slug: `${prefix}-campaign`, status: "ACTIVE", startDate: new Date(Date.now() - 86_400_000), endDate: new Date(Date.now() + 7 * 86_400_000), showOnHomepage: true,
        products: { create: [{ tenantId, productId, sortOrder: 10, isFeatured: true }, { tenantId, productId: inactiveProductId, sortOrder: 20 }] },
        categories: { create: [{ tenantId, categoryId, sortOrder: 10 }, { tenantId, categoryId: inactiveCategoryId, sortOrder: 20 }] }
      }
    });
    await prisma.festivalCampaign.create({ data: { tenantId, title: "Synthetic Draft Festival", slug: `${prefix}-draft`, status: "DRAFT", startDate: new Date(), endDate: new Date(Date.now() + 86_400_000) } });

    const offer = await prisma.offerRule.create({
      data: {
        tenantId, title: "Synthetic Festival 10 Percent", ruleType: "AUTOMATIC", status: "ACTIVE", priority: 999, targetScope: "TARGETED", discountKind: "PERCENT", discountValue: 10,
        targets: { create: { tenantId, targetType: "PRODUCT", targetId: productId } }
      }
    });
    offerRuleId = offer.id;
    const plan = await prisma.membershipPlan.create({ data: { tenantId, name: "Synthetic Checkout Member", slug: `${prefix}-member`, price: 0, durationDays: 30, status: "ACTIVE" } });
    membershipPlanId = plan.id;
    await prisma.userMembership.create({ data: { tenantId, userId: customerId, planId: plan.id, status: "ACTIVE", startsAt: new Date(Date.now() - 1_000), expiresAt: new Date(Date.now() + 30 * 86_400_000) } });
    expect(campaign.id).toBeTruthy();
  }, 30_000);

  afterAll(async () => {
    if (!tenantId) return;
    await prisma.auditLog.deleteMany({ where: { tenantId, actorId: { in: [customerId, otherId].filter(Boolean) } } });
    await prisma.user.deleteMany({ where: { id: { in: [customerId, otherId].filter(Boolean) } } });
    await prisma.festivalCampaign.deleteMany({ where: { tenantId, slug: { startsWith: prefix } } });
    if (offerRuleId) await prisma.offerRule.deleteMany({ where: { id: offerRuleId } });
    if (membershipPlanId) await prisma.membershipPlan.deleteMany({ where: { id: membershipPlanId } });
    await prisma.product.deleteMany({ where: { tenantId, slug: { startsWith: prefix } } });
    await prisma.category.deleteMany({ where: { tenantId, slug: { startsWith: prefix } } });
  }, 30_000);

  async function createOrder(quantity: number, suffix: string, total = quantity * 500) {
    return prisma.order.create({
      data: {
        tenantId, userId: customerId, orderNumber: `UAT-FEST-${runId}-${suffix}`, status: "payment_pending", paymentStatus: "not_started", fulfillmentStatus: "unfulfilled",
        subtotalAmount: quantity * 500, discountAmount: quantity === 2 ? 100 : 0, totalAmount: total, currency: "INR", customerName: "Synthetic Customer", customerEmail: `${prefix}@example.invalid`, customerPhone: "0000000000",
        shippingAddressJson: { synthetic: true, city: "UAT", pincode: "000000" }, pricingSnapshotJson: { synthetic: true },
        items: { create: { productId, variantId, titleSnapshot: "Synthetic Festival Hamper", skuSnapshot: `UAT-${runId}-ACTIVE`, itemType: "PHYSICAL", quantity, unitPrice: 500, lineTotal: quantity * 500 } }
      }
    });
  }

  it("proves discovery, pricing, stock, membership gate, payment, account projection, and negative paths", async () => {
    const [campaigns, draftCampaigns, activeProduct] = await Promise.all([
      getActiveFestivalCampaigns({ slug: `${prefix}-campaign` }),
      getActiveFestivalCampaigns({ slug: `${prefix}-draft` }),
      getCatalogItemBySlug(`${prefix}-hamper`)
    ]);
    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].products.map((item) => item.product.id)).toEqual([productId]);
    expect(campaigns[0].categories.map((item) => item.category.id)).toEqual([categoryId]);
    expect(draftCampaigns).toHaveLength(0);
    expect(activeProduct?.id).toBe(productId);
    await expect(getCatalogItemBySlug(`${prefix}-inactive-hamper`)).rejects.toThrow(/404/);

    const cart = await prisma.cart.create({
      data: { tenantId, userId: customerId, status: "ACTIVE", items: { create: { productId, variantId, quantity: 2, itemType: "PHYSICAL", priceSnapshot: 500, titleSnapshot: "Synthetic Festival Hamper" } } },
      include: { items: { include: { product: { select: { slug: true, title: true, type: true, currency: true, categoryId: true } }, variant: { select: { title: true, sku: true } } } } }
    });
    expect(await getCartStockIssues(cart.items)).toEqual([]);
    expect((await getCartStockIssues([{ ...cart.items[0], quantity: 6 }]))[0]?.available).toBe(5);
    const quote = await quoteCartPricing(cart, null, { id: customerId });
    expect({ subtotal: quote.subtotal, discount: quote.discountTotal, total: quote.total }).toEqual({ subtotal: 1_000, discount: 100, total: 900 });
    expect(quote.discountLines[0]?.offerRuleId).toBe(offerRuleId);
    expect(commerceMembershipGateDestination({ id: customerId }, true, "/checkout")).toBeNull();
    expect(commerceMembershipGateDestination({ id: otherId }, false, "/checkout")).toContain("/membership?");

    const order = await createOrder(2, "SUCCESS", quote.total);
    const attempt = await createMockPaymentAttempt(order.id, { id: customerId });
    expect((await createMockPaymentAttempt(order.id, { id: customerId })).id).toBe(attempt.id);
    expect((await getVariantStockSummary(variantId)).currentReserved).toBe(2);
    await expect(simulateMockPaymentSuccess(attempt.id, { id: otherId })).rejects.toThrow(/cannot access/);
    await simulateMockPaymentSuccess(attempt.id, { id: customerId });
    await simulateMockPaymentSuccess(attempt.id, { id: customerId });
    const paidOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { paymentAttempts: true, paymentEvents: true } });
    expect({ status: paidOrder.status, payment: paidOrder.paymentStatus, attempts: paidOrder.paymentAttempts.length, events: paidOrder.paymentEvents.length }).toEqual({ status: "confirmed", payment: "succeeded", attempts: 1, events: 1 });
    expect(paidOrder.invoiceNumber).toBeTruthy();
    expect(await getVariantStockSummary(variantId)).toMatchObject({ sold: 2, currentReserved: 0, available: 3 });

    await projectCommerceOrder(order.id);
    await projectCommerceOrder(order.id);
    const accountActions = (await prisma.customerAccountEntry.findMany({ where: { tenantId, userId: customerId, relatedEntityId: order.id } })).map((entry) => entry.actionType);
    expect(accountActions).toEqual(expect.arrayContaining(["ORDER_CREATED", "PAYMENT_SUCCEEDED", "ORDER_CONFIRMED"]));
    expect((await prisma.order.findMany({ where: { tenantId, id: order.id }, include: { items: true, paymentAttempts: true } }))[0]?.items).toHaveLength(1);

    const oversoldOrder = await createOrder(4, "NO-STOCK");
    await expect(createMockPaymentAttempt(oversoldOrder.id, { id: customerId })).rejects.toThrow(/Insufficient stock/);
    expect(await prisma.paymentAttempt.count({ where: { orderId: oversoldOrder.id } })).toBe(0);

    const failedOrder = await createOrder(1, "FAIL");
    const failedAttempt = await createMockPaymentAttempt(failedOrder.id, { id: customerId });
    await simulateMockPaymentFailure(failedAttempt.id, { id: customerId });
    expect(await getVariantStockSummary(variantId)).toMatchObject({ currentReserved: 0, available: 3 });
    const retryAttempt = await createMockPaymentAttempt(failedOrder.id, { id: customerId });
    expect(retryAttempt.id).not.toBe(failedAttempt.id);
    await simulateMockPaymentCancel(retryAttempt.id, { id: customerId });
    expect(await getVariantStockSummary(variantId)).toMatchObject({ currentReserved: 0, available: 3 });
  }, 60_000);
});
