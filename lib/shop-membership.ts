import type { MembershipBenefit, MembershipBenefitTarget } from "@prisma/client";
export type ShopClaimBenefit = MembershipBenefit & { targets?: MembershipBenefitTarget[] };
export type ShopClaimContext = { productId: string; variantId: string; categoryId: string | null; tagIds: string[] };
export function selectShopClaimBenefit(benefits: ShopClaimBenefit[], context: ShopClaimContext, benefitId?: string | null, now = new Date()) {
  return benefits.find((b) => (!benefitId || b.id === benefitId) && b.active && b.method === "CLAIM" && b.type === "FREE_USAGE" && (b.scope === "SHOP" || b.scope === "GLOBAL") && (!b.validFrom || b.validFrom <= now) && (!b.validUntil || b.validUntil >= now) && membershipBenefitMatchesTarget(b, context)) ?? null;
}
import { membershipBenefitMatchesTarget } from "@/lib/membership-entitlements";
