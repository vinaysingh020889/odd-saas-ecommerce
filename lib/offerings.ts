import type { MembershipBenefit, MembershipBenefitTarget, OfferingRequestStatus } from "@prisma/client";
import { calculateMembershipSaving, membershipBenefitMatchesTarget } from "@/lib/membership-entitlements";

export type OfferingBenefit = MembershipBenefit & { targets?: MembershipBenefitTarget[] };
export const OFFERING_TERMINAL_STATUSES: OfferingRequestStatus[] = ["CLOSED", "CANCELLED", "REJECTED"];

export const OFFERING_TRANSITIONS: Record<OfferingRequestStatus, OfferingRequestStatus[]> = {
  SUBMITTED: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["COLLECTION_SCHEDULED", "COLLECTED", "CANCELLED"],
  COLLECTION_SCHEDULED: ["COLLECTED", "CANCELLED"],
  COLLECTED: ["RECEIVED"],
  RECEIVED: ["PROCESSING"],
  PROCESSING: ["REWARD_SELECTION"],
  REWARD_SELECTION: ["REWARD_ORDERED", "CANCELLED"],
  REWARD_ORDERED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
  REJECTED: []
};

export function assertOfferingTransition(from: OfferingRequestStatus, to: OfferingRequestStatus) {
  if (!OFFERING_TRANSITIONS[from].includes(to)) throw new Error(`Cannot move an offering from ${from} to ${to}.`);
}

export function offeringDueState(input: { status: OfferingRequestStatus; processingDueAt?: Date | null; rewardSelectionDueAt?: Date | null }, now = new Date()) {
  const dueAt = input.status === "REWARD_SELECTION" ? input.rewardSelectionDueAt : input.processingDueAt;
  if (!dueAt || OFFERING_TERMINAL_STATUSES.includes(input.status)) return "ON_TRACK" as const;
  if (dueAt < now) return "OVERDUE" as const;
  if (dueAt.getTime() - now.getTime() <= 24 * 60 * 60 * 1000) return "DUE_SOON" as const;
  return "ON_TRACK" as const;
}

export function selectOfferingBenefit(benefits: OfferingBenefit[], input: { type: MembershipBenefit["type"]; method?: "AUTOMATIC" | "CLAIM"; amount?: number; entityType: string }) {
  const now = new Date();
  return benefits
    .filter((benefit) => benefit.active && (benefit.scope === "OFFERINGS" || benefit.scope === "GLOBAL"))
    .filter((benefit) => benefit.type === input.type && benefit.method === (input.method ?? "AUTOMATIC"))
    .filter((benefit) => (!benefit.validFrom || benefit.validFrom <= now) && (!benefit.validUntil || benefit.validUntil >= now))
    .filter((benefit) => membershipBenefitMatchesTarget(benefit, { entityType: input.entityType }))
    .map((benefit) => ({ benefit, saving: calculateMembershipSaving(benefit, input.amount ?? 0) }))
    .sort((left, right) => right.saving - left.saving || left.benefit.sortOrder - right.benefit.sortOrder)[0] ?? null;
}
