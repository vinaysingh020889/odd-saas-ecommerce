# OMDivyaDarshan Commerce SaaS Technical Master Document

Last updated: June 30, 2026

## 1. Purpose Of This Document

This is the master technical knowledge document for the OMDivyaDarshan Commerce SaaS application.

It is designed to help:

- Developers understand the system quickly.
- Product owners understand what is built and why.
- Admins understand how modules connect technically.
- Custom GPT assistants answer questions about product behavior, modules, models, flows, strengths, weaknesses and future enhancements.
- Future implementers make changes without breaking the architectural intent.

This document explains:

- Application architecture
- Technology stack
- Prisma models and their purpose
- Route groups and module ownership
- Core business logic layers
- Security and permission model
- Mock vs production-ready boundaries
- Strong points of the current product
- Weaknesses and technical debt
- Future flexibility and upgrade paths

## 2. Product Identity

Product name: OMDivyaDarshan Commerce SaaS

Current tenant: `omdivyadarshan`

Primary app role:

> Transactional and operational SaaS engine for devotional ecommerce, service applications, Kundli reports, Asthi Visarjan, memberships, festivals, merchandising and admin operations.

The app is not just a storefront. It is a vertical commerce and operations platform for spiritual products and assisted devotional services.

## 3. Current Product Stage

Current stage:

> Advanced mock-commerce and service-operations foundation.

The product is strong for:

- Internal demos
- Stakeholder validation
- Workflow testing
- Admin operations design
- Data model validation
- Future provider integration planning

The product is not yet production-ready for:

- Real payment settlement
- Real refunds
- Real wallet ledger
- Real courier/shipping integration
- Real document upload/private file storage
- Real Kundli report generation
- Real notification delivery
- Production security hardening
- Production observability and backups

## 4. Technology Stack

Runtime and framework:

- Next.js App Router
- React 18
- React Server Components
- Server Actions
- TypeScript
- Tailwind CSS

Database and ORM:

- PostgreSQL
- Prisma ORM
- Prisma migrations
- Prisma seed script

Authentication and security basics:

- Custom email/password auth
- `bcryptjs` password hashing
- Signed cookie session helpers
- Admin role checks
- Route-level admin protection

Core scripts:

- `npm run dev`: local development server
- `npm run build`: production build
- `npm run start`: production start
- `npm run lint`: ESLint
- `npm run typecheck`: TypeScript no-emit check
- `npm run prisma:generate`: generate Prisma client
- `npm run prisma:migrate`: run Prisma dev migration
- `npm run prisma:seed`: seed demo data

## 5. Codebase Shape

Important top-level areas:

- `app/(public)`: public storefront, login/signup and public customer flows
- `app/admin`: admin, operations, CMS and reporting routes
- `app/api`: public/internal API endpoints
- `components`: shared UI and module components
- `components/storefront`: premium storefront UI components
- `lib`: business logic, server actions, data access helpers and module services
- `lib/auth`: auth/session/password helpers
- `prisma/schema.prisma`: full data model
- `prisma/migrations`: schema migrations
- `prisma/seed.ts`: idempotent demo seed data
- `tenants/omdivyadarshan`: tenant configuration
- `docs`: product, admin and technical documentation

## 6. Architectural Pattern

The application follows a pragmatic Next.js server-first pattern:

- Server Components fetch data directly through Prisma-backed helper functions.
- Server Actions mutate data and revalidate affected routes.
- Prisma models enforce relational structure and tenant scoping.
- Shared `lib/*` modules encapsulate business rules and workflows.
- Admin pages are mostly server-rendered pages with forms and server actions.
- Customer-facing components are server-rendered where possible, with client components only where interactivity is needed.

Main architectural idea:

> Keep modules strongly data-backed and tenant-aware, use admin surfaces for content and operations, and leave external providers replaceable behind future integration layers.

## 7. Tenant Model

Core model:

- `Tenant`

Purpose:

- Owns nearly every business entity.
- Allows future multi-tenant SaaS expansion.
- Current seed uses a single OMDivyaDarshan tenant.

Tenant-linked domains include:

- Users and roles
- Categories and products
- Orders and payments
- Hero slides, festivals, promotions and offers
- Asthi, Kundli and service bookings
- Memberships
- Documents, assignments and checklists
- Tags, search logs, events and audit logs

Future SaaS implication:

The schema is already tenant-aware, but true SaaS readiness still needs tenant onboarding, tenant admin isolation, tenant billing, tenant-level theme configuration, tenant media/storage separation and stricter authorization checks.

## 8. Authentication, Users And Roles

Models:

- `User`
- `Role`
- `UserRole`

Key logic:

- `lib/auth/password.ts`: password hashing/verification
- `lib/auth/session.ts`: session read/write helpers
- `lib/auth/actions.ts`: login, signup and logout actions
- `lib/admin-auth.ts`: admin access guards

Current behavior:

- Customers can sign up and log in.
- Admin users are seeded.
- Admin routes call role guard helpers.
- Roles are broad rather than fine-grained.

Current admin roles include examples such as:

- `SUPER_ADMIN`
- `ADMIN`
- `OPERATIONS_ADMIN`
- `PRODUCT_MANAGER`
- `SUPPORT_AGENT`
- Vendor/operator-style roles for future workbenches

Strength:

- Simple auth model is easy to understand and test.
- Role relationships are modeled relationally.
- Admin route protection exists.

Weakness:

- Fine-grained RBAC is not complete.
- Admin 2FA is missing.
- Rate limiting and suspicious login detection are missing.
- Session hardening needs production review.

## 9. Audit And Governance

Model:

- `AuditLog`

Purpose:

- Records sensitive admin decisions and changes.
- Supports investigation of who changed what.

Used in modules such as:

- Admin hardening
- Requests
- Documents
- Kundli package update
- Role changes
- Customer notes
- Operational decisions where implemented

Admin route:

- `/admin/audit-logs`

Strength:

Audit visibility exists early, which is valuable for operations-heavy workflows.

Weakness:

Audit coverage is not yet universal. Production should standardize audit events for all sensitive writes.

## 10. Catalog Models

Core models:

- `Category`
- `Product`
- `ProductVariant`
- `ProductMedia`
- `ProductReview`
- `ProductSpec`
- `ProductFaq`
- `ProductContentBlock`
- `KitComponent`
- `WishlistItem`

Purpose:

- `Category`: parent/subcategory hierarchy, category hero and homepage intent metadata.
- `Product`: products, services, kits and sellable records.
- `ProductVariant`: SKU/variant-level price and inventory connection.
- `ProductMedia`: product media records.
- `ProductReview`: review data.
- `ProductSpec`: structured PDP attributes.
- `ProductFaq`: product FAQs.
- `ProductContentBlock`: backend-driven PDP content sections.
- `KitComponent`: kit/bundle composition.
- `WishlistItem`: customer wishlist shell.

Important logic files:

- `lib/catalog.ts`
- `lib/storefront.ts`
- `lib/admin-actions.ts`
- `components/admin-product-form.tsx`
- `components/admin-category-form.tsx`
- `components/admin-product-content-manager.tsx`
- `components/admin-product-media-manager.tsx`
- `components/admin-kit-builder.tsx`
- `components/storefront/premium-product-card.tsx`

Admin routes:

- `/admin/categories`
- `/admin/categories/new`
- `/admin/categories/[id]/edit`
- `/admin/products`
- `/admin/products/new`
- `/admin/products/[id]/edit`
- `/admin/services`
- `/admin/services/new`
- `/admin/reviews`

Public routes:

- `/shop`
- `/shop/category/[slug]`
- `/product/[slug]`
- `/services`
- `/services/[slug]`

## 11. Category Hero And Listing Logic

Category hero fields currently use existing homepage intent fields:

- `homepageIntentTitle`
- `homepageIntentDescription`
- `homepageIntentImage`
- `homepageIntentSortOrder`
- `showOnHomepageIntent`

Current category page behavior:

- Hero title uses `homepageIntentTitle` or category name fallback.
- Hero description uses `homepageIntentDescription`, category description or fallback copy.
- Hero image uses `homepageIntentImage` or a product image fallback.
- Category listing has quick filter chips, inline filter form, sort control and full-width product grid.
- Sort/filter submissions include `#products` so the page returns to the listing area.

Strength:

- Category pages are now CMS-controlled without adding another model.
- Admin can enhance category merchandising from the category edit page.

Weakness:

- Internal field names are not ideal. Future cleanup should split `heroTitle`, `heroDescription`, `heroImageUrl` from homepage intent fields.

## 12. Product Detail Logic

Product detail page uses:

- Product base fields
- Product media/image helpers
- Variants
- Stock state
- Specs
- FAQs
- Content blocks
- Tags
- Reviews

Important behavior:

- PDP content sections are backend-driven.
- If only one content block exists, that block controls title/body.
- Reviews stay separate.
- Products with zero reviews show a no-review state instead of fake five stars.
- Tag pills display without unnecessary context labels.

Strength:

The PDP is no longer a placeholder layout. It is becoming a structured content-commerce page.

Weakness:

No rich text editor, media blocks, SEO schema editor or advanced preview workflow exists yet.

## 13. Storefront And Homepage Logic

Key components:

- `components/customer-header.tsx`
- `components/storefront/hero-slider.tsx`
- `components/storefront/hero-slide-card.tsx`
- `components/storefront/hero-slider-controls.tsx`
- `components/storefront/promo-strip.tsx`
- `components/storefront/footer.tsx`
- `components/storefront/collection-card.tsx`
- `components/storefront/premium-product-card.tsx`

Key routes:

- `/shop`
- `/`

Current behavior:

- `/shop` is the practical storefront home.
- `/` redirects into storefront home flow.
- Header is premium two-row layout.
- Header search has readable typed text.
- Wallet/cart/profile controls live in the header.
- Hero slider is admin-driven.
- Seasonal promo strip appears below the slider and is dismissible.
- Footer completes the storefront.

Strength:

The storefront now feels like a real commerce product rather than a bare demo.

Weakness:

The information architecture still needs final decisions around home vs shop naming and navigation labels.

## 14. Hero Slides, Campaigns And Merchandising Logic

### HeroSlide

`HeroSlide` powers the storefront homepage slider on `/shop`.

Core purpose:

- Allows admin-controlled homepage hero content.
- Supports product, category, service, festival, custom and no-link slide destinations.
- Stores background/image content, headline, description, CTA text, ordering and active state.
- Supports presentation fields such as theme, text alignment and overlay.

Important enums:

- `HeroSlideLinkType`
- `HeroSlideTheme`
- `HeroSlideTextAlign`
- `HeroSlideOverlay`

Important logic files:

- `lib/hero-slides.ts`
- `lib/hero-slide-actions.ts`
- `components/storefront/hero-slider.tsx`
- `components/storefront/hero-slide-card.tsx`
- `components/admin-hero-slide-form.tsx`

Admin ownership:

- `/admin/hero-slides`
- `/admin/hero-slides/new`
- `/admin/hero-slides/[id]/edit`

Behavior:

- Public storefront fetches active slides in display order.
- Admin can create, edit, activate, deactivate and reorder slides.
- Storefront slider should be treated as the primary home visual surface.
- `/shop` is currently the practical homepage; `/` redirects to `/shop`.

Strength:

The hero slider is backed by database content, not hard-coded page copy.

Weakness:

Visual polish and exact responsive behavior may still need product-owner review after every major header or layout change.

### FestivalCampaign

`FestivalCampaign` models seasonal campaigns such as Shravan or other festival-led commerce events.

Related models:

- `FestivalCampaignProduct`
- `FestivalCampaignCategory`
- `FestivalCampaignService`

Purpose:

- Groups products, services and categories under a seasonal campaign.
- Supports merchandising without changing the underlying catalog.
- Helps create campaign-specific storefront journeys.

### PromotionPlacement

`PromotionPlacement` controls promotional surfaces.

Purpose:

- Defines where a promotion should appear.
- Allows promotional content to be managed separately from core products.
- Creates a foundation for homepage banners, category placements and checkout messaging.

### OfferRule, OfferTarget And OfferRedemption

Offer models represent discount/business rules and their redemption tracking.

Purpose:

- `OfferRule` defines the offer.
- `OfferTarget` defines which products, categories, services or segments the offer applies to.
- `OfferRedemption` records usage.

Important logic:

- `lib/pricing.ts`
- `lib/admin-actions.ts`

Current state:

The offer layer is structurally strong, but it should still be treated as an internal promotional engine until real payment reconciliation and production checkout rules are finalized.

## 15. Search, Tags, Recommendations And Intent Logic

### Tags

Models:

- `Tag`
- `TagAlias`
- `TagRelation`

Purpose:

- Connect products, services, categories and content around devotional intent.
- Support alternate search terms through aliases.
- Build semantic relationships between catalog items without hard-coding every connection.

Important logic files:

- `lib/tags.ts`
- `lib/tag-actions.ts`
- `lib/tag-relations.ts`
- `components/tag-selector.tsx`
- `components/tag-chips.tsx`

Admin ownership:

- `/admin/tags`

Storefront behavior:

- Tags are displayed as pills on product and listing surfaces.
- Product detail pages should display the pills without extra explanatory labels when the UI does not need them.

### SearchQueryLog

`SearchQueryLog` stores search behavior.

Purpose:

- Tracks what customers are looking for.
- Supports search insights and future recommendation tuning.
- Helps identify missing catalog, poor naming and seasonal demand.

Important logic files:

- `lib/search.ts`
- `lib/admin-search.ts`

Routes:

- `/search`
- `/admin/search-insights`

### Customer Interest Profiles

Models:

- `CustomerInterestProfile`
- `AnonymousInterestProfile`
- `CustomerEvent`

Purpose:

- Captures browsing and engagement signals.
- Allows future personalization.
- Supports anonymous-to-customer behavior continuity if expanded later.

Important logic:

- `lib/customer-events.ts`
- `components/customer-event-beacon.tsx`
- `lib/recommendations.ts`

Current strength:

The platform already thinks beyond plain search. It has the foundation for intent-aware commerce.

Current weakness:

Recommendation scoring is still early. It should be made explainable before it influences high-value purchase journeys.

## 16. Cart, Checkout, Orders And Payment Logic

### Cart And CartItem

Purpose:

- Store user cart state.
- Support products, variants and kits.
- Preserve selected quantities before checkout.

Important files:

- `lib/cart.ts`
- `lib/cart-actions.ts`
- `app/cart/page.tsx`

Expected behavior:

- Add-to-cart should validate product availability and quantity rules.
- Cart totals should be calculated through shared pricing logic, not duplicated UI math.

### Pricing

Important file:

- `lib/pricing.ts`

Purpose:

- Centralizes price calculation.
- Supports offer application.
- Reduces risk of different totals across product cards, cart and checkout.

Future requirement:

When production payment providers are added, provider capture amount must come from this pricing layer or a server-side order snapshot, not from client-provided totals.

### Order, OrderItem And OrderActivity

Purpose:

- `Order` stores checkout-level transaction state.
- `OrderItem` stores the purchased line items.
- `OrderActivity` records operational changes and timeline events.

Important files:

- `lib/order-actions.ts`
- `lib/admin-order-actions.ts`
- `app/checkout/page.tsx`
- `app/admin/orders/page.tsx`

Current behavior:

- The order layer supports mock payment and operational review flows.
- Order activity creates useful admin history.

### OrderRequest

Purpose:

- Captures non-standard order requests or customer-driven request flows.
- Useful for items requiring manual confirmation, special sourcing or admin intervention.

Important files:

- `lib/order-request-actions.ts`
- `/admin/requests`

### PaymentAttempt And PaymentEvent

Purpose:

- `PaymentAttempt` represents a payment try.
- `PaymentEvent` stores payment event history.

Important files:

- `lib/payment-actions.ts`
- `lib/mock-payment-provider.ts`

Current state:

Payments are mock/provider-shell oriented. This is not a production Razorpay, PayPal, wallet, courier or real external payment integration.

Security rule:

Never trust browser-side payment status. Production integrations must verify provider webhooks server-side and update order/payment state only after verified events.

## 17. Inventory Logic

### InventoryLedger

Purpose:

- Tracks stock movements in an auditable way.
- Supports movement types through `InventoryMovementType`.
- Avoids treating inventory as a single untraceable number.

Important files:

- `lib/inventory.ts`
- `lib/inventory-actions.ts`
- `/admin/inventory`

Expected movement categories:

- Stock received
- Stock adjusted
- Stock reserved
- Stock released
- Stock sold or fulfilled

Strength:

Ledger-based inventory is better for operational trust than direct overwrite-only stock fields.

Weakness:

Concurrency and reservation behavior must be hardened before high-volume production checkout.

Recommended future enhancement:

Implement transaction-safe inventory reservation during checkout and release on payment failure or timeout.

## 18. Membership Logic

### MembershipPlan

Purpose:

- Defines customer-facing membership plans.
- Controls status through `MembershipPlanStatus`.

### MembershipBenefit

Purpose:

- Defines benefits attached to plans.
- Uses `MembershipBenefitType`, `MembershipBenefitScope` and `MembershipUsagePeriod` to describe eligibility and usage limits.

### MembershipRule

Purpose:

- Defines rules governing membership behavior.
- Allows benefits to evolve without hard-coding everything into checkout.

### UserMembership

Purpose:

- Stores a user's actual membership subscription state.
- Uses `UserMembershipStatus`.

### MembershipRequest

Purpose:

- Captures request/review workflow for membership purchase or upgrade.

### MembershipBenefitUsage

Purpose:

- Tracks benefit consumption.
- Prevents benefits from being reused beyond allowed periods.

### MembershipStatusHistory

Purpose:

- Stores status changes over time for auditability.

Important files:

- `lib/membership.ts`
- `lib/membership-actions.ts`
- `app/membership/page.tsx`
- `app/admin/memberships/page.tsx`

Strength:

The membership layer is future-ready because plan, benefits, usage and status history are separated.

Weakness:

Membership checkout and benefit enforcement should be tested carefully before production launch.

## 19. Kundli Logic

### KundliPackage

Purpose:

- Stores customer-facing Kundli packages.
- Replaces hard-coded package cards.
- Allows admin editing of title, price, estimated delivery, description, features and status.

Important route ownership:

- Public listing: `/kundli`
- Admin orders queue: `/admin/kundli`
- Admin package editor: `/admin/kundli/packages`

Important files:

- `lib/kundli-actions.ts`
- `app/kundli/page.tsx`
- `app/admin/kundli/page.tsx`
- `app/admin/kundli/packages/page.tsx`

### KundliOrder

Purpose:

- Tracks a customer's Kundli order/application.
- Uses `KundliOrderStatus` and `KundliPaymentStatus`.
- Supports intake, review, assignment, report preparation and delivery placeholders.

### KundliDocument

Purpose:

- Stores uploaded or generated Kundli-related documents.
- Uses `KundliDocumentType`, `KundliDocumentStatus` and `KundliReportStatus`.

### KundliStatusHistory

Purpose:

- Records state changes for traceability.

Current strength:

The Kundli module is not just a static service page anymore. Packages are database-backed and editable.

Important clarification:

`/admin/kundli` is the application/order queue. Package editing belongs to `/admin/kundli/packages`.

## 20. Asthi Visarjan Logic

### AsthiLocation

Purpose:

- Stores available ritual/service locations.

### AsthiPackage

Purpose:

- Stores Asthi service packages.

### AsthiAddOn

Purpose:

- Stores optional add-ons for the service journey.

### AsthiApplication

Purpose:

- Tracks customer applications.
- Uses `AsthiApplicationStatus`, `AsthiPaymentStatus` and `AsthiServiceMode`.

### AsthiDocument

Purpose:

- Handles required or supporting documents.
- Uses `AsthiDocumentType` and `AsthiDocumentStatus`.

### AsthiActivity And AsthiStatusHistory

Purpose:

- Preserve operational history and status transitions.

Important files:

- `lib/asthi-actions.ts`
- `app/services/asthi-visarjan/page.tsx`
- `app/asthi/apply/page.tsx`
- `app/admin/asthi/page.tsx`

Strength:

The module supports a multi-step operational service, not just a checkout SKU.

Weakness:

Real-world document verification, service partner assignment and notifications remain future production concerns.

## 21. Service Booking, Capacity And Reschedule Logic

### ServiceBooking

Purpose:

- Tracks booked services.
- Connects customer requests to operational fulfillment.
- Supports assignment and activity history.

### ServiceBookingActivity

Purpose:

- Records changes, comments and milestones for a service booking.

Important files:

- `lib/service-bookings.ts`
- `lib/service-booking-actions.ts`
- `app/admin/service-bookings/page.tsx`

### ServiceCapacityRule, ServiceCapacitySlot And ServiceCapacityLedger

Purpose:

- Define and track service availability.
- Help prevent overbooking.
- Create an operations-aware service system.

Important files:

- `lib/service-capacity.ts`
- `lib/service-capacity-rules.ts`
- `app/admin/service-capacity-rules/page.tsx`
- `app/admin/capacity/page.tsx`

### RescheduleRequest And RescheduleRequestActivity

Purpose:

- Capture reschedule requests instead of overwriting bookings silently.
- Keep admin workflow transparent.

Important files:

- `lib/reschedule-actions.ts`
- `lib/reschedule-requests.ts`
- `app/admin/reschedule-requests/page.tsx`

Strength:

The platform separates customer intent from operational capacity, which is important for real service businesses.

Weakness:

Calendar, notification and partner availability integrations are not production-complete yet.

## 22. Documents, Assignments And Checklist Layer

### OperationalDocument

Purpose:

- Stores operational documents linked to orders, services or admin workflows.
- Supports internal review and proof handling.

### DocumentActivity

Purpose:

- Stores timeline events for documents.

Important files:

- `lib/documents.ts`
- `components/admin-document-panel.tsx`
- `app/admin/documents/page.tsx`

### Assignment

Purpose:

- Assigns operational work to admin users or roles.
- Supports queue ownership.

Important files:

- `components/admin-assignment-panel.tsx`
- `app/admin/assignments/page.tsx`

### ChecklistTemplate, ChecklistTemplateItem, ChecklistInstance, ChecklistInstanceItem And ChecklistActivity

Purpose:

- Provide a checklist foundation for repeatable operations.
- Templates define reusable process steps.
- Instances represent checklist execution on a specific workflow.
- Activities preserve history.

Important files:

- `lib/checklists.ts`
- `lib/checklist-actions.ts`
- `components/admin-checklist-panel.tsx`
- `app/admin/checklists/page.tsx`

Current state:

The checklist layer exists as a foundation and appears in the admin navigation. It is not yet a complete configurable SOP engine for every workflow.

Strong future direction:

Use checklist templates to drive operational quality for Kundli preparation, Asthi applications, order fulfillment, service bookings and document review.

## 23. Customer, CRM And Event Logic

### User

Purpose:

- Stores account identity.
- Connects to roles, addresses, memberships, carts, orders and activity.

### CustomerAddress

Purpose:

- Stores delivery and customer contact addresses.

### CustomerNote

Purpose:

- Allows internal admin notes on customer records.

### CustomerEvent

Purpose:

- Stores customer behavior events.
- Enables future CRM, retention and recommendation logic.

### CustomerInterestProfile And AnonymousInterestProfile

Purpose:

- Convert browsing and interaction behavior into intent profiles.
- Support future personalization and targeted merchandising.

Important routes:

- `/admin/customers`
- `/admin/customer-events`
- `/admin/interest-profiles`

Important files:

- `lib/customer-events.ts`
- `components/customer-event-beacon.tsx`

Privacy principle:

Customer behavior data should be used to improve relevance and service quality. Future production work must add consent, retention and privacy controls if analytics becomes more advanced.

## 24. Admin Architecture And Route Ownership

The admin system is split into focused routes rather than one large settings screen.

Primary admin areas:

- `/admin` for dashboard overview.
- `/admin/products` for catalog products.
- `/admin/services` for services.
- `/admin/categories` for category and category hero management.
- `/admin/tags` for tag and alias control.
- `/admin/reviews` for product reviews.
- `/admin/inventory` for stock movement.
- `/admin/hero-slides` for homepage slider content.
- `/admin/festivals` for seasonal campaigns.
- `/admin/promotions` for promotional placements.
- `/admin/offers` for offer rules.
- `/admin/orders` for order operations.
- `/admin/payments` for payment tracking.
- `/admin/requests` for special order requests.
- `/admin/service-bookings` for booked services.
- `/admin/service-capacity-rules` for service capacity configuration.
- `/admin/capacity` for capacity operations.
- `/admin/reschedule-requests` for rescheduling workflows.
- `/admin/assignments` for work assignment.
- `/admin/checklists` for checklist templates and operations.
- `/admin/documents` for operational documents.
- `/admin/asthi` for Asthi applications.
- `/admin/kundli` for Kundli orders.
- `/admin/kundli/packages` for Kundli package editing.
- `/admin/memberships` for membership operations.
- `/admin/search-insights` for search intelligence.
- `/admin/audit-logs` for audit review.
- `/admin/settings` for system settings.

Admin principle:

The admin panel should be treated as the operational control room. Public pages should not contain management-only editing logic except through safe server actions and authenticated admin routes.

## 25. Authentication, Roles And Security Model

### Core Models

- `Role`
- `UserRole`
- `AuditLog`

### Important files

- `lib/admin-auth.ts`
- `lib/admin-hardening-actions.ts`
- `lib/restricted-work.ts`
- `lib/auth/session.ts`
- `lib/auth/password.ts`
- `lib/auth/actions.ts`

### Security Principles Already Present

- Admin logic is separated from storefront logic.
- Role and permission concepts exist.
- Audit logs exist for traceability.
- Sensitive mutations should run through server actions.
- Password handling is separated into auth utility files.

### Required Production Security Rules

- Never trust client-side price, payment, role or status values.
- Validate all admin mutations server-side.
- Verify all payment provider callbacks server-side.
- Add rate limiting for login, signup, checkout and high-risk admin actions.
- Add CSRF-safe patterns where needed for state-changing form submissions.
- Ensure uploaded files are scanned, typed and access-controlled.
- Restrict admin documents and customer data by role.
- Add stronger session expiry and device/session visibility if going live.

### Current Weakness

The product has a good security foundation, but some areas are still prototype-oriented because payment, notification, courier and provider integrations are intentionally not fully live.

## 26. Tenant And SaaS Flexibility

### Tenant

`Tenant` exists as a SaaS foundation model.

Purpose:

- Enables future multi-tenant support.
- Allows the platform to evolve beyond one brand or one store.

Current state:

The application is tenant-aware structurally, but many routes and business flows still behave as a single-brand OMDivyaDarshan deployment.

Future requirements for true SaaS multi-tenancy:

- Tenant scoping on every query.
- Tenant-aware auth and role checks.
- Tenant-specific catalog, branding, payment configuration and notification settings.
- Tenant-safe media storage paths.
- Tenant-level audit logs.
- Tenant-aware background jobs.

Important warning:

A `Tenant` model alone does not make the application fully multi-tenant. Query scoping and permission isolation are the real production requirement.

## 27. Storefront Architecture

Important public components:

- `components/storefront/customer-header.tsx`
- `components/storefront/hero-slider.tsx`
- `components/storefront/hero-slide-card.tsx`
- `components/storefront/premium-product-card.tsx`
- `components/storefront/collection-card.tsx`
- `components/storefront/promo-strip.tsx`
- `components/storefront/footer.tsx`
- `components/storefront/shell.tsx`

Important storefront logic:

- `lib/storefront.ts`
- `lib/catalog.ts`
- `lib/merchandising.ts`
- `lib/recommendations.ts`

Current storefront decisions:

- `/shop` is the functional homepage.
- `/` redirects to `/shop`.
- The header has top-bar and primary navigation responsibilities.
- The homepage hero slider is database-backed.
- Category pages show category-specific hero content from the category edit form.
- Product listing pages use filters, sort links, quick pills and responsive product cards.

Important UX rule:

Because `/shop` is the customer home, navigation should avoid redundant “Shop” labeling unless the product owner intentionally wants it for clarity.

## 28. Product Detail Page Logic

Important product detail behavior:

- Product media comes from `ProductMedia` where available.
- Product content blocks come from `ProductContentBlock`.
- Product specs come from `ProductSpec`.
- Product FAQs come from `ProductFaq`.
- Reviews come from `ProductReview`.
- Tags are displayed through tag relations.

Important UI expectation:

If one content block is configured from admin, the detail panel should use that content block's title and body rather than forcing static tabs that do not match the backend data.

Review rule:

If a product has zero reviews, the UI should not imply a 5-star rating. It can show no rating, “New”, or “0 reviews” without stars.

## 29. Data Seeding And Demo Boundaries

Seed data exists to make the platform usable during development and demos.

Seeded or demo-oriented areas include:

- Products
- Categories
- Tags
- Hero slides
- Kundli packages
- Service and catalog examples
- Admin/demo users

Important principle:

Seed data is not the same as hard-coded application behavior. If a screen reads seeded database content, it is admin-manageable once admin tooling exists.

Demo boundary:

Mock payment, placeholder reports, placeholder documents and demo stock are not production integrations.

## 30. Strong Areas Of The Current Product

The application is strong in these areas:

- Broad commerce schema with catalog, cart, orders, inventory, services and membership.
- Dedicated operational workflows for Kundli and Asthi services.
- Admin-first thinking with routes for most business modules.
- Audit, activity and status history models across several workflows.
- Database-backed hero slider and category hero management.
- Tag and intent architecture for future personalization.
- Checklist and document foundations for operational quality.
- Separation of admin actions, storefront logic and Prisma models.
- Future-ready membership benefit usage design.
- Ledger-based inventory foundation.

## 31. Weak Areas And Technical Debt

Known weaknesses:

- Multi-tenancy is model-ready but not guaranteed at query level everywhere.
- Payment layer is mock/provider-shell, not production provider-integrated.
- Inventory reservation and checkout concurrency need hardening.
- Notifications are not fully provider-backed.
- Some admin pages are v1 operational screens rather than polished management studios.
- Search and recommendations need scoring transparency.
- Media management needs final production storage and validation rules.
- Role permissions need rigorous route-by-route enforcement testing.
- Service capacity logic needs real calendar and partner integration before scale.
- Documentation must stay updated as modules evolve.

## 32. Future Flexibility And Extension Strategy

The product should evolve by adding providers behind stable internal interfaces.

Recommended future provider boundaries:

- Payment provider adapter: Razorpay, PayPal or other gateway.
- Notification provider adapter: WhatsApp, SMS, email.
- Courier provider adapter: shipment creation, tracking, label generation.
- Media storage adapter: local, S3-compatible or CDN-backed.
- Calendar provider adapter: service booking and reschedule integration.
- Astrology/report provider adapter: Kundli generation or partner workflow.

Engineering rule:

External providers should not leak directly into page components. They should be introduced through server-side service layers and clear provider interfaces.

## 33. Custom GPT Answering Rules

A custom GPT using this document should answer with these rules:

- Treat `/shop` as the current customer homepage.
- Treat `/` as a redirect to `/shop` unless the code changes later.
- Treat `/admin/kundli` as Kundli order/application operations.
- Treat `/admin/kundli/packages` as Kundli package editing.
- Treat Hero Slides as database-backed homepage slider content.
- Treat Category Hero content as part of category editing.
- Do not claim Razorpay, PayPal, wallet, courier, WhatsApp, SMS or email production integrations are complete unless the code later proves it.
- Do not call seeded demo content static if it is backed by Prisma models and admin-editable flows.
- Distinguish between “foundation exists” and “production complete”.
- When asked what to improve, prioritize security, provider adapters, multi-tenant scoping, checkout hardening, media validation and operational automation.
- When asked what is strong, highlight model breadth, admin coverage, operational workflows, audit/activity history and future-ready architecture.

## 34. Recommended Next Engineering Priorities

High priority:

- Confirm tenant scoping strategy before any SaaS expansion.
- Harden checkout and payment verification.
- Add production-ready inventory reservation.
- Complete role permission enforcement across admin routes.
- Finalize media upload/storage validation.
- Add provider adapters only behind server-side boundaries.

Medium priority:

- Improve admin dashboard reporting.
- Expand checklist templates into workflow-specific SOPs.
- Make recommendation scoring explainable.
- Add customer notification preferences.
- Add more audit coverage for sensitive changes.

Product priority:

- Finalize homepage vs shop terminology.
- Define exact hero slider design rules.
- Decide which modules are MVP, beta or future enterprise.
- Convert remaining placeholder copy into production content.

## 35. Validation Commands

Standard local validation commands:

```bash
npm run typecheck
npm run lint
npm run build
```

Database commands:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Important note:

A documentation-only change does not require a full build, but any schema, server action, route or component change should be validated with typecheck, lint and build where practical.

## 36. Final Technical Summary

OMDivyaDarshan Commerce SaaS is a commerce and devotional-services platform with a broad Prisma-backed domain model, a growing admin console, a premium storefront direction and several specialized operational modules.

Its strongest architectural idea is flexibility: catalog commerce, service booking, Kundli operations, Asthi applications, memberships, hero merchandising, tags, search insights, checklists, documents and audit trails are modeled as separate but connected systems.

Its biggest production risks are not the number of features, but the operational hardening still required around payment verification, tenant isolation, inventory concurrency, provider integrations, file security and role-level enforcement.

The correct future path is to preserve the current model separation, strengthen server-side business logic, and add external providers through clean adapters rather than scattering provider code through UI pages.
