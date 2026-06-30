# OMDivyaDarshan Commerce SaaS Product Audit

Last updated: June 30, 2026

## 1. Executive Summary

OMDivyaDarshan Commerce SaaS has evolved into a broad devotional commerce and operations platform. It is no longer just a product storefront. It now combines ecommerce, service booking, membership, Asthi Visarjan, Kundli, festival merchandising, admin operations, customer tracking, content enrichment, catalog governance and mock payment workflows in one tenant-aware SaaS foundation.

The platform is currently strongest as an internal demo, workflow validation and product architecture foundation. It has a real data model, admin surfaces, seeded journeys, customer-facing routes, mock payment/order flows, operational queues and CMS-like merchandising controls. It is not yet production-ready for real money movement or automated external fulfilment because live payment, wallet ledger, courier, storage, notifications, compliance, observability and final security hardening are still pending.

Current product stage:

> Advanced mock-commerce and devotional operations SaaS foundation with a strong admin backbone, premium storefront improvements, and multiple service-commerce workflows. Ready for internal validation and controlled demos; not ready for live paid production without provider and infrastructure integration.

## 2. Strategic Positioning

The SaaS app should be treated as the transactional engine for OMDivyaDarshan.

WordPress or a marketing CMS can remain useful for public SEO, articles, blogs, long-form spiritual education, landing pages and organic acquisition. This Next.js SaaS platform should own authenticated and transactional experiences:

- Shopping and product discovery
- Category-led storefront browsing
- Product detail pages and content blocks
- Cart, checkout and order tracking
- Membership purchase and benefits
- Service applications and booking flows
- Asthi Visarjan workflow
- Kundli report and consultation workflow
- Admin operations and queues
- Merchandising, homepage sliders and promotional sections
- Customer dashboard and CRM-like admin visibility
- Internal analytics and interest tracking

Strategic potential:

- Can become a specialized devotional commerce operating system, not just an ecommerce site.
- Can support products, services, rituals, memberships, reports, applications and future spiritual content subscriptions.
- Can grow into a multi-tenant SaaS if tenant isolation, billing, theme management and tenant onboarding are completed.
- Can power both B2C and operations-heavy assisted workflows where human review and customer communication matter.
- Can become a strong admin-led CMS-commerce hybrid with category hero controls, homepage hero slides, festival campaigns, product content blocks and service workflow modules.

## 3. Current Scope Snapshot

Public/customer surfaces now include:

- `/shop` as the practical storefront home.
- `/` redirecting into the commerce home experience.
- Full-width premium homepage hero slider backed by admin-managed hero slides.
- Premium two-row customer header with profile dropdown, wallet/cart icons and search.
- Category product listing pages with editable category hero content, inline filters, quick chips, sort and grid/list controls.
- Product detail pages with backend-driven content blocks, specs, FAQs and reviews section.
- Product, kit and service catalog cards.
- Cart and checkout with mock payment lifecycle.
- Customer dashboard, orders, addresses and wallet shell.
- Kundli package browsing, apply, review and details completion flows.
- Asthi Visarjan application and tracking flows.
- Service booking and review flows.
- Membership listing and membership review flow.
- Festival detail routes and related merchandising.
- Search route backed by smart search and query logging.

Admin surfaces now include:

- Admin overview and operations console.
- Admin master search.
- Catalog management for products, services, categories, tags, reviews and inventory.
- Category edit with category hero/homepage intent controls.
- Homepage hero slides management.
- Homepage layout and merchandising controls.
- Festival, promotions and offers management.
- Orders, payments, requests and operational queues.
- Service bookings, capacity rules, capacity slots and reschedules.
- Asthi applications and Kundli orders.
- Kundli package editor at `/admin/kundli/packages`.
- Assignments, checklists and operational documents.
- Customers, memberships, customer events and interest profiles.
- Roles, permissions shell, audit logs, settings and reports shells.

## 4. New and Recently Enhanced Modules

### 4.1 Homepage and Storefront Foundation

Recent enhancements:

- `/shop` is effectively the home/storefront entry experience.
- The standalone `Shop` nav item was identified as redundant because the logo and home flow already point to `/shop`.
- Full-width hero slider added to the storefront and connected to admin-managed hero slides.
- Slider supports backend content, images, CTA labels, themes and multiple slide intents.
- Header was restyled into a two-row premium red/brown gradient menubar with icon grouping.
- Header search text visibility was fixed so typed text is readable.
- Horizontal overflow issues were fixed so the header and hero align without page-level sideways scrolling.
- Seasonal/promo strip was moved below the hero and made dismissible.
- Storefront footer was added for a more complete page experience.

Strength:

The storefront now feels closer to a premium commerce experience rather than a technical demo.

Weakness:

The information architecture still needs final product decisions: `/shop` is the home page, but naming and navigation should be cleaned so users do not wonder why a `Shop` button exists on the shop/home page.

### 4.2 Hero Slides Admin

Implemented:

- `HeroSlide` Prisma model and enums.
- Migration and seed data for initial slides.
- Admin list, new and edit routes.
- Storefront slider components.
- Real `/shop` homepage hero rendering.
- Full-width slider treatment and responsive behavior.

Potential:

Hero slides can become the main merchandising layer for festivals, campaigns, category pushes, services, products and membership promotions.

Weakness:

The module is still basic CMS. It does not yet include scheduling windows, A/B testing, per-audience targeting, device-specific cropping UI or analytics per slide.

### 4.3 Category Hero Editing

Recently completed:

- Category edit now clearly exposes **Category Hero and Homepage Intent** fields.
- Admin can edit hero title, hero description and hero image URL within category edit.
- Public category page now uses:
  - `homepageIntentTitle` for hero title with category name fallback.
  - `homepageIntentDescription` for hero description with category description fallback.
  - `homepageIntentImage` for hero visual with product image fallback.
- Category save revalidates the category page.

Potential:

This makes category pages CMS-like and keeps category enhancement centralized in category admin rather than scattering hero content into a separate system.

Weakness:

The field names are still reused from homepage intent internally. A future schema cleanup could rename these to more neutral `heroTitle`, `heroDescription`, `heroImageUrl` while preserving homepage intent fields separately.

### 4.4 Category Product Listing UX

Recently enhanced:

- Removed subcategory promotion block from category listing pages.
- Moved quick filters into the listing toolbar.
- Kept sort and grid/list controls on the right side of the listing toolbar.
- Moved detailed filters into the listing card instead of a separate left sidebar.
- Removed the word `Listing` from the card header.
- Product grid now uses full width instead of being squeezed by a sidebar.
- Membership/promo card no longer interrupts product rows; it now appears near the bottom above the footer area.
- Product cards were tightened for better grid alignment, stable image ratio and bottom-aligned actions.

Potential:

This creates a cleaner catalog browsing page that is closer to modern ecommerce category UX.

Weakness:

Grid/list controls are still mostly visual. A real list view mode and persisted view preference should be added later.

### 4.5 Product Detail Page Content System

Recently enhanced:

- Product detail tabs now follow backend content blocks rather than hardcoded placeholder tabs.
- If only one content block exists, the title and body come directly from that block.
- Reviews stay separate and correctly show zero-review state without fake stars.
- Removed unwanted context label around tag pills.
- Product/storefront image rendering remains fixed.

Potential:

This gives admins a real product storytelling mechanism: usage, contents, ritual note, care, FAQs and specs can become structured PDP content.

Weakness:

The PDP content editor is still basic. It lacks rich text, media blocks, ordering previews, SEO schema generation and validation for repeated/empty sections.

### 4.6 Kundli Packages and Kundli Operations

Implemented/enhanced:

- Dedicated `KundliPackage` model exists separately from normal products/services.
- Public `/kundli` page reads active Kundli packages from the database.
- Seed includes packages like Online Kundli Report, Handmade Kundli, Detailed Life Report, Kundli Matching and Consultation + Report.
- Admin Kundli orders queue exists at `/admin/kundli`.
- New Kundli package editor exists at `/admin/kundli/packages`.
- `/admin/kundali` redirects to `/admin/kundli` to prevent spelling-based 404.
- `/admin/kundli` now has an Edit packages action.

Potential:

Kundli can become a standalone report-commerce workflow with intake, mock payment, birth detail collection, assignment, report upload and consultation scheduling.

Weakness:

Kundli packages are not unified with products/services. That is acceptable for now, but it can confuse admins. Long term, the product needs a clear decision: keep Kundli as a dedicated service module or make packages service products with a specialized workflow layer.

### 4.7 Admin Navigation and Header/User Controls

Enhanced:

- Customer profile menu now groups dashboard, support, admin and logout.
- Wallet and cart are visible near profile controls.
- Header search visibility fixed.
- Admin sidebar includes Kundli Packages.
- Public header is more premium and aligned with the storefront hero.

Weakness:

Navigation still needs a final product IA pass. Some modules are shells, some are live flows, and some labels may not match business language yet.

## 5. Core Platform Modules

### 5.1 Catalog

Capabilities:

- Products, services and kits.
- Category hierarchy with parent and child categories.
- Category hero and homepage intent metadata.
- Product variants, pricing, MRP, images and inventory connection.
- Product specs, FAQs and content blocks.
- Featured flags and sort order.
- Product/service tagging.

Strength:

The catalog is broad enough to support both commerce and service workflows.

Weakness:

Admin UX needs deeper media management, bulk operations, import/export, SEO controls, publishing previews and stronger validation.

### 5.2 Cart, Checkout and Orders

Capabilities:

- Customer cart.
- Checkout shell.
- Mock payment flow.
- Order creation and tracking.
- Order admin queue.
- Order requests for cancellation/return/refund shells.
- Inventory movements and order activity records.

Strength:

Good internal lifecycle structure exists for ecommerce validation.

Weakness:

No live Razorpay, PayPal, UPI, wallet settlement, invoice PDF, tax engine, courier pickup, refund automation or webhook reconciliation is connected.

### 5.3 Inventory

Capabilities:

- Product variant stock tracking.
- Inventory ledger style movements.
- Admin inventory visibility.
- Product stock badges.

Strength:

Enough for demo and operational thinking.

Weakness:

Needs real warehouse/location support, low-stock notifications, batch/expiry, purchase orders, returns-to-stock, vendor stock and reconciliation tools.

### 5.4 Membership

Capabilities:

- Membership plans, benefits, rules and user memberships.
- Membership review/purchase flow with mock payment.
- Membership requests and admin view.
- Benefit usage structures.

Strength:

Membership is modeled as more than a static product. It can become loyalty, entitlement and premium support.

Weakness:

Needs real billing, renewals, proration, failed payment handling, membership upgrade/downgrade automation, benefit redemption UI and communication triggers.

### 5.5 Asthi Visarjan

Capabilities:

- Asthi locations, packages and add-ons.
- Customer application flow.
- Mock payment/reference handling.
- Admin queue and application detail.
- Documents and status history.
- Assignment/checklist integration.

Strength:

This is one of the strongest differentiators because it models a sensitive assisted-service workflow.

Weakness:

Needs real document upload, secure storage, identity/privacy handling, customer notifications, provider/vendor assignment and clear SLA communication before production.

### 5.6 Kundli

Capabilities:

- Database-backed Kundli packages.
- Public package cards.
- Apply/review/details flow.
- Admin order queue.
- Package editor.
- Document/report placeholder support.

Strength:

Good base for digital/report commerce.

Weakness:

No real astrology calculation/report generation, astrologer workbench, file generation, consultation calendar or delivery automation.

### 5.7 Service Bookings and Capacity

Capabilities:

- Service booking flows.
- Service capacity rules and slots.
- Queue behavior and manual promotion.
- Reschedule request handling.
- Assignment and activity records.

Strength:

The system anticipates operations constraints rather than treating services like simple products.

Weakness:

Needs calendar integration, provider availability, customer time-slot selection, notifications and no-show/cancellation policy logic.

### 5.8 Documents, Checklists and Assignments

Capabilities:

- Operational documents shell.
- Document status and activity.
- Assignment records for work routing.
- Checklists and checklist activities.
- Admin queues and detail panels.

Strength:

This gives the product an operations backbone.

Weakness:

Currently URL/storage-key placeholder based. It needs real private file upload, signed URLs, virus scanning, audit retention and access policies.

### 5.9 Tags, Search and Recommendations

Capabilities:

- Tenant-scoped tag graph.
- Tag aliases.
- Tag relations across products, categories, services, festivals and promotions.
- Smart search route and search insights.
- Related product/service recommendations.
- Customer events and interest profiles.

Strength:

This can become a powerful discovery layer for devotional intent, ritual context and festival shopping.

Weakness:

Search is still database/basic relevance. It needs typo tolerance, synonyms, language support, ranking tuning, analytics feedback loops and possibly a dedicated search provider later.

### 5.10 Merchandising, Festivals, Promotions and Offers

Capabilities:

- Homepage hero slides.
- Homepage layout shell.
- Festival campaigns.
- Promotion placements.
- Offer rules, targets and redemptions.
- Promo strips and merchandising cards.

Strength:

Strong foundation for seasonal commerce.

Weakness:

Needs scheduling, preview mode, campaign performance analytics, targeting, coupon abuse controls and richer merchandising templates.

## 6. Route Inventory

Public and customer routes:

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
- `/kundli/[id]`
- `/kundli/[id]/review`
- `/kundli/[id]/complete-details`
- `/asthi/[id]`
- `/asthi/[id]/review`
- `/asthi/[id]/complete-details`
- `/asthi/apply`
- `/service-bookings/[id]`
- `/service-bookings/[id]/review`
- `/search`
- `/cart`
- `/checkout`
- `/dashboard`
- `/addresses`
- `/orders`
- `/orders/[id]`
- `/wallet`
- `/login`
- `/signup`

Admin routes:

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
- `/admin/homepage-layout`
- `/admin/hero-slides`
- `/admin/hero-slides/new`
- `/admin/hero-slides/[id]/edit`
- `/admin/festivals`
- `/admin/festivals/new`
- `/admin/festivals/[id]/edit`
- `/admin/promotions`
- `/admin/promotions/new`
- `/admin/promotions/[id]/edit`
- `/admin/offers`
- `/admin/offers/new`
- `/admin/offers/[id]/edit`
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
- `/admin/checklists`
- `/admin/documents`
- `/admin/asthi`
- `/admin/asthi/[applicationNo]`
- `/admin/kundli`
- `/admin/kundli/[orderNo]`
- `/admin/kundli/packages`
- `/admin/kundali` redirect
- `/admin/customers`
- `/admin/customers/[id]`
- `/admin/memberships`
- `/admin/delivery-zones`
- `/admin/shipping-rules`
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
- `/admin/vendor-workbench`
- `/admin/assigned-service-work`
- `/admin/my-work`

Public APIs:

- `/api/public/homepage`
- `/api/public/festivals`
- `/api/public/festivals/[slug]`
- `/api/customer-events`

## 7. Technology and Architecture

Current stack:

- Next.js App Router
- React Server Components
- Server Actions
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- Custom session/auth helpers
- Tenant config for OMDivyaDarshan

Architecture strengths:

- Clear route groups for public, customer and admin areas.
- Prisma schema is broad and tenant-aware.
- Server Actions are used for form-based workflows.
- Shared UI primitives and storefront components exist.
- Operational records, status histories, documents, checklists and audit logs are modeled.
- Admin route structure is extensive and maps to real business workflows.

Architecture weaknesses:

- Many modules are still first-version shells.
- Some naming is inherited from earlier phases and should be normalized.
- Field reuse, such as homepage intent fields also powering category hero, should eventually be cleaned.
- Some admin pages need stronger UX cohesion and preview modes.
- Provider integrations are intentionally absent.
- No production observability, queue workers, background jobs or webhook architecture is finalized.

## 8. Business Potential

High-value opportunities:

- Festival commerce: campaign-led shopping, kits, offers and services.
- Assisted seva workflows: Asthi, puja booking, ritual support and document-guided processes.
- Kundli/report commerce: digital products with human review and optional consultation.
- Membership: loyalty, premium support, priority fulfilment, discounts and spiritual content access.
- Category-led devotional discovery: intent-based browsing powered by tags and category hero CMS.
- B2B/vendor extension: vendor workbench, rural subadmin and fulfilment assignments.
- Operations SaaS: assignments, documents, checklists, queues and reporting can become a serious back-office platform.

Most defensible product angle:

> OMDivyaDarshan can become a vertical commerce and operations platform for devotional products and assisted spiritual services, where ecommerce and human-guided workflows live together.

## 9. Major Weaknesses and Risks

### Production readiness gaps

- No live payment gateway.
- No real wallet ledger.
- No courier/shipping provider integration.
- No outbound email, WhatsApp, SMS or push notification provider.
- No private object storage or secure binary upload.
- No PDF invoice/report generation.
- No production monitoring, alerting or backup policy documented in code.
- No rate limiting or bot protection.
- No final security review.

### Product clarity gaps

- `/shop` is the home page, but navigation and naming need final clarity.
- Kundli packages are separate from product/service catalog, which may confuse admins.
- Some admin modules are shells while others are functional; this should be indicated in UI.
- Grid/list toggle is not yet a real mode switch.

### Admin UX gaps

- Media handling is URL-based and lacks upload/crop/preview workflows.
- Bulk edit/import/export is missing.
- No strong preview workflow for homepage, category hero, campaign and product content edits.
- Permissions are not fully enforced at fine-grained action level.
- Admin dashboards need clearer operational priorities and SLA indicators.

### Customer UX gaps

- No real notification loop after order/application actions.
- Dashboard can become overwhelming as modules grow.
- Checkout/payment is mock only.
- Service/Kundli/Asthi progress tracking needs more polished customer-facing milestones.
- Product listing view mode is not fully implemented.

### Data and analytics gaps

- Internal event tracking exists but lacks consent/privacy controls.
- No external analytics integration.
- No funnel analytics or conversion attribution.
- No hero slide/category/product performance reporting.

## 10. Recommended Next Roadmap

### Phase A: Product clarity and polish

1. Finalize navigation semantics around `/shop` as home.
2. Remove redundant `Shop` nav item if `/shop` remains home.
3. Add real list view mode or remove the visual list toggle until it is functional.
4. Add category hero image preview in admin edit.
5. Add product media manager with upload/ordering/primary image UI.
6. Add preview buttons from admin to public pages.

### Phase B: Commerce production core

1. Integrate Razorpay or preferred payment provider.
2. Add payment webhook reconciliation.
3. Add invoice generation.
4. Add refund/cancellation financial workflow.
5. Add wallet ledger or remove wallet until ready.
6. Add delivery/courier integration and tracking.

### Phase C: Service operations production core

1. Add real document upload and private storage.
2. Add customer notifications for status changes.
3. Add provider/astrologer/pandit assignment UX.
4. Add calendar and slot booking for services/consultations.
5. Add SLA dashboards for Asthi, Kundli and service bookings.

### Phase D: Admin governance

1. Harden RBAC per action.
2. Add two-factor authentication for admin.
3. Add audit retention policy.
4. Add sensitive data masking.
5. Add rate limiting and admin session controls.
6. Add backup/restore and operational runbooks.

### Phase E: Growth and intelligence

1. Add search synonyms, typo tolerance and Hindi/Sanskrit aliases.
2. Add conversion analytics for hero slides, categories, products and campaigns.
3. Add recommendation performance tracking.
4. Add festival campaign calendars.
5. Add customer segmentation and consent-based marketing exports.

## 11. Readiness Assessment

Demo readiness: High

- Strong enough for internal demos.
- Strong enough to validate workflows with stakeholders.
- Strong enough to show product direction and admin depth.

Operational pilot readiness: Medium

- Can support a controlled mock/internal pilot.
- Needs careful manual handling because payments, notifications and document uploads are not live.

Live commercial readiness: Low to Medium

- The storefront and admin foundation are strong.
- Production provider integrations and security hardening are still required before accepting real money and sensitive documents.

SaaS readiness: Medium foundation, low live SaaS readiness

- Tenant-aware schema exists.
- A single tenant is seeded and configured.
- True SaaS tenant onboarding, tenant billing, tenant admin isolation, theme customization and tenant data governance are not complete.

## 12. Overall Assessment

OMDivyaDarshan Commerce SaaS is now a serious platform foundation. It has grown from mock ecommerce into a devotional commerce operating system with:

- premium storefront foundations
- admin-managed homepage hero slides
- category hero CMS controls
- product detail content management
- cart, checkout and mock payment lifecycle
- inventory and order operations
- Asthi workflow
- Kundli package and order workflow
- service booking and capacity workflow
- membership foundation
- merchandising, offers and festivals
- tags, search and recommendations
- customer events and interest profiles
- assignments, documents, checklists and queues
- admin governance and reporting shells

The strongest next move is not to add many more modules. The strongest next move is to harden and polish the existing ones: payment, storage, notifications, media, previews, RBAC, provider workflows and real operational readiness.

Final verdict:

> The platform has high strategic potential and unusually broad vertical depth for devotional commerce. Its weakness is not lack of features; its weakness is that many features are still mock, shell or first-pass implementations. Production success depends on consolidation, provider integration, admin polish and a clear operational rollout plan.
