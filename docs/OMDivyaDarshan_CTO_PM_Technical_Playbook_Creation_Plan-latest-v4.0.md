# OMDivyaDarshan CTO/PM Technical Playbook - Creation Plan

**Status:** Approved execution backbone - Gates 0 through 6.5 closed; Gate 7 temporary hosted UAT next
**Plan date:** 3 September 2026
**Execution state:** Gate 0 baseline through Gate 6 local launch certification completed; the repository is eligible for release-candidate freeze but is not yet approved for hosted client UAT or production
**Purpose:** Define exactly how the final CTO/project-manager technical playbook will be researched, evaluated, written, verified, and delivered.

> This file is the approved planning blueprint, not the final technical playbook. Gate 0 execution and evidence are recorded in `docs/OMDivyaDarshan_Phase1_Gate0_Baseline.md`; the complete assessment and final document-generation work remain scheduled under this plan.

## 1. Planned Deliverables

After this plan is approved, create two synchronized deliverables:

- `docs/OMDivyaDarshan-CTO-PM-Technical-Playbook-2026-09-03.md`
- `docs/OMDivyaDarshan-CTO-PM-Technical-Playbook-2026-09-03.docx`

The Markdown file will be the maintainable technical source of truth. The polished DOCX will be the management and stakeholder version. Existing documents will remain unchanged and will be treated as historical inputs.

For this assessment, "line-by-line evaluation" means traceable coverage of every route, module, schema domain, migration, configuration surface, test suite, placeholder, mock integration, and known external dependency. It does not mean adding prose commentary to every physical source-code line.

## 2. Evidence and Evaluation Method

### 2.1 Assessment snapshot

Create a dated assessment snapshot containing:

- Git branch and current commit.
- Complete working-tree state, including committed, modified, and untracked work.
- Framework and package versions.
- Public, customer, admin, and API routes.
- Database models, enums, and migrations.
- Runtime and environment configuration contract.
- Deployment, hosting, CI/CD, and infrastructure assets.
- Automated test, TypeScript, ESLint, and production-build results.
- Available live-UAT and persisted-database evidence.

### 2.2 Evidence labels

Every evaluated capability will receive one evidence label:

- `COMMITTED`: Present in the current Git baseline.
- `WORKTREE`: Implemented in the current working tree but not safely committed as part of the current baseline.
- `AUTOMATED-VERIFIED`: Covered by passing automated verification.
- `LIVE-UAT`: Validated through the running application and persisted state.
- `EXTERNAL/UNVERIFIED`: Claimed or planned outside this repository but not independently verifiable from available evidence.

### 2.3 Maturity labels

Every capability will also receive one maturity label:

- `NOT STARTED`
- `SHELL`
- `IMPLEMENTED`
- `VALIDATED`
- `BLOCKED`
- `PRODUCTION READY`

No capability will be marked `PRODUCTION READY` unless its application behavior, infrastructure, security, live UAT, and operating procedure are all ready.

### 2.4 Evidence precedence

When sources conflict, use this order:

1. Current source and configuration.
2. Prisma schema and migrations.
3. Automated tests and build results.
4. Persisted/live-UAT evidence.
5. Existing documents as historical evidence of intent.

### 2.5 External-system rule

WordPress, Google Forms, DNS, production hosting, payment-provider approval, and any other unavailable system will be marked `EXTERNAL/UNVERIFIED`. The playbook must state the exact evidence required to verify each external claim.

## 3. Phase-1 Readiness Model

Use the following disclosed weighting for the locked Phase-1 objective:

| Workstream | Weight |
| --- | ---: |
| Kundli operations | 40% |
| Public ODD website and Asthi CTA | 15% |
| Festival hamper commerce | 15% |
| Membership | 15% |
| Production infrastructure, security, and operations | 15% |

Evaluate every workstream separately across:

- Business-definition readiness.
- Functional implementation.
- Automated and live verification.
- Production infrastructure and security.
- Operational launch readiness.

The playbook will show the supporting evidence beside every score so a percentage cannot conceal a production blocker.

## 4. Planned Playbook Structure

### 4.1 Document control and executive decision brief

- Assessment date, repository snapshot, source register, audience, and confidence boundaries.
- Documents superseded for current-state claims.
- One-page answer covering what exists, how ready it is, what blocks launch, and what leadership must decide.

### 4.2 Locked product direction and Phase-1 boundary

- WordPress as the public discovery, content, trust, and SEO layer.
- Next.js platform as the commerce, authenticated customer, Kundli, and admin engine.
- Asthi Visarjan directed to the existing external application process.
- Kundli as the primary operational workflow.
- Limited festival hampers and selected products instead of a complete ecommerce rollout.
- Membership-ready commerce and benefits.
- Explicitly deferred wallet, large marketplace expansion, courier automation, and unrelated modules.

### 4.3 Architecture and setup

- Next.js, React, TypeScript, Tailwind CSS, Prisma, and PostgreSQL architecture.
- Tenant model, Server Components, Server Actions, business-service boundaries, authentication, authorization, sessions, audit, and storage.
- Local setup, environment variables, migrations, seed process, validation commands, and runtime assumptions.
- Domain and deployment model.
- Missing CI/CD, production hosting, monitoring, and operational infrastructure.
- Data-flow diagrams for customer, Guruji, admin, database, and private storage interactions.
- Temporary Teoram UAT infrastructure versus the required OMD-owned production boundary.

### 4.4 Complete module-by-module assessment

Evaluate all of the following:

1. Authentication, users, sessions, roles, permissions, and restricted work.
2. Customer account, dashboard, addresses, and account activity.
3. Storefront, homepage, catalog, categories, product detail, media, reviews, wishlist, and search.
4. Festival campaigns, gift hampers, promotions, offers, merchandising, and recommendations.
5. Cart, checkout, orders, inventory, order requests, fulfilment, and payments.
6. Membership plans, benefits, rules, usage, gating, activation, upgrades, downgrades, and cancellation.
7. Kundli customer intake, payment state, assignment, queues, capacity, Guruji workspace, report review, versioning, delivery, access control, and audit.
8. Asthi Visarjan application and the revised external-form strategy.
9. General service bookings, capacity, queues, assignments, and rescheduling.
10. Operational documents, checklists, assignments, notifications, reporting, CRM, customer events, interest profiles, and audit logs.
11. Wallet/reward client and explicitly disabled or deferred behavior.
12. Public APIs and all external integration boundaries.

For every module, record:

- Business purpose.
- Users and owned routes.
- Data models and business services.
- Implemented functionality.
- Available automated and live evidence.
- Mock, placeholder, blocked, deferred, or external behavior.
- Production risks.
- Required next action.
- Accountable owner.
- Readiness conclusion.

### 4.5 Kundli technical and UAT deep dive

- Record KND-IMP-02 closure evidence for automatic assignment, queueing, manual assignment, reassignment, authorization, and customer-safe projection.
- Record KND-IMP-03 closure evidence for private GCS storage, PDF validation, immutable report versions, correction, approval, delivery, rejected access, keyless signing, URL expiry, and oversized-file rejection.
- Record the dedicated temporary UAT identity, exact least-privilege permissions, zero service-account keys, negative listing result, and synthetic-object cleanup.
- Record Membership Gate 2 lifecycle evidence for activation, renewal, upgrade, approved plan change, cancellation, limits, projections, and negative authorization cases.
- Label the current Teoram bucket `TEMPORARY UAT - NOT APPROVED OMD PRODUCTION STORAGE`.
- Prevent implemented behavior from being reported as production complete.

### 4.6 Technical governance and production readiness

Review:

- Security and route/action-level RBAC.
- Kundli birth data and sensitive-document handling.
- Tenant isolation.
- Secrets and workload identity.
- Audit completeness and retention.
- Database backup and restore.
- Monitoring, logging, alerts, and incident response.
- Rate limiting, bot protection, session security, and admin 2FA.
- Payment, webhook, refund, and reconciliation controls.
- Inventory and checkout concurrency.
- Product media and document storage.
- Data retention, privacy, consent, and compliance.
- Repository risks, including the large uncommitted implementation footprint.
- Framework/configuration risks, including duplicated Next.js configuration files.

### 4.7 Final readiness scorecard

- Capability-by-capability RAG matrix.
- Separate functional, verification, infrastructure, business-content, and operational-readiness scores.
- Clear conclusions for internal demonstration, controlled pilot, and real-customer production launch.
- Evidence and blockers shown beside every conclusion.

### 4.8 Execution projection and critical path

Prepare a gated execution plan:

1. **Gate 0 - Baseline and UAT surface freeze:** review, organize, validate, and commit the current working tree safely; expose only the locked Phase-1 surfaces in primary navigation without deleting deferred modules.
2. **Gate 1 - Kundli closure:** authorize keyless signing, close KND-IMP-03, and rerun final live UAT.
3. **Gate 2 - Provisional Membership closure:** prove synthetic plan activation, entitlement gating, renewal, upgrade, downgrade/cancellation review, limited benefits, account projection, admin visibility, expiry, authorization, and idempotency. The final client membership matrix and real payment remain external inputs.
4. **Gate 3 - Selected Festival commerce:** freeze a limited synthetic hamper/product catalog and verify discovery, inventory, pricing, cart, checkout, mock payment, order/account projection, and admin fulfilment without expanding into full ecommerce.
5. **Gate 4 - Dashboard and admin role matrix - CLOSED:** customer, Guruji, product, support, operations, and super-admin responsibilities, direct-route authorization, locked-surface filtering, persisted roles, and negative customer/cross-role projection boundaries passed synthetic local UAT. Evidence: `docs/OMDivyaDarshan_Phase1_Gate4_Dashboard_Admin_Role_Matrix_UAT.md`.
6. **Gate 5 - Public discovery and handoff verification - CLOSED:** Kundli, Membership, festival-limited Shop, festival campaign, Asthi external-URL handling, Phase-1 header/footer discovery, and rendered local destinations passed. Final client Asthi/WordPress URLs and content remain explicit inputs. Evidence: `docs/OMDivyaDarshan_Phase1_Gate5_Public_Discovery_Handoff_UAT.md`.
7. **Gate 6 - Local UAT and launch certification - CLOSED:** migration state, persisted critical paths, full regression, TypeScript, ESLint, optimized build, runtime health, security headers, content/configuration, synthetic-seed safety, and operations/rollback procedures passed or were explicitly bounded. Interactive visual rehearsal remains required in hosted UAT because the local browser sandbox was ACL-blocked. Evidence: `docs/OMDivyaDarshan_Phase1_Gate6_Local_UAT_Launch_Certification.md`.
8. **Gate 6.5 - Release candidate freeze - CLOSED:** published annotated tag `phase1-uat-rc1` resolves to Gate 6 commit `1a935666385ee407de42e22fa60240fecee65339`; local and remote tag objects match. Migration, dependency, schema, seed, runtime-configuration checksums and the hosted-UAT contract are recorded. Evidence: `docs/OMDivyaDarshan_Phase1_Gate6.5_RC1_Freeze_Manifest.md`.
9. **Gate 7 - Hosted UAT and client handoff:** deploy the frozen release candidate to explicitly temporary UAT infrastructure, run hosted smoke/critical-path UAT, and declare `READY FROM OUR SIDE - CLIENT UAT` only after the hosted evidence passes. Production infrastructure and hardening remain a separate launch dependency.

For every gate, include:

- Work packages.
- Dependencies.
- Owner.
- Entry criteria.
- Exit criteria.
- Evidence/artifacts.
- Optimistic, likely, and risk effort ranges in engineer-days.
- Calendar projection for one engineer and for two parallel workstreams.

### 4.9 Owner and leadership decision register

Capture required decisions for:

- Dedicated OMD cloud project, billing owner, and infrastructure access.
- Production OMD-owned keyless Kundli report signer authorization; temporary synthetic UAT authorization is complete.
- Hosting, DNS, and production-domain ownership.
- Membership tiers, prices, validity, benefits, and eligibility.
- Festival hamper SKUs, content, inventory, pricing, shipping, and tax.
- Payment gateway versus Gau/donation-coin purchase behavior.
- Razorpay/PayPal status and any approved manual-payment fallback.
- Asthi landing-page content and official Google Form URL.
- Manual versus automated email, WhatsApp, SMS, and support workflow.
- Privacy, refund, cancellation, fulfilment, SLA, and customer-support policies.

### 4.10 Technical appendices

- Complete public, customer, admin, and API route inventory.
- Prisma model and enum domain map.
- Migration chronology.
- Environment and configuration matrix.
- Automated test and scenario inventory.
- Mock, placeholder, and deferred-feature register.
- External-system evidence register.
- Risk register with probability, impact, mitigation, owner, and trigger.
- Requirements-to-code-to-test traceability matrix.
- Glossary and status definitions.

### 4.11 UAT surface-freeze rules

During Gate 0, primary navigation will be restricted as follows:

- Customer: Dashboard, Kundli, Membership, Shop/Hampers, Cart, Orders, and Account.
- Guruji: assigned Kundli work only.
- Admin: only the Phase-1 operational areas required for Kundli, membership, festival products/orders, customers, inventory, audit, and UAT support.
- Wallet, the internal Asthi workflow, unfinished Puja/vendor areas, and unrelated demo modules will be removed from primary UAT navigation but not deleted.

### 4.12 Mandatory membership integration scenarios

Membership closure must demonstrate:

- No membership: checkout is blocked or free-membership activation is requested.
- Free membership: checkout is permitted.
- Priority membership: the configured Kundli entitlement or priority rule is recognized.
- Eligible membership: configured SHOP/FESTIVAL benefits are evaluated; automatic checkout price mutation waits for the approved client package matrix.
- Usage-limited benefit: successful use changes the recorded usage and remaining allowance.

### 4.13 Mandatory external CTA checks

Before full Phase-1 client handoff, verify:

- WordPress Kundli CTA to the correct application route.
- WordPress Membership CTA to the correct membership route.
- WordPress Festival/Shop CTA to the selected hamper/shop route.
- Asthi CTA to the approved external/manual application route.

Unavailable final content or URLs must be recorded as client-owned external dependencies; no broken or misleading CTA may be presented as UAT-ready.

## 5. Document Production Workflow

1. Perform a fresh read-only repository and infrastructure evidence audit.
2. Recompute route, model, migration, test, and configuration metrics.
3. Run the complete automated validation baseline.
4. Build the traceability and maturity matrices.
5. Draft the Markdown source document.
6. Review every conclusion for evidence, scope, and production-readiness accuracy.
7. Generate the synchronized DOCX from the approved Markdown content.
8. Apply a formal business-report design with cover, metadata, contents, page numbers, restrained OMD colors, status callouts, and readable tables.
9. Render the DOCX to page images and visually inspect every page.
10. Run heading, navigation, table-geometry, accessibility, metadata/privacy, and link checks.
11. Correct all content and layout defects and repeat verification.
12. Freeze the exact locally validated commit, migrations, and seed as the release candidate.
13. Deploy that exact release candidate for hosted UAT.
14. Deliver only the final Markdown and DOCX files.

## 6. Safety and Quality Rules

- Do not modify application behavior, source code, database records, or cloud resources while creating the assessment.
- Preserve all existing user changes.
- Do not overwrite the earlier product audit, technical master document, roadmap, admin guide, or execution plan.
- Do not expose credentials, session secrets, signed URLs, real customer information, Kundli report content, or private storage keys.
- Clearly distinguish evidence from assumption.
- Clearly distinguish a foundation from a production-complete capability.
- Clearly distinguish repository-owned work from external WordPress, form, domain, provider, and infrastructure work.
- Ensure the Markdown and DOCX conclusions remain synchronized.

## 7. Validation and Acceptance Criteria

The final playbook is accepted only when:

- Every route group and major business module is represented.
- Every database domain and migration family is mapped.
- All environment variables and provider boundaries are documented.
- Every Phase-1 requirement is mapped to implementation, evidence, gaps, owner, and next action.
- Kundli KND-IMP-02 and KND-IMP-03 status is represented accurately.
- Mock payments, wallet, external notifications, courier, and other deferred integrations are not misreported as complete.
- External/unavailable systems are explicitly marked unverified.
- Current Git/worktree risk is disclosed.
- Test, typecheck, lint, and build results are dated and reproducible.
- Readiness scoring is evidence-backed and its method is disclosed.
- The critical path contains dependencies, gates, owners, acceptance criteria, and effort ranges.
- The document contains no confidential credentials or private report data.
- The DOCX passes full render and visual QA.

## 8. Assumptions

- The assessment will evaluate the current working tree, not only the last Git commit.
- Current repository metrics will be recomputed during execution rather than copied blindly from this plan.
- External systems that cannot be inspected will remain `EXTERNAL/UNVERIFIED`.
- Estimates will use engineer-days and assume one full-stack engineer with fractional QA/PM support and timely owner/content approvals.
- A second calendar scenario will show the effect of two parallel engineering/content workstreams.
- The final playbook will supersede earlier documents only for current-state and readiness claims; earlier documents remain historical records.

## 9. Approval Gate

The execution backbone is approved. Gate 0 may proceed. The full playbook remains a separate deliverable that will be generated from verified execution evidence.
