export const serviceBookingStatuses = [
  "DRAFT",
  "QUEUED",
  "PAYMENT_PENDING",
  "SUBMITTED",
  "CONFIRMED",
  "SCHEDULED",
  "ASSIGNED",
  "IN_PROGRESS",
  "PROOF_PENDING",
  "PROOF_UPLOADED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED"
] as const;

export const serviceBookingPaymentStatuses = ["NOT_STARTED", "PENDING", "CONFIRMED", "FAILED", "REFUNDED"] as const;
