# OMDivyaDarshan Admin Panel Usage Guide

Last updated: June 30, 2026

## 1. Purpose

This guide explains how to use the current OMDivyaDarshan admin panel. It is for super admins, operations admins, catalog managers, product managers, support agents, and future assistant agents.

Admin URL: `/admin`

Demo admin login: `admin@omdivyadarshan.local` / `Admin@123`

Boundary: this is still a mock/manual operations platform. Live Razorpay, PayPal, real wallet ledger, courier APIs, WhatsApp, SMS, email, signed file storage, real Kundli report generation and real refunds are not connected yet.

## 2. What The Admin Panel Manages

The admin panel now manages:

- Products, services, kits, variants and inventory
- Categories, subcategories and category hero content
- Tags, aliases and context graph
- Product media URLs, specs, FAQs and content blocks
- Homepage hero slides and homepage layout shell
- Festivals, promotions, offers and coupons
- Orders, mock payments and order requests
- Membership plans, benefits, rules, requests and user memberships
- Asthi Visarjan applications
- Kundli packages and Kundli orders
- Service bookings, service capacity and reschedules
- Assignments, checklists and operational documents
- Customer CRM, internal notes, customer events and interest profiles
- Admin search, queues, notifications, reports, roles, permissions and audit logs

Recently added or enhanced:

- Homepage hero slider admin at `/admin/hero-slides`.
- `/shop` now acts as the storefront home.
- Premium storefront header, search visibility, profile dropdown, wallet/cart controls and footer.
- Category edit now controls category hero title, description and image.
- Category listing now has inline filters, quick chips, sort controls, full-width product grid and anchored sort/filter submissions.
- Product detail pages now use backend content blocks instead of hardcoded tabs.
- Kundli package editor added at `/admin/kundli/packages`.
- `/admin/kundali` redirects to `/admin/kundli`.
- Product cards and listing alignment were tightened.

## 3. First-Time Setup Order

Use this order when preparing the frontend:

1. Login at `/admin`.
2. Create parent categories and subcategories in `/admin/categories`.
3. Edit category hero fields for important category pages.
4. Create/edit products in `/admin/products`.
5. Create/edit service products in `/admin/services`.
6. Add variants, images, specs, FAQs and content blocks from product edit pages.
7. Configure kit components for kit products.
8. Configure inventory in `/admin/inventory`.
9. Configure tags in `/admin/tags` and attach them to products, categories, services, festivals and promotions.
10. Configure homepage hero slides in `/admin/hero-slides`.
11. Review `/admin/homepage-layout`.
12. Configure festivals, promotions and offers.
13. Configure memberships in `/admin/memberships`.
14. Configure Kundli packages in `/admin/kundli/packages`.
15. Configure delivery zones and shipping rules.
16. Test `/shop`, category pages, product pages, cart, checkout and mock payment.
17. Test Asthi, Kundli and service booking flows.
18. Use queues, assignments, checklists, documents and requests for operations.
19. Review reports, customer events, interest profiles and audit logs.

If a frontend area looks incomplete, check category setup, product image, active status, inventory, tags, category hero fields, hero slide status, homepage intent settings and product content blocks.

## 4. Daily Admin Routine

1. Open `/admin`.
2. Check overview attention cards.
3. Open `/admin/queues` for overdue, due today and unassigned work.
4. Open `/admin/notifications` for internal alerts.
5. Process orders in `/admin/orders`.
6. Process requests in `/admin/requests`.
7. Review service bookings in `/admin/service-bookings`.
8. Review reschedules in `/admin/reschedule-requests`.
9. Review Asthi applications in `/admin/asthi`.
10. Review Kundli orders in `/admin/kundli`.
11. Review documents in `/admin/documents`.
12. Review assignments in `/admin/assignments`.
13. Review customers in `/admin/customers`.
14. Review mock payments in `/admin/payments`.
15. Use `/admin/audit-logs` when investigating changes.
16. Use `/admin/reports` for status and metrics.

## 5. Navigation Map

Command:

- `/admin`: overview
- `/admin/my-work`: assigned work
- `/admin/search`: admin master search

Catalog:

- `/admin/products`, `/admin/products/new`, `/admin/products/[id]/edit`
- `/admin/services`, `/admin/services/new`
- `/admin/categories`, `/admin/categories/new`, `/admin/categories/[id]/edit`
- `/admin/tags`, `/admin/tags/new`, `/admin/tags/[id]/edit`
- `/admin/reviews`
- `/admin/inventory`

Merchandising:

- `/admin/homepage-layout`
- `/admin/hero-slides`, `/admin/hero-slides/new`, `/admin/hero-slides/[id]/edit`
- `/admin/festivals`, `/admin/festivals/new`, `/admin/festivals/[id]/edit`
- `/admin/promotions`, `/admin/promotions/new`, `/admin/promotions/[id]/edit`
- `/admin/offers`, `/admin/offers/new`, `/admin/offers/[id]/edit`

Operations:

- `/admin/orders`, `/admin/orders/[id]`
- `/admin/service-bookings`, `/admin/service-bookings/[id]`
- `/admin/reschedule-requests`
- `/admin/requests`
- `/admin/capacity`
- `/admin/service-capacity-rules`
- `/admin/assignments`
- `/admin/checklists`
- `/admin/documents`
- `/admin/shipping-rules`
- `/admin/delivery-zones`
- `/admin/asthi`, `/admin/asthi/[applicationNo]`
- `/admin/kundli`, `/admin/kundli/[orderNo]`, `/admin/kundli/packages`
- `/admin/customers`, `/admin/customers/[id]`
- `/admin/memberships`

Finance and system:

- `/admin/payments`
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

## 6. Categories, Subcategories And Category Hero

Routes: `/admin/categories`, `/admin/categories/new`, `/admin/categories/[id]/edit`

Use categories before products. Parent categories are broad browsing buckets; subcategories are product assignment buckets.

Configure:

- Name, slug, parent category, type, status and sort order
- Featured flag and tags
- Category hero title, description and image URL
- Homepage intent visibility and homepage sort order

How to edit category hero:

1. Open `/admin/categories`.
2. Select a category and click Edit.
3. Find **Category Hero and Homepage Intent**.
4. Enter Hero title, Hero description and Hero image URL.
5. Save category.
6. Open `/shop/category/[slug]` and confirm the hero.

Behavior:

- Hero title falls back to category name.
- Hero description falls back to category description.
- Hero image falls back to a product image if empty.
- Homepage intent controls whether the category appears on `/shop` intent cards.

## 7. Products And PDP Content

Routes: `/admin/products`, `/admin/products/new`, `/admin/products/[id]/edit`

Product setup:

1. Create category/subcategory first.
2. Create product.
3. Assign category.
4. Add description, short description, price, MRP and image URL.
5. Add variants and inventory.
6. Add specs, FAQs and content blocks.
7. Attach tags.
8. Set active/published status.
9. Review `/product/[slug]`.

Product detail behavior:

- Tabs follow backend content blocks.
- If one content block exists, its title/body drive the visible section.
- Reviews are separate.
- Zero-review products show no-review state, not fake stars.
- Tag pills display without an unnecessary context label.

Recommended content blocks: How to Use, What Is Inside, Care, Ritual Note and Details.

## 8. Product Cards And Category Listing Controls

Public route: `/shop/category/[slug]`

Admin inputs come from categories, products, inventory and tags.

Current listing behavior:

- Quick chips: All, In Stock, Featured, Best Sellers, Kits, Highest Rated.
- Sort control is in the listing toolbar.
- Filter controls are inside the listing card.
- Product grid is full width.
- Sort and filter submissions return to `#products`.
- Membership promo sits near the bottom, not between product rows.

If cards look uneven, check image URL, title length, short description, price/MRP, stock state and active filters.

## 9. Services And Kits

Service routes: `/admin/services`, `/admin/services/new`

Use services for bookable or assisted devotional services.

Service setup:

1. Create service record.
2. Assign service category.
3. Add price and description.
4. Attach tags.
5. Configure capacity rules if bookable.
6. Test service page and booking flow.

Kits are product records with bundled component logic. Use kits for puja packs and ritual-ready bundles. Configure kit details, components and inventory, then test cart/checkout.

## 10. Inventory

Route: `/admin/inventory`

Use inventory for product and variant stock control.

Tasks:

- Search SKUs/products.
- Check low-stock and out-of-stock records.
- Adjust stock manually.
- Verify inventory before testing checkout.

Frontend impact: product cards show stock badges, PDPs show stock state, and cart/checkout depend on availability.

## 11. Tags, Search And Recommendations

Tag routes: `/admin/tags`, `/admin/tags/new`, `/admin/tags/[id]/edit`

Search insight route: `/admin/search-insights`

Use tags for festivals, deities, rituals, places, benefits, materials and product uses.

How to use:

1. Create tags and aliases.
2. Attach tags on product/category/service/festival/promotion edit forms.
3. Check public tag pills.
4. Review `/admin/search-insights` for no-result and repeated searches.
5. Add missing aliases or improve content based on search behavior.

Tags affect search, recommendations, related services and future personalization.

## 12. Homepage, Shop Page And Hero Slides

Public route: `/shop`

Admin routes: `/admin/hero-slides`, `/admin/hero-slides/new`, `/admin/hero-slides/[id]/edit`, `/admin/homepage-layout`

Hero slides power the main storefront slider.

Hero slide setup:

1. Open `/admin/hero-slides`.
2. Add or edit slide.
3. Add title, subtitle, badge and CTA.
4. Add desktop image URL and mobile image URL if available.
5. Choose link type or custom href.
6. Choose theme, text alignment and overlay.
7. Set status active and sort order.
8. Save and verify `/shop`.

Best practices: use real product/festival/service imagery, keep copy short, use one primary CTA and make the first slide strong.

`/shop` is the practical storefront home. If `/shop` remains home, a standalone Shop nav item is redundant.

## 13. Festivals, Promotions And Offers

Festival routes: `/admin/festivals`, `/admin/festivals/new`, `/admin/festivals/[id]/edit`

Promotion routes: `/admin/promotions`, `/admin/promotions/new`, `/admin/promotions/[id]/edit`

Offer routes: `/admin/offers`, `/admin/offers/new`, `/admin/offers/[id]/edit`

Setup flow:

1. Create festival campaign if relevant.
2. Attach tags/categories/products where supported.
3. Create promotion placements.
4. Create offer rule and targets.
5. Connect hero slides or homepage areas.
6. Test public pages, cart quote and checkout behavior.

## 14. Orders, Requests And Mock Payments

Customer routes: `/cart`, `/checkout`, `/orders`, `/orders/[id]`

Admin routes: `/admin/orders`, `/admin/orders/[id]`, `/admin/requests`, `/admin/payments`

Order workflow:

1. Review order in `/admin/orders`.
2. Open order detail.
3. Review items, customer, payment status and activity.
4. Use assignment/document panels where relevant.
5. Handle cancellation/return/refund requests in `/admin/requests`.
6. Inspect mock payment attempts in `/admin/payments`.

Boundary: mock payments are not real settlement. No live refund, invoice, courier or wallet reversal is connected.

## 15. Memberships

Route: `/admin/memberships`

Use this for membership plans, benefits, rules, user memberships, membership requests and benefit usage records.

Workflow:

1. Configure plan.
2. Add benefits.
3. Add rules and usage limits.
4. Test `/membership` and review flow.
5. Review user memberships and benefit usage.

Membership can become loyalty, premium support, priority seva and discount entitlement. Recurring billing is not connected yet.

## 16. Asthi Visarjan Operations

Routes: `/admin/asthi`, `/admin/asthi/[applicationNo]`, `/asthi/apply`, `/asthi/[id]`, `/asthi/[id]/review`, `/asthi/[id]/complete-details`

Workflow:

1. Open `/admin/asthi`.
2. Review applications.
3. Open application detail.
4. Review payment, applicant, package and location.
5. Use documents for proof placeholders.
6. Use assignments/checklists if available.
7. Update status as work progresses.

Boundary: no real document storage, courier, ceremony provider or notification integration exists yet.

## 17. Kundli Packages And Kundli Operations

Routes:

- `/admin/kundli`: Kundli orders queue
- `/admin/kundli/[orderNo]`: Kundli order detail
- `/admin/kundli/packages`: Kundli package editor
- `/admin/kundali`: redirects to `/admin/kundli`
- `/kundli`: public package list
- `/kundli/apply`: customer package application

Important distinction:

- `/admin/kundli` is for orders/applications.
- `/admin/kundli/packages` is for package cards shown on `/kundli`.

Edit packages:

1. Open `/admin/kundli/packages`.
2. Edit package name, slug, price, currency and description.
3. Choose delivery mode.
4. Set active/inactive status.
5. Set estimate days and sort order.
6. Edit inclusions, one per line.
7. Save and verify `/kundli`.

Handle orders:

1. Open `/admin/kundli`.
2. Open order detail.
3. Review applicant, package, payment and birth details.
4. Assign reviewer/operator if needed.
5. Update status and report placeholders.
6. Use documents/checklists/assignments where applicable.

Boundary: no real astrology engine, report generation, consultation calendar or report delivery automation exists yet.

## 18. Service Bookings, Capacity And Reschedules

Routes: `/admin/service-bookings`, `/admin/service-bookings/[id]`, `/admin/capacity`, `/admin/service-capacity-rules`, `/admin/reschedule-requests`

Booking workflow:

1. Review booking status/payment.
2. Open booking detail.
3. Review customer, service, slot and notes.
4. Check capacity.
5. Assign work if needed.
6. Promote queued booking only when capacity allows or manual override is justified.

Capacity workflow:

1. Configure capacity rule.
2. Review slots.
3. Track holds, confirms, releases and cancellations.
4. Audit manual overrides.

Reschedule workflow:

1. Review pending request.
2. Compare requested date/time with capacity.
3. Approve, reject, queue or priority-exception.
4. Add notes.
5. Check service booking activity.

Boundary: no external calendar/provider availability or automated customer notification exists yet.

## 19. Documents, Assignments And Checklists

Routes: `/admin/documents`, `/admin/assignments`, `/admin/checklists`, `/admin/my-work`

Documents support Asthi, Kundli, orders, requests, assignments, customers, products and service bookings.

Document workflow:

1. Open `/admin/documents`.
2. Filter by status/type/owner.
3. Open related work item.
4. Approve, reject, request reupload, archive or change visibility where supported.

Assignments route internal work to users/teams. Use priority and due dates. `/admin/my-work` shows work assigned to the current user.

Checklists standardize repeated operational steps such as Asthi document review, Kundli report preparation, service fulfilment and order fulfilment.

Boundary: documents are URL/storage-key placeholders, not secure file storage yet.

## 20. Customers And CRM

Routes: `/admin/customers`, `/admin/customers/[id]`

Use customer detail for profile, orders, Asthi applications, Kundli orders, memberships, service bookings, internal notes, timeline, customer events and interest profile summary.

Workflow:

1. Search customer.
2. Open customer detail.
3. Review linked work.
4. Add internal note if needed.
5. Use timeline/events to understand behavior.

## 21. Admin Search, Reports And Events

Routes: `/admin/search`, `/admin/reports`, `/admin/customer-events`, `/admin/interest-profiles`

Admin search finds orders, products, customers, tags and operational records where indexed.

Reports show metrics for orders, mock paid revenue, requests, documents, stock, Asthi, Kundli, memberships and search queries.

Customer events track product/category/service/festival views, search, cart, checkout, order completion, membership intent and Asthi/Kundli starts.

Interest profiles summarize user and anonymous interests from first-party events.

Boundary: consent/privacy controls are needed before production marketing use.

## 22. Admin Hardening

Routes: `/admin/roles`, `/admin/permissions`, `/admin/audit-logs`, `/admin/settings`

Use roles for broad admin access assignment. Use permissions as a planning/reference shell. Use audit logs when investigating sensitive changes.

Production hardening still needed:

- Full RBAC per action
- Admin 2FA
- Session controls
- Rate limiting
- Sensitive data masking
- Provider credential isolation
- Backup/restore policy

## 23. Troubleshooting

### Category hero did not update

Check category edit saved, hero fields are set, category is active, and `/shop/category/[slug]` was hard-refreshed.

### Product missing from category

Check product status, assigned category/subcategory, product type, inventory and active filters.

### Sort jumps to top

Category sort/filter URLs should include `#products`. Hard refresh if old JS/CSS is cached.

### Header search text is invisible

The header input should use dark text on a light field. Hard refresh if stale CSS remains.

### Kundli packages are not in product/service admin

Kundli packages use a dedicated `KundliPackage` model. Edit them at `/admin/kundli/packages`.

### `/admin/kundali` looks confusing

`/admin/kundali` redirects to `/admin/kundli`. Use `/admin/kundli/packages` for package editing.

### Hero slide not appearing

Check slide status, title, desktop image URL and sort order. Then hard refresh `/shop`.

### Product detail tabs look wrong

Check content blocks, specs and FAQs on product edit. Reviews are separate.

## 24. Current Boundaries

The platform does not yet include live payment integration, real wallet ledger, refund settlement, courier API, invoice PDF generation, real file upload, private storage, signed URLs, Kundli report generation, email/WhatsApp/SMS provider, push notifications, production-grade RBAC, admin 2FA, rate limiting, bot protection, observability, backup automation or consent/privacy preference center.

## 25. Best Admin Discipline

- Keep public slugs stable.
- Use active/inactive status deliberately.
- Add images before judging frontend quality.
- Use category hero fields for major categories.
- Use product content blocks for PDP storytelling.
- Do not treat mock payments as real settlement.
- Do not treat document URLs as secure storage.
- Use assignments/checklists instead of informal tracking.
- Use audit logs for sensitive decisions.
- Keep tags clean because they affect search and recommendations.
- Test public pages after admin changes.

## 26. Suggested Admin Training Flow

Teach new admins in this order:

1. Login and overview.
2. Categories and category hero.
3. Products and PDP content.
4. Inventory and product cards.
5. Hero slides and homepage merchandising.
6. Orders and mock payments.
7. Requests and documents.
8. Asthi workflow.
9. Kundli packages and orders.
10. Service bookings and capacity.
11. Memberships.
12. Customers and notes.
13. Queues, reports and audit logs.

## 27. Final Notes

The admin panel is now broad enough for internal demonstrations and operational workflow validation. The highest-value next work is production payment integration, secure document storage, notifications, admin preview flows, stronger RBAC/security, media upload/crop tools, provider workflow polish and operational reporting discipline.
