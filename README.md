# OMDivyaDarshan Commerce SaaS

Mock ecommerce lifecycle foundation for the OMDivyaDarshan commerce SaaS app at `app.omdivyadarshan.org`.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy local environment values:

   ```bash
   cp .env.example .env.local
   ```

3. Update `DATABASE_URL` in `.env.local` for your local PostgreSQL database.
   Set `SESSION_SECRET` to a long random value for local auth sessions.

4. Run Prisma migration and seed:

   ```bash
   npm run prisma:migrate
   npm run prisma:seed
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

The app should be available at `http://localhost:3000`.

The sections below the demo guide are historical implementation notes from earlier phases. The current demo-ready behavior is summarized in `Demo Readiness Guide`.

## Ecommerce Maturity 2: Request Shell

- Customers can submit cancellation, return, or refund requests from `/orders/[id]` where the order state is eligible.
- Requests can apply to the whole order or a selected order item.
- Admins triage requests in `/admin/requests` or from `/admin/orders/[id]`.
- Request decisions create `OrderActivity`; approve/reject/close decisions also write `AuditLog`.
- This is an operations shell only. No Razorpay/PayPal refund, courier pickup, wallet reversal, email, WhatsApp, SMS, or PDF generation is connected.

## Service Capacity + Assignment Foundation

- `/admin/capacity` manages internal capacity slots for Asthi, Puja, Kundli, consultations and future services.
- Capacity movements are manually recorded in `ServiceCapacityLedger` as hold, confirm, release, cancel or adjustment.
- `/admin/assignments` manages internal work assignment for Asthi applications, Kundli orders, ecommerce orders, order requests and future tasks.
- Asthi, Kundli and admin order detail pages show assignment panels.
- Customer tracking pages show only `customerVisibleNote`; internal assignment notes stay admin-only.
- This is an internal operations shell only. No external calendar, courier, payment, wallet, email, WhatsApp or SMS automation is connected.

## Document / Proof / Report Shell

- `/admin/documents` is the global queue for operational document placeholders across Asthi, Kundli, orders, order requests, assignments, customers, products and future service bookings.
- Admin detail pages for Asthi, Kundli and ecommerce orders include a reusable document panel.
- Documents support requested, uploaded, under review, approved, rejected, reupload required and archived states.
- Visibility can be `Internal Only` or `Customer Visible`; customer pages show only customer-visible records.
- Status and visibility changes create `DocumentActivity`; approve/reject/reupload/visibility/archive actions also write `AuditLog`.
- Seed adds sample Asthi requested documents, an Asthi proof placeholder, a Kundli report placeholder and an order fulfilment proof placeholder when matching demo records exist.
- This is a URL/storage-key placeholder architecture only. No binary upload, private object storage, signed URL, PDF generation, email, WhatsApp or SMS delivery is connected.

## Admin Hardening v1

- `/admin/roles` lets Super Admin assign/remove existing tenant roles using `Role` and `UserRole`; the final Super Admin assignment is protected.
- `/admin/permissions` documents planned role boundaries for catalog, orders, requests, payments, inventory, Asthi, Kundli, capacity, assignments, documents, memberships, offers, reports and settings.
- `/admin/audit-logs` browses sensitive admin events with filters for actor, action, entity and date range. Metadata payloads are visible only to Super Admin.
- `/admin/queues` now shows SLA-style operational cards and assignment filters for overdue, due today and unassigned work.
- `/admin/notifications` is an internal computed alert shell for overdue assignments, pending documents, pending requests, failed/pending mock payments, stock and capacity.
- `/admin/reports` is a read-only metrics dashboard for orders, mock paid revenue, requests, documents, stock, Asthi, Kundli, memberships and search queries.
- `/admin/customers/[id]` includes internal customer notes and a combined admin-only customer timeline.
- Role changes and customer note creation write `AuditLog`.
- This is admin control and visibility hardening only. Final production security still needs complete RBAC enforcement, 2FA, infrastructure hardening, provider credential isolation and operational audit review.

## Customer Event + Interest Tracking v1

- Internal first-party analytics now records product, category, service, festival, tag, search, cart, wishlist, checkout, order completion, Asthi, Kundli and membership intent events.
- `/admin/customer-events` lists tracked events with filters for event type, user, anonymous id, entity type and date range.
- `/admin/interest-profiles` shows recomputed customer and anonymous interest summaries from first-party events.
- `/admin/customers/[id]` shows an internal event timeline and interest profile summary.
- `/admin/reports` includes top viewed products, top searched terms, top clicked tags, checkout starts, add-to-cart events, wishlist events and high-intent users.
- Anonymous browsing remains open. Anonymous events merge into the customer profile on login/signup where safe.
- This does not add GA4, GTM, ad pixels or any external analytics provider. Production launch should connect these controls to consent/privacy preferences before using them for marketing automation.

## Phase 1 Auth

Customer auth is intentionally simple in this phase:

- `/signup` creates a customer user with name, email, and password.
- `/login` validates email/password credentials.
- `/dashboard`, `/orders`, `/orders/[id]`, and `/wallet` require login.
- Unauthenticated customer app routes redirect to `/login`.
- Logout is available in the customer app layout.

Local development credentials seeded by `npm run prisma:seed`:

- Customer: `customer@omdivyadarshan.local` / `Password@123`
- Super admin: `admin@omdivyadarshan.local` / `Admin@123`

These credentials are for local development only.

## Current Boundaries

- Wallet remains disabled/mock only.
- No wallet ledger is created.
- Payment uses the internal mock gateway only.
- No real Razorpay, PayPal, payment webhooks, courier API, real refund integration, real file storage, signed URLs, PDF generation, or outbound notifications are included.
- Admin Hardening v1 is not final production-grade security.
- Customer event tracking is internal first-party analytics only and still needs consent/privacy controls before production marketing use.
- Admin routes are visually separate and support mock ecommerce operations.

## Tag + Context Graph Foundation

The admin now includes a tenant-scoped tag graph foundation for future discovery, search, merchandising, recommendations, and content linking.

- Admin routes:
  - `/admin/tags`
  - `/admin/tags/new`
  - `/admin/tags/[id]/edit`
- Supported tag types include festivals, puja, rituals, deities, temples, places, tithi, occasions, product use, service type, benefit intent, content topic, and material attributes.
- `TagAlias` stores Hindi/Sanskrit/transliteration/spelling/search aliases as flexible text aliases.
- `TagRelation` is a generic relation table for tagging products, variants, categories, services, Asthi packages/locations, Kundli packages, membership plans, festival campaigns, and promotions without adding a separate join table for each module.
- Seed creates foundational OMD context tags such as Shiv, Vishnu, Durga, Ganesh, Lakshmi, Sawan, Shradh, Diwali, Navratri, Raksha Bandhan, Kashi, Haridwar, Prayagraj, Gaya, Rudrabhishek, Belpatra, Somwar Vrat, Pind Daan, Tarpan, and Puja Samagri.

Admin usage:

1. Open `/admin/tags`.
2. Use search, type, and status filters to audit existing tags.
3. Click `New tag` to create a context tag. Slug is generated from name and remains editable.
4. Add aliases one per line or comma-separated.
5. Edit existing tags from the list. Tags are tenant-scoped and safe to seed repeatedly.

Tag attachment:

- Product and service records can be tagged from their create/edit forms.
- Category records can be tagged from category create/edit.
- Festival campaigns can be tagged from festival create/edit.
- Promotion placements can be tagged from promotion create/edit.
- Tag assignments are stored in the generic `TagRelation` table using strict tenant scoping.
- Public product detail, category detail, services listing, and festival detail pages show subtle tag chips only when active tags are assigned.

Tag attachment smoke test:

1. Open `/admin/products/new` or `/admin/products/[id]/edit` and select a few tags.
2. Save the product, reopen the edit page, and confirm the selected tags remain checked.
3. Open `/product/[slug]` and confirm tag chips appear below the product summary.
4. Repeat for `/admin/categories/[id]/edit` and confirm `/shop/category/[slug]` shows category tags.
5. Repeat for `/admin/festivals/[id]/edit` and confirm `/festivals/[slug]` shows campaign tags.
6. Repeat for `/admin/promotions/[id]/edit` and confirm assignments save. Promotion chips are admin/future-targeting only in this phase.

## Smart Search Foundation

Smart Search v1 adds a database-backed public search route and a simple admin insight surface. It uses the existing Tag + Context Graph; no external search service, AI search, recommendation engine, or notification system is used.

- Public route: `/search`
- Admin route: `/admin/search-insights`
- Header search submits to `/search?q=...`
- Search covers product/service title, slug, description, short description, product specs, product FAQs, category names, festival campaign titles/content, tag names, tag slugs, tag aliases, and attached `TagRelation` context.
- Results are grouped as Products, Services, Categories, Festivals, and Tags.
- Ranking favors exact title/name matches, slug matches, tag name/alias matches, attached tag relation matches, description/spec/FAQ matches, and active/published records.
- Search queries are logged in `SearchQueryLog` with normalized query, result count, optional user id, optional session id, source, and timestamp.
- Admin insights show recent searches, repeated searches, and no-result searches.

Smart Search demo terms:

- `Shiv`
- `Rudrabhishek`
- `Sawan`
- `Ganga Jal`
- `Kashi`
- `Haridwar`
- `Raksha Bandhan`
- `Shradh`
- `Pind Daan`
- `Tarpan`
- `Puja Samagri`

Smart Search smoke test:

1. Run seed after migration.
2. Open `/search?q=Shiv` and confirm Rudrabhishek/Sawan context appears.
3. Open `/search?q=Ganga Jal` and confirm product results appear.
4. Open `/search?q=Pind Daan` and confirm Asthi/Shradh-related context appears where active.
5. Search for a nonsense term, then open `/admin/search-insights` and confirm a no-result query is logged.

## Recommendation Foundation

Recommendation v1 is automatic and database-backed. It uses existing tag attachments, festival campaign links, category context, product/service type, active status, and inventory availability where stock data exists.

- Helper: `lib/recommendations.ts`
- Public product detail pages show:
  - Related Products for products.
  - Required Samagri for service detail pages.
  - Related Services where shared context exists.
- Festival pages use explicit campaign links first, then tag-based fallback recommendations.
- Category pages show Related Services when collection tags match service tags.
- `/services` shows a lightweight Required Samagri section for the first visible service context when safe.
- No recommendation admin UI exists yet. Manual curation can be added later with curated recommendation groups or weighted placement controls.

Recommendation scoring considers:

- Shared tags by importance: Festival, Ritual, Deity, Place, Puja, Product Use, Service Type, Benefit Intent, Material Attribute, Content Topic.
- Same category.
- Same festival campaign.
- Same product/service type.
- Active/published records.
- Inventory status for physical products.
- Current entity is excluded from its own recommendations.

Recommendation smoke test:

1. Open `/product/ganga-jal-bottle` and review Related Products/Related Services.
2. Open `/product/rudrabhishek-puja-service` and review Required Samagri.
3. Open `/shop/category/puja-samagri` and review Related Services if tag context exists.
4. Open `/festivals/sawan-shravan-2026` and confirm campaign-linked products/services appear first.

## Demo Readiness Guide

Seeded local credentials:

- Customer: `customer@omdivyadarshan.local` / `Password@123`
- Super admin: `admin@omdivyadarshan.local` / `Admin@123`

Seeded demo catalog:

- Physical product: `Rudraksha Mala`
- Kit product: `Satvik Puja Samagri Kit`
- Kit components: `Ganga Jal Bottle`, `Raksha Bandhan Puja Thali`, and `Rudraksha Mala`
- Membership engine plans: `Free Member`, `Premium Member`, and `Divya Member`
- Digital product: `Kundli Basic Report`
- Kundli engine packages: `Online Kundli Report`, `Handmade Kundli`, `Detailed Life Report`, `Kundli Matching`, and `Consultation + Report`
- Service placeholder: `Rudrabhishek Puja Service`
- Asthi service: `Asthi Visarjan Seva` with Kashi, Haridwar, and Prayagraj packages
- Product media galleries are seeded for Rudraksha Mala, Satvik Puja Samagri Kit, Divya Membership, Kundli Basic Report, and Asthi Visarjan Seva
- Reviews are seeded with approved reviews and one pending moderation sample

Customer demo journey:

1. Browse `/shop` while logged out and review the storefront hero, collection tiles, featured products, kits, membership entry, and product card actions.
2. Use the Products dropdown in the header and open a category route such as `/shop/category/puja-samagri`.
3. Test category search, type, stock, price, rating, and sort filters.
4. Open `/membership` and confirm MembershipPlan cards are presented separately from ordinary products.
5. Open `/product/rudraksha-mala` and review the product detail.
6. Add the product to cart as a guest, then confirm the header cart badge and `/cart` quantity.
7. Continue to checkout and confirm that `/checkout` redirects to login when logged out.
8. Login as `customer@omdivyadarshan.local`.
9. Return to `/cart` or `/checkout`, create the checkout order, and open the order detail.
10. Start mock payment and use `Simulate Success` to confirm a paid order.
11. Create another checkout, use `Simulate Failure`, then verify retry is available.
12. Use Buy Now on `/product/satvik-puja-samagri-kit` to test kit reservation and sale.
13. Activate `Free Member` from `/membership`, then open `/dashboard` to see the UserMembership entitlement.
14. Open `/membership/premium-member/review` and confirm mock activation for a paid plan.
15. Open the same Premium review again to confirm same-plan activation is treated as an idempotent no-op.
16. Open `/membership/divya-member/review` and confirm mock activation to test upgrade safety; the previous active plan is cancelled with history.
17. Return to `/membership` and confirm Free downgrade is blocked while a paid plan is active.
18. Open `/orders` and `/orders/[id]` to review friendly statuses, timeline, items, and kit snapshots.
19. Open `/dashboard` to see the unified customer control center: welcome state, active membership, Asthi applications, Kundli orders, shopping summary, quick actions, and recommended next steps.
20. Login as a customer and submit a product review; it remains pending until admin approval.

Asthi Visarjan MVP journey:

1. Browse `/services/asthi-visarjan` while logged out.
2. Click `Start Application`.
3. Login as `customer@omdivyadarshan.local` if prompted.
4. On `/asthi/apply`, select a holy place, package, optional add-ons, service mode, preferred date, and applicant contact.
5. Submit to open `/asthi/[id]/review` with the calculated Asthi quote. The pre-payment review route uses the internal draft id because the public application number is generated after mock payment.
6. Confirm the mock Asthi payment. No real gateway is called, and repeated confirmation safely redirects without duplicating payment history.
7. The system generates a stable Asthi application number and redirects to `/asthi/[applicationNo]/complete-details`.
8. Fill deceased details, relation, family details, special instructions, and document placeholder filenames or URLs.
9. Submit details to move the application into document review. Required death certificate and applicant ID placeholders keep the document state as pending until supplied.
10. Open `/asthi/[applicationNo]` to review application number, current status, payment status, selected seva, add-ons, next action, progress steps, document status, proof placeholders, and activity history.
11. Open `/services/asthi-visarjan` while logged in to see the active application notification and quick tracking link.
12. Open `/dashboard` to see the active Asthi application card.

Kundli Engine MVP journey:

1. Browse `/kundli` while logged out to review active Kundli packages, privacy/process messaging, and package selection.
2. Click `Start Kundli Request` or select a package. Login as `customer@omdivyadarshan.local` if prompted.
3. On `/kundli/apply`, choose a package and submit applicant contact, language preference, and an optional question.
4. Review the quote on `/kundli/[id]/review`; the pre-payment review route uses the internal draft id because the public Kundli order number is generated after mock payment.
5. Confirm mock payment. No real gateway, wallet ledger, Razorpay, or PayPal action happens.
6. The system generates a stable Kundli order number and redirects to `/kundli/[orderNo]/complete-details`.
7. Submit birth name, date/time/place of birth, language, customer note, and optional existing Kundli filename/URL placeholder.
8. For `Kundli Matching`, submit partner birth details as well.
9. Open `/kundli/[orderNo]` to track payment, details, assignment, review, report readiness, consultation, delivery, timeline, and report URL placeholder.
10. Confirm any membership benefit shown in Kundli is preview-only. Benefit application and usage consumption are deferred to a later pass.
11. Open `/dashboard` to see the active Kundli request card and quick action.

Admin demo journey:

1. Login as `admin@omdivyadarshan.local`.
2. Open `/admin` and review the queue-first operations overview for Asthi, Kundli, memberships, orders, payments, stock, and quick admin links.
3. Open `/admin/orders`, filter by order/payment/fulfilment status, and inspect a paid order.
4. Open `/admin/orders/[id]` to review customer contact, items, kit snapshot, mock payment attempts/events, inventory movements, fulfilment shell, notes, and timeline.
5. Move a paid order through `Processing`, `Ready to Ship`, `Shipped`, and `Delivered`.
6. Add courier and tracking placeholders in the fulfilment shell.
7. Open `/admin/payments` to review mock payment attempts and event counts.
8. Open `/admin/inventory` to confirm reserved, released, and sold movements.
9. Open `/admin/products/[id]/edit` for a product to add image URLs, mark one image primary, set sort order, and optionally assign media to a variant.
10. On the product edit page, enable or disable reviews/ratings and moderate product reviews.
11. Open `/admin/reviews` to filter pending, approved, or rejected reviews and approve/reject submissions.
12. Open `/admin/products/[id]/edit` for the kit product to inspect configured kit components.
13. Open `/admin/customers` and `/admin/customers/[id]` to review customer profile, active cart visibility, orders, and memberships.
14. Open `/admin/memberships` to verify MembershipPlan definitions, benefits, seeded rules, active member counts, activation counts, and UserMembership entitlements.
15. Toggle a plan inactive and confirm inactive plans are blocked from new activation; toggle it active again for demo continuity.
16. Open `/admin/asthi` to review Asthi queue counts, payment, document, and application status.
17. Open `/admin/asthi/[applicationNo]` to verify documents, mark documents verified, schedule ritual, upload proof placeholder, and complete the application through valid status transitions.
18. Open the customer Asthi tracking page again to confirm admin status and timeline updates are visible.
19. Open `/admin/kundli` to review Kundli queue counts, payment, detail, submitted, review, and report-ready states.
20. Open `/admin/kundli/[orderNo]` to inspect intake, birth details, partner details when applicable, documents, membership preview, report status, and customer-visible timeline.
21. Assign astrologer/guru, set consultation date/mode when relevant, and move a confirmed Kundli order through `Submitted`, `Assigned`, `In Review`, `Report Ready`, `Delivered`, and `Completed`.
22. Add a report URL/report note placeholder before delivery where useful.
23. Open the customer Kundli tracking page again to confirm admin status and timeline updates are visible.
24. Confirm the admin membership panel remains preview-only and does not consume Kundli membership benefits.

Connected dashboard smoke test:

1. Login as `customer@omdivyadarshan.local`.
2. Create an Asthi application through `/services/asthi-visarjan`.
3. Activate a membership through `/membership`.
4. Create a Kundli order through `/kundli`.
5. Visit `/dashboard` and confirm Membership, Asthi, Kundli, Orders, Quick Actions, and Recommended Next Steps render together.
6. Login as `admin@omdivyadarshan.local`.
7. Visit `/admin`.
8. Confirm Asthi, Kundli, Membership, Orders, Payments, and Catalog attention queues appear with quick links.

Expected route behavior:

- `/shop` works logged out.
- `/shop/category/[slug]` works logged out with filters and sorting.
- `/membership` works logged out and activation/review actions require login.
- `/membership/[slug]/review` requires login and blocks inactive/current no-op activations.
- `/kundli` works logged out.
- `/kundli/apply` requires login.
- `/kundli/[id]/review` works for the owning customer before payment confirmation.
- `/kundli/[orderNo]/complete-details` requires confirmed mock payment and owner access.
- `/kundli/[orderNo]` works for the owning customer.
- `/product/[slug]` works logged out.
- `/cart` works logged out.
- `/checkout` redirects logged out users to `/login`.
- `/dashboard` works logged in.
- `/orders` works logged in.
- `/orders/[id]` works logged in for the owning customer.
- `/admin` redirects logged out users to `/login`.
- `/admin` works as admin.
- `/admin/orders` works as admin.
- `/admin/payments` works as admin.
- `/admin/memberships` works as admin.
- `/admin/inventory` works as admin.
- `/admin/customers` works as admin.
- `/admin/asthi` works as admin.
- `/admin/kundli` works as admin.
- `/admin/kundli/[orderNo]` works as admin.
- `/admin/asthi/[applicationNo]` works as admin.
- `/admin/reviews` works as admin.

Product media, reviews, and related products:

- Add media from `/admin/products/[id]/edit` using the Product Media section.
- Mark one image as primary; existing `Product.imageUrl` remains a fallback when no media rows exist.
- Multiple gallery images can be added and reordered with `sortOrder`.
- Reviews can be enabled/disabled per product. Ratings can also be shown/hidden per product.
- Customer-submitted reviews are created as `pending`; public product pages show `approved` reviews only.
- Related products are selected by same category first, same product type second, and featured products as fallback, excluding the current product.

Asthi MVP boundaries:

- Asthi payment uses dedicated mock confirmation only.
- Asthi review uses internal id before mock payment; customer tracking uses application number after mock payment confirmation.
- Document upload is a local/dev metadata placeholder and does not store private files in real storage.
- Document review/status control exists in admin; service capacity, on-ground fulfilment automation, proof file storage, courier, and real payment integration are deferred.

Final smoke checklist:

```bash
npx prisma validate
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run typecheck
npm run lint
npm run build
npm run dev
```

## Phase 2 Catalog

Phase 2 adds reusable catalog models and demo listings:

- Categories for products, services, and mixed offerings.
- Products/services with variants and placeholder prices.
- `/shop` lists active product/kit/membership/digital items.
- `/product/[slug]` shows database-backed catalog detail.
- `/services` lists active service/kit items.
- `/services/asthi-visarjan` remains a service landing placeholder only.
- `/admin/products` and `/admin/services` show read-only catalog records.

After pulling Phase 2 changes, run:

```bash
npm run prisma:migrate
npm run prisma:seed
```

Demo catalog routes:

- `/shop`
- `/product/raksha-bandhan-puja-thali`
- `/product/rudraksha-mala`
- `/product/rudrabhishek-puja-service`
- `/services`
- `/services/asthi-visarjan`
- `/admin/products`
- `/admin/services`

Still intentionally excluded in Phase 2:

- Cart and checkout
- Payments
- Wallet redemption or wallet ledger
- Inventory stock deduction or ledger
- Service booking capacity
- Asthi application documents, payment, status, or fulfillment workflow

## Phase 3 Cart & Checkout Quote

Phase 3 adds a functional authenticated cart and a checkout review shell:

- Product and service detail pages can add active catalog items to cart.
- Public browsing does not require login.
- Logged-out public pages show Login and Signup.
- Logged-in public pages show Dashboard and Logout.
- Cart supports both guest session carts and logged-in user carts.
- Guest cart is tracked with a signed cart cookie.
- `/cart` is public and shows cart items, quantity, subtotal, quantity update, and remove actions.
- `/checkout` requires login and shows a quote/review shell only.
- Guest carts are linked to the user after login/signup when possible.
- Checkout includes coupon and wallet placeholders.
- Final payable amount equals cart subtotal.
- The checkout CTA is disabled and says `Payment coming in Phase 4`.

After pulling Phase 3 changes, run:

```bash
npm run prisma:migrate
npm run prisma:seed
```

Phase 3 demo flow:

- Open `/product/raksha-bandhan-puja-thali`
- Add the item to cart
- Review `/cart`
- Login with `customer@omdivyadarshan.local` / `Password@123` when checkout asks for authentication
- Continue to `/checkout`

Still intentionally excluded in Phase 3:

- Razorpay, PayPal, payment webhooks, or payment capture
- Orders and order fulfillment
- Inventory reservation or stock deduction
- Service booking capacity
- Asthi application workflow
- Wallet ledger or wallet redemption

## Phase 3B Checkout & Order Draft

Phase 3B converts checkout review into an internal order draft:

- `/checkout` requires login and shows customer identity, cart items, contact fields, address fields, totals, coupon placeholder, wallet placeholder, and disabled payment messaging.
- Submitting checkout creates an `Order` with `payment_pending` status and `not_started` payment status.
- `OrderItem` snapshots product title, SKU, type, quantity, unit price, and line total.
- The active cart is marked `CONVERTED` after order draft creation.
- `/orders` lists the current customer's orders.
- `/orders/[id]` shows customer order detail and blocks other customers.
- `/admin/orders` and `/admin/orders/[id]` provide read-only admin order visibility.

Still intentionally excluded in Phase 3B:

- Payment gateways, payment webhooks, and payment attempts
- Order fulfilment lifecycle
- Inventory reservation or ledger
- Service capacity
- Asthi workflow and document upload
- Wallet ledger, rewards, or redemption

## Phase 3C Inventory Ledger & Reservation

Phase 3C makes physical commerce stock-safe before payment gateway work:

- `InventoryLedger` records inventory movements by physical product variant.
- Active movement types are `initial`, `adjustment`, `reserved`, and `released`.
- Future movement enum values exist for `sold`, `returned`, and `damaged`, but they are not active yet.
- Seed creates opening `initial` stock for seeded physical products only.
- `/admin/inventory` shows available stock, active reserved stock, status, last movement, ledger history, and admin stock adjustment forms.
- Product variant edit pages show computed available/reserved inventory metadata.
- `/shop`, `/product/[slug]`, `/cart`, and `/checkout` show stock pressure for physical products.
- Cart still does not reduce stock.
- Checkout validates stock and creates `reserved` ledger movements inside the order draft transaction.
- `/admin/orders/[id]` shows reservation summary and can manually release active reserved stock for payment-pending orders.

Still intentionally excluded in Phase 3C:

- Razorpay, PayPal, payment webhooks, payment capture, or payment attempts
- Converting reserved stock to sold
- Automatic payment failure/expiry release jobs
- Fulfilment or shipping
- Service capacity
- Asthi workflow and document upload
- Wallet ledger, rewards, or redemption

## UI Refinement Phase 1

UI Refinement Phase 1 improves the presentation and usability of the existing completed flows without expanding backend scope:

- Public storefront pages use stronger headers, cleaner filter panels, and fully clickable catalog cards.
- Product detail pages better separate offering selection, price display, and add-to-cart actions.
- Cart and checkout now use clearer summaries, empty states, stock warnings, and step-style review sections.
- Customer dashboard and order pages use reusable page headers, status badges, and cleaner order cards.
- Admin dashboard, catalog tables, orders, order detail, and inventory pages are cleaner and more readable.
- Shared lightweight UI components were added for page headers, panels, badges, empty states, links, and summary rows.

Still intentionally deferred:

- Payment gateways and webhooks
- Payment capture or payment attempts
- Fulfilment/shipping
- Service capacity
- Asthi workflow/documents
- Wallet ledger, rewards, or redemption

## Admin Operations Foundation

This phase strengthens the admin panel as an internal CMS and operations console without crossing into payments or fulfilment:

- `/admin` now shows operational metrics, recent order drafts, low-stock attention, customer count, and incomplete kits.
- `/admin/orders` supports search and filters by customer/order data, order status, payment status, and created date.
- `/admin/orders/[id]` shows customer contact, items, reservation movements, total, timeline, internal admin notes, and draft cancellation.
- Draft cancellation is limited to `payment_pending` orders and releases active stock reservations. It does not capture payment, refund, or fulfil.
- `/admin/customers` lists customer accounts with search, status, roles, and order count.
- `/admin/customers/[id]` shows profile metadata, roles, recent orders, and active cart support visibility.
- Kit products now have a kit component builder on the product edit page.
- Product variants now support a configurable low-stock threshold.
- `/admin/inventory` supports stock state, movement type, and SKU/product search filters.

Still intentionally excluded:

- Razorpay, PayPal, payment webhooks, payment attempts, payment capture, or refunds
- Order fulfilment, shipping labels, delivery lifecycle, or vendor assignment
- Automatic inventory expiry jobs or converting reserved stock to sold
- Service capacity and booking operations
- Asthi application workflow
- Wallet ledger, wallet redemption, rewards, or balance mutation

## Mock Payment Lifecycle

The app now has a provider-style mock payment lifecycle so ecommerce orders can move beyond draft status without adding Razorpay or PayPal yet:

- `PaymentAttempt` stores mock provider payment sessions for an order.
- `PaymentEvent` stores deterministic mock provider events with idempotency protection.
- Customer order detail can start or retry a mock payment for eligible orders.
- Mock success is processed through backend event handling, marks the order confirmed, marks payment succeeded, converts active reserved stock to sold, and clears the reservation.
- Mock failure/cancel/expiry is processed through backend event handling, marks payment status accordingly, releases active reserved stock, and records timeline activity.
- Admin order detail shows payment attempts, payment events, stock movement, and legacy membership subscription records when present.
- Legacy membership products can still create `MembershipSubscription` records from older order flows; the active MVP membership engine uses separate `MembershipPlan` and `UserMembership` records.
- Kit orders snapshot configured `KitComponent` records into order item metadata. Physical kit components are reserved/sold/released by component variant when components exist.
- Kits without configured components keep a `kit_only_todo` snapshot and continue to behave as before.

Manual mock payment test flow:

1. Add a product or kit to cart.
2. Checkout to create a `payment_pending` order.
3. Open `/orders/[id]`.
4. Click `Start mock payment`.
5. Click `Simulate success` to confirm payment and sell reserved stock.
6. For retry testing, create another order, start mock payment, then click `Simulate failure` or `Simulate cancel`; stock reservations are released and retry remains available where appropriate.
7. Open `/admin/orders/[id]` to inspect attempts, events, activities, and inventory movements.

Still intentionally excluded:

- Real Razorpay, PayPal, payment webhooks, payment capture, or refunds
- Wallet ledger or wallet redemption
- Fulfilment, shipping labels, courier API, or delivery lifecycle automation
- Service capacity and booking operations
- Asthi application workflow

## Admin Search Foundation

The admin panel now has two search layers for day-to-day operations:

- The sticky admin header includes a master search box that opens `/admin/search`.
- `/admin/search` searches across products, services, categories, customers, orders, mock payments, requests, documents, assignments, Asthi applications, Kundli orders, memberships, tags, festivals, promotions and capacity slots.
- `/admin/products`, `/admin/services`, and `/admin/categories` include local module search for faster catalog work.
- Existing operational pages such as orders, customers, payments and documents keep their own filters.

This is a database-backed admin search foundation only. It does not add external search infrastructure, AI search, provider integrations or new business workflow.

## Membership Maturity v1

The membership engine now supports real operational membership management without external providers:

- Active same-plan renewal extends the membership from the current expiry date.
- Expired same-plan renewal restarts membership from the current date.
- Higher paid plan changes are treated as upgrades through the existing mock membership confirmation flow.
- Unsafe active paid downgrades are routed into `MembershipRequest` for admin review instead of silently changing entitlement.
- Customers can request cancellation from `/membership`; admin approval changes the membership status to cancelled.
- `MembershipBenefitUsage` records benefit consumption with scope, related module and related record metadata.
- `/membership` shows active plan, expiry, benefits, usage, remaining usage where limited, renewal CTA, cancellation CTA and pending requests.
- `/dashboard` shows active membership expiry and recent benefit usage count.
- `/admin/memberships` supports plan editing, request review, status/history visibility and recent benefit usage.
- `/admin/customers/[id]` shows the newer `UserMembership` engine alongside legacy product-order membership subscriptions.

Still intentionally excluded:

- Real Razorpay/PayPal membership billing
- Real refunds or proration
- Wallet credits/reversals
- Provider notifications
- Automatic benefit consumption across every module

## Puja / General Service Booking Maturity v1

Generic Puja and general services now have a reusable booking engine separate from Asthi and Kundli:

- Public service detail pages are available at `/services/[slug]` for `Product.type === "SERVICE"` records.
- Asthi service slugs continue to use the dedicated `/services/asthi-visarjan` engine.
- Customers can start a service booking with package/variant, preferred date/time, place, participant count, quantity and instructions.
- Capacity slots are reused when selected. If no slot is selected, booking enters manual review mode.
- Capacity is held on booking start, confirmed on mock payment success and released on mock payment failure where applicable.
- Customer review/payment shell is available at `/service-bookings/[id]/review`.
- Customer tracking is available at `/service-bookings/[id]`.
- Admin queue is available at `/admin/service-bookings`.
- Admin detail supports status updates, internal/customer-visible notes, assignment panel and document/proof/report panel.
- Customer dashboard shows active Puja/general service bookings separately from Asthi and Kundli.
- Required samagri, related products and related services use the existing tag/context recommendation helpers.
- Audit logs, service booking activity and customer events are written for key actions.

Still intentionally excluded:

- Real payment gateway integration
- Real notification providers
- Real courier or proof delivery integrations
- Asthi/Kundli rewrite into generic services
- Full service form builder

## Service Capacity Queue & Limit Rules v1

Service bookings now have a reusable capacity limit and queue layer for operational control:

- `/admin/service-capacity-rules` manages active/inactive daily, weekly, monthly and total limits for service products, variants/packages, dates/ranges and locations.
- Booking creation evaluates selected slots and matching capacity rules before payment.
- If capacity is full, the booking is not rejected. It moves to `Queued`, receives a queue position, keeps the requested service/date/location/package, and payment stays closed until operations promotes it.
- Queue order is first-come-first-serve with an admin priority flag available for exceptions.
- `/admin/service-bookings` shows queue position, priority, capacity status and queue reason with filters.
- `/admin/service-bookings/[id]` supports priority add/remove and manual promotion. Promotion re-checks capacity and can use a clearly audited manual override.
- Customer tracking at `/service-bookings/[id]` shows waitlist status, queue position and next step.
- Capacity release is tied to terminal admin status changes where a booking had held/confirmed slot capacity.
- Audit logs and service booking activities are written for rule create/update, queue entry, priority changes, promotion and capacity release.

Still intentionally excluded:

- Automatic queue promotion jobs
- External calendars or provider scheduling
- Real notification providers
- Asthi/Kundli rewrite into generic service booking

## Reschedule Request Shell v1

Generic Puja/general service bookings now support an admin-reviewed reschedule request flow:

- Customers can request a new preferred date, time, slot or place from `/service-bookings/[id]` when the booking is submitted, confirmed, scheduled or assigned.
- A request records the current booking snapshot and requested schedule. The booking itself does not change until admin approval.
- `/admin/reschedule-requests` shows the operational queue with filters, capacity preview, customer reason and booking links.
- Admin can approve, reject, approve to queue when capacity is full, or approve a priority exception with an audit trail.
- Approval re-checks capacity, releases the old slot capacity when needed, reserves/confirms the new slot when available, and updates the service booking schedule.
- Customer tracking and dashboard surfaces show pending/queued reschedule state.
- Service booking activity, reschedule activity, audit logs and customer events are written for request, approval, rejection, queue move and priority exception.

Still intentionally excluded:

- Automatic calendar/provider scheduling
- Customer self-confirmed schedule changes
- Real WhatsApp/SMS/email notifications
- Asthi/Kundli rewrite into generic reschedule flow

## Membership Benefits & Rules Editor v1

Membership is now business-controlled from `/admin/memberships`:

- Admin can edit plan basics, price, duration, status, featured state, sort order and membership flow flags.
- Admin can create, edit, deactivate and reactivate benefits with guided fields for type, scope, value, usage limit, reset period, validity and customer visibility.
- Admin can create, edit, deactivate and reactivate guided rules without editing raw JSON.
- Rule evaluation is centralized in `lib/membership.ts` through `getMembershipPlanConfig`, `evaluateMembershipRulesForScope`, `checkMembershipBenefitEligibility` and `recordMembershipBenefitUsage`.
- The preview panel on `/admin/memberships` evaluates a member, scope and sample amount without consuming benefits.
- Customer `/membership` and `/dashboard` read live configured benefits, so admin edits affect future visibility without requiring repurchase.
- `/admin/customers/[id]` shows configured benefit usage and remaining counts for support review.
- Plan, benefit and rule changes write `AuditLog`.

Still intentionally excluded:

- Automatic membership discount stacking across checkout
- Wallet crediting or real cashback ledger
- Provider billing, refunds or notifications
- Per-customer custom overrides
- Advanced membership analytics

## Internal Task Checklist Layer v1

Operations now has a reusable checklist layer for workflow discipline across service-commerce work:

- `/admin/checklists` manages checklist templates and template steps.
- Default templates are seeded for Asthi applications, Puja/service bookings, Kundli report delivery, product order fulfilment, document review and proof/report delivery.
- Admin detail pages for service bookings, Asthi, Kundli and orders auto-create checklist instances from the active template for that work type.
- Checklist items support pending, in progress, completed, skipped and blocked states.
- Items can be required/optional, assigned to a user or role, given due dates from template SLA offsets and marked as customer-visible milestones.
- `/admin` and `/admin/queues` show pending, overdue, blocked and required-waiting checklist counts.
- Customer-visible milestones appear on order, service booking, Asthi and Kundli tracking pages only when a step is explicitly marked customer-visible.
- Checklist actions write checklist activity and audit logs.

Still intentionally excluded:

- Workflow automation engine
- Drag-and-drop workflow builder
- Notification reminders
- SLA escalation automation
- Approval chains
- External provider integrations
