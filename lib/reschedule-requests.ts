export const rescheduleRequestStatuses = ["submitted", "under_review", "approved", "rejected", "queued", "priority_exception", "closed"] as const;

export const activeRescheduleRequestStatuses = ["submitted", "under_review", "queued"] as const;

export const rescheduleEligibleServiceBookingStatuses = ["SUBMITTED", "CONFIRMED", "SCHEDULED", "ASSIGNED"] as const;

export function isServiceBookingRescheduleEligible(status: string, paymentStatus: string) {
  return rescheduleEligibleServiceBookingStatuses.includes(status as never) && !["REFUNDED"].includes(paymentStatus);
}

export function rescheduleRequestNumber() {
  return `RSCH-${Date.now()}`;
}
