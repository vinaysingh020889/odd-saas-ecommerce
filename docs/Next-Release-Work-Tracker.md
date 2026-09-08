# OMD next-release work tracker

Status values: `DONE`, `IN PROGRESS`, `PENDING`, `BLOCKED`.

## Release objective

Run every customer and operations journey against launch-shaped behavior and Razorpay Test Mode. Moving to real payments should require only live credentials, production webhook configuration, reconciliation checks, and formal launch approval.

## Batches

| Batch | Outcome | Included backlog items | Status |
| --- | --- | --- | --- |
| 0 | Razorpay foundation for shop orders | 18, 30, 31, 35 | IN PROGRESS — local code and tests done; hosted deployment/webhook test pending |
| 1 | Correct offers, coupons, cashback eligibility, and explanations | 4–10, 12, 19–20 | DONE — pricing behavior, messages, offer-form guidance, and focused tests complete |
| 2 | Consistent checkout quote, delivery, tax, and stock presentation | 11, 21-23, 30 | DONE - selected-address totals, delivery enforcement, configurable GST/HSN/SAC, immutable tax snapshots, and customer-friendly stock wording verified |
| 3 | Membership activation, pricing benefits, savings, badges, and promise audit | 1-3, 14-17 | DONE - active-state messaging, automatic commerce discounts, member prices/savings, plan identity badge, admin guidance, and promise labeling verified |
| 4 | ODD wallet earning, pending/available balance, spending, reversals, and core-wallet boundary | 13, 24, 36 | DONE - earning, delivery release, 50% opt-in spending, payment locks, timeout/cancellation release, refund returns, FIFO expiry, audited admin adjustments, investigation UI, and sync boundary verified |
| 5 | Razorpay Test Mode across membership, Kundli, Asthi, and service bookings | 18, 24–25, 27 | IN PROGRESS — local provider flows, webhook routing, admin visibility, migration, tests, and build done; hosted journey/webhook evidence pending |
| 6 | Account recovery, notifications, documents, and CMS-wide contextual help | 12, 26–28, 33 | PENDING |
| 7 | Reconciliation, launch checks, complete journey tests, deployment, and rollback evidence | 29–35 | PENDING |

## Batch completion rules

- A batch moves to `DONE` only after behavior, customer/admin wording, meaningful tests, type checking, and a production build pass.
- Provider-dependent batches additionally require a hosted Razorpay Test Mode journey and webhook evidence.
- Every monetary state transition must be idempotent, auditable, and recoverable by operations.
- This file is updated at the end of each batch with completed work and remaining dependencies.

## Current execution

Batches 1, 2, 3, and 4 are complete. Batch 5 is locally complete: paid memberships, Kundli, Asthi, and service bookings now create owner-bound Razorpay Test Mode orders for the exact payable amount, confirm only provider-captured payments, process webhook retries idempotently, and run each domain lifecycle after settlement. The shared payment ledger now supports typed non-order subjects, and the operations payment screen/search expose those attempts. Customer and admin wording consistently identifies Test Mode. Migration `20260908213000_generalize_razorpay_subjects` is applied locally; 161 non-UAT tests pass, 4 environment-dependent UAT tests remain skipped, and Prisma validation, TypeScript, lint, and the 80-route production build pass. Per the provider-dependent completion rule, Batch 5 remains IN PROGRESS until the UAT deployment records one hosted successful journey and signed webhook reconciliation.
