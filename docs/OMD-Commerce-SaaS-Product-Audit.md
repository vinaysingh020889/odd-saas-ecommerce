# OMDivyaDarshan Commerce SaaS Product Audit

Last updated: June 27, 2026

## 1. Executive Summary

OMDivyaDarshan Commerce SaaS is now a broad, modular transactional platform for `app.omdivyadarshan.org`.

The application has moved well beyond a basic ecommerce demo. It now behaves like a combined commerce, service booking, devotional operations, membership entitlement, content-discovery, and admin-control platform. It supports product commerce, kits, services, Asthi Visarjan, Kundli, memberships, festivals, merchandising, offers, smart search, recommendations, mock payments, inventory, service capacity, rescheduling, documents, requests, customer CRM, audit logs, internal queues, reporting shells, and first-party event tracking.

The system is still intentionally not production-ready for money movement and external operations because real payment gateways, wallet ledger, courier integration, notifications, private object storage, real report generation, provider webhooks, and final security hardening are not yet connected.

Current product stage:

> Strong mock-commerce and service-commerce SaaS platform with working admin operations, membership control, mock payment lifecycle, service capacity and document shells. Ready for internal demo, workflow validation, and next-phase provider/infrastructure planning.

## 2. Product Positioning

This app is the transactional engine for OMDivyaDarshan.

WordPress remains suitable as the public discovery, SEO, blog, and editorial layer. The Next.js SaaS app is responsible for authenticated and transactional workflows:

- Public storefront browsing
- Product, service, kit, festival, and category discovery
- Customer login, signup, dashboard, orders and addresses
- Cart, checkout, coupons, quote, mock payment, order tracking
- Product inventory, kit component inventory, reservation/sold/release behavior
- Membership plans, benefits, usage and rules
- Asthi Visarjan application workflow
- Kundli package/order workflow
- Generic Puja/general service booking workflow
- Service capacity, queue and reschedule operations
- Admin catalog, merchandising, orders, requests, documents, assignments, reports and audit logs
- Smart search, tags, recommendations and customer event tracking

Strategic potential:

- Can become the transactional backend for spiritual ecommerce, seva booking, membership-led loyalty, festival merchandising, and operations-heavy fulfilment.
- Can support many devotional brands or tenants later because the core schema is tenant-aware.
- Can evolve into a strong CMS-commerce hybrid where admins control catalog, homepage layout, festivals, promotions, tags, search context, memberships and service operations.
- Can become provider-ready later for payments, notifications, courier, storage, invoices and reporting without needing to restart the product architecture.

## 3. Technology Stack

Application:

- Next.js App Router
- React Server Components
- Server Actions
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL

Authentication and access:

- Custom email/password auth
- Password hashing
- Signed cookie session
- Customer route protection
- Admin route protection
- Role and permission shell for future RBAC depth

Configuration:

- `.env`
- `.env.example`
- `lib/env.ts`
- Tenant config under `tenants/omdivyadarshan/tenant.config.ts`
- Tenant slug: `omdivyadarshan`

Design system:

- OMD spiritual palette: deep brown, saffron, temple gold, ivory cream, sand, muted brown, success green, error red, ops blue
- Shared UI primitives in `components/ui.tsx`
- Customer header/navigation
- Admin sidebar operations console
- Premium storefront and product detail components

## 4. High-Level Architecture

Route groups:

- `app/(public)` for storefront and public entry flows
- `app/(app)` for authenticated customer account pages
- `app/admin` for admin, operations and CMS routes
- `app/api/public` for public JSON APIs

Core helper layers:

- `lib/auth/*` for customer auth/session
- `lib/admin-auth.ts` for admin auth gate
- `lib/catalog.ts`, `lib/storefront.ts` for catalog data
- `lib/cart.ts`, `lib/cart-actions.ts` for cart
- `lib/order-actions.ts` for checkout/order lifecycle
- `lib/mock-payment-provider.ts`, `lib/payment-actions.ts` for mock payment
- `lib/inventory.ts` for inventory ledger behavior
- `lib/pricing.ts` for offer/coupon/cashback quote
- `lib/membership.ts`, `lib/membership-actions.ts` for membership entitlement and admin rules
- `lib/asthi-actions.ts` for Asthi workflow
- `lib/kundli-actions.ts` for Kundli workflow
- `lib/service-booking-actions.ts`, `lib/service-capacity.ts`, `lib/service-capacity-rules.ts` for service booking and capacity
- `lib/reschedule-actions.ts`, `lib/reschedule-requests.ts` for service reschedule review
- `lib/documents.ts` for operational document placeholders
- `lib/merchandising.ts` for homepage/festival/promotion control
- `lib/tags.ts`, `lib/tag-actions.ts`, `lib/tag-relations.ts` for tag/context graph
- `lib/search.ts` for smart search
- `lib/recommendations.ts` for tag-based related products/services
- `lib/customer-events.ts` for first-party event and interest tracking
- `lib/admin-search.ts` for admin master search
- `lib/admin-hardening-actions.ts` for roles, notes and admin hardening actions
- `lib/status-labels.ts` for friendly status display

## 5. Route Inventory

Public/customer discovery:

- `/`
- `/shop`
- `/shop/category/[slug]`
- `/product/[slug]`
- `/services`
- `/services/[slug]`
- `/services/asthi-visarjan`
- `/festivals/[slug]`
- `/membership`
- `/membership/[slug]/review`
- `/kundli`
- `/kundli/apply`
- `/search`
- `/cart`
- `/checkout`
- `/login`
- `/signup`
- `/wallet`

Authenticated customer:

- `/dashboard`
- `/addresses`
- `/orders`
- `/orders/[id]`
- `/asthi/[id]`
- `/asthi/[id]/review`
- `/asthi/[id]/complete-details`
- `/kundli/[id]`
- `/kundli/[id]/review`
- `/kundli/[id]/complete-details`
- `/service-bookings/[id]`
- `/service-bookings/[id]/review`

Admin command and catalog:

- `/admin`
- `/admin/search`
- `/admin/products`
- `/admin/products/new`
- `/admin/products/[id]/edit`
- `/admin/services`
- `/admin/services/new`
- `/admin/categories`
- `/admin/categories/new`
- `/admin/categories/[id]/edit`
- `/admin/tags`
- `/admin/tags/new`
- `/admin/tags/[id]/edit`
- `/admin/reviews`
- `/admin/inventory`

Admin merchandising and offers:

- `/admin/homepage-layout`
- `/admin/festivals`
- `/admin/festivals/new`
- `/admin/festivals/[id]/edit`
- `/admin/promotions`
- `/admin/promotions/new`
- `/admin/promotions/[id]/edit`
- `/admin/offers`
- `/admin/offers/new`
- `/admin/offers/[id]/edit`

Admin operations:

- `/admin/orders`
- `/admin/orders/[id]`
- `/admin/payments`
- `/admin/requests`
- `/admin/service-bookings`
- `/admin/service-bookings/[id]`
- `/admin/service-capacity-rules`
- `/admin/capacity`
- `/admin/reschedule-requests`
- `/admin/assignments`
- `/admin/documents`
- `/admin/asthi`
- `/admin/asthi/[applicationNo]`
- `/admin/kundli`
- `/admin/kundli/[orderNo]`
- `/admin/customers`
- `/admin/customers/[id]`
- `/admin/memberships`
- `/admin/delivery-zones`
- `/admin/shipping-rules`

Admin hardening and insight:

- `/admin/queues`
- `/admin/notifications`
- `/admin/reports`
- `/admin/customer-events`
- `/admin/interest-profiles`
- `/admin/search-insights`
- `/admin/roles`
- `/admin/permissions`
- `/admin/audit-logs`
- `/admin/settings`

Public APIs:

- `/api/public/homepage`
- `/api/public/festivals`
- `/api/public/festivals/[slug]`
- `/api/customer-events`

## 6. Core Data Model

Tenant, auth and governance:

- `Tenant`
- `User`
- `Role`
- `UserRole`
- `AuditLog`

Catalog:

- `Category`
- `Product`
- `ProductVariant`
- `ProductMedia`
- `ProductSpec`
- `ProductFaq`
- `ProductContentBlock`
- `ProductReview`
- `KitComponent`

Commerce:

- `Cart`
- `CartItem`
- `Order`
- `OrderItem`
- `OrderActivity`
- `OrderRequest`
- `PaymentAttempt`
- `PaymentEvent`
- `InventoryLedger`
- `CustomerAddress`
- `ServiceablePincode`

Offers and merchandising:

- `OfferRule`
- `OfferTarget`
- `OfferRedemption`
- `FestivalCampaign`
- `FestivalCampaignProduct`
- `FestivalCampaignCategory`
- `FestivalCampaignService`
- `PromotionPlacement`

Membership:

- `MembershipSubscription`
- `MembershipPlan`
- `MembershipBenefit`
- `MembershipRule`
- `UserMembership`
- `MembershipRequest`
- `MembershipBenefitUsage`
- `MembershipStatusHistory`

Asthi:

- `AsthiLocation`
- `AsthiPackage`
- `AsthiAddOn`
- `AsthiApplication`
- `AsthiDocument`
- `AsthiActivity`
- `AsthiStatusHistory`

Kundli:

- `KundliPackage`
- `KundliOrder`
- `KundliDocument`
- `KundliStatusHistory`

Service operations:

- `ServiceBooking`
- `ServiceBookingActivity`
- `ServiceCapacitySlot`
- `ServiceCapacityRule`
- `ServiceCapacityLedger`
- `RescheduleRequest`
- `RescheduleRequestActivity`
- `Assignment`

Documents:

- `OperationalDocument`
- `DocumentActivity`

Context, discovery and analytics:

- `Tag`
- `TagAlias`
- `TagRelation`
- `SearchQueryLog`
- `CustomerEvent`
- `CustomerInterestProfile`
- `AnonymousInterestProfile`

Admin/CRM:

- `CustomerNote`

## 7. Module Audit

### 7.1 Tenant, Roles and Access

What exists:

- Single tenant seed for OMDivyaDarshan.
- User and role model with admin/customer separation.
- Admin route gate through `requireAdminUser`.
- Role management shell at `/admin/roles`.
- Permission planning shell at `/admin/permissions`.
- Audit log browser at `/admin/audit-logs`.

Potential:

- Can become a real multi-role operations platform with catalog, finance, fulfilment, support, astrologer, pandit and super-admin permission sets.
- Tenant model allows multi-brand expansion later.

Missing:

- Fine-grained RBAC enforcement across every action.
- 2FA and device/session management.
- Admin impersonation controls.
- Production-grade account recovery.

### 7.2 Storefront and Discovery

What exists:

- Premium `/shop` surface with backend-controlled homepage data.
- Category listing pages with filters, stock filter, sort and search.
- Two-level category/subcategory structure using `Category.parentId`.
- Header dropdowns for products and services.
- Festival pages at `/festivals/[slug]`.
- Public APIs for homepage and festival data.
- Smart search at `/search`.

Potential:

- Can become a controlled storefront CMS where business teams manage the homepage, festival promotions, intent blocks, product discovery and seasonal campaigns without code changes.

Missing:

- Full image asset management/upload.
- Advanced faceted filters.
- SEO metadata management for every product/category/festival.
- Search autocomplete and typo tolerance.

### 7.3 Catalog, Products, Services and Kits

What exists:

- Product types for physical, digital, service, membership and kit/package style records.
- Variant support with SKU and pricing.
- Product media gallery by URL.
- Product specs, FAQs and content blocks.
- Product reviews with moderation.
- Kit component builder.
- Product and service admin forms.
- Slug generation/editing patterns.
- Whole-card clickable product cards.
- Admin product/service/category search.

Potential:

- Can support a rich devotional marketplace with physical goods, digital reports, services, kits, memberships and future vendor-led products.
- Kit component inventory is especially important for puja kits and festival bundles.

Missing:

- Bulk import/export.
- Product versioning and approval workflow.
- Vendor/seller portal.
- Advanced attributes/filter taxonomy.
- Media upload/storage pipeline.

### 7.4 Product Detail Page

What exists:

- Premium product detail layout.
- Product gallery using `ProductMedia`.
- Variant display.
- Add to Cart and Buy Now.
- Wishlist action foundation.
- Delivery pincode shell.
- Specs, FAQs, content blocks and reviews.
- Tag chips and context labels.
- Related products, related services and required samagri.

Potential:

- Ready to become a high-conversion spiritual ecommerce PDP once real imagery, policies, and payment/shipping integrations are added.

Missing:

- Final visual QA across all product types.
- Strong media assets for all products.
- Full review submission UX polish.
- Policy data such as return rules, warranty, ritual guidance, packaging details.

### 7.5 Cart, Checkout and Pricing

What exists:

- Guest cart support.
- Auth-required checkout.
- Cart quantity update and remove.
- Coupon input.
- Pricing engine for automatic discounts, coupon discounts and cashback promise.
- Address selection.
- Shipping estimate/manual rule shell.
- Tax/GST snapshot.
- Order creation from cart.

Potential:

- Can support proper ecommerce checkout once payment gateway, invoice PDF and courier integrations are attached.

Missing:

- Real payment method selection.
- Payment gateway capture and webhooks.
- Checkout fraud/risk checks.
- Advanced taxes by state/category/HSN/SAC.
- Cart abandonment automation.

### 7.6 Mock Payment Engine

What exists:

- `PaymentAttempt` and `PaymentEvent`.
- Backend-controlled success/failure/cancel/expiry handling.
- Mock payment popup/panel.
- Retry flow.
- Idempotent mock event behavior.
- Customer and admin payment visibility.
- Inventory sold/release behavior after mock payment event.

Potential:

- The architecture is ready to map to Razorpay/PayPal/provider events later.

Missing:

- Real gateway adapters.
- Webhook signature verification.
- Refund API.
- Settlement/reconciliation.
- Payment failure recovery jobs.

### 7.7 Orders, Fulfilment and Requests

What exists:

- Order lifecycle from payment pending to confirmed/processing/shipped/delivered/cancelled/refunded shell states.
- Admin order detail with customer info, items, payment, attempts/events, inventory, timeline, notes and fulfilment shell.
- Manual courier/tracking placeholders.
- Invoice number/date placeholder.
- Cancellation, return and refund request shell.
- Admin request queue.
- Order activity timeline.

Potential:

- Can become a full order management system when courier, warehouse, returns and refund providers are integrated.

Missing:

- Real fulfilment provider/courier.
- Label generation.
- Pickup/return logistics.
- Real refund execution.
- Invoice PDF and GST-compliant invoice logic.

### 7.8 Inventory and Kits

What exists:

- Inventory ledger.
- Opening stock and adjustments.
- Reservation on checkout.
- Sold conversion on mock payment success.
- Release on failure/cancel/expiry.
- Kit component inventory behavior.
- Low-stock thresholds.
- Admin inventory ledger visibility.

Potential:

- Can support serious physical commerce with kit BOM logic and stock safety.

Missing:

- Purchase orders.
- Warehouse/location inventory.
- Supplier/vendor stock.
- Batch/expiry tracking.
- Automated reservation expiry jobs.

### 7.9 Membership Engine

What exists:

- Dedicated `MembershipPlan`, `UserMembership`, benefits, rules and usage.
- Free activation.
- Paid mock activation.
- Renewal flow.
- Upgrade flow.
- Downgrade request flow.
- Cancellation request flow.
- Benefit usage recording.
- Admin membership visibility.
- Customer membership page and dashboard visibility.
- Membership Benefits & Rules Editor v1:
  - plan basics editor
  - flow flags
  - benefit create/edit/deactivate/reactivate
  - guided rule create/edit/deactivate/reactivate
  - preview/test panel
  - usage remaining display
  - rule evaluation helper

Potential:

- Can become a strong loyalty/entitlement system for recurring devotional engagement, member-only benefits, priority service, Kundli credits, service benefits, support priority and future wallet rewards.

Missing:

- Real subscription billing.
- Auto-renewal.
- Proration/refund.
- Complex stacking with ecommerce offers.
- Per-customer overrides.
- Member segmentation.
- Notification reminders.
- Wallet crediting.

### 7.10 Asthi Visarjan

What exists:

- Dedicated Asthi landing and application flow.
- Package/location/add-on model.
- Mock payment/review shell.
- Complete details step.
- Documents and required proof placeholders.
- Timeline/status history.
- Admin Asthi queue and detail.
- Assignment panel and document panel.
- Active application visibility on the landing page.

Potential:

- Can become a guided high-trust ritual operations product with document verification, family coordination, proof/certificate delivery and on-ground partner workflow.

Missing:

- Real document upload/storage.
- Real payment capture.
- Real notification updates.
- Real operator/pandit mobile workflow.
- Certificate/PDF generation.
- External partner portal.

### 7.11 Kundli

What exists:

- Kundli package model.
- Kundli application/order flow.
- Birth details and partner details where applicable.
- Mock payment/review shell.
- Admin Kundli queue and detail.
- Document/report placeholder shell.
- Assignment panel integration.
- Customer timeline.

Potential:

- Can support astrology products, consultations, matching, report workflows and membership benefits.

Missing:

- Real Kundli calculation/report engine.
- Astrologer workspace.
- Report PDF generation.
- Consultation scheduling integration.
- Real delivery/notification.

### 7.12 Puja / General Service Booking

What exists:

- Generic service detail route `/services/[slug]`.
- Service booking model for Puja/general services.
- Package/variant selection.
- Preferred date/time/location.
- Participant count and quantity.
- Mock payment review.
- Customer tracking page.
- Admin service booking list and detail.
- Assignment and document panels.
- Required samagri and related products/services.

Potential:

- Can become a reusable service booking engine for puja, temple services, guided rituals, consultations and future seva categories.

Missing:

- Full custom service form builder.
- Real calendar integration.
- Vendor/pandit availability.
- Automated notifications.
- Real proof/report upload.

### 7.13 Service Capacity, Queue and Reschedule

What exists:

- Service capacity slots.
- Capacity rules by service, variant, date/range and location.
- Daily/weekly/monthly/total limits.
- Queue behavior when capacity is full.
- Queue position and priority.
- Manual promotion with audit.
- Reschedule request model and activity.
- Customer reschedule request from service booking tracking.
- Admin reschedule queue.
- Capacity re-check on approval.
- Release old capacity and reserve/confirm new capacity.

Potential:

- Can become the operations backbone for high-demand festival services, pandit capacity, temple slots and priority membership service.

Missing:

- Automatic queue promotion jobs.
- Calendar sync.
- Staff/vendor availability matching.
- Customer notification on queue/reschedule updates.
- Capacity analytics.

### 7.14 Documents / Proof / Reports

What exists:

- Generic `OperationalDocument`.
- Document activity.
- Owner types for Asthi, Kundli, order, order item, order request, assignment, service booking, customer, product and general.
- Admin document panel.
- Global `/admin/documents` queue.
- Customer-visible/internal-only visibility.
- Requested/uploaded/review/approved/rejected/reupload/archive states.
- URL/storage-key placeholder fields.

Potential:

- Can become a secure proof/report/document center for all service operations.

Missing:

- Real S3/R2/GCS storage.
- Signed URLs.
- File upload scanning/validation.
- PDF generation.
- Customer upload UX for every owner type.

### 7.15 Tags, Context Graph, Search and Recommendations

What exists:

- Tag foundation with types for deity, festival, puja, ritual, place, tithi, occasion, product use, service type, benefit intent, content topic and material attribute.
- Tag aliases for Hindi/Sanskrit/transliteration/spelling/search variants.
- Generic `TagRelation`.
- Tag selector in product, category, service, festival and promotion admin forms.
- Public tag chips on product, category, services and festival pages.
- Smart search route `/search`.
- Search query logging and `/admin/search-insights`.
- Recommendation helper for related products, related services, required samagri and festival recommendations.

Potential:

- Can power rich spiritual discovery: "Shiv", "Sawan", "Rudrabhishek", "Ganga Jal", "Pind Daan", "Kashi" and similar context-first browsing.

Missing:

- Search autocomplete.
- Synonym weighting UI.
- Manual recommendation curation.
- Personalized recommendations.
- External search service for scale.

### 7.16 Merchandising, Festivals and Promotions

What exists:

- Category homepage intent controls.
- Festival campaign model and public pages.
- Promotion placements.
- Homepage layout control.
- Backend-driven hero, announcement strip, festival focus and intent categories.
- Admin festival/promotion CRUD.
- Tags attached to campaigns/promotions.

Potential:

- Can support seasonal merchandising for Sawan, Shradh, Diwali, Navratri, Raksha Bandhan and future campaigns.

Missing:

- Visual page builder.
- Asset upload pipeline.
- A/B testing.
- Approval/scheduling workflows beyond current status/date fields.

### 7.17 Offers and Discount Center

What exists:

- Automatic offers.
- Coupon offers.
- Product/category/service/membership/kit targeting.
- Flat and percent discounts.
- Max discount and min cart value.
- Cashback promise lines without wallet credit.
- Offer redemption audit snapshot.
- Cart/checkout quote integration.

Potential:

- Can become a strong growth and retention engine once stacked with membership benefits and festival campaigns.

Missing:

- Advanced stacking rules.
- Segment-specific offers.
- Payment-provider cashback/reward settlement.
- Marketing analytics.

### 7.18 Wishlist and Delivery Shell

What exists:

- Wishlist item model and actions.
- Header/product page wishlist state foundation.
- Delivery pincode/serviceable zone shell.
- Admin delivery zone page.
- Shipping rule shell.

Potential:

- Can improve conversion, customer retention and delivery confidence.

Missing:

- Wishlist page polish.
- Real courier serviceability.
- Delivery ETA API.
- COD policy engine.

### 7.19 Address, Shipping, Tax and Invoice Foundation

What exists:

- Customer address book.
- Checkout address selection.
- Order address snapshot.
- Manual shipping estimate/charge shell.
- Tax/GST snapshot fields.
- Invoice number/date placeholder.
- Customer/admin order visibility.

Potential:

- Can become a production ecommerce checkout base with proper tax and invoicing.

Missing:

- PDF invoice.
- HSN/SAC-driven tax engine.
- State/country tax rules.
- Real courier rate service.

### 7.20 Customer Dashboard

What exists:

- Active membership.
- Recent orders and pending payment.
- Active Asthi applications.
- Active Kundli orders.
- Active service bookings.
- Reschedule state hints.
- Default address shortcut.
- Quick actions.
- Recommended next steps.

Potential:

- Can become a unified devotee control center for all purchases, services, rituals, reports and membership benefits.

Missing:

- Notification center for customers.
- Saved wishlist summary.
- Support ticket summary.
- More personalized recommendations.

### 7.21 Admin Dashboard and Operations

What exists:

- Queue-first admin overview.
- Operational cards for Asthi, Kundli, memberships, orders, payments, stock and kits.
- Service booking and reschedule queue counts.
- Admin sidebar grouped by command, catalog, merchandising, operations, finance and system.
- `/admin/queues` SLA-style attention view.
- `/admin/notifications` computed alert shell.
- `/admin/reports` metrics shell.

Potential:

- Can become a true back-office operations cockpit.

Missing:

- Role-specific dashboards.
- SLA timers/escalations.
- Bulk actions.
- Exportable reports.

### 7.22 Customers and CRM Visibility

What exists:

- Customer list/search.
- Customer detail with orders, active cart, roles, notes, memberships, Asthi, Kundli, documents, assignments and timeline.
- Internal notes.
- Interest profile.
- Recent customer events.
- Membership benefit remaining visibility.

Potential:

- Can become an internal support CRM and customer success console.

Missing:

- Support ticketing.
- Customer segmentation.
- Communication history.
- Consent/privacy controls.

### 7.23 Admin Hardening

What exists:

- Role management UI.
- Permission matrix shell.
- Audit log browser.
- Admin queue filters/SLA view.
- Customer notes.
- Notification center shell.
- Reports dashboard shell.

Potential:

- Strong foundation for moving from demo/admin convenience into controlled operations.

Missing:

- Fine-grained permission enforcement.
- Security event review.
- Admin action approval flows.
- 2FA.

### 7.24 Customer Event and Interest Tracking

What exists:

- First-party customer events.
- Anonymous and user-based tracking.
- Product/category/service/festival/tag/search/add-to-cart/checkout/order/membership/service booking events.
- Customer interest profile recomputation.
- Admin event view.
- Interest profile admin view.
- Report widgets for high-intent users and top activity.

Potential:

- Can drive personalization, merchandising, retargeting and support context.

Missing:

- Consent manager.
- Data retention policy.
- Event export.
- Advanced analytics.

### 7.25 Wallet Boundary

What exists:

- Wallet client remains disabled/mock.
- Wallet placeholders are visible where useful.
- Cashback promise is calculated but not credited.

Potential:

- Can later become a dedicated wallet/rewards service.

Missing:

- Wallet ledger.
- Balance.
- Credit/debit/reversal.
- Expiry.
- Compliance and reconciliation.

## 8. Current End-to-End Customer Journeys

Ecommerce:

1. Browse `/shop` while logged out.
2. Open category or product detail.
3. Add to cart or Buy Now.
4. Login/signup before checkout/payment where required.
5. Select address.
6. Apply coupon.
7. Review shipping/tax/quote.
8. Create order.
9. Start mock payment.
10. Simulate success/failure/cancel.
11. Track order in `/orders/[id]`.
12. Raise cancellation/return/refund request where eligible.

Membership:

1. Open `/membership`.
2. Activate free plan or confirm paid mock membership.
3. Renew active/expired plan.
4. Request cancellation or downgrade where applicable.
5. View active benefits, usage and remaining counts.
6. Admin edits benefits/rules and customer sees updated configured benefits.

Asthi:

1. Open `/services/asthi-visarjan`.
2. Apply for package/location/add-ons.
3. Review mock payment.
4. Complete family/details.
5. Track application, documents and timeline.
6. Admin progresses documents, schedule, proof and status.

Kundli:

1. Open `/kundli`.
2. Apply for package.
3. Review mock payment.
4. Complete birth/partner details.
5. Track report/consultation state.
6. Admin assigns, updates documents/report placeholders and timeline.

Generic service booking:

1. Open `/services/[slug]`.
2. Choose package/variant, date/time/place and quantity.
3. If capacity is full, booking is queued.
4. If payment is required, confirm mock payment.
5. Track booking.
6. Request reschedule if eligible.
7. Admin approves/rejects/queues/priority-excepts the request.

## 9. Current End-to-End Admin Journeys

Catalog and merchandising:

1. Create categories/subcategories.
2. Create products/services/kits.
3. Add variants, media, specs, FAQs, content blocks and tags.
4. Configure kit components.
5. Configure homepage intent categories.
6. Configure festivals, promotions and homepage layout.
7. Configure offers/coupons.

Commerce operations:

1. Monitor `/admin/orders`.
2. Open order detail.
3. Review payment attempts/events.
4. Review inventory movements.
5. Move fulfilment status.
6. Add tracking placeholders.
7. Review customer requests.
8. Review documents and assignments.

Service operations:

1. Configure capacity slots and rules.
2. Monitor `/admin/service-bookings`.
3. Promote queued bookings.
4. Assign work.
5. Add document/proof placeholders.
6. Handle reschedule requests.

Membership operations:

1. Open `/admin/memberships`.
2. Edit plan basics and flow flags.
3. Create/edit/deactivate/reactivate benefits.
4. Create/edit/deactivate/reactivate guided rules.
5. Preview rule evaluation for a member/scope/amount.
6. Review cancellation/downgrade requests.
7. Inspect customer membership usage from customer detail.

Admin hardening:

1. Manage user roles.
2. Review permission matrix.
3. Browse audit logs.
4. Check queues, notifications and reports.
5. Review customer events and interest profiles.

## 10. Validation Status

Recent validation after the latest membership rules editor work:

- `prisma validate` passed.
- `prisma migrate dev --name membership_benefits_rules_editor_v1` passed.
- `prisma generate` passed.
- `prisma seed` passed.
- `tsc --noEmit` passed.
- `eslint .` passed.
- `next build` passed.

Recent migration additions:

- `20260626200506_reschedule_request_shell_v1`
- `20260626202330_membership_benefits_rules_editor_v1`

## 11. What Is Strong Now

Strongest areas:

- Modular app architecture with tenant-aware data.
- Realistic mock ecommerce lifecycle.
- Strong admin operations panel.
- Robust catalog/product foundations.
- Product detail backend maturity.
- Inventory ledger and kit components.
- Membership entitlement and admin rules editor.
- Service booking with capacity, queue and reschedule shell.
- Asthi and Kundli dedicated workflows.
- Documents/proof/report placeholder architecture.
- Tags, smart search and recommendations.
- Merchandising and festival campaign control.
- Admin hardening, audit logs and queue visibility.
- Customer event tracking and interest profiles.

Business value:

- The platform can demonstrate real customer and admin workflows without external providers.
- Business users can now control many surfaces directly: catalog, categories, homepage, festivals, promotions, offers, tags and membership rules.
- Operations can track work across orders, service bookings, Asthi, Kundli, documents, assignments, requests and reschedules.

## 12. What Is Incomplete or Deferred

Critical production blockers:

- Real Razorpay/PayPal integration.
- Payment webhooks and idempotency against real providers.
- Real refunds and reconciliation.
- Wallet ledger and wallet compliance.
- Real courier/shipping integration.
- Real document storage and signed URLs.
- Real PDF invoice/report/certificate generation.
- Notification providers: email, SMS, WhatsApp.
- Fine-grained RBAC enforcement.
- 2FA and production security hardening.
- Production monitoring, backups, rate limiting and audit retention.

Important product gaps:

- Final mobile/UI QA.
- Real product/service imagery.
- Bulk catalog tools.
- Vendor/partner management.
- Advanced search/autocomplete.
- Manual recommendation curation.
- Advanced offer stacking.
- Customer support ticketing.
- Full service calendar/availability engine.
- Staff/pandit/astrologer workspaces.
- Advanced analytics/export.

## 13. Recommended Next Priorities

Priority 1: Internal Task Checklist Layer v1

- Add reusable checklists for admin workflows.
- Attach to order, Asthi, Kundli, service booking, assignment and document owners.
- Helps operations follow step-by-step execution.

Priority 2: Restricted Role Panels v1

- Convert permission shell into practical restricted panels.
- Start with read/write gating for catalog, operations, finance, documents and memberships.

Priority 3: Basic Support / Customer Ops Shell

- Add support requests/tickets.
- Link to customer, order, service booking, Asthi, Kundli and membership.

Priority 4: Cart and Catalog Polish

- Improve category/product management ergonomics.
- Finish media gaps.
- Tighten mobile storefront and product detail QA.

Priority 5: Reports and Analytics Polish

- Add date filters.
- Add export.
- Add funnel snapshots.

Priority 6: Provider Planning, Not Integration

- Map Razorpay/PayPal/courier/storage/notification integration contracts.
- Define webhook and reconciliation architecture before implementation.

Priority 7: Final UI and Mobile QA

- Cross-device QA for customer and admin.
- Polish responsive overflow, form density and page hierarchy.

## 14. Production Readiness Assessment

Current readiness:

- Demo readiness: High
- Internal workflow validation: High
- Admin CMS/control readiness: Medium-high
- Production ecommerce readiness: Medium
- Production payment readiness: Low
- Production fulfilment readiness: Low
- Production security readiness: Medium-low

The application has a strong modular backbone and many working internal flows. It should not yet handle real customer money or private documents in production until external providers, storage, security and compliance layers are implemented.

## 15. Final Product Manager Verdict

OMDivyaDarshan Commerce SaaS is now a serious platform foundation. It is no longer just a storefront. It is becoming a devotional commerce operating system with:

- ecommerce
- service booking
- ritual operations
- membership entitlements
- festival merchandising
- customer CRM
- admin operations
- search/context intelligence
- document/proof/report workflows
- audit and governance shells

The best next move is not to add more visible modules blindly. The best next move is to deepen operational reliability: checklists, role gating, support queues, provider contracts, storage architecture and final UX QA.

In simple terms:

> The product is now strong enough to demonstrate the complete vision. The next phase should make it safer, cleaner and more production-disciplined.
