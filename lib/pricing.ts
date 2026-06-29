import type { Prisma } from "@prisma/client";
import { cartSubtotal, itemSubtotal, type CartWithItems } from "@/lib/cart";
import { prisma } from "@/lib/prisma";

export type PricingLine = {
  offerRuleId: string;
  title: string;
  code: string | null;
  amount: number;
  targetSubtotal: number;
};

export type CartPricingQuote = {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  couponCode: string | null;
  couponStatus: "not_entered" | "applied" | "invalid" | "ineligible";
  couponMessage: string | null;
  discountLines: PricingLine[];
  cashbackLines: PricingLine[];
  cashbackPromiseTotal: number;
  snapshot: Prisma.InputJsonValue;
};

type OfferRuleWithTargets = Prisma.OfferRuleGetPayload<{
  include: { targets: true; _count: { select: { redemptions: true } } };
}>;

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function isActive(rule: { status: string; startDate: Date | null; endDate: Date | null }, now = new Date()) {
  if (rule.status !== "ACTIVE" && rule.status !== "SCHEDULED") return false;
  if (rule.startDate && rule.startDate > now) return false;
  if (rule.endDate && rule.endDate < now) return false;
  return true;
}

function lineMatchesTarget(item: CartWithItems["items"][number], rule: OfferRuleWithTargets) {
  if (rule.targetScope === "ALL" || rule.targets.length === 0) return true;

  return rule.targets.some((target) => {
    if (target.targetType === "PRODUCT") return target.targetId === item.productId;
    if (target.targetType === "VARIANT") return target.targetId === item.variantId;
    if (target.targetType === "CATEGORY") return target.targetId === item.product.categoryId;
    if (target.targetType === "KIT") return item.product.type === "KIT" && (target.targetId === item.productId || target.targetId === "ALL");
    if (target.targetType === "SERVICE") return item.product.type === "SERVICE" && (target.targetId === item.productId || target.targetId === "ALL");
    if (target.targetType === "MEMBERSHIP") return item.product.type === "MEMBERSHIP" && (target.targetId === item.productId || target.targetId === "ALL");
    return false;
  });
}

function targetSubtotal(cart: CartWithItems, rule: OfferRuleWithTargets) {
  return cart.items.reduce((total, item) => total + (lineMatchesTarget(item, rule) ? itemSubtotal(item) : 0), 0);
}

function calculateAmount(kind: string | null, value: unknown, base: number, cap?: unknown) {
  const numericValue = toNumber(value);
  if (!numericValue || base <= 0) return 0;

  const raw = kind === "FLAT" ? numericValue : kind === "PERCENT" ? Math.round((base * numericValue) / 100) : 0;
  const max = cap === null || cap === undefined ? null : toNumber(cap);
  return Math.max(0, Math.min(raw, base, max && max > 0 ? max : raw));
}

function quoteLine(rule: OfferRuleWithTargets, base: number): PricingLine | null {
  const amount = calculateAmount(rule.discountKind, rule.discountValue, base, rule.maxDiscountAmount);
  if (amount <= 0) return null;

  return {
    offerRuleId: rule.id,
    title: rule.title,
    code: rule.code,
    amount,
    targetSubtotal: base
  };
}

function cashbackLine(rule: OfferRuleWithTargets, base: number): PricingLine | null {
  if (!rule.cashbackKind || !rule.cashbackValue) return null;
  const amount = calculateAmount(rule.cashbackKind, rule.cashbackValue, base);
  if (amount <= 0) return null;

  return {
    offerRuleId: rule.id,
    title: `${rule.title} cashback`,
    code: rule.code,
    amount,
    targetSubtotal: base
  };
}

async function userRedemptionCount(userId: string | undefined, ruleId: string) {
  if (!userId) return 0;
  return prisma.offerRedemption.count({ where: { userId, offerRuleId: ruleId } });
}

export async function quoteCartPricing(cart: CartWithItems | null, couponCode?: string | null, user?: { id: string } | null): Promise<CartPricingQuote> {
  const subtotal = cart ? cartSubtotal(cart) : 0;
  const normalizedCoupon = couponCode?.trim().toUpperCase() || null;

  if (!cart || cart.items.length === 0) {
    const snapshot = {
      subtotal: 0,
      discountTotal: 0,
      cashbackPromiseTotal: 0,
      total: 0,
      couponCode: normalizedCoupon,
      discountLines: [],
      cashbackLines: []
    };
    return {
      subtotal: 0,
      discountTotal: 0,
      shippingTotal: 0,
      taxTotal: 0,
      total: 0,
      couponCode: normalizedCoupon,
      couponStatus: normalizedCoupon ? "invalid" : "not_entered",
      couponMessage: normalizedCoupon ? "Cart is empty." : null,
      discountLines: [],
      cashbackLines: [],
      cashbackPromiseTotal: 0,
      snapshot
    };
  }

  const rules = await prisma.offerRule.findMany({
    where: {
      tenantId: cart.tenantId,
      status: { in: ["ACTIVE", "SCHEDULED"] }
    },
    include: { targets: true, _count: { select: { redemptions: true } } },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }]
  });
  const activeRules = rules.filter((rule) => isActive(rule));

  const eligible = [];
  for (const rule of activeRules) {
    if (rule.usageLimit && rule._count.redemptions >= rule.usageLimit) continue;
    if (rule.perUserLimit && (await userRedemptionCount(user?.id, rule.id)) >= rule.perUserLimit) continue;

    const base = targetSubtotal(cart, rule);
    if (base <= 0) continue;
    if (subtotal < toNumber(rule.minCartValue)) continue;
    eligible.push({ rule, base });
  }

  const automaticLines = eligible
    .filter(({ rule }) => rule.ruleType === "AUTOMATIC")
    .map(({ rule, base }) => quoteLine(rule, base))
    .filter((line): line is PricingLine => Boolean(line))
    .sort((left, right) => right.amount - left.amount);

  const [automaticLine] = automaticLines;
  let couponStatus: CartPricingQuote["couponStatus"] = normalizedCoupon ? "invalid" : "not_entered";
  let couponMessage: string | null = null;
  let couponLine: PricingLine | null = null;

  if (normalizedCoupon) {
    const coupon = eligible.find(({ rule }) => rule.ruleType === "COUPON" && rule.code?.toUpperCase() === normalizedCoupon);
    if (!coupon) {
      couponStatus = "invalid";
      couponMessage = "Coupon is not valid for this cart.";
    } else if (automaticLine && !coupon.rule.stackWithAutomatic) {
      couponStatus = "ineligible";
      couponMessage = "Coupon cannot be combined with the current automatic offer.";
    } else {
      couponLine = quoteLine(coupon.rule, coupon.base);
      couponStatus = couponLine ? "applied" : "ineligible";
      couponMessage = couponLine ? "Coupon applied." : "Coupon does not create a discount for this cart.";
    }
  }

  const discountLines = [automaticLine, couponLine].filter((line): line is PricingLine => Boolean(line));
  const discountTotal = Math.min(subtotal, discountLines.reduce((total, line) => total + line.amount, 0));

  const cashbackLines = eligible
    .map(({ rule, base }) => cashbackLine(rule, base))
    .filter((line): line is PricingLine => Boolean(line));
  const cashbackPromiseTotal = cashbackLines.reduce((total, line) => total + line.amount, 0);
  const total = Math.max(0, subtotal - discountTotal);
  const snapshot = {
    subtotal,
    discountTotal,
    shippingTotal: 0,
    taxTotal: 0,
    total,
    couponCode: normalizedCoupon,
    couponStatus,
    couponMessage,
    discountLines,
    cashbackLines,
    cashbackPromiseTotal
  };

  return {
    subtotal,
    discountTotal,
    shippingTotal: 0,
    taxTotal: 0,
    total,
    couponCode: normalizedCoupon,
    couponStatus,
    couponMessage,
    discountLines,
    cashbackLines,
    cashbackPromiseTotal,
    snapshot
  };
}
