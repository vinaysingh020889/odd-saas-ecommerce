# OMDivyaDarshan Locked Work Update & Production Execution Plan

**Document status:** Locked execution roadmap for Phase-1 production readiness and hosting  
**Prepared on:** 30 June 2026  
**Primary objective:** Convert the current OMDivyaDarshan commerce/service-operations SaaS foundation from strong demo/internal validation stage into a controlled, hosted, production-ready Phase-1 launch.  
**Core rule:** Do not treat the current mock/manual platform as live paid production until payment verification, private storage, production database, security hardening, backups, observability and launch QA are completed.

---

## 1. Executive Summary

OMDivyaDarshan has now moved far beyond a basic ecommerce website. The current build already has a strong platform backbone covering storefront, catalog, products, kits, services, Asthi Visarjan, Kundli, memberships, offers, homepage hero slides, category hero controls, inventory, customer dashboard, customer event tracking, admin operations, queues, documents, assignments, reports and audit shells.

The next work is no longer about simply adding more screens. The next work is about making the first phase **production-ready, hosted, secure, reviewable and operationally usable**.

The locked direction is:

- `omdivyadarshan.org` remains the public discovery/content/SEO layer.
- `app.omdivyadarshan.org` becomes the transactional customer + commerce + service operations app.
- `/admin` or `admin.omdivyadarshan.org` becomes the protected operations control panel.
- `wallet.omdivyadarshan.org` remains a separate loyalty/reward service track, not a forced dependency for Phase-1 commerce launch.
- Phase-1 should launch with strong ecommerce/service operations and either live payment mode or controlled manual/mock payment mode depending on provider credentials.

The current system can be hosted quickly for review. But real public paid production requires a stricter readiness gate.

---

## 2. Current Status Snapshot

### 2.1 What is already strong

The current app already includes:

- Premium `/shop` storefront/home direction.
- Admin-managed hero slides.
- Category hero/content controls.
- Product listing and product detail pages using backend product content blocks.
- Product, service, kit and membership catalog foundation.
- Cart and checkout with mock payment lifecycle.
- Inventory ledger behavior for reserve, release and sold movement.
- Asthi Visarjan application/tracking/admin flow.
- Kundli package/order/admin flow.
- Service booking, capacity and reschedule foundation.
- Membership plans, benefits, rules and user memberships.
- Offers, coupons, cashback-promise shell and promotions.
- Tags, aliases, context graph, smart search and search insights.
- Customer events and interest profiles.
- Admin queues, assignments, checklists, documents, notes, audit logs and reports shells.

### 2.2 What is not production-ready yet

The following cannot remain mock/manual if the platform is launched for real paid users:

- Razorpay live payment integration.
- PayPal live payment integration.
- Gateway webhook verification.
- Real refund execution.
- Private file/object storage for documents, proofs and reports.
- Signed URLs for sensitive files.
- Real notification system: email first, WhatsApp/SMS later.
- Production-grade role permissions.
- Admin 2FA or stronger admin access protection.
- Final security hardening.
- Production database backup and restore process.
- Error monitoring, logs and uptime checks.
- Courier/shipping integration or manual tracking fallback policy.
- Real wallet ledger, if wallet is included in Phase-1 paid launch.

### 2.3 Locked conclusion

The app is suitable today for:

- hosted demo,
- internal workflow validation,
- controlled operational training,
- seeded data walkthrough,
- partner review,
- pre-production UAT.

The app becomes suitable for public paid production only after the readiness roadmap below is completed.

---

## 3. Production-Ready Definition for Phase-1

Phase-1 production-ready does **not** mean every future feature is complete. It means the first release is safe, hosted, recoverable and usable for real operations.

### 3.1 Phase-1 must include

- Hosted app with HTTPS.
- Managed production PostgreSQL.
- Environment variables and secrets separated from code.
- Production migrations deployed safely.
- Real admin login with demo credentials removed or disabled.
- Customer login/signup working reliably.
- Storefront, category, product, cart, checkout and order flows passing QA.
- Admin catalog, inventory, order, Asthi, Kundli, membership and service operations passing QA.
- Private storage connected for documents/proofs/reports, or a clear manual fallback if files are not accepted in Phase-1.
- Payment mode explicitly selected:
  - **Live payment mode:** Razorpay/PayPal integrated with verified webhooks.
  - **Controlled manual mode:** no real online payment collection; orders/applications are recorded and handled manually.
- Email notification baseline or manual notification SOP.
- Backup and rollback plan.
- Error logging and uptime monitoring.
- Launch checklist and daily admin operating routine.

### 3.2 Phase-1 must not pretend to include

- Real wallet cashback credits unless wallet ledger is built.
- Real payment capture unless gateway webhooks are verified server-side.
- Real refunds unless gateway refund flow is connected.
- Secure document handling unless private storage and access control are implemented.
- Automated courier tracking unless courier adapter/API is connected.
- Automated WhatsApp/SMS unless provider templates and credentials are available.

---

## 4. Locked Hosting Architecture

### 4.1 Recommended cost-controlled production architecture

For a clean production deployment with low operational burden:

| Layer | Recommended production choice | Reason |
|---|---|---|
| App runtime | GCP Cloud Run or equivalent container hosting | Scales down, supports Docker, clean deployment, HTTPS through load balancer/domain mapping. |
| Database | Managed PostgreSQL: Cloud SQL, Supabase, Neon or equivalent | Backups, connection reliability and production isolation. |
| ORM/migrations | Prisma with `migrate deploy` | Safe production migration path. |
| Storage | GCS / S3 / R2 private bucket | Required for documents, proof, reports and future invoices. |
| Secrets | GCP Secret Manager / platform secrets | Keeps keys out of repository and `.env`. |
| DNS/CDN | Cloudflare or domain DNS provider | SSL, DNS, security headers, caching and WAF options. |
| Monitoring | Sentry + uptime monitor + provider logs | Production error visibility. |
| Analytics | GA4/GTM + internal events | Marketing and product tracking. |

### 4.2 Domain mapping

| Domain/subdomain | Phase-1 use | Routing decision |
|---|---|---|
| `omdivyadarshan.org` | WordPress public discovery | Keep WordPress as SEO/content layer. |
| `app.omdivyadarshan.org` | Customer app + storefront + account | Main Next.js production deployment. |
| `admin.omdivyadarshan.org` | Optional admin alias | Can rewrite/proxy to `app.omdivyadarshan.org/admin`, or use `/admin` only in Phase-1. |
| `wallet.omdivyadarshan.org` | Wallet placeholder or future service | Keep reserved. Do not fake real ledger unless built. |

### 4.3 Hosting tracks

#### Track A — Fast hosted review/demo

Use this when the immediate target is a demo link and workflow validation.

- Deploy current Next.js app to hosted environment.
- Connect managed PostgreSQL.
- Run production migrations.
- Seed controlled demo data.
- Keep payment in mock/manual mode.
- Protect admin routes.
- Share demo URL for review.

Exit: reviewer can browse storefront, login, test cart, test mock payment, inspect admin workflows and validate modules.

#### Track B — Controlled production launch

Use this when real users and real transactions will start.

- Complete all Track A work.
- Add private storage for document/proof/report files.
- Disable mock payment for public users.
- Connect Razorpay/PayPal with server-side verification.
- Add webhook event log and idempotency.
- Add notification outbox and email baseline.
- Add backup, rollback and monitoring.
- Complete UAT and launch sign-off.

Exit: real orders/applications can be accepted under a controlled Phase-1 operations SOP.

---

## 5. Locked Phase-1 Scope

### 5.1 Included in first production phase

#### Customer/storefront

- `/shop` storefront home.
- Category browsing.
- Product detail pages.
- Search.
- Cart.
- Checkout.
- Orders and order tracking.
- Customer dashboard.
- Address book.
- Membership browsing and review.
- Asthi Visarjan flow.
- Kundli flow.
- Service booking flow.

#### Admin/operations

- Admin overview.
- Products, services, categories and inventory.
- Hero slides and homepage layout.
- Festivals, promotions and offers.
- Orders, requests and payment visibility.
- Asthi applications.
- Kundli orders and packages.
- Service bookings, capacity and reschedules.
- Membership plans, rules and user memberships.
- Documents, assignments, checklists and notes.
- Customers, events and interest profiles.
- Audit logs, reports and queues.

#### Provider-ready foundations

- Razorpay adapter.
- PayPal adapter.
- Email notification outbox.
- Manual courier tracking fallback.
- Private storage abstraction.
- Webhook event log.
- Idempotency for payment/provider events.

### 5.2 Deferred beyond first production phase

These should not block hosted Phase-1 unless specifically required for launch:

- Full independent wallet loyalty service.
- Donation reward webhook and wallet ledger.
- Full WhatsApp/SMS automation.
- Courier API automation.
- Full vendor/subadmin portal maturity.
- Full pandit/astrologer separate mobile panel.
- Advanced analytics dashboards.
- Recommendation personalization engine.
- Multi-tenant billing and tenant onboarding.
- A/B testing and advanced merchandising.
- Real Kundli report generation engine.

---

## 6. Production Roadmap

## Sprint 0 — Lock access, branch and production boundary

**Goal:** Freeze the launch boundary before deploying.

### Work items

- Confirm production mode:
  - hosted demo only,
  - controlled manual operations,
  - or live payment production.
- Confirm domain strategy.
- Confirm database provider.
- Confirm object storage provider.
- Confirm payment availability.
- Confirm notification provider availability.
- Create `main` / `production` branch discipline.
- Create `.env.production.example`.
- Remove hardcoded demo assumptions from production configuration.
- Document production seed vs demo seed.

### Exit criteria

- Production boundary is written and accepted.
- No unclear payment/storage/wallet promise remains.
- Production branch can build cleanly.

---

## Sprint 1 — Hosting foundation and production database

**Goal:** Get the app deployable with a real production database.

### Work items

- Prepare deployment target.
- Configure production PostgreSQL.
- Configure connection pooling if required.
- Add production environment variables.
- Run:
  - `npm install`
  - `npx prisma validate`
  - `npx prisma generate`
  - `npx prisma migrate deploy`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
- Create safe production seed script.
- Create database backup before and after first migration.
- Create rollback notes for app and database.

### Exit criteria

- Production app builds.
- Production database connects.
- Migrations deploy without drift.
- Admin login works in hosted environment.
- `/shop`, `/admin`, `/login`, `/cart`, `/checkout` open without server errors.

---

## Sprint 2 — Security and access hardening

**Goal:** Make hosted app safe enough for controlled UAT.

### Work items

- Remove or disable public demo credentials.
- Force strong admin password reset.
- Add admin session expiry rules.
- Add rate limiting to login and sensitive actions.
- Add CSRF/origin protection where needed.
- Enforce server-side validation on all production actions.
- Review admin-only server actions.
- Review customer/admin route gates.
- Add role-level checks for sensitive operations.
- Add audit logs for:
  - payment status changes,
  - order status changes,
  - inventory adjustments,
  - Asthi/Kundli status changes,
  - document/proof actions,
  - membership changes,
  - role changes.
- Add secure headers.
- Confirm no secrets exist in repository.

### Exit criteria

- Admin and customer access are separated.
- Sensitive actions are server-gated.
- Demo credentials do not work in production unless explicitly enabled for private demo.
- Audit logs capture production-sensitive actions.

---

## Sprint 3 — Storage, documents, proof and report handling

**Goal:** Remove unsafe public URL handling for sensitive operational files.

### Work items

- Connect private object storage bucket.
- Add upload adapter for:
  - Asthi documents,
  - Asthi proof,
  - Kundli reports,
  - service proof,
  - order documents,
  - future invoice files.
- Add signed URL generation.
- Add file type and file size validation.
- Add customer-visible vs internal-only access flags.
- Add access audit for sensitive file views/downloads.
- Add manual fallback if real upload is deferred:
  - no public file URLs,
  - admin-only placeholder status,
  - clear SOP for offline document collection.

### Exit criteria

- Sensitive files are not public.
- Admin can request, upload/review or mark document status.
- Customer can view only allowed files.
- File URLs expire or are permission controlled.

---

## Sprint 4 — Payment production path

**Goal:** Decide and implement the launch payment model.

### Option A: Live Razorpay/PayPal production

Required work:

- Add Razorpay server-side order creation.
- Add Razorpay webhook endpoint.
- Verify webhook signature.
- Match order ID, amount and currency.
- Add duplicate event/idempotency handling.
- Add PayPal create/capture flow if international payments are included.
- Add PayPal webhook/capture verification.
- Add payment event log.
- Add failure, retry and abandonment handling.
- Confirm inventory reservation only becomes sold after server-verified payment success.
- Confirm service capacity only becomes confirmed after server-verified payment success.
- Add refund request shell; do not execute real refunds unless refund API is implemented.

Exit criteria:

- No order/service is fulfilled based only on frontend payment success.
- Payment success is server verified.
- Failed payment releases stock/capacity/wallet locks where applicable.
- Admin can inspect payment attempts and payment events.

### Option B: Controlled manual payment launch

Required work:

- Keep online payment disabled for public users.
- Replace payment CTA with enquiry/manual confirmation flow.
- Capture order/application intent.
- Admin manually verifies payment outside the system.
- Admin marks payment confirmed with audit reason.
- Customer sees clear status and next step.
- No claim of live online payment is shown.

Exit criteria:

- No user is misled into thinking live payment exists.
- Operations team can handle orders/applications manually.
- All manual status changes are audited.

---

## Sprint 5 — Notification and communication readiness

**Goal:** Ensure users and admins are not blind after checkout/application submission.

### Work items

- Add notification outbox table if not already present.
- Start with email baseline:
  - signup/login support,
  - order created,
  - payment success/failure,
  - Asthi application submitted,
  - document requested,
  - service scheduled,
  - proof uploaded,
  - Kundli order submitted/report ready,
  - support escalation.
- Add email template manager or template constants.
- Add manual WhatsApp/SMS SOP if API is not available.
- Add admin notification center checks for high-priority tasks.
- Add retry/failure state for notification sending.

### Exit criteria

- Users receive at least email or manual communication for critical journey points.
- Admin sees pending communication tasks.
- Failed notifications are visible and recoverable.

---

## Sprint 6 — Data, catalog and content production readiness

**Goal:** Replace demo feel with real business-ready data.

### Work items

- Import final categories and subcategories.
- Import final products with:
  - SKU,
  - MRP,
  - selling price,
  - stock,
  - variant,
  - product image,
  - specs,
  - FAQs,
  - content blocks,
  - tags.
- Configure real hero slides.
- Configure category hero title, description and image.
- Configure services and packages.
- Configure Asthi locations, packages, add-ons and required document rules.
- Configure Kundli packages, pricing and delivery timeline.
- Configure membership plans and benefit rules.
- Configure offers and coupons.
- Configure delivery zones and shipping rules.
- Configure festival campaigns.
- Confirm no fake/demo content is visible on production.

### Exit criteria

- Homepage looks production-ready.
- Category and product pages have real images and descriptions.
- Asthi/Kundli/membership/service data is not dummy.
- Search and tags return useful results.

---

## Sprint 7 — Admin operations hardening

**Goal:** Make internal users capable of running the system daily.

### Work items

- Finalize daily admin routine.
- Add or polish `/admin/my-work` if it is used.
- Confirm queues show:
  - overdue,
  - due today,
  - unassigned,
  - payment issue,
  - document pending,
  - proof pending,
  - low stock,
  - reschedule requests.
- Confirm assignment owner and due dates.
- Confirm customer timeline and internal notes.
- Confirm audit log browser usability.
- Confirm report dashboard is useful enough for launch.
- Prepare admin SOP for:
  - order processing,
  - Asthi application processing,
  - Kundli report processing,
  - service booking processing,
  - stock adjustment,
  - refunds/cancellations,
  - customer support.

### Exit criteria

- Admin does not need developer support for normal Phase-1 operations.
- Every operational item has an owner, status and next action.
- Sensitive decisions are logged.

---

## Sprint 8 — QA, UAT and launch certification

**Goal:** Prove the hosted version is safe for Phase-1 launch.

### QA matrix

| Area | Required tests |
|---|---|
| Auth | Customer signup, login, logout, admin login, blocked unauthorized admin access. |
| Storefront | Home, category, product detail, search, cart, checkout. |
| Catalog admin | Create/edit product, variant, category, tags, content blocks, inventory. |
| Hero/homepage | Hero slide create/edit/sort/status, category hero, promotion visibility. |
| Cart/checkout | Add, remove, quantity change, coupon, order creation, payment path. |
| Payment | Success, failure, retry, cancel, webhook/idempotency if live. |
| Inventory | Reserve, release, sold, adjustment, low stock, kit components. |
| Orders | Customer order detail, admin order detail, status changes, notes, requests. |
| Membership | Plan display, review, activation, benefits, admin rule preview. |
| Asthi | Start, review, details, documents, payment/manual confirmation, tracking, admin queue. |
| Kundli | Package, details, review, payment/manual confirmation, admin queue, report placeholder. |
| Service booking | Date/location/package, capacity, reschedule, assignment, proof. |
| Documents | Upload/request/review/approve/reject/visibility. |
| Notifications | Email/manual notification for critical states. |
| Security | Admin route gating, sensitive action checks, rate limiting, no public secrets. |
| Performance | Key pages load acceptably on mobile and desktop. |
| Mobile | Header, menu, cart, checkout, Asthi/Kundli forms, admin usability baseline. |
| SEO | Public titles, descriptions, canonical basics, sitemap/robots if applicable. |
| Analytics | GA4/GTM firing, internal customer events recorded. |
| Backup | Database backup verified, restore process documented. |

### Exit criteria

- Critical flows pass.
- No P0/P1 bug remains open.
- Launch mode is declared.
- Rollback plan is documented.
- Admin operating SOP is ready.

---

## 7. Production Readiness Checklist

### 7.1 Code readiness

- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] `npx prisma validate` passes.
- [ ] `npx prisma generate` passes.
- [ ] `npx prisma migrate deploy` tested on staging/production database.
- [ ] No console errors on primary pages.
- [ ] No hardcoded localhost URLs.
- [ ] No secrets committed.
- [ ] No demo-only logic visible to public users.

### 7.2 Infrastructure readiness

- [ ] Production app hosted.
- [ ] Production PostgreSQL connected.
- [ ] Database backups enabled.
- [ ] Environment variables configured.
- [ ] HTTPS active.
- [ ] Domain/subdomain routing complete.
- [ ] Object storage bucket configured.
- [ ] Monitoring configured.
- [ ] Error logging configured.
- [ ] Deployment rollback route known.

### 7.3 Payment readiness

- [ ] Payment mode selected: live or controlled manual.
- [ ] Razorpay credentials added if live India payments are included.
- [ ] Razorpay webhook secret added.
- [ ] PayPal credentials added if international payments are included.
- [ ] Webhook event log enabled.
- [ ] Idempotency implemented.
- [ ] Payment failure tested.
- [ ] Refund path clearly marked as real or manual.

### 7.4 Security readiness

- [ ] Demo admin credentials disabled or changed.
- [ ] Strong admin password policy.
- [ ] Admin session expiry.
- [ ] Login rate limiting.
- [ ] Admin route protection tested.
- [ ] Customer route protection tested.
- [ ] Sensitive server actions permission checked.
- [ ] Audit logs for sensitive actions.
- [ ] Private document URLs.
- [ ] Security headers configured.

### 7.5 Operations readiness

- [ ] Admin daily routine documented.
- [ ] Product/category setup completed.
- [ ] Inventory loaded.
- [ ] Asthi packages finalized.
- [ ] Kundli packages finalized.
- [ ] Membership plans finalized.
- [ ] Service booking/capacity setup finalized.
- [ ] Offers/coupons finalized.
- [ ] Support escalation process finalized.
- [ ] Manual fallback process written.

---

## 8. First Launch Mode Decision

### Recommended locked launch path

Because the platform is already broad but external integrations are still the main blockers, the safest path is:

#### Launch 1: Hosted production demo / UAT

- Real hosted app.
- Real production-like database.
- Admin and customer flows visible.
- Mock/manual payment only.
- Demo content replaced with controlled real sample data.
- No public real-money launch.

#### Launch 2: Controlled paid production

- Razorpay live mode connected.
- PayPal connected only if international flow is ready.
- Private storage connected.
- Email baseline connected.
- Admin SOP finalized.
- Payment, inventory, capacity and order lifecycle tested end-to-end.

#### Launch 3: Wallet-linked ecosystem

- Independent wallet service skeleton.
- Wallet ledger.
- Reward source/redeem source configuration.
- Donation webhook.
- Redemption quote/lock/confirm/release/reverse.
- Wallet admin and dashboard.

This prevents overpromising wallet and payment before the safety layer is ready.

---

## 9. Hosting Implementation Runbook

### 9.1 Pre-deployment

1. Confirm latest code branch.
2. Pull latest repository.
3. Confirm remote origin.
4. Run local validation:
   - `npm install`
   - `npx prisma validate`
   - `npx prisma generate`
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
5. Confirm `.env.production.example` is complete.
6. Create production database.
7. Create production storage bucket.
8. Add provider secrets.
9. Confirm domain/subdomain DNS access.

### 9.2 Deployment

1. Build production image or deploy via selected platform.
2. Set production environment variables.
3. Run `npx prisma migrate deploy`.
4. Run safe production seed only if approved.
5. Start app.
6. Test `/shop`.
7. Test `/login`.
8. Test `/admin`.
9. Test primary customer journeys.
10. Point domain/subdomain.
11. Enable HTTPS.
12. Run smoke checklist.

### 9.3 Post-deployment smoke test

- [ ] Home/storefront loads.
- [ ] Category page loads.
- [ ] Product page loads.
- [ ] Search works.
- [ ] Cart works.
- [ ] Checkout reaches payment/manual confirmation step.
- [ ] Customer login works.
- [ ] Admin login works.
- [ ] Admin dashboard loads.
- [ ] Product edit works.
- [ ] Hero slide edit works.
- [ ] Order detail works.
- [ ] Asthi flow works.
- [ ] Kundli flow works.
- [ ] Membership page works.
- [ ] No server errors in logs.

### 9.4 Rollback

- Keep previous deployment active until new smoke test passes.
- Keep database backup before migration.
- If migration fails, do not manually edit production tables without backup.
- If app deploy fails, rollback app image/build.
- If data import fails, restore from backup or reverse import batch.

---

## 10. Required Inputs Before Public Production

### 10.1 Access

- Domain/DNS access.
- Hosting/cloud access.
- Git repository access.
- Production database provider access.
- Object storage provider access.
- WordPress admin/server access if public site routing is included.

### 10.2 Payment and finance

- Razorpay account.
- Razorpay live API key/secret.
- Razorpay webhook secret.
- PayPal business account if international payments are required.
- PayPal client ID/secret.
- Refund policy.
- GST/tax details.
- Invoice numbering rules.
- Bank/legal billing details.

### 10.3 Catalog and commerce

- Product catalog spreadsheet.
- Product images.
- SKU and variant data.
- MRP/selling price.
- Stock quantities.
- GST/HSN if needed.
- Shipping eligibility.
- Return eligibility.
- Category/subcategory priorities.
- Product FAQs/specs/content blocks.

### 10.4 Services

- Final service list.
- Puja packages.
- Service pricing.
- Locations.
- Date/time rules.
- Required user details.
- Required documents.
- Deliverables.
- Proof format.
- Cancellation/refund terms.

### 10.5 Asthi Visarjan

- Final locations.
- Package names.
- Package prices.
- Add-ons.
- Required documents.
- Process steps.
- Proof/certificate format.
- Support contact process.
- Refund/cancellation policy.

### 10.6 Kundli

- Final package names.
- Pricing.
- Delivery timeline.
- Required birth details.
- Consultation rules.
- Report sample format.
- Refund/cancellation policy.

### 10.7 Membership

- Final plan names.
- Pricing.
- Duration.
- Benefits.
- Usage rules.
- Upgrade/renewal/cancellation policy.
- Wallet/reward eligibility if any.

### 10.8 Communication

- Support email.
- Support phone.
- Sender email/domain.
- Email provider credentials.
- WhatsApp provider/template details if used.
- SMS provider/template details if used.
- Escalation owner list.

### 10.9 Brand and content

- Final logo.
- Brand images.
- Hero slider images.
- Festival images.
- Testimonials.
- Trust badges.
- Policy pages.
- About/support content.
- Live Darshan YouTube/channel links.

---

## 11. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Payment credentials delayed | Cannot launch live paid checkout | Launch controlled manual/UAT mode first. |
| Storage not connected | Sensitive documents unsafe | Do not accept real sensitive uploads until private storage is active. |
| Demo credentials remain | Admin compromise risk | Disable/change before production. |
| No backup before migration | Data loss risk | Mandatory backup before production migrations/imports. |
| No webhook verification | Fake/incorrect paid status risk | Fulfil only after server-side webhook/capture verification. |
| Wallet promised before ledger | Financial/trust risk | Show cashback only as promise until real wallet ledger exists. |
| Poor product data | Storefront feels weak | Use production data import checklist before launch. |
| No notification system | High support load | At least email baseline or manual notification SOP. |
| Admin roles too broad | Operational/security risk | Use role restrictions and audit logs. |
| Overlaunching too many modules | QA failure risk | Launch core flows first, defer wallet/courier automation. |

---

## 12. Final Acceptance Criteria

The Phase-1 platform can be called production-ready only when all the following are true:

1. Hosted URL is live with HTTPS.
2. Production database is connected and backed up.
3. Production migrations are clean.
4. Admin demo credentials are disabled or changed.
5. Storefront, cart, checkout and order tracking pass QA.
6. Asthi Visarjan customer and admin flow pass QA.
7. Kundli customer and admin flow pass QA.
8. Membership flow pass QA.
9. Admin operations console is usable for daily work.
10. Inventory reserve/release/sold behavior works.
11. Payment mode is clearly live or manual.
12. Live payment, if enabled, is verified only through server-side gateway verification.
13. Private storage is connected before accepting real sensitive documents.
14. Notifications or manual communication SOP are active.
15. Error monitoring and basic uptime monitoring are active.
16. Backup and rollback plan is documented.
17. P0/P1 bugs are closed.
18. Launch owner signs off on the release mode.

---

## 13. Immediate Next Execution Order

The next execution should be done in this exact order:

1. Freeze production scope and payment mode.
2. Prepare deployment branch and production env template.
3. Choose hosting/database/storage providers.
4. Deploy hosted UAT version.
5. Connect production PostgreSQL and run migrations.
6. Disable demo credentials and harden admin access.
7. Connect private storage or disable sensitive file upload until ready.
8. Replace seed/demo data with production-ready data.
9. QA storefront, checkout, Asthi, Kundli, membership, service booking and admin operations.
10. Add payment gateway only after credentials and webhook endpoints are available.
11. Add email notification baseline.
12. Configure domain/subdomains and HTTPS.
13. Run launch checklist.
14. Open controlled Phase-1 launch.

---

## 14. Locked Final Direction

OMDivyaDarshan should now be treated as a **serious production platform project**, not a design/demo exercise.

The first phase should focus on:

- clean hosting,
- production database,
- secure admin,
- real data,
- safe checkout,
- controlled operations,
- auditability,
- backups,
- monitoring,
- and clear launch boundaries.

More features can continue later, but the first hosted production version must be safe, stable and operationally honest.

**Locked principle:** launch fewer things safely before launching many things loosely.

