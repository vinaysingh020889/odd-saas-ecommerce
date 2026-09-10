# Batch 6 Offerings to Blessings Production Review

Date: 2026-09-10
Scope: Offerings workflow, reward orders, membership entitlements, operations reporting, cancellation/refund behavior, permissions, accessibility, and cross-module regression.

## Acceptance coverage

- Customer submits a material description, up to five HTTPS photo references, and pickup, drop-off, or courier instructions.
- Operations advances a guarded lifecycle: submission, acceptance, collection scheduling, collection, receipt, processing, reward selection, reward order, and closure.
- Reward products use the normal Product, ProductVariant, Order, OrderItem, inventory ledger, payment, fulfillment, cancellation, and refund paths.
- Membership is evaluated by benefit scope/type/target rather than plan name. Supported effects are Offerings access, free pickup, priority queue, reward credit, and free reward shipping.
- Reservation idempotency and the shared redemption state machine remain the source of truth. Offerings expiry releases only Offerings pickup reservations; module-aware processors retain responsibility for shop/service holds.
- Operations can view reserved liability, consumption, releases, reversals, net savings, overdue claims, and overdue Offerings.

## Policy decisions

Customer cancellation is self-service until collection. A reserved pickup benefit is released. After collection begins, support or operations must review the request because custody and processing costs may exist. Rejection before collection releases a reservation. Collection consumes the pickup benefit. Reward order cancellation, inventory release, payment refund, partial refund, and membership reversal use the normal order workflow.

## Role and security review

Customer actions derive identity from the signed, HTTP-only session cookie and re-read request ownership, tenant, address, product, variant, inventory, and membership server-side. Form values are constrained; descriptions are length limited; photo references must be HTTPS and are stored as references rather than uploaded executable content. All mutations are server-only and audited.

SUPER_ADMIN and OPERATIONS_ADMIN may view and advance Offerings and view obligation reports. Other admin roles cannot access these routes. Customer-visible timelines exclude internal activities. Reward pricing and benefit decisions are snapshotted on the request, order, item, and redemption.

## Accessibility review

Pages have a unique h1, labelled fieldsets and controls, explicit help text, native required controls, keyboard-operable forms and links, table captions and scoped headers, ordered timelines, and status text that does not depend on color alone. ESLint completed without accessibility findings.

## Validation evidence

- Prisma schema validation passed.
- Migration 20260910233000_offerings_blessings_hardening applied; migration status is current.
- TypeScript passed.
- ESLint passed.
- 185 tests passed across 42 files; the persisted cross-module membership UAT also passed. Three unrelated environment-gated UAT files remained skipped.
- Four focused Offerings tests cover state transitions, overdue classification, semantic access selection, and target separation.
- Next.js 16.3.4 production build passed and generated all customer/admin Offerings and report routes.
