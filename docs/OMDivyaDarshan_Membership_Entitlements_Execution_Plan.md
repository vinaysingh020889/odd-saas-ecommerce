# OMD Membership and Entitlements Execution Plan

Status: Approved direction; Batch 1 complete; Batches 2-6 pending
Purpose: One sequenced plan for configurable membership plans, automatic savings, complimentary claims, and cross-module fulfilment.

## Current baseline

Already available:

- Free, Premium, and Divya plans are seeded; the CMS can create any number of additional plans.
- Benefits and rules can be added to an existing plan, then published as an immutable version.
- An active membership is required for normal commerce checkout.
- Broad membership discounts can be applied in the normal shop cart.
- The membership evaluator can identify scoped benefits and basic usage limits.
- Customer membership badges, wallet foundations, Razorpay Test Mode, orders, service bookings, Kundli, Asthi, notifications, and audit logs exist.

Confirmed gaps:

- Admin cannot create a fourth membership plan from the CMS.
- Published plan changes affect current evaluation instead of preserving what an existing member purchased.
- Benefits cannot target a specific category, product, variant, service, Kundli package, Asthi package, campaign, or temple tag.
- Kundli, service booking, and Asthi totals do not apply membership pricing.
- Complimentary benefits have no production claim, reservation, cancellation, or fulfilment lifecycle.
- The existing membership usage action is a demonstration action rather than a claim workflow.
- Prasad is not a normal managed shop category yet.
- Offerings to Blessings is a roadmap item without an operational workflow.

## Locked architecture decisions

1. The system supports any number of membership plans. Free, Premium, and Divya are initial records only.
2. Business modules never check a plan name. They ask the membership engine whether a benefit applies.
3. A plan is a stable marketing identity; every publication creates an immutable plan version.
4. Existing members remain on the plan version they purchased unless an admin explicitly migrates them.
5. Discounts apply automatically. Complimentary products and services require an explicit customer claim.
6. Availability is derived from the active plan version and a single redemption ledger; unused entitlement rows are not generated for every user.
7. One `MembershipBenefitRedemption` lifecycle handles reservations, consumed benefits, releases, reversals, and automatic savings.
8. The related Order, Service Booking, Kundli, Asthi, or Offerings request owns fulfilment. Membership does not duplicate those workflows.
9. Every price-affecting decision is snapshotted so later plan or catalog edits cannot change historical transactions.
10. All quota checks and reservations are atomic and idempotent.

## Core model

The reusable relationship is:

`MembershipPlan -> MembershipPlanVersion -> MembershipBenefit -> MembershipBenefitTarget -> MembershipBenefitRedemption`

### Benefit methods

- Automatic: percentage discount, fixed discount, free shipping, priority, or access.
- Claim: complimentary unit or monetary credit selected by the member.

### Supported targets

- Entire scope
- Category
- Product
- Product variant
- Service
- Kundli package
- Asthi package
- Festival campaign
- Tag, including temple
- Validated future module reference

### Redemption states

- `RESERVED`
- `CONSUMED`
- `RELEASED`
- `REVERSED`

The redemption stores the member, plan version, benefit, target, related subject, quantity, original amount, saving, final amount, period key, reservation expiry, idempotency key, and audit reason.

## Execution tracker

### Batch 1 - Membership plan lifecycle

Status: DONE (2026-09-09)

- Add Create Plan, Draft, Publish, Duplicate, Retire, and Reorder controls.
- Add immutable plan versions and connect each membership to its purchased version.
- Backfill the current three plans and memberships without changing current access.
- Prevent destructive deletion of plans with members or transaction history.
- Add clear validation, audit logs, and plain-language admin help.

Acceptance gate:

- Admin can create and publish a fourth plan without code or seed changes.
- A later plan edit does not change benefits for existing members.
- Draft plans are invisible to customers.
- Retired plans remain readable in historical memberships.
Completion evidence:

- CMS supports Create Plan, editable working drafts, Publish, Duplicate, Retire, and numeric reordering.
- Publication creates immutable snapshots of plan terms, benefits, and rules; activation and renewal bind planVersionId.
- Migration created one version for each existing plan and backfilled all existing memberships.
- Local database result: 3 plans, 3 versions, 3 memberships, 0 unbound memberships.
- Rolled-back database acceptance check passed for fourth-plan creation, draft invisibility, immutable published terms after editing, and retired-history readability.
- Validation passed: Prisma schema, TypeScript, ESLint, 167 tests, and the Next.js production build.

### Batch 2 - Benefit targeting and redemption engine

Status: PENDING

- Add benefit method, effect, target, value/quantity, reset, validity, stacking, residual charges, and fulfilment instructions.
- Add reusable benefit targets.
- Add the unified redemption ledger.
- Implement atomic reserve, consume, release, and audited reversal operations.
- Implement a shared evaluator for shop, service, Kundli, Asthi, festival, shipping, and future modules.
- Allocate monetary savings to individual lines for accurate partial refunds.
- Replace technical CMS fields with a guided benefit wizard and readable policy preview.

Default policies:

- Use the best membership price benefit per item.
- Wallet may combine with membership unless disabled.
- Coupon combination requires explicit permission.
- Complimentary items do not receive another price discount.
- Item price, shipping, tax, add-ons, and upgrade differences are calculated separately.
- Reserved and consumed quantities both count against availability.

Acceptance gate:

- Admin can target a benefit to an entire scope or a selected entity.
- Preview and transaction-time evaluation return the same result.
- Concurrent attempts cannot overuse a limited benefit.
- Refreshes, retries, and webhook replays cannot duplicate redemption.

### Batch 3 - Claim Centre and Kundli reference implementation

Status: PENDING

- Add customer My Benefits sections: Available, In Progress, Used, and Expired/Cancelled.
- Add admin Membership Claims Queue with new, pending, due, overdue, fulfilled, cancelled, and exception views.
- Add notifications for new, overdue, failed, and manual-review claims.
- Apply percentage and fixed membership discounts to Kundli prices and Razorpay totals.
- Allow selected Kundli packages to be claimed as complimentary units.
- Skip Razorpay when the payable amount is zero.
- Support a defined benefit credit with a payable package-upgrade difference.
- Release abandoned or eligible cancelled reservations.
- Keep claims valid through fulfilment when membership expires after a valid reservation.

Acceptance gate:

- Admin can configure three complimentary selected Kundli reports for a plan.
- Customer sees the remaining balance and can claim exactly once per action.
- A zero-value claim enters the existing details, verification, Guruji assignment, report, and delivery workflow.
- Paid upgrades charge only the snapshotted difference.

### Batch 4 - Shop and Prasad

Status: PENDING

- Apply benefit targets consistently on product, cart, checkout, payment, order, admin, refund, and savings-history surfaces.
- Create a normal Prasad category.
- Add temple-tagged Prasad products with variants, inventory, source, dispatch estimate, and shipping rules.
- Support complimentary physical-product claims by creating normal orders.
- Reserve inventory and collect an address before confirming a physical claim.
- Support category-wide, product-specific, variant-specific, and temple-tag benefits.

Acceptance gate:

- Admin can configure one complimentary Prasad product from selected temples.
- The claim creates a fulfilment-ready order and correctly records remaining entitlement.
- Cancellation, inventory failure, delivery, and partial refund produce consistent redemption states.

### Batch 5 - Puja, general services, and Asthi

Status: PENDING

- Apply membership discounts and credits to service bookings and Asthi packages.
- Support complimentary Puja or service units.
- Reserve capacity before confirming a service claim.
- Release benefits when a held booking expires or is validly cancelled.
- Apply membership priority to the existing queue system.
- Preserve add-on, travel, shipping, and upgrade charges when they are excluded from a benefit.

Acceptance gate:

- Admin can configure one free Puja monthly and a percentage discount on a selected service.
- Date/capacity conflicts cannot consume the benefit permanently.
- The customer, operations team, payment record, and membership history show the same amount and status.

### Batch 6 - Offerings to Blessings and production hardening

Status: PENDING

- Add an Offerings to Blessings request workflow for material description, photos, pickup/drop/courier, acceptance, collection, receipt, processing, reward selection, and closure.
- Fulfil reward Prasad/products/hampers through normal orders.
- Allow membership access, free pickup, priority, reward credit, and free reward shipping benefits.
- Add reservation-expiry processing and operational reminders.
- Add reports for outstanding benefit liability, reservations, consumption, reversals, savings, and overdue claims.
- Complete cancellation/refund policies, role permissions, accessibility, security review, and cross-module UAT.

Acceptance gate:

- Offerings and its reward can be tracked end to end without special membership logic.
- Operations can see every outstanding obligation and overdue claim.
- Customer and financial histories remain correct after retries, cancellation, refund, expiry, and reversal.

## Delivery method for every batch

1. Confirm the batch schema and customer/admin acceptance cases.
2. Add backward-compatible migration and data backfill.
3. Implement the smallest complete vertical slice.
4. Run focused tests, then the required broader checks once.
5. Commit the batch independently.
6. Deploy to the isolated candidate revision.
7. Complete UAT without moving main traffic.
8. Mark the batch DONE only after its acceptance gate passes.

Partially integrated benefits must remain hidden or clearly marked unavailable until their complete transaction and fulfilment path passes UAT.
