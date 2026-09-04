# OMDivyaDarshan Phase-1 Gate 6.5 - RC1 Freeze Manifest

**Freeze date:** 4 September 2026  
**Release identifier:** `phase1-uat-rc1`  
**Candidate commit:** `1a935666385ee407de42e22fa60240fecee65339`  
**Candidate branch at freeze:** `phase1-uat`  
**Scope:** Temporary synthetic hosted UAT only  
**Status:** `LOCALLY FROZEN - REMOTE TAG PUBLICATION REQUIRES EXPLICIT APPROVAL`

## 1. Freeze Verification

- The working tree was clean when the candidate was frozen.
- The annotated tag `phase1-uat-rc1` resolves exactly to the candidate commit above.
- The tag annotation contains the migration and configuration aggregate checksums.
- Gate 6 certification passed on this exact commit.
- This manifest is a documentation-only governance record created after the tag. It is not part of the RC1 application artifact and does not alter the frozen candidate.

The configured remote is `origin` at `https://github.com/vinaysingh020889/odd-saas-ecommerce`. Remote tag publication was not performed because explicit authorization to export the tag and referenced repository contents to that destination is required.

## 2. Migration Freeze

| Item | Frozen value |
| --- | --- |
| Migration directories | 40 |
| Tracked migration files | 41 |
| Aggregate SHA-256 | `05241efbcee0e125bd63b9bd777d0b8c31423ceda50e554c06ac1e3ca114fa4e` |

The aggregate is SHA-256 over a UTF-8 manifest containing each migration file's lowercase SHA-256 and normalized relative path, sorted by path and terminated by a newline.

## 3. Runtime and Configuration Freeze

| File | SHA-256 |
| --- | --- |
| `.env.uat.example` | `80ae9e93d62097945cc76ab77e6798cd52b8ab225f50a6cddc961521fd54cde3` |
| `.nvmrc` | `d163649b204e0ea27669c9feccac0c6b82a8263cef38b745f0383fdb6530abe0` |
| `next.config.ts` | `b8b9f7a6e3c4e453f3afcb55ba98631c945346c47dd606d9abea38859ac321be` |
| `package-lock.json` | `9c7bf4bd099097c3cab2bd54443699d6fbe074b4ef412fc9b43db3bd24584f07` |
| `package.json` | `f2108e260e164fd97c087c523eadbc645a47726660df3efd83439db31e73ab6c` |
| `prisma/schema.prisma` | `17d22caef07c63491ef785b4e99171c1dbdab222a5eef266d3c0a4fbb55afb09` |
| `prisma/seed.ts` | `08f8761eef1b3b74fd1062e2ae4e34ced11597bcf8b7bf3fd93e4ba8c5968b18` |
| `scripts/phase1-local-certify.mjs` | `642d57a83dde2aadb0a86144061f1d3f5715f758f58991b2570b52fe3121f1dc` |

Configuration aggregate SHA-256: `1a08e0999b788daf92411359c412bbc737825c6eaf7717157f7b509e5254c864`.

## 4. Hosted-UAT Contract

Required application configuration:

- `APP_ENV=staging`
- HTTPS `APP_BASE_URL`
- approved WordPress base URL or an explicitly recorded temporary value
- private hosted `DATABASE_URL`
- unique, non-placeholder `SESSION_SECRET` of at least 32 characters
- `PHASE1_UAT_MODE=true`
- `RAZORPAY_MODE=test` and `PAYPAL_MODE=sandbox`
- `STORAGE_DRIVER=gcs`, approved temporary `GCS_PROJECT_ID`, and private `GCS_PRIVATE_BUCKET`
- keyless GCS signing identity only; no service-account key files
- `KUNDLI_REPORT_SIGNED_URL_TTL_SECONDS=600`
- `WALLET_ENABLED=false`
- `ASTHI_APPLICATION_URL` may remain empty only with the tested pending state and a recorded client dependency

Synthetic provisioning controls:

- no real customer, Guruji, order, membership, or Kundli data;
- `ALLOW_SYNTHETIC_SEED=true` only for the one-time seed command;
- unique `SYNTHETIC_UAT_PASSWORD` supplied out of band and never committed;
- restore `ALLOW_SYNTHETIC_SEED=false` before normal operation.

Infrastructure contract:

- Node.js 20.19 or newer;
- HTTPS temporary application host;
- private PostgreSQL with a named pre-migration provider snapshot;
- the already approved temporary GCP project and private Kundli-report bucket;
- minimum-permission keyless identity and no service-account keys;
- immutable deployment of the tagged commit;
- `/api/health` must return HTTP 200 after migration and startup;
- previous immutable deployment retained for application rollback;
- provider snapshot restore procedure available for database recovery.

The temporary GCP storage boundary was previously validated under Gate 1. The hosted application, HTTPS URL, PostgreSQL instance, and secret values are deployment inputs and are not claimed as provisioned by this freeze.

## 5. Post-Freeze Change Control

- Do not move or recreate `phase1-uat-rc1` at another commit.
- Do not add application features to RC1.
- Any code, schema, migration, dependency, runtime configuration, or seed change creates a new candidate such as `phase1-uat-rc2` and requires proportional Gate 6 recertification.
- A P0/P1 defect blocks deployment or client UAT. Fix it on a new commit and issue a new RC tag.
- Client-owned content or environment values must be recorded in the hosted-UAT evidence; they must never introduce secrets into Git.
- Deploy Gate 7 from the tag, not from a moving branch name.

## 6. Remaining Gate 6.5 Action

After the repository destination is explicitly approved, publish only `refs/tags/phase1-uat-rc1` to `origin` and verify that the remote tag resolves to the frozen candidate commit. Then Gate 6.5 can be marked fully closed and Gate 7 deployment can begin.
