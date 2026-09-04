# OMDivyaDarshan Phase-1 Gate 2 - Membership Cross-Module UAT Evidence

**Evidence date:** 4 September 2026
**Gate:** Provisional membership lifecycle, entitlement, commerce enforcement, and dashboard closure
**Status:** CLOSED FOR SYNTHETIC CLIENT UAT
**Environment:** Local PostgreSQL with isolated synthetic records; no real customer or payment data
**Working branch:** `phase1-uat`

## Scope and Boundary

This gate proves that the membership engine is ready for client UAT using provisional plans. It does not finalize the client's package names, prices, validity, trips, prasad, live darshan, VIP entry, offers, or other commercial promises. Razorpay, production infrastructure, notifications, policies, and automatic real-world fulfilment remain deferred.

No real payment was attempted. Paid membership activation used an explicitly labelled mock reference. The persisted UAT created isolated synthetic users, plans, benefits, memberships, requests, usage, audit records, and account projections, then removed them.

## Blocking Gaps Found and Corrected

| Gap | Resolution |
| --- | --- |
| PostgreSQL advisory lock used Prisma's row-returning API and failed on the database `void` result | All membership locks now use `$executeRaw`; live local activation succeeded |
| An approved downgrade/plan-change request closed the request but did not change the entitlement | Approval now cancels the previous entitlement, creates the requested active entitlement, retains the original expiry, and records both histories |
| Paid mock double-submit could extend a plan more than once | The review page supplies a deterministic membership-state reference; repeated submission is idempotent |
| Plan renewal, upgrade, and cancellation flags were not enforced by the server lifecycle | All three controls are enforced in the lifecycle service and reflected in customer UI |
| Duplicate downgrade/cancellation requests could create operational noise | Open requests are serialized with advisory locks and deduplicated |
| Terminal requests could be changed or repeatedly applied | Same decision is a no-op; conflicting terminal transitions are rejected; admin terminal rows are read-only |
| A cancelled member could no longer see the processed request on the membership page | Recent decisions and admin notes remain visible without an active entitlement |
| Lifecycle logic was embedded in UI actions | Authentication/authorization remains in Server Actions; transactional lifecycle behavior is isolated in `lib/membership-lifecycle.ts` |

## Persisted Synthetic UAT Matrix

| Scenario | Result |
| --- | --- |
| Non-member has no active entitlement | PASS |
| Guest/non-member commerce destination preserves the safe return path | PASS |
| Free membership activation permits the shared active-membership commerce gate | PASS |
| Repeated Free activation does not create or extend another entitlement | PASS |
| Paid mock activation cancels the prior Free entitlement | PASS |
| Identical paid confirmation reference is idempotent | PASS |
| A new renewal reference extends the existing paid entitlement | PASS |
| Higher-plan activation retains history and leaves exactly one current entitlement | PASS |
| SHOP percentage benefit is evaluated for an active provisional plan | PASS |
| KUNDLI limited-use benefit is eligible before use | PASS |
| First KUNDLI usage is persisted and audited | PASS |
| Second use is rejected after the monthly limit is reached | PASS |
| Duplicate downgrade request resolves to the same open request | PASS |
| Admin review moves submitted request to under review | PASS |
| Admin approval creates the requested replacement plan | PASS |
| Replacement plan retains the original expiry | PASS |
| Repeated identical approval is a no-op | PASS |
| Conflicting decision after approval is rejected | PASS |
| Cross-customer cancellation request is rejected | PASS |
| Duplicate cancellation request resolves to one request | PASS |
| Approved cancellation removes commerce eligibility | PASS |
| Renewal-disabled plan rejects renewal | PASS |
| Upgrade-disabled plan rejects a plan change | PASS |
| Cancellation-disabled plan rejects a cancellation request | PASS |
| Date-expired ACTIVE record is not treated as active | PASS |
| Eligible expired plan restarts safely through renewal | PASS |
| Inactive plan cannot be activated | PASS |
| Customer account contains membership and processed-request projections | PASS |
| Admin queries can see the synthetic memberships and request history | PASS |
| Synthetic users and plans remaining after cleanup | PASS - `0` users, `0` plans |

## Cross-Module Enforcement Evidence

- Checkout browsing and cart remain public as designed.
- `/checkout`, direct order-draft creation, payment-attempt creation, payment success, payment failure, cancellation, and expiry actions retain server-side membership enforcement.
- Kundli and Asthi actions are not incorrectly placed behind the commerce-membership gate.
- Active membership benefits can be evaluated for SHOP, FESTIVAL, KUNDLI, SUPPORT, and the other configured scopes.
- Membership activation, renewal, upgrade, cancellation, request decisions, and limited usage are projected into audit/history and the customer account statement.
- Customer and admin dashboards query the same persisted entitlement and request state.

Automatic checkout price mutation from a membership benefit is not enabled in this provisional gate. The generic benefit/rule evaluator is validated, but applying a real percentage, free service, trip, prasad, VIP access, or other promise must follow the approved client membership matrix and fulfilment policy.

## Verification Evidence

| Check | Result |
| --- | --- |
| Persisted opt-in membership UAT | PASS - 1/1 |
| Membership lifecycle unit coverage | PASS - 4/4 |
| Full Vitest suite | PASS - 19 files, 84 tests |
| Opt-in suites in normal runs | SKIPPED BY DEFAULT - Membership persisted UAT and real-GCS UAT require explicit flags |
| TypeScript | PASS |
| Full ESLint | PASS |
| Next.js production build | PASS - 77/77 pages generated |
| Database migrations | PASS - all 40 migrations applied |
| Synthetic cleanup audit | PASS - zero synthetic membership users and plans |

## Closure Decision

The provisional membership engine is `LOCAL-UAT VALIDATED` and `CLOSED FOR SYNTHETIC CLIENT UAT`.

This means OMD can demonstrate plan discovery, Free and mock-paid activation, active entitlement gating, renewal, upgrade, limited benefits, customer requests, admin review, approved downgrade/cancellation, customer/account history, and negative access cases. It does not mean the commercial membership offering or production payment/fulfilment operations are approved.

## Next Execution Step

Proceed to selected Festival Hampers and Products UAT: freeze a small synthetic launch catalog, verify festival/category/product discovery, inventory and availability, membership-aware offer evaluation without inventing the final client benefit, cart/checkout/order/mock-payment/admin fulfilment, and negative stock or inactive-product cases.
