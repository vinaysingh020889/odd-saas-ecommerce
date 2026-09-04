# OMDivyaDarshan Phase-1 UAT Operations and Rollback Runbook

**Scope:** Synthetic local and temporary hosted client UAT only
**Production authority:** None

## 1. Release Boundary

The candidate contains only Kundli/Guruji operations, provisional Membership, selected active Festival Hampers, the required dashboards/admin surfaces, and the Asthi external-form handoff. Mock payments are UAT-only. Real customer data, public production traffic, real payment settlement, production storage, notifications, and production policies are prohibited until separately approved.

## 2. Required Configuration

- Local development starts from `.env.example`.
- Temporary hosted UAT starts from `.env.uat.example` with secrets supplied by the hosting secret manager.
- `APP_ENV=staging`, `PHASE1_UAT_MODE=true`, HTTPS `APP_BASE_URL`, a unique 32+ character `SESSION_SECRET`, PostgreSQL, private GCS settings, and `WALLET_ENABLED=false` are mandatory for hosted UAT.
- `ASTHI_APPLICATION_URL` may remain absent for client UAT; the UI must show the explicit pending state.
- No service-account JSON key is permitted. GCS authentication remains keyless.

## 3. Synthetic Data Provisioning

The repository seed is prohibited when `APP_ENV=production`. For a new temporary hosted-UAT database:

1. Set `ALLOW_SYNTHETIC_SEED=true` only for the seed command.
2. Supply a unique 16+ character `SYNTHETIC_UAT_PASSWORD` through the secret manager.
3. Run migrations, then `npm run prisma:seed`.
4. Immediately restore `ALLOW_SYNTHETIC_SEED=false` and restart the application.
5. Share UAT credentials only through an approved private channel.

Never use the local passwords documented in the development README on a hosted environment.

## 4. Migration Procedure

1. Record the candidate commit and the complete migration-directory checksum or artifact.
2. Create and identify a provider snapshot/backup before any hosted migration.
3. Run `npx prisma validate`.
4. Run `npx prisma migrate status`; investigate drift or failed migrations before proceeding.
5. Run `npx prisma migrate deploy` against the temporary hosted-UAT database.
6. Run `npx prisma migrate status` again and require `Database schema is up to date`.
7. Start the application and require `/api/health` to return HTTP 200.

No destructive schema reset, `migrate dev`, or manual table editing is permitted on hosted UAT.

## 5. Local Certification

Run:

```text
npm run phase1:certify
```

This validates schema/migration status, executes the persisted Membership, Festival Commerce and Role Matrix UATs plus the Kundli critical suites, runs the full regression, TypeScript, ESLint, and creates the production build. The real-GCS report UAT remains separately controlled by `RUN_GCS_KUNDLI_UAT=true` and the previously approved keyless identity.

## 6. Smoke and Persona Rehearsal

Require HTTP 200 and expected Phase-1 content from `/api/health`, `/shop`, `/membership`, `/kundli`, `/services/asthi-visarjan`, and an active `/festivals/[slug]` page.

Persona responsibilities:

- Customer: discover a selected hamper, activate/inspect membership, complete a mock purchase, create and track Kundli, and see only owned records.
- Guruji: enter `/admin/my-work`, see only assigned Kundli work, upload/review through the approved report path, and never access admin-wide queues.
- Product Manager: manage selected products, categories, inventory, festival campaigns, promotions, and offers; no operations/payment access.
- Support Agent: search and view customer-support context; no catalog/payment/assignment control.
- Operations Admin: operate Kundli queues, memberships, selected orders/payments, customers, audit, and fulfilment.

## 7. Manual Operations During UAT

- Payments stay visibly mock/manual; no financial settlement is implied.
- Outbound email, WhatsApp, and SMS are absent. The UAT coordinator records required contact actions and communicates out-of-band.
- Do not upload real Kundli or customer documents. Use synthetic PDFs and synthetic identities only.
- Record defects with persona, route, synthetic record identifier, expected result, actual result, severity, owner, and retest evidence.
- Stop UAT for any P0 data exposure, cross-role access, destructive migration, or credential leak.

## 8. Rollback

Application rollback:

1. Keep the previous immutable deployment available until candidate smoke checks pass.
2. On application failure, route traffic back to that deployment; do not rewrite Git history.
3. Verify `/api/health`, login, Shop, Membership, Kundli, Asthi handoff, and admin entry after rollback.

Database rollback:

1. Prefer a forward corrective migration when data remains valid.
2. If a migration or seed corrupts UAT data, stop writes and preserve logs.
3. Restore only from the named pre-migration provider snapshot into a new database/instance.
4. Verify migration status and synthetic record counts before reconnecting the application.
5. Never reverse SQL manually without an reviewed recovery plan.

The current workstation does not provide `pg_dump`/`pg_restore`; therefore database restore evidence must come from the selected hosted PostgreSQL provider before any real-data production launch.

## 9. Decision Rules

- Gate 6 local pass: no P0/P1 defect; certification command, migration status, health, security headers, synthetic cleanup, and rendered smoke checks pass.
- Gate 6.5 release-candidate freeze: exact commit, migrations, seed behavior, and hosted-UAT environment contract are tagged/frozen.
- Gate 7 client-UAT readiness: the exact candidate is deployed to temporary UAT and hosted smoke/critical paths pass.
- Production launch remains blocked until real payments or approved manual mode, production-owned storage/identity, final data/content/policies, monitoring, backup/restore evidence, notifications/manual SOP, security hardening, and owner sign-off are complete.

## 10. Current Decision

Gate 6 closed on 4 September 2026. The complete local certification command and rendered runtime smoke passed with no observed P0/P1 defect. Proceed to Gate 6.5 release-candidate freeze; do not issue the client-UAT readiness declaration until Gate 7 hosted evidence passes.
