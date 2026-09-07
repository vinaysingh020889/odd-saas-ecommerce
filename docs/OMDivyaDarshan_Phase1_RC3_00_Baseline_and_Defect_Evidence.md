# OMDivyaDarshan Phase-1 RC3 — Baseline and Defect Evidence

**Status:** Execution evidence — RC3-00  
**Captured:** 07 September 2026  
**Repository baseline:** `3fe29046ba97dd815396f674984a80b549abdbcd` on `phase1-uat`

## 1. Scope and evidence classification

This record starts the locked RC3 execution. It distinguishes verified repository/runbook facts from findings that still require hosted-log confirmation.

The supplied deployment runbook remains an untracked user artifact and is not part of an application commit:

- Path: `docs/OMDivyaDarshan_Phase1_UAT_Hosting_Deployment_Runbook_2026-09-05.pdf`
- Size: 397,448 bytes
- SHA-256: `cdfb700da3112e091faa27a39e32be37f26bb7224e285c60797f390973e17b61`

## 2. Verified hosted-UAT contract

| Concern | Verified value |
|---|---|
| GCP project | `omdivyadarshan-uat` |
| Cloud Run service | `omd-phase1-uat` |
| Region | `asia-southeast1` |
| Runtime identity | `omd-phase1-uat-runtime@omdivyadarshan-uat.iam.gserviceaccount.com` |
| Private Kundli bucket | `omdivyadarshan-uat-kundli-reports` |
| Storage driver | `gcs` |
| Bucket controls | Uniform access enabled; public access prevention enforced |
| Runtime object permissions | create, get, update, delete |
| Object-list permission | deliberately absent |
| Bucket-metadata permission | `storage.buckets.get` added and verified on 07 September 2026 |
| Hosted `APP_ENV` | `staging` on current revision `omd-phase1-uat-00003-xpk` |
| Seed data | synthetic UAT data only |

No service-account key is required or permitted. The existing keyless Cloud Run identity remains the required model.

## 3. PDF upload defect — evidence-backed root-cause hypothesis

`GcsKundliReportStorage.putObject()` calls `assertBucketSecurity()` before saving an object. That assertion calls GCS `Bucket.getMetadata()`. The deployed custom runtime role has object permissions but no `storage.buckets.get` permission.

Therefore the hosted upload is expected to fail before object creation with a GCS authorization error for bucket metadata. The server action currently catches the storage exception and returns only a generic upload failure, so the precise provider error is hidden from the UI.

**Classification:** repository and IAM-contract mismatch verified. Cloud Logging contains two matching failed POST requests (HTTP 500) from revision `omd-phase1-uat-00002-x82` at 19:29:18Z and 19:32:19Z on 04 September 2026. The application had not logged the swallowed provider exception, so the exact GCS 403 text was unavailable.

### Required correction

Keep object listing prohibited. Either:

1. add only `storage.buckets.get` to the custom runtime role because the application deliberately performs the bucket-policy assertion; or
2. move the policy assertion to a deployment/readiness gate and remove it from runtime object operations.

RC3 uses option 1. On 07 September 2026, only `storage.buckets.get` was added to `projects/omdivyadarshan-uat/roles/omdKundliReportObjectAccess`. The role was immediately re-read and verified to contain bucket metadata plus object create/get/update/delete only. Object listing remains absent; no key or public access was introduced.

## 4. Report-ready failure — verified workflow relationship

The `REPORT_READY` transition is correctly transactional and requires an active uploaded private PDF record. When the preceding GCS upload fails, no `OperationalDocument` is created. A subsequent report-ready action therefore rejects with “An attached internal Kundli report is required”.

The page currently binds forms directly to throwing server actions and has no action-level recovery presentation. A valid business rejection can consequently surface as a failed page/navigation instead of an inline, recoverable message.

**Classification:** state prerequisite and direct-throw behavior verified in code and existing tests. Hosted symptom remains part of the RC3 hosted retest.

## 5. Partial-write safety already present

The upload workflow already has useful safety boundaries:

- validates file type, signature and size before storage;
- checks current active primary assignment before upload;
- rechecks ownership/order state in the persistence transaction;
- supersedes the previous version and creates the new document atomically;
- attempts object deletion if database persistence fails.

RC3 must preserve these properties while adding an operator-visible error reference and reliable recovery UI.

## 6. RC3-01 acceptance boundary

RC3-01 is complete only when:

- the runtime storage authorization contract matches the application behavior;
- upload errors produce a safe message plus traceable error reference;
- report-ready validation returns recoverable inline feedback;
- no invalid order/document state is committed on failure;
- existing ownership, MIME/signature, size, versioning and compensation tests pass;
- focused regression tests cover the hosted permission mismatch and action failure behavior;
- hosted UAT confirms private upload, admin review transition, authorized download and denial paths.

## 7. Deployment corrections queued for Gate 7

- deploy the frozen RC3 tag to the existing `omd-phase1-uat` service;
- retain the verified `APP_ENV=staging` setting;
- retain synthetic data only, Secret Manager injection and the existing keyless runtime identity;
- do not create service-account keys;
- do not grant object listing or public bucket access;
- capture Cloud Run revision, image digest, environment contract and post-deploy smoke evidence.
