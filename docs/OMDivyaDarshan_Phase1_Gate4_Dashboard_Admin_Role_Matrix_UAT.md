# OMDivyaDarshan Phase-1 Gate 4 - Dashboard and Admin Role-Matrix UAT Evidence

**Evidence date:** 4 September 2026
**Gate:** Customer, Guruji, and admin dashboard authorization and projection
**Status:** CLOSED FOR SYNTHETIC CLIENT UAT
**Environment:** Local PostgreSQL; isolated synthetic users and memberships; Phase-1 UAT mode
**Working branch:** `phase1-uat`

## Scope and Boundary

This gate validates the locked Phase-1 dashboard surfaces and role boundaries. It does not certify production identity infrastructure, real staff accounts, real customer data, final policies, notifications, or production hardening.

## Blocking Gaps Corrected

| Gap | Resolution |
| --- | --- |
| Catalog navigation was role-filtered, but direct product/category/inventory/festival/promotion/offer URLs had no page-level gate | Added `requireCatalogAdminUser()` to all 16 list/create/edit server pages |
| Operations overview linked to Payments, but Operations Admin was denied by the payment page and navigation | Aligned the page and finance navigation to `SUPER_ADMIN` plus `OPERATIONS_ADMIN` |
| Phase-1 admin overview exposed deferred Asthi, services, reschedule, and generic checklist surfaces | Dashboard cards, quick links, copy, and Asthi queue now honor the Phase-1 allowlist |
| Customer dashboard still exposed internal Asthi and generic Puja/service panels and actions | Phase-1 mode now limits quick actions, recommendations, and panels to the locked customer surface |

## Validated Role Matrix

| Persona | Permitted Phase-1 responsibility | Negative boundary | Result |
| --- | --- | --- | --- |
| Customer | Festival shop, membership, Kundli, orders, account, own projections | No admin role; another customer's membership projection is excluded | PASS |
| Guruji / Astrologer | Assigned Kundli work through `/admin/my-work` | No operations, catalog, support, payment, or other customer's work | PASS |
| Product Manager | Products, categories, inventory, festivals, promotions, offers, Kundli packages | No operations dashboard, payments, support, or assignment control | PASS |
| Support Agent | Admin search and customer support visibility | No catalog, payment, membership administration, or operations control | PASS |
| Operations Admin | Operations dashboard, Kundli queues, customers, memberships, selected commerce/orders, payments, audit | Deferred Phase-1 navigation excluded | PASS |
| Super Admin | All locked Phase-1 administration | Deferred primary surfaces remain hidden in Phase-1 UAT mode | PASS |

## Persisted UAT Evidence

The opt-in test `lib/phase1-role-matrix.uat.test.ts` creates synthetic users for the five operational roles plus two customers, persists role joins and two memberships, reloads them through Prisma, validates positive and negative capability combinations, proves per-customer versus tenant-admin membership projections, then deletes every synthetic user and plan.

| Scenario | Result |
| --- | --- |
| Required operational roles exist in the seeded UAT tenant | PASS |
| Operations Admin receives full operations capability | PASS |
| Support Agent receives support but not catalog capability | PASS |
| Product Manager receives catalog but not operations capability | PASS |
| Guruji is an authenticated admin-workspace role but lacks cross-role capabilities | PASS |
| Each customer query returns only its own membership | PASS |
| Tenant-scoped admin query returns both synthetic customer memberships | PASS |
| Synthetic users and membership plan remaining after cleanup | PASS - zero |

## Verification Evidence

| Check | Result |
| --- | --- |
| Focused authorization and dashboard suite | PASS - 21/21 |
| Persisted opt-in role-matrix UAT | PASS - 1/1 |
| Full Vitest suite | PASS - 21 files, 105 active tests |
| Opt-in suites in normal runs | SKIPPED BY DEFAULT - Role Matrix, Festival, Membership, and real-GCS UAT require explicit flags |
| TypeScript | PASS |
| Full ESLint | PASS |
| Next.js production build | PASS - 77/77 pages generated |

## Closure Decision

Gate 4 is `LOCAL-UAT VALIDATED` and `CLOSED FOR SYNTHETIC CLIENT UAT`. Dashboard visibility, direct-route authorization, persisted role assignment, and customer projection isolation now match the locked Phase-1 responsibility model.

## Next Execution Step

Proceed to Gate 5 - Public Discovery and Handoff Verification. Verify the public Kundli, Membership, Festival/Shop, and Asthi CTA destinations; preserve final WordPress/Asthi URLs and content as explicit client-pending inputs where unavailable.
