# OMDivyaDarshan Phase-1 Gate 1 - KND-IMP-03 UAT Evidence

**Evidence date:** 4 September 2026
**Gate:** Kundli private report storage and signed-download closure
**Status:** CLOSED
**Environment:** Temporary synthetic UAT only; not production infrastructure
**Working branch:** `phase1-uat`

## Scope

This gate closes the remaining external validation gap for KND-IMP-03. The implemented storage adapter successfully used a real private Google Cloud Storage bucket through a keyless, least-privilege identity.

This is not production provisioning or approval to use real customer data. The existing `teoram-web` Cloud Run service belongs to another application and was not modified.

## Authorized UAT Resources

| Resource | UAT value |
| --- | --- |
| GCP project | `teoram-5944f` |
| Private report bucket | `teoram-5944f-omd-kundli-reports-uat` |
| Bucket region | `asia-south1` |
| Runtime identity | `omd-kundli-uat@teoram-5944f.iam.gserviceaccount.com` |
| Custom IAM role | `projects/teoram-5944f/roles/omdKundliReportUat` |
| Authentication | User ADC to short-lived service-account impersonation; no service-account key |

## Least-Privilege Design

The custom role contains exactly four permissions:

- `storage.buckets.get`
- `storage.objects.create`
- `storage.objects.get`
- `storage.objects.delete`

The role is bound only on the approved bucket. The runtime identity can sign as itself through `roles/iam.serviceAccountTokenCreator`. The UAT operator can impersonate only this dedicated identity for local validation.

Confirmed restrictions:

- User-managed service-account keys: `0`
- `storage.objects.list`: not granted; live negative test returned permission denied
- Bucket uniform access: enabled
- Bucket public-access prevention: enforced
- Live synthetic objects after cleanup: `0`

## Real GCS Integration Proof

The opt-in test `lib/kundli-report-storage.gcs-uat.test.ts` ran against the real bucket with `RUN_GCS_KUNDLI_UAT=true`.

| Step | Result |
| --- | --- |
| Generate a synthetic PDF with no customer information | PASS |
| Validate PDF signature, MIME type, safe name, and size | PASS |
| Generate an opaque tenant/order/version object key | PASS |
| Enforce private bucket security metadata | PASS |
| Upload through the application adapter with CRC32C validation | PASS |
| Read exact PDF metadata and byte size | PASS |
| Create a V4 HTTPS URL using keyless IAM signing | PASS |
| Download immediately with HTTP 200 and verify exact bytes | PASS |
| Verify attachment content type and filename | PASS |
| Reject the same URL after its eight-second lifetime | PASS |
| Delete the synthetic object and confirm not found | PASS |

The signed URL and its signature were never printed or stored in project documentation.

## Application Regression Evidence

| Check | Result |
| --- | --- |
| Focused real-GCS UAT | PASS - 1/1 |
| Full Vitest suite | PASS - 18 files, 80 tests |
| Real-GCS test in normal runs | SKIPPED BY DEFAULT - explicit opt-in required |
| TypeScript | PASS |
| Full ESLint | PASS |
| Next.js production build | PASS - 77/77 pages generated |
| Service-account key audit | PASS - zero user-managed keys |
| Least-privilege negative listing test | PASS - denied as designed |
| Synthetic cleanup audit | PASS - zero live objects |

Existing coverage verifies Guruji ownership, admin review/correction, customer visibility only after approval, rejected cross-user access, immutable report versions, and secure route behavior.

## Closure Decision

KND-IMP-03 is `LIVE-UAT VALIDATED` and `CLOSED` for the locked Phase-1 synthetic UAT scope.

The dedicated identity and custom role may remain only for temporary UAT. They must not be relabeled as production resources. Production requires an OMD-owned project, production bucket and identity, secrets/configuration, retention policy, observability, backup/restore procedure, and a separate security review.

## Next Execution Step

Proceed to membership cross-module UAT: activation, entitlement state, checkout enforcement, order/payment/account projection, admin visibility, expiry/cancellation behavior, and negative access cases using provisional synthetic membership packages.
