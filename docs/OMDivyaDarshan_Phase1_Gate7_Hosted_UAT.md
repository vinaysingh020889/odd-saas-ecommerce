# OMDivyaDarshan Phase-1 Gate 7 - Hosted UAT Evidence

**Evidence date:** 5 September 2026  
**Currently hosted candidate:** `phase1-uat-rc1`

**Next certified candidate:** `phase1-uat-rc2` at `2e644d1806dddd5f44ac9f7700b42448230d0158`
**Frozen application commit:** `1a935666385ee407de42e22fa60240fecee65339`  
**Hosted service:** `https://omd-phase1-uat-845032306091.asia-southeast1.run.app`  
**Scope:** Temporary synthetic client UAT only  
**Status:** `IN PROGRESS - RC2 DEPLOYMENT AND HOSTED ENVIRONMENT CLASSIFICATION BLOCKED`

## 1. Current Decision

The Cloud Run service is reachable and its public Phase-1 routes pass hosted HTTPS smoke checks. Gate 7 does not yet pass because `/api/health` reports `target: local-uat` instead of `hosted-uat`. This means the deployment is not currently proving the mandatory hosted-only checks for HTTPS application URL, strong session secret, and private GCS configuration.

After the hosted review, RC2 was created to restore complete role-authorized admin navigation while retaining the Phase-1 core/extended distinction. RC2 passed full local certification. The hosted service remains RC1 until RC2 is published and deployed; evidence: `docs/OMDivyaDarshan_Phase1_RC2_Admin_Navigation_Correction.md`.

Do not declare `READY FROM OUR SIDE - CLIENT UAT` until the environment classification is corrected, the health endpoint remains HTTP 200 as `hosted-uat`, the deployed artifact is tied to RC1, and authenticated persona/visual UAT passes.

## 2. Hosted Checks Passed

| Check | Result |
| --- | --- |
| HTTPS service reachability | Pass |
| `/api/health` transport and database | HTTP 200; `status=ok`; database `ok` |
| Phase-1 surface lock | `phase1ScopeLocked=true` |
| `/` | HTTP 307 to `/shop` |
| `/shop` | HTTP 200; festival/product content present |
| `/membership` | HTTP 200; membership-plan content present |
| `/kundli` | HTTP 200; Kundli/application content present |
| `/services/asthi-visarjan` | HTTP 200; Asthi handoff content present |
| `/api/public/festivals` | HTTP 200; 2 active campaigns returned |
| `/festivals/raksha-bandhan-2026` | HTTP 200; title present; 3 linked products |
| `/festivals/shradh-pitru-paksha-2026` | HTTP 200; title present; 1 linked product |
| `/dashboard` unauthenticated | HTTP 307 to `/login` |
| `/admin` unauthenticated | HTTP 307 to `/login` |
| Security headers | `nosniff`, frame denial, strict-origin referrer policy, and baseline CSP present |

The expected Asthi URL warning remains disclosed and non-blocking for synthetic client UAT.

## 3. Blocking Configuration Finding

Observed health response:

- `target=local-uat`
- `database=ok`
- zero blockers under the local target

Required correction:

1. Set Cloud Run `APP_ENV=staging`.
2. Confirm the same revision configuration includes HTTPS `APP_BASE_URL`, a unique non-placeholder `SESSION_SECRET` of at least 32 characters, `PHASE1_UAT_MODE=true`, `STORAGE_DRIVER=gcs`, the approved temporary `GCS_PROJECT_ID` and private `GCS_PRIVATE_BUCKET`, and `WALLET_ENABLED=false`.
3. Keep `RAZORPAY_MODE=test`, `PAYPAL_MODE=sandbox`, and synthetic data only.
4. Deploy a configuration-only Cloud Run revision using the same frozen RC1 image; do not rebuild from a moving branch.
5. Require `/api/health` to return HTTP 200 with `target=hosted-uat` and zero blockers.

Changing hosted environment variables does not change RC1 source, but the resulting Cloud Run revision name and image digest must be recorded.

## 4. Evidence Still Required

- Cloud Run revision/image provenance showing the deployed artifact is the frozen RC1 candidate.
- Hosted readiness response after `APP_ENV=staging`.
- Confirmation that the runtime service account is the approved minimum-permission keyless identity and no service-account key is mounted or stored.
- Named pre-migration PostgreSQL snapshot/backup and migration-deploy evidence.
- Synthetic Customer, Guruji, Product Manager, Support Agent, Operations Admin, and Super Admin persona walkthroughs, including negative cross-role checks.
- Hosted Kundli private-report upload, signed access, authorization denial, and cleanup using synthetic PDF/data only.
- Hosted Membership and selected Festival Commerce critical paths using test/mock payments only.
- Application rollback to the retained prior revision and post-rollback health evidence, or an explicitly approved scheduled rehearsal before client access.
- Visual responsive review and defect register with no open P0/P1.

The supported automated browser could not start on the current Windows host because the browser sandbox was rejected by an ACL error. This is a test-tool limitation, not an observed Cloud Run application error. Interactive visual/persona evidence must therefore be completed from an approved working browser environment.

## 5. Next Decision Point

Re-run hosted smoke immediately after the configuration-only revision. If health reports `hosted-uat` with zero blockers, proceed to the authenticated persona and operational evidence matrix. Gate 7 closes only after all required evidence passes.
