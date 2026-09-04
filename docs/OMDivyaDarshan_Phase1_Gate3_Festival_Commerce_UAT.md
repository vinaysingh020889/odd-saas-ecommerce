# OMDivyaDarshan Phase-1 Gate 3 - Selected Festival Commerce UAT Evidence

**Evidence date:** 4 September 2026
**Gate:** Selected festival hampers/products discovery-to-order closure
**Status:** CLOSED FOR SYNTHETIC CLIENT UAT
**Environment:** Local PostgreSQL; isolated synthetic records; mock payment only
**Working branch:** `phase1-uat`

## Scope and Boundary

This gate validates a deliberately small festival-commerce launch path rather than a general ecommerce rollout. Synthetic records represented one active festival, one active hamper, inactive catalog records, five stock units, one automatic product offer, one active member, and success/failure payment paths.

Final festival names, SKUs, copy, images, prices, tax, shipping, stock, membership discounts, Razorpay, courier integration, and fulfilment policy remain client or production inputs.

## Blocking Gaps Corrected

| Gap | Resolution |
| --- | --- |
| Active festivals could expose linked inactive products, services, or categories | Public festival queries now filter every linked catalog relation to `ACTIVE` |
| Repeated Pay submission was rejected before checking for an existing pending attempt | Pending-attempt lookup now occurs first; duplicate submission returns the same attempt |

## Persisted UAT Matrix

| Scenario | Result |
| --- | --- |
| Active in-window festival is discoverable | PASS |
| Draft festival is hidden | PASS |
| Inactive linked product and category are excluded | PASS |
| Active product resolves; inactive product reaches 404 | PASS |
| Active hamper retains SKU, price, media, category, and variant | PASS |
| Available stock accepts quantity two | PASS |
| Quantity above stock is rejected | PASS |
| Targeted 10% synthetic offer produces `1000 - 100 = 900` | PASS |
| Active membership permits checkout gate | PASS |
| Non-member is redirected to membership with safe checkout return | PASS |
| First payment attempt reserves two units | PASS |
| Duplicate Pay returns the same pending attempt | PASS |
| Cross-customer payment access is rejected | PASS |
| Mock success confirms order, payment, invoice, and two sold units | PASS |
| Duplicate success is idempotent: one attempt and one event | PASS |
| Order, payment, and confirmation project to customer account | PASS |
| Repeated account projection is idempotent | PASS |
| Admin order query sees item and payment state | PASS |
| Four-unit order is rejected when only three remain | PASS |
| Failed payment releases reserved stock | PASS |
| Retry creates a new attempt | PASS |
| Cancelled retry releases stock again | PASS |
| Admin fulfilment controls remain operations-admin protected | PASS - source/regression validation |
| Synthetic records remaining after cleanup | PASS - zero |

## Verification Evidence

| Check | Result |
| --- | --- |
| Persisted opt-in Festival Commerce UAT | PASS - 1/1 |
| Festival safety regression | PASS - 3/3 |
| Full Vitest suite | PASS - 20 files, 87 tests |
| Opt-in suites in normal runs | SKIPPED BY DEFAULT - Festival, Membership, and real-GCS UAT require explicit flags |
| TypeScript | PASS |
| Full ESLint | PASS |
| Next.js production build | PASS - 77/77 pages generated |

## Closure Decision

The selected festival-commerce application path is `LOCAL-UAT VALIDATED` and `CLOSED FOR SYNTHETIC CLIENT UAT`.

The application can demonstrate controlled festival discovery, selected-product availability, targeted offer pricing, membership-first checkout, inventory reservation/sale/release, mock payment success/failure/retry, account history, and admin order visibility. This is not approval for a broad ecommerce catalog or real commercial transactions.

## Next Execution Step

Proceed to Gate 4 - Dashboard and Admin Role-Matrix UAT: validate customer, Guruji, operations admin, support, product/inventory, and unauthorized-role visibility against only the locked Phase-1 surfaces, then correct projection or access gaps.
