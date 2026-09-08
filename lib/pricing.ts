import type { Prisma } from "@prisma/client";
import { cartSubtotal, itemSubtotal, type CartWithItems } from "@/lib/cart";
import { prisma } from "@/lib/prisma";
import { getActiveMembershipForUser } from "@/lib/membership";

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
    title: rule.title,
    code: rule.code,
    amount,
    targetSubtotal: base
  };
}

async function completedRedemptionCount(ruleId: string, userId?: string) {
  const rows = await prisma.offerRedemption.findMany({
    where: { offerRuleId: ruleId, ...(userId ? { userId } : {}), order: { paymentStatus: "succeeded" } },
    select: { orderId: true },
    distinct: ["orderId"]
  });
  return rows.length;
}

function membershipScopeSubtotal(cart: CartWithItems, scope: string) {
  return cart.items.reduce((total, item) => {
    if (item.product.type === "MEMBERSHIP") return total;
    const applies =
      scope === "GLOBAL" ||
      (scope === "SHOP" && item.product.type !== "SERVICE") ||
      (["PUJA", "SERVICE_BOOKING"].includes(scope) && item.product.type === "SERVICE") ||
      (scope === "FESTIVAL" && item.product.type === "KIT");
    return total + (applies ? itemSubtotal(item) : 0);
  }, 0);
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
  const pricedCart = cart;
  const activeMembership = user?.id ? await getActiveMembershipForUser(user.id) : null;
  const now = new Date();
  const membershipLine = activeMembership
    ? activeMembership.plan.benefits
        .filter((benefit) =>
          benefit.active &&
          ["DISCOUNT_PERCENT", "DISCOUNT_AMOUNT"].includes(benefit.type) &&
          (!benefit.validFrom || benefit.validFrom <= now) &&
          (!benefit.validUntil || benefit.validUntil >= now)
        )
        .map<PricingLine | null>((benefit) => {
          const base = membershipScopeSubtotal(pricedCart, benefit.scope);
          const value = Number(benefit.valueDecimal ?? 0);
          const amount = benefit.type === "DISCOUNT_PERCENT"
            ? Math.round((base * value) / 100)
            : Math.min(base, value);
          return amount > 0
            ? {
                offerRuleId: `membership:${benefit.id}`,
                title: `${activeMembership.plan.name} member savings`,
                code: null,
                amount,
                targetSubtotal: base
              }
            : null;
        })
        .filter((line): line is PricingLine => Boolean(line))
        .sort((left, right) => right.amount - left.amount)[0] ?? null
    : null;

  async function eligibility(rule: OfferRuleWithTargets) {
    if (!isActive(rule)) return { eligible: false as const, reason: "This coupon is inactive or outside its validity dates." };
    const base = targetSubtotal(pricedCart, rule);
    if (base <= 0) return { eligible: false as const, reason: "This coupon does not apply to the products or services in your cart." };
    const minimum = toNumber(rule.minCartValue);
    if (subtotal < minimum) return { eligible: false as const, reason: `This coupon requires a minimum cart subtotal of ₹${minimum}. Add ₹${minimum - subtotal} more to use it.` };
    if (rule.usageLimit && (await completedRedemptionCount(rule.id)) >= rule.usageLimit) return { eligible: false as const, reason: "This coupon has reached its total usage limit." };
    if (rule.perUserLimit && user?.id && (await completedRedemptionCount(rule.id, user.id)) >= rule.perUserLimit) return { eligible: false as const, reason: "You have already used this coupon the maximum number of times." };
    return { eligible: true as const, base };
  }

  const eligible = [];
  for (const rule of rules.filter((candidate) => candidate.ruleType === "AUTOMATIC")) {
    const result = await eligibility(rule);
    if (result.eligible) eligible.push({ rule, base: result.base });
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
  let couponCashbackLine: PricingLine | null = null;

  if (normalizedCoupon) {
    const couponRule = rules.find((rule) => rule.ruleType === "COUPON" && rule.code?.trim().toUpperCase() === normalizedCoupon);
    const couponResult = couponRule ? await eligibility(couponRule) : null;
    const coupon = couponRule && couponResult?.eligible ? { rule: couponRule, base: couponResult.base } : null;
    if (!coupon) {
      couponStatus = couponRule ? "ineligible" : "invalid";
      couponMessage = couponResult && !couponResult.eligible ? couponResult.reason : "Coupon code not found. Check the spelling and try again.";
    } else if ((automaticLine || eligible.some(({ rule, base }) => cashbackLine(rule, base))) && !coupon.rule.stackWithAutomatic) {
      couponStatus = "ineligible";
      couponMessage = "This coupon cannot be combined with the automatic discount already applied to your cart.";
    } else {
      couponLine = quoteLine(coupon.rule, coupon.base);
      couponCashbackLine = cashbackLine(coupon.rule, coupon.base);
      couponStatus = couponLine || couponCashbackLine ? "applied" : "ineligible";
      couponMessage = couponLine && couponCashbackLine
        ? `Coupon applied: ₹${couponLine.amount} discount now and ₹${couponCashbackLine.amount} cashback after eligible fulfilment.`
        : couponLine
          ? `Coupon applied: you save ₹${couponLine.amount} now.`
          : couponCashbackLine
            ? `Coupon applied: ₹${couponCashbackLine.amount} cashback after eligible fulfilment. Your payable amount is unchanged.`
            : "This coupon is configured without a discount or cashback value.";
    }
  }

  const discountLines = [membershipLine, automaticLine, couponLine].filter((line): line is PricingLine => Boolean(line));
  const discountTotal = Math.min(subtotal, discountLines.reduce((total, line) => total + line.amount, 0));

  const automaticCashbackLines = eligible
    .map(({ rule, base }) => cashbackLine(rule, base))
    .filter((line): line is PricingLine => Boolean(line));
  const cashbackLines = [...automaticCashbackLines, couponCashbackLine].filter((line): line is PricingLine => Boolean(line));
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
