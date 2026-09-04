# OMDivyaDarshan Phase-1 Gate 6 - Local UAT and Launch Certification

**Decision date:** 4 September 2026  
**Branch:** `phase1-uat`  
**Entry baseline:** `4271c8d`  
**Status:** `CLOSED - ELIGIBLE FOR GATE 6.5 RELEASE-CANDIDATE FREEZE`  
**Authority:** Synthetic local UAT only; this is not hosted-UAT or production approval.

## 1. Decision

Gate 6 passes with no observed P0/P1 defect. The locked Phase-1 application can proceed to Gate 6.5, where the exact commit, migration set, seed behavior, and temporary hosted-UAT configuration will be frozen as a release candidate.

Do not declare `READY FROM OUR SIDE - CLIENT UAT` yet. That declaration belongs to Gate 7 after the frozen candidate is deployed to the approved temporary UAT environment and the hosted smoke and critical paths pass.

## 2. Certified Phase-1 Boundary

- Kundli customer intake, assignment/queueing, Guruji work, report review/delivery, customer-safe projection, and access controls.
- Provisional Membership activation, gating, benefits, lifecycle requests, account/admin projection, expiry, authorization, and idempotency.
- Selected festival campaigns, hampers/products, inventory, pricing, membership-gated checkout, mock payment, order/account projection, and admin fulfilment boundary.
- Customer, Guruji, Product Manager, Support Agent, Operations Admin, and Super Admin dashboard/route boundaries.
- Public discovery for Shop, Membership, Kundli, an active festival campaign, and the Asthi external-application handoff state.

Excluded from this approval: real payments, real customer data, production storage/infrastructure, final client content/data, notifications, production policies, and production hardening.

## 3. Automated Evidence

The reproducible command `npm run phase1:certify` completed successfully.

| Check | Result |
| --- | --- |
| Prisma schema | Valid |
| Migration state | 40 migrations; local database up to date |
| Persisted Phase-1 critical path | 7 suites, 33 tests passed |
| Full regression | 23 suites, 119 tests passed; 4 explicitly opt-in UAT tests skipped in the normal pass |
| TypeScript | Passed |
| ESLint | Passed |
| Next.js production build | Passed on Next.js 16.3.4; 77 static pages generated and dynamic routes compiled |

The required persisted Membership, Festival Commerce, and Role Matrix suites ran in the dedicated critical-path pass before being intentionally skipped in the normal regression pass. The suites use unique synthetic identifiers and deterministic teardown. The real-GCS report test remains separately controlled and was previously closed under Gate 1 using the approved temporary keyless identity.

## 4. Runtime and Content Evidence

The optimized build was served locally on port 3136 and tested without redirect following.

| Route/check | Result |
| --- | --- |
| `/api/health` | HTTP 200; `status=ok`; database `ok`; 0 blockers; 1 disclosed Asthi URL warning |
| `/shop` | HTTP 200; festival and product/hamper content present |
| `/membership` | HTTP 200; membership-plan content present |
| `/kundli` | HTTP 200; Kundli/application content present |
| `/services/asthi-visarjan` | HTTP 200; explicit Asthi handoff surface present |
| `/festivals/raksha-bandhan-2026` | HTTP 200; campaign and linked product content present |
| `/api/public/festivals` | HTTP 200; 2 active synthetic/demo campaigns returned |
| `/dashboard` and `/admin` unauthenticated | HTTP 307 to `/login` |
| `/wallet` unauthenticated | HTTP 307 to `/login`; wallet remains outside the Phase-1 launch boundary |

The in-app visual browser could not start because the host Windows sandbox rejected its process with an ACL error. This was a tooling limitation, not an application response failure. Rendered HTTP checks passed against the same optimized build. Interactive visual/persona rehearsal therefore remains mandatory in Gate 7 on the hosted candidate.

## 5. Security and Configuration Corrections

- Added a non-sensitive `/api/health` readiness endpoint with database and target-aware configuration checks.
- Added global `nosniff`, frame denial, referrer, permissions, and baseline CSP response headers.
- Hardened the repository seed: it always refuses production and requires explicit opt-in plus a unique 16+ character password outside local development.
- Rehearsed the production seed stop rule; it exited before database writes.
- Added a secret-free `.env.uat.example` contract and retained keyless-only GCS authentication.
- Scanned tracked filenames for runtime environment files, private keys, and live-token artifacts; none were found.
- Updated Next.js to 16.3.4 and Vitest to 3.2.7. `npm audit` now reports 0 critical and 0 high findings.
- Standardized hosted UAT on Node `>=20.19.0` through `package.json` and `.nvmrc`. The local certification ran on 20.18.1 with an engine warning; Gate 7 must use the declared version or newer.

Five moderate audit findings remain in the current Google Cloud Storage transitive request/UUID chain. The registry offers no newer direct `@google-cloud/storage` release and npm proposes an unsafe major downgrade to resolve the chain. This is accepted only for temporary synthetic UAT, with private storage, keyless identity, and no real customer data; it must be reassessed before production.

## 6. Operations and Rollback Evidence

`docs/OMDivyaDarshan_Phase1_UAT_Operations_Rollback_Runbook.md` now defines:

- temporary hosted-UAT configuration and synthetic-data restrictions;
- migration validation/deploy sequence and required pre-migration provider snapshot;
- health, smoke, persona, stop, defect, and manual-communication procedures;
- immutable application rollback and provider-snapshot database recovery steps.

Local `pg_dump`/`pg_restore` binaries are unavailable, so a real database restore was not claimed. Hosted provider snapshot creation and restore evidence is mandatory before production and should be rehearsed during hosted-UAT operations.

## 7. Gate 6 Exit Matrix

| Exit criterion | Outcome |
| --- | --- |
| No open P0/P1 found in certification | Pass |
| Critical functional paths | Pass |
| Role and ownership isolation | Pass |
| Configuration/readiness contract | Pass |
| Migration validation | Pass |
| Runtime health and security headers | Pass |
| Synthetic-only seed safety | Pass |
| Rendered public/protected route smoke | Pass |
| Operations/rollback procedure | Documented; hosted restore evidence remains required |
| Interactive visual browser rehearsal | Deferred to Gate 7 due host ACL limitation |

## 8. Immediate Next Step - Gate 6.5

1. Commit this Gate 6 closure as one immutable candidate baseline.
2. Record the exact commit SHA, all 40 migrations and their checksum, seed version, dependency lockfile, and `.env.uat.example` contract.
3. Create the release identifier `phase1-uat-rc1` without adding secrets or credentials.
4. Confirm temporary hosting uses Node 20.19+, HTTPS, private PostgreSQL, the already approved temporary GCS bucket/keyless identity, and synthetic data only.
5. Deploy only that frozen candidate, then begin Gate 7 hosted UAT.

## 9. Production No-Go Register

Production remains blocked by the final Razorpay/payment decision and credentials; final product/festival data; final membership matrix; real Guruji information; final WordPress/Asthi URLs and content; OMD-owned production cloud/storage and keyless identity; tested backup/restore; monitoring/alerts; policies; notifications or an approved manual SOP; security hardening and owner sign-off.
