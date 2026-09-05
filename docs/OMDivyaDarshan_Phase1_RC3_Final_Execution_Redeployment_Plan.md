# OMDivyaDarshan Phase-1 RC3 - Final Execution and Redeployment Plan

**Plan date:** 5 September 2026

**Release name:** `RC3 - Hosted Reliability and Operations Hardening`

**Target tag:** `phase1-uat-rc3`

**Status:** `SCOPE FROZEN - PLANNING COMPLETE - IMPLEMENTATION NOT STARTED`

**Authority:** Temporary synthetic UAT only; no production authority and no real customer data.

## 1. Executive Decision

RC3 will stabilize the primary Kundli/Guruji workflow, add bounded operational visibility and notifications, improve admin usability, add Hero Slide image-only rendering, and then redeploy the same controlled Cloud Run UAT environment for Gate 7.

Nothing outside this document enters RC3. New requests go to the post-RC3 backlog unless they fix a P0/P1 defect preventing the frozen acceptance path.

RC2 does not require a separate hosted deployment. RC3 will start from the current branch containing the certified RC2 navigation correction, and RC3 will carry that correction into the next hosted revision.

## 2. Verified Starting State

| Item | Current state |
| --- | --- |
| Hosted application | RC1 is reachable at the existing Cloud Run UAT URL |
| Hosted public smoke | Passed for Shop, Membership, Kundli, Asthi and active festivals |
| Hosted readiness blocker | `/api/health` reports `target=local-uat`; Cloud Run must use `APP_ENV=staging` |
| RC2 application change | Commit `2e644d1806dddd5f44ac9f7700b42448230d0158`; full local certification passed |
| RC2 tag | Annotated local tag exists; it does not need a separate deployment if RC3 supersedes it |
| Admin navigation | RC2 exposes all role-authorized modules and labels non-core entries `Extended` |
| Notifications | `/admin/notifications` computes alerts on page load; no persisted recipient/read state |
| Operational logging | `AuditLog` exists; no separate System Event model/view exists |
| Error handling | No route `error.tsx` or global error boundary exists |
| Hero Slides | Existing template fields only; no image-only banner type |
| Private storage | Existing keyless GCS workflow is for synthetic Kundli PDFs only |
| Public image upload | Deferred; WordPress Media Library URL workflow remains in force |

The working tree contains a user-supplied untracked deployment-runbook PDF. It must be preserved and explicitly classified before the RC3 clean-tree checkpoint; it must not be silently deleted or included in the application candidate.

## 3. Frozen RC3 Scope

RC3 contains exactly these seven implementation workstreams:

1. Kundli private PDF upload and report-review transition reliability.
2. Phase-1 error handling, recovery UI and safe error references.
3. Persisted operational System Events.
4. Persisted in-app Admin/Guruji notifications.
5. Accessible accordion admin navigation carrying the RC2 complete role-aware menu.
6. Responsive Admin/Guruji layouts and internally scrolling tables.
7. Hero Slide `IMAGE_ONLY` and `TEMPLATE` modes.

RC3 also includes the tests, additive migrations, release metadata, documentation and deployment evidence strictly required to certify those items.

## 4. Explicitly Excluded

- OMD Media Library, `/admin/media`, public GCS media bucket, Cloudinary, or direct image upload.
- WebSockets, push notifications, email, WhatsApp or SMS delivery.
- Razorpay production settlement, PayPal production, refunds or reconciliation automation.
- Full ecommerce, marketplace, courier or vendor expansion.
- Production infrastructure, real customer/Guruji data, or production storage migration.
- General redesign of public pages.
- Refactoring every legacy server action. Shared protection will cover all surfaces, while detailed business recovery is limited to the locked Phase-1 critical actions.

Public images continue through `WordPress Media Library -> public URL -> OMD image field`. The private Kundli bucket must never be used for banners or product images.

## 5. Execution Gates

### RC3-00 - Baseline, evidence and reproduction

Entry: RC2 code and certification are present.

Actions:

1. Preserve and classify the untracked deployment PDF.
2. Create the RC3 working branch from the current verified state; do not move RC1/RC2 tags.
3. Capture the current hosted Cloud Run revision, immutable image digest, environment-variable names, runtime service account, traffic split and health response without exposing secret values.
4. Capture the existing Cloud SQL migration status and named pre-change snapshot.
5. Reproduce the private PDF upload failure and `Mark Report Ready for Admin Review` failure using one synthetic assigned Kundli record.
6. Record route, persona, order/document identifiers, expected/actual state, server error reference/log, storage response and before/after database state.

Exit:

- Both failures are reproducible or supported by sufficient hosted evidence.
- No real data is used.
- Exact failing state transitions and partial-write risk are understood.
- The repository baseline is explicit and unrelated user files are protected.

### RC3-01 - Kundli/Guruji critical reliability

Implement one authoritative report transition service for:

```text
Assigned -> In preparation -> PDF uploaded -> Awaiting admin review
         -> Correction requested -> Replacement uploaded -> Awaiting review
         -> Approved -> Customer-visible delivery -> Completed
```

Requirements:

- Enforce active assignment ownership and tenant isolation for every Guruji operation.
- Validate PDF MIME, signature, size and storage configuration before committing business state.
- Upload with an opaque private object key; never store or log signed URLs.
- Make upload metadata, report version, status history, audit entry and notification/event creation transactionally consistent where possible.
- Compensate by deleting an uploaded object if the subsequent database transaction fails.
- Do not advance review status without a valid current uploaded report.
- Make repeated submit/retry operations idempotent.
- Ensure a failed action leaves the previous report/order state intact.
- Convert expected validation/storage/permission failures into safe actionable results rather than broken pages.

Required negative evidence:

- invalid PDF; renamed non-PDF; oversized PDF;
- submission without current upload; duplicate/repeated submission;
- another Guruji's Kundli; unauthenticated/unauthorized user;
- simulated storage write/read/sign failure;
- expired signed download URL;
- database failure after storage upload, proving compensation and no partial status transition.

Exit: the complete Kundli report loop and every listed failure pass locally with deterministic cleanup.

### RC3-02 - Error handling and recovery foundation

Add:

- root/global unexpected-error fallback;
- Admin, authenticated Customer and public route error boundaries;
- explicit permission-denied and not-found presentation;
- shared safe error-reference generator such as `OMD-KND-XXXXXX`;
- sanitized server-side error recording;
- `Retry`, `Back` and appropriate safe destination controls;
- consistent action-result handling for the RC3 Kundli, Membership and selected Commerce critical actions.

Rules:

- Business validation messages explain what the user can correct.
- Unexpected failures show `Something went wrong`, confirm that no completed change is being claimed, and show only the safe reference.
- Raw stack traces, object keys, signed URLs, secrets, request headers and personal Kundli data never reach the UI or event metadata.
- Error boundaries do not convert authorization denials into generic server errors.

Exit: deliberate Phase-1 failures render recoverable UI and correlate to a sanitized System Event without leaking technical or personal data.

### RC3-03 - Operational System Events

Create an additive Prisma migration and `/admin/system-events`.

Minimum event data:

- tenant, timestamp, severity (`SUCCESS`, `WARNING`, `ERROR`);
- module, action and safe outcome message;
- actor ID and role snapshot where available;
- entity type/ID where safe;
- error reference/correlation ID;
- sanitized metadata JSON;
- optional linked audit-log ID.

Indexes must support tenant/date, tenant/severity/date, module/action and error-reference filters.

The view supports result, module, actor role, date and error-reference filters. Access is limited to Super Admin and Operations Admin. Audit Log remains the accountability record; System Events represents runtime/operational outcomes.

Transaction rule:

- Success events are written with the successful business transaction when consistency is required.
- Failure events are recorded after rollback in a separate safe write.
- Failure to record an event must not change a successful business outcome, but it must reach platform logging.

Exit: meaningful success/warning/failure cases are filterable and contain no prohibited data.

### RC3-04 - Persisted in-app notifications

Replace the computed-only notification shell with persisted, role-aware notifications while retaining useful computed operational summaries where appropriate.

Minimum notification data:

- tenant and recipient user;
- type, title, safe message and destination;
- source module/entity/event;
- deduplication key;
- created, read and archived timestamps.

Implement:

- Admin/Guruji notification bell and unread count;
- notification centre with unread/read state;
- mark one and mark all read;
- safe click-through to the authorized record;
- server-render refresh plus modest polling; no WebSockets;
- deduplication for retried/idempotent actions;
- recipient and tenant isolation.

Required events include Kundli assignment, report submission, correction, replacement, approval and approaching due date. Admin operational notifications also include new order, membership activation, low stock and failed actions requiring attention when those state changes occur within the RC3 critical paths.

Exit: the Kundli correction loop produces the correct Admin/Guruji notifications exactly once, and another user cannot read or mutate them.

### RC3-05 - Admin/Guruji usability

#### Accordion navigation

- Carry forward RC2's complete role-authorized navigation.
- Organize Command Center, Kundli Operations, Commerce, Membership and Customers, Merchandising, Fulfilment, Finance, Insights, System and Extended groups.
- Automatically open the group containing the current route.
- Keep Extended collapsed by default unless the current route belongs to it.
- Preserve the restricted Guruji `My Work` navigation.
- Use accessible buttons, keyboard operation, `aria-expanded` and visible focus states.

#### Responsive behavior

- Reduce sidebar width, content padding, gaps and grid density progressively.
- Use an accessible drawer/compact navigation at smaller breakpoints.
- Make wide tables scroll inside their panels instead of cropping the entire page.
- Prevent horizontal page overflow at desktop, small laptop, landscape/portrait tablet and phone widths.
- Prioritize Kundli queue, Guruji work, report review, notifications and critical admin forms.

Exit: role menus and critical workflows pass visual checks at the agreed viewport matrix with no hidden action or page-level horizontal crop.

### RC3-06 - Hero Slide banner modes

Use an additive/backward-compatible migration:

- add `HeroSlideBannerType` with `TEMPLATE` and `IMAGE_ONLY`;
- default all existing slides to `TEMPLATE`;
- make CTA label requirements mode-aware;
- reuse the existing primary destination URL as the optional full-banner destination unless implementation evidence requires a dedicated field.

`IMAGE_ONLY` renders only the responsive desktop/mobile image and optional full-banner link. It renders no text, button, card, overlay, gradient, mask or tint. It must retain meaningful alt text and keyboard-accessible linking.

`TEMPLATE` preserves existing behavior and appearance.

The admin form must clearly switch fields and validation by mode. Images remain public URLs copied from WordPress Media Library.

Exit: both modes render correctly across the viewport matrix; existing slides remain unchanged after migration.

### RC3-07 - Release metadata and complete local certification

Add non-sensitive release identification to hosted readiness:

- `RELEASE_ID=phase1-uat-rc3`
- `RELEASE_SHA=<exact candidate commit>`

Hosted readiness must require valid release metadata and may expose only these non-sensitive values through `/api/health` so the deployed revision can be tied to the frozen candidate.

Run:

- Prisma validate and migration status;
- additive migration upgrade rehearsal on a copy/synthetic database;
- persisted Kundli, Membership, Festival Commerce and role-matrix UAT;
- System Event and notification persistence/isolation tests;
- error-boundary/action failure tests;
- Hero template/image-only rendering tests;
- responsive navigation/component tests;
- full regression, TypeScript, ESLint and optimized production build;
- tracked-secret scan and dependency audit.

No P0/P1 defect may remain. Any schema, code, dependency, seed or runtime-contract change after this point invalidates the candidate and requires a new tag plus proportional recertification.

Exit: one exact clean commit has a complete evidence record and is eligible for `phase1-uat-rc3`.

## 6. Freeze and Publication Procedure

1. Confirm the candidate contains only approved RC3 files plus explicitly approved documentation.
2. Confirm a clean Git working tree; do not stage the unrelated deployment PDF without an explicit decision.
3. Record exact commit SHA, migration aggregate, schema, seed, lockfile and runtime-contract SHA-256 checksums.
4. Create annotated immutable tag `phase1-uat-rc3` containing the candidate SHA and aggregate checksums.
5. Verify the local tag resolves to the candidate.
6. Obtain explicit approval for the configured Git remote, then push only the required candidate/tag.
7. Verify the remote annotated-tag object and peeled candidate commit match locally.
8. Never move or recreate the RC3 tag. A correction becomes RC4 or `rc3.1` only through an explicitly approved naming decision.

## 7. Same-Service Cloud Run Redeployment

Do not create a new Cloud Run service, database, bucket or GCP project.

### Pre-deployment

1. Record the current serving revision, traffic, image digest and rollback revision.
2. Record a redacted configuration manifest containing environment/secret names but no values.
3. Create and name a Cloud SQL pre-migration snapshot/backup.
4. Validate the approved runtime service account and keyless GCS permissions.
5. Build the RC3 container once from the exact tag and record its immutable image digest.
6. Run migrations through a controlled one-off job/process before application traffic; do not run competing migrations in every application instance.

### Mandatory hosted configuration

- `APP_ENV=staging`
- correct HTTPS `APP_BASE_URL`
- `PHASE1_UAT_MODE=true`
- unique 32+ character `SESSION_SECRET` from Secret Manager
- private Cloud SQL `DATABASE_URL` from Secret Manager
- `STORAGE_DRIVER=gcs`
- approved temporary `GCS_PROJECT_ID` and private `GCS_PRIVATE_BUCKET`
- keyless runtime identity; no JSON service-account key
- `KUNDLI_REPORT_SIGNED_URL_TTL_SECONDS=600`
- `RAZORPAY_MODE=test`, `PAYPAL_MODE=sandbox`
- `WALLET_ENABLED=false`
- `RELEASE_ID=phase1-uat-rc3`
- exact `RELEASE_SHA`
- synthetic-seed switch disabled during normal operation

### Deployment

1. Deploy the immutable RC3 image digest to the existing `omd-phase1-uat` service with zero traffic if the platform workflow supports it.
2. Run revision-specific health/smoke checks.
3. Require HTTP 200 from `/api/health` with `target=hosted-uat`, database `ok`, zero blockers and exact RC3 release metadata.
4. Verify private GCS upload/sign/download/delete with a synthetic PDF and cleanup.
5. Shift traffic to the RC3 revision only after the pre-traffic checks pass.
6. Record the final revision name, image digest, service account and traffic allocation.

### Immediate rollback triggers

- health is not HTTP 200 or reports the wrong target/release;
- database migration failure/drift;
- login/session failure;
- private storage or signed access failure;
- cross-user/role data exposure;
- Kundli report transition failure;
- unexplained elevated error rate or P0/P1 defect.

Application rollback routes traffic to the retained prior revision. Because RC3 migrations must be additive/backward compatible, the prior application should remain runnable. Restore the database snapshot only for proven data corruption after writes are stopped and evidence is preserved.

## 8. Hosted Gate 7 UAT Matrix

### Public

- Shop/home, template and image-only heroes, festivals/products, Membership, Kundli and Asthi handoff.
- Desktop, small laptop, tablet landscape/portrait and phone.

### Customer

- signup/login, dashboard, membership, cart, test checkout, order tracking, Kundli submission/tracking and secure approved-report download.
- safe validation, permission, not-found and unexpected-error recovery.

### Guruji

- restricted login/navigation, notification bell, assigned work only, preparation, private upload, review submission, correction, replacement and completion.

### Admin

- accordion/full authorized navigation, notifications, customer/member visibility, assignment, report review/correction/approval, orders, inventory, merchandising, Audit Logs and System Events.

### Security negatives

- Customer denied Admin.
- Guruji denied another Guruji's work and unrestricted administration.
- Product role denied Kundli operations.
- Support role denied restricted modification.
- Unauthenticated protected routes denied.
- Notification and System Event tenant/recipient isolation.
- No signed URL, object key, secret, PDF content or sensitive birth data in UI errors/log metadata.

### Operations

- health/release metadata, Cloud SQL migration/snapshot evidence, GCS identity and cleanup, event/error correlation, notification polling, prior-revision rollback and post-rollback smoke.

Gate 7 closes only when all mandatory rows pass, the defect register has no P0/P1, and interactive browser/persona evidence is attached. Only then may the project declare `READY FROM OUR SIDE - CLIENT UAT`.

## 9. Work Order and Dependencies

```text
RC3-00 reproduce and baseline
        |
RC3-01 Kundli transactional fix
        |
RC3-02 error/result foundation
        |
RC3-03 System Events
        |
RC3-04 notifications
        |
RC3-05 navigation/responsive  +  RC3-06 Hero modes
        \___________________________/
                      |
RC3-07 full certification
                      |
freeze/tag/publish -> same-service deploy -> Gate 7 hosted UAT
```

RC3-05 and RC3-06 may be developed in parallel only after the shared schema/error contracts are stable. Database migration ownership remains single-threaded.

## 10. Ownership

| Responsibility | Accountable owner |
| --- | --- |
| Scope/change control and final go/no-go | Product Owner / Project Manager |
| Kundli state, storage, errors, events, notifications and migrations | Application engineering |
| Navigation, responsive UI and Hero modes | Frontend/application engineering |
| GCP project, Cloud Run, Cloud SQL, Secret Manager, runtime identity and rollback | UAT cloud operator |
| Persona scripts, defects and retest evidence | QA/UAT coordinator |
| Synthetic Guruji/Admin operational validation | Business operations representatives |

One person may hold multiple roles, but every evidence row must identify who executed and who accepted it.

## 11. Effort Projection

Planning range for one experienced engineer plus UAT/cloud support:

| Work | Likely effort |
| --- | ---: |
| Baseline/reproduction | 0.5-1.0 engineer-day |
| Kundli critical reliability | 1.5-3.0 |
| Error/recovery foundation | 1.0-2.0 |
| System Events and migration | 1.5-2.5 |
| Notifications and migration | 1.5-2.5 |
| Accordion/responsive UI | 1.5-2.5 |
| Hero modes and migration | 0.75-1.5 |
| Integrated certification/fixes | 1.0-2.0 |
| Cloud redeployment and hosted Gate 7 | 1.0-2.0 plus stakeholder availability |

Likely total: approximately 11-19 engineer-days. This is an evidence-based range, not a calendar promise. Storage/identity access, reproducibility of hosted errors, migration findings and UAT stakeholder availability are the main schedule risks.

## 12. Final Definition of Done

RC3 is complete only when:

- the critical Kundli report loop and failures are safe, atomic and understandable;
- System Events and recipient-isolated notifications work without sensitive-data leakage;
- all authorized backend navigation is discoverable and responsive;
- Hero image-only/template modes are verified;
- complete local certification passes on one immutable candidate;
- the same existing UAT service runs that exact image/tag with `APP_ENV=staging` and correct release metadata;
- private GCS and Cloud SQL evidence passes;
- hosted persona, security, responsive and rollback UAT passes;
- no P0/P1 remains;
- Gate 7 evidence is signed off.

After RC3/Gate 7 passes, the next separately approved scope may cover final client data/content and RC4 OMD Media Library. Neither begins before this hosted cycle is stable.
