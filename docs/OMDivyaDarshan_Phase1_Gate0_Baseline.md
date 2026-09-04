# OMDivyaDarshan Phase-1 Gate 0 Baseline

**Snapshot date:** 3 September 2026
**Gate:** Baseline + UAT Surface Freeze
**Status:** CLOSED - REVIEWABLE CHECKPOINT CREATED
**Working branch:** `phase1-uat`
**Starting commit:** `fdb7daa`

## Completed In This Gate

- Updated the CTO/PM playbook creation plan with the approved execution corrections.
- Created the dedicated `phase1-uat` working branch without discarding any existing changes.
- Added the explicit `PHASE1_UAT_MODE` runtime flag.
- Enabled the flag only in the ignored local `.env` file.
- Added a customer UAT banner identifying synthetic/provisional data.
- Restricted customer primary navigation to Festival Hampers, Membership, Kundli, Cart, Dashboard, Orders, and Account.
- Removed Wallet, generic Services, Asthi, and Search from primary customer UAT navigation.
- Preserved all deferred routes and implementation; nothing was deleted for the surface freeze.
- Restricted admin primary navigation to the Phase-1 operational allowlist.
- Preserved the existing Guruji restriction to assigned Kundli work only.
- Consolidated the duplicate Next.js configuration into `next.config.ts`, retaining the Kundli upload body-size configuration.
- Added automated regression coverage for the Phase-1 navigation policy.

## Validation Evidence

| Check | Result |
| --- | --- |
| Full Vitest suite | PASS - 18 files, 80 tests |
| TypeScript | PASS |
| Full ESLint | PASS |
| Final focused ESLint | PASS |
| Next.js production build | PASS |
| Static page generation | PASS - 77/77 |
| Production-rendered `/shop` | PASS - HTTP 200 |
| UAT banner | PASS |
| Festival Hampers navigation | PASS |
| Membership navigation | PASS |
| Kundli navigation | PASS |
| Wallet hidden | PASS |
| Generic Services hidden | PASS |
| Internal Asthi link hidden | PASS |
| Search hidden | PASS |
| Deferred routes remain compiled | PASS |

The in-app browser connection was unavailable in the Windows sandbox. The rendered production HTML was therefore checked through HTTP, supported by source-level policy regression tests and the successful production build.

## Repository Safety Snapshot

The Gate began with a broad pre-existing working tree:

- 107 Git status entries.
- 58 modified tracked files.
- 1 deleted tracked file after configuration consolidation.
- 48 untracked paths.

These changes span Kundli, membership, customer account, commerce, inventory, admin, schema, migrations, tests, documentation, and UI work. No existing work was discarded. The implementation was classified, explicitly staged, and separated into the reviewable checkpoints below.

## Checkpoint Commit Chain

| Commit | Checkpoint | Scope |
| --- | --- | --- |
| `cda6120` | Phase-1 platform foundation | Shared schema, five migrations, seed data, environment/configuration, dependencies, Vitest configuration, and account backfill tooling |
| `878922b` | Kundli critical path | Assignment engine, Guruji eligibility and workspace isolation, customer/admin workflow, secure report storage/download, and regression coverage |
| `edbad07` | Membership and account | Membership-first purchase enforcement, activation safety, customer activity statement, and operational projection hooks |
| `5da3e43` | Festival commerce | Festival storefront, catalog/product/service administration, and inventory workflow improvements |
| `a2e3310` | Gate-0 UAT surface freeze | Customer/admin navigation allowlists, UAT disclosure, retained deferred routes, and policy regression tests |

## Working-Tree Classification

| Review group | Principal paths | Current interpretation |
| --- | --- | --- |
| Kundli assignment and queue consistency | `lib/kundli-assignment-*`, `lib/kundli-customer-assignment*`, Kundli customer/admin pages, assignment surfaces, July Kundli migrations | CHECKPOINTED - KND-IMP-02 implementation and regression evidence retained |
| Kundli private reports and Guruji workspace | `lib/kundli-report-*`, `lib/kundli-guruji-workspace*`, report download routes, Guruji component, admin review pages, GCS dependency/config | CLOSED - Gate 1 real-GCS signed-download UAT passed with a keyless least-privilege identity |
| Membership-first commerce | Membership pages/actions/services, `lib/commerce-membership-*`, cart/checkout/order/payment enforcement points | CLOSED FOR SYNTHETIC CLIENT UAT - lifecycle, gating, requests, limited usage, projections, and negative cases passed |
| Customer account statement | Account activity route, dashboard/customer admin updates, `lib/customer-account*`, backfill script, customer-account migration | CHECKPOINTED - migration applied locally and projection tests pass |
| Festival/catalog/commerce administration | Shop, product/service admin, inventory, storefront components, catalog/admin actions | CLOSED FOR SYNTHETIC CLIENT UAT - selected catalog, offer, stock, payment, projection, and negative paths passed |
| Cross-cutting operations | Documents, restricted work, Asthi, service booking/capacity, order requests and admin search | CLASSIFIED AND CHECKPOINTED with the owning Kundli or account layer |
| Gate 0 UAT freeze | `lib/phase1-uat*`, customer/admin navigation, runtime flag, plan/baseline docs, Next config consolidation | CLOSED AND VALIDATED |
| Shared schema/tooling | `prisma/schema.prisma`, `prisma/seed.ts`, `package.json`, lockfile, Vitest and Next configuration | CHECKPOINTED; Prisma schema valid and all 40 local migrations applied |

## Gate 0 Closure

- Every pre-existing modified or untracked implementation file was classified and explicitly staged.
- No broad `git add .`, reset, checkout, or destructive cleanup was used.
- The repository is represented by five reviewable implementation checkpoints plus the documentation closure commit.
- The local UAT surface is frozen to the locked Phase-1 scope while deferred functionality remains preserved in the codebase.
- Gate 0 is complete; no implementation blocker remains at this gate.

## Gate 1 Closure

Gate 1 was completed on 4 September 2026. KND-IMP-03 is `LIVE-UAT VALIDATED` and `CLOSED` for temporary synthetic UAT. Evidence is recorded in `docs/OMDivyaDarshan_Phase1_Gate1_KND-IMP-03_UAT.md`.

## Gate 2 Membership Closure

Gate 2 was completed on 4 September 2026. The provisional membership engine is `LOCAL-UAT VALIDATED` and `CLOSED FOR SYNTHETIC CLIENT UAT`. Evidence is recorded in `docs/OMDivyaDarshan_Phase1_Gate2_Membership_UAT.md`.

## Gate 3 Festival Commerce Closure

Gate 3 was completed on 4 September 2026. Selected festival commerce is `LOCAL-UAT VALIDATED` and `CLOSED FOR SYNTHETIC CLIENT UAT`. Evidence is recorded in `docs/OMDivyaDarshan_Phase1_Gate3_Festival_Commerce_UAT.md`.

The next execution step is dashboard/admin role-matrix UAT, followed by public handoff checks, local release certification, and the hosted client-UAT release candidate.
