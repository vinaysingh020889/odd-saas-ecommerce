# OMDivyaDarshan Admin Panel Usage Guide

Last updated: June 27, 2026

## 1. Purpose

This guide explains how to use the OMDivyaDarshan admin panel end to end.

It is written for:

- business admins
- catalog managers
- operations teams
- support agents
- product managers
- future custom GPT assistants that need to answer admin-panel questions

Admin URL:

`/admin`

Demo admin login:

`admin@omdivyadarshan.local` / `Admin@123`

Important boundary:

The platform currently uses mock/manual operational flows. Do not expect real Razorpay, PayPal, wallet ledger, courier API, WhatsApp, SMS, email, signed file storage, real report generation or real refund integration.

## 2. First-Time Setup Order

Use this order when making the website frontend ready:

1. Open `/admin` and confirm admin login works.
2. Configure categories and subcategories in `/admin/categories`.
3. Create/edit products in `/admin/products`.
4. Create/edit service products in `/admin/services`.
5. Add variants, images, specs, FAQs and content blocks from product edit pages.
6. Configure kit components for kit products.
7. Configure inventory in `/admin/inventory`.
8. Configure tags in `/admin/tags` and attach them to products/categories/services/festivals/promotions.
9. Configure homepage layout, festivals and promotions.
10. Configure offers/coupons in `/admin/offers`.
11. Configure delivery zones and shipping rules.
12. Configure membership plans, benefits and rules.
13. Test storefront, cart, checkout, mock payment and order tracking.
14. Configure Asthi and Kundli operational records if needed.
15. Configure service capacity slots/rules before promoting service bookings.
16. Use queues, documents, assignments and requests for day-to-day operations.
17. Use reports, audit logs and customer events for review.

If the frontend looks incomplete, usually the issue is category setup, product media, active status, inventory, homepage merchandising, or missing tags.

## 3. Daily Admin Operating Routine

Use this as the daily admin checklist:

1. Open `/admin`.
2. Check attention cards: orders, payments, stock, Asthi, Kundli, memberships, service bookings and reschedules.
3. Open `/admin/queues` for overdue, due today and unassigned work.
4. Open `/admin/notifications` for computed internal alerts.
5. Process order requests in `/admin/requests`.
6. Process service reschedules in `/admin/reschedule-requests`.
7. Review documents in `/admin/documents`.
8. Review paid orders in `/admin/orders`.
9. Review service bookings in `/admin/service-bookings`.
10. Review customer issues in `/admin/customers`.
11. Use `/admin/audit-logs` when you need to know who changed something.
12. Use `/admin/reports` for high-level metrics.

## 4. Admin Navigation Map

The sidebar is grouped into major admin areas.

Command:

- `/admin`: operations overview
- `/admin/search`: master admin search

Catalog:

- `/admin/products`: product list
- `/admin/services`: service product list
- `/admin/categories`: category and subcategory management
- `/admin/tags`: context graph tag management
- `/admin/reviews`: product review moderation
- `/admin/inventory`: inventory ledger and stock control

Merchandising:

- `/admin/homepage-layout`: current homepage control overview
- `/admin/festivals`: festival campaign management
- `/admin/promotions`: promotion placement management
- `/admin/offers`: offer and coupon rules

Operations:

- `/admin/orders`: ecommerce orders
- `/admin/service-bookings`: generic Puja/general service bookings
- `/admin/reschedule-requests`: service booking reschedule requests
- `/admin/requests`: cancellation/return/refund request shell
- `/admin/capacity`: capacity slots
- `/admin/service-capacity-rules`: capacity limits and queue rules
- `/admin/assignments`: internal work assignments
- `/admin/documents`: document/proof/report queue
- `/admin/orders?fulfillmentStatus=ready_to_ship`: fulfilment filtered order view
- `/admin/shipping-rules`: manual shipping rules
- `/admin/delivery-zones`: pincode serviceability
- `/admin/asthi`: Asthi operations
- `/admin/kundli`: Kundli operations
- `/admin/customers`: customer CRM
- `/admin/memberships`: membership plans, requests, benefits and rules

Finance:

- `/admin/payments`: mock payment attempts and events
- `/admin/orders?paymentStatus=refunded`: refund-state order view

System:

- `/admin/queues`: SLA/attention queues
- `/admin/notifications`: internal alert shell
- `/admin/reports`: read-only operational metrics
- `/admin/customer-events`: customer event browser
- `/admin/interest-profiles`: customer/anonymous interest profiles
- `/admin/search-insights`: public search insights
- `/admin/roles`: role assignment shell
- `/admin/permissions`: permission planning shell
- `/admin/audit-logs`: audit log browser
- `/admin/settings`: deferred settings surface

## 5. Admin Overview

Route:

`/admin`

Use this first after login.

This page shows operational attention across:

- Asthi applications
- Kundli orders
- memberships
- ecommerce orders
- payments
- paid orders awaiting processing
- low/out-of-stock items
- kits missing components
- reschedule requests

How to use it:

- Treat it as the control center.
- Click attention cards to jump into the right queue.
- Use it at the start of the day and after large test runs.

## 6. Categories and Subcategories

Routes:

- `/admin/categories`
- `/admin/categories/new`
- `/admin/categories/[id]/edit`

Use categories before products.

Recommended structure:

- Parent category: broad browsing bucket.
- Subcategory: product assignment bucket.

Example:

- Puja Samagri
  - Puja Kits
  - Sacred Waters
  - Puja Thali

What to configure:

- name
- slug
- parent category
- status
- type
- homepage intent fields
- featured flag
- sort order
- tags

How to add a subcategory:

1. Open `/admin/categories`.
2. Select or identify the parent category.
3. Click new category/add subcategory.
4. Choose the parent category in the form.
5. Save.
6. Return to the selected parent view.

Rules:

- Products should usually be assigned to subcategories.
- Parent category pages aggregate products from direct subcategories.
- Keep parent slugs stable because public links and campaigns may use them.
- Homepage intent fields are usually most useful on parent categories.

Frontend impact:

- `/shop`
- `/shop/category/[slug]`
- product dropdown
- homepage intent blocks
- festival/category linking

## 7. Products

Routes:

- `/admin/products`
- `/admin/products/new`
- `/admin/products/[id]/edit`

Use this for physical products, digital products, kits and legacy membership product records.

Create product flow:

1. Open `/admin/products/new`.
2. Fill title, slug, category/subcategory, type, status, price, description.
3. Save the product.
4. Open the product edit page.
5. Add variants.
6. Add media/images.
7. Add specs, FAQs and content blocks.
8. Attach tags.
9. Add kit components if the product is a kit.
10. Configure inventory for physical variants.

Important fields:

- title
- slug
- category
- product type
- short description
- description
- price/MRP
- status
- variant SKU
- active variant flag
- low stock threshold

Frontend impact:

- product card
- product detail page
- search
- recommendations
- cart
- checkout
- order snapshots

## 8. Product Media, Specs, FAQs and Content

Route:

`/admin/products/[id]/edit`

Use these controls to make product detail pages feel premium.

Media:

- Add image URLs.
- Mark one image as primary.
- Add alt text.
- Sort media in display order.
- Use real product-specific images whenever possible.

Specs:

- Pack type
- Material
- Shelf life
- Origin
- Ritual use
- Delivery mode

FAQs:

- What is included?
- How to use?
- Is it suitable for gifting?
- Is it digital or physical?
- Is this stock tracked?

Content blocks:

- What's inside
- How to use
- Ritual notes
- Care instructions
- Important guidance

If product cards or product detail pages look weak, first check product images and product content.

## 9. Kits

Route:

`/admin/products/[id]/edit`

Kits are sold as one product but can contain multiple component products/variants.

How to create a kit:

1. Create a product.
2. Set product type to `KIT`.
3. Save it.
4. Open the edit page.
5. Add kit components.
6. Set component quantity and sort order.
7. Ensure component variants have stock.

Why components appear after save:

The system needs a saved product ID before it can attach kit components safely.

Frontend and checkout impact:

- Kit appears as one sellable product.
- Checkout can reserve component inventory.
- Mock payment success converts reserved component stock to sold.

Admin warning:

Kits without components appear as incomplete attention items.

## 10. Services

Routes:

- `/admin/services`
- `/admin/services/new`
- `/services`
- `/services/[slug]`

Services are stored through the product/service catalog structure. Generic Puja/general services use `Product.type === "SERVICE"`.

Use services for:

- Puja booking
- priest-assisted service
- ritual service
- devotional consultation style offerings

Service setup flow:

1. Create service from `/admin/services/new`.
2. Add title, slug, category, description and status.
3. Add variants/packages if pricing differs.
4. Attach tags.
5. Add media/content if needed.
6. Configure capacity rules if the service has limited availability.

Important boundary:

Asthi and Kundli have dedicated engines. Do not force them into generic service booking unless intentionally planned later.

## 11. Inventory

Route:

`/admin/inventory`

Inventory tracks product variant stock through ledger movements.

Movement types:

- initial/opening stock
- adjustment
- reserved
- released
- sold
- returned
- damaged

How to use:

1. Confirm product variants exist.
2. Add opening stock or adjustment.
3. Use filters for product, SKU, stock status or movement.
4. Review ledger history on the right/detail view.
5. Investigate low/out-of-stock items from `/admin`.

Important behavior:

- Cart does not reduce stock.
- Checkout reserves stock.
- Mock payment success converts reserved stock to sold.
- Mock payment failure/cancel releases stock.
- Kits can reserve component stock.

## 12. Tags and Context Graph

Routes:

- `/admin/tags`
- `/admin/tags/new`
- `/admin/tags/[id]/edit`

Tags power discovery, search, recommendations and context chips.

Tag types include:

- festival
- puja
- ritual
- deity
- temple
- place
- tithi
- occasion
- product use
- service type
- benefit intent
- content topic
- material attribute

How to use:

1. Create or edit tags in `/admin/tags`.
2. Add aliases for Hindi, Sanskrit, transliteration and spelling variants.
3. Attach tags from product, category, service, festival and promotion forms.
4. Use tags to connect related products/services/festivals.

Frontend impact:

- product detail tag chips
- category tag chips
- festival tag chips
- smart search
- related products
- related services
- required samagri

## 13. Smart Search and Search Insights

Public search:

`/search`

Admin insight:

`/admin/search-insights`

Search covers:

- product title, slug, description
- service title
- product specs
- product FAQs
- categories
- festivals
- tags
- tag aliases
- attached tag relations

How admin should use insights:

1. Open `/admin/search-insights`.
2. Review recent searches.
3. Review repeated searches.
4. Review no-result searches.
5. Add products, tags, aliases or content if customers search for missing terms.

## 14. Recommendations

Recommendations are automatic in v1.

They use:

- shared tags
- tag type importance
- same category
- festival campaign links
- active status
- inventory availability where useful

Where recommendations appear:

- product detail: related products and related services
- service surfaces: required samagri where safe
- festival pages: linked or tag-matched products/services
- category pages: related services/useful collection sections

How admin controls them:

- Attach better tags.
- Link products/services/categories to festivals.
- Keep products active and stocked.
- Add strong categories and descriptions.

There is no manual recommendation admin yet.

## 15. Homepage Layout, Festivals and Promotions

Routes:

- `/admin/homepage-layout`
- `/admin/festivals`
- `/admin/festivals/new`
- `/admin/festivals/[id]/edit`
- `/admin/promotions`
- `/admin/promotions/new`
- `/admin/promotions/[id]/edit`

Homepage layout:

- Shows current hero source.
- Shows active intent categories.
- Shows active festivals.
- Shows active placements.
- Links to edit source records.

Festival campaigns:

- Use for Raksha Bandhan, Sawan, Shradh, Diwali, Navratri and similar seasonal campaigns.
- Add title, slug, description, images, schedule, CTA and SEO fields.
- Link products, services and categories.
- Set status and hero/focus visibility.

Promotion placements:

- Use placement keys like homepage hero, announcement strip, shop banner, dashboard seasonal card, cart cross-sell and checkout suggestion.
- Add image URL, CTA and active dates.
- Draft/expired/archived placements do not show publicly.

If homepage image is not showing:

1. Check placement key.
2. Check status is active.
3. Check date range includes today.
4. Check image URL is valid and public.
5. Check priority and sort order.
6. Check homepage layout page to see which source is active.

## 16. Offers and Discount Center

Routes:

- `/admin/offers`
- `/admin/offers/new`
- `/admin/offers/[id]/edit`

Use offers for:

- automatic discounts
- coupon discounts
- product/category/service/membership/kit targeting
- flat discounts
- percentage discounts
- cashback promise placeholders

Setup flow:

1. Choose automatic or coupon rule.
2. Set title/code if coupon.
3. Choose target scope.
4. Set discount kind and value.
5. Set max discount and min cart value.
6. Set priority and active dates.
7. Save.
8. Test in cart/checkout.

Important:

- Cashback is only a promised benefit.
- No wallet credit is created.
- No real payment provider is connected.

## 17. Customer Addresses, Shipping and Delivery Zones

Routes:

- `/addresses`
- `/admin/delivery-zones`
- `/admin/shipping-rules`

Customer addresses:

- Customers can add/edit/delete/set default addresses.
- Checkout stores address snapshots on orders.

Delivery zones:

- Use pincode, city, state, serviceable flag and estimated days.
- Product page pincode checker reads this data.

Shipping rules:

- Manual shell for charges and estimates.
- No real courier API.

## 18. Cart, Checkout and Orders

Customer routes:

- `/cart`
- `/checkout`
- `/orders`
- `/orders/[id]`

Admin routes:

- `/admin/orders`
- `/admin/orders/[id]`

Customer order flow:

1. Add item to cart or Buy Now.
2. Login if required.
3. Select address.
4. Review cart.
5. Apply coupon if available.
6. Review shipping/tax/final amount.
7. Create order.
8. Start mock payment.
9. Simulate success/failure/cancel.
10. Track order.

Admin order detail shows:

- order summary
- customer/contact
- items
- kit component snapshot
- payment status
- payment attempts/events
- inventory movements
- fulfilment block
- admin notes
- requests
- documents
- assignments
- timeline
- invoice placeholder
- shipping/tax snapshot

Allowed admin actions:

- mark processing
- mark ready to ship
- mark shipped
- mark delivered
- cancel when allowed
- add/update tracking placeholder
- add notes
- mark refund requested/refunded as mock/admin state

Rules:

- Unpaid orders cannot be shipped/delivered.
- Delivered orders should not go back to processing.
- Cancelled/refunded orders have limited actions.
- Sensitive actions write audit logs.

## 19. Mock Payments

Routes:

- `/admin/payments`
- `/orders/[id]`

Mock payment supports:

- start payment
- success
- failure
- cancel
- retry

Admin payments page shows:

- provider
- order number
- customer
- amount
- status
- created date
- payment events count

Important:

- This is not Razorpay or PayPal.
- Backend actions update payment/order state.
- Frontend state alone never confirms payment.

## 20. Requests: Cancellation, Return and Refund Shell

Routes:

- `/admin/requests`
- customer order detail `/orders/[id]`

Customers can raise:

- cancellation request
- return request
- refund request

Admin can:

- mark under review
- approve
- reject
- close

Important:

- No real refund provider is connected.
- Requests create order activity.
- Sensitive admin decisions write audit logs.
- Customer order detail shows request status and next step.

## 21. Memberships

Routes:

- `/membership`
- `/membership/[slug]/review`
- `/admin/memberships`
- `/admin/customers/[id]`

Membership admin controls:

- edit plan name, description, price and duration
- active/inactive state
- featured state
- sort order
- renewal allowed flag
- upgrade allowed flag
- cancellation request allowed flag
- customer note
- internal note
- create/edit/deactivate/reactivate benefits
- create/edit/deactivate/reactivate guided rules
- preview rule evaluation
- review cancellation/downgrade/upgrade requests

Benefit fields:

- title
- description
- type
- scope
- value
- usage limit
- reset period
- validity range
- active state
- customer-visible flag
- internal note

Benefit types:

- discount percent
- discount amount
- free usage
- priority support
- priority queue
- access
- shipping benefit
- wallet bonus placeholder
- custom

Scopes:

- shop
- puja
- kundli
- asthi
- service booking
- festival
- content
- support
- shipping
- global

How to test membership rules:

1. Open `/admin/memberships`.
2. Choose a member in Rule Preview.
3. Select scope.
4. Enter sample amount.
5. Click Evaluate.
6. Check matched benefits, matched rules, discount hints, priority flags and usage remaining.

Important:

- Admin never edits raw JSON.
- Rule changes affect future evaluation immediately.
- Preview does not consume usage.
- Usage history remains if a benefit is deactivated.
- No wallet credit or real billing is connected.

## 22. Asthi Visarjan Operations

Routes:

- `/admin/asthi`
- `/admin/asthi/[applicationNo]`
- `/services/asthi-visarjan`
- `/asthi/[id]`

Use Asthi admin for:

- reviewing applications
- confirming mock payment state
- reviewing details
- checking documents
- scheduling ritual
- uploading proof placeholders
- completing application
- assignment
- document/proof/certificate placeholder control

Typical admin flow:

1. Open `/admin/asthi`.
2. Filter by status.
3. Open application.
4. Review selected seva/package/add-ons.
5. Review details and documents.
6. Mark documents verified where appropriate.
7. Schedule ritual.
8. Assign operator/pandit/coordinator.
9. Add proof/certificate placeholders.
10. Progress status and timeline.

Customer experience:

- Active applications appear on Asthi landing/tracking surfaces.
- Customer sees status, documents and timeline.

## 23. Kundli Operations

Routes:

- `/admin/kundli`
- `/admin/kundli/[orderNo]`
- `/kundli`
- `/kundli/[id]`

Use Kundli admin for:

- reviewing Kundli orders
- checking payment/details
- assignment
- document/report placeholders
- consultation/report status
- customer-visible timeline

Typical admin flow:

1. Open `/admin/kundli`.
2. Filter by status.
3. Open order.
4. Review package and details.
5. Assign astrologer/operator.
6. Add internal or customer-visible notes.
7. Add report/document placeholder.
8. Progress status.

Important:

- No real Kundli report engine exists yet.
- No real PDF report generation exists yet.

## 24. Puja / General Service Bookings

Routes:

- `/admin/service-bookings`
- `/admin/service-bookings/[id]`
- `/services/[slug]`
- `/service-bookings/[id]`
- `/service-bookings/[id]/review`

This module is separate from:

- Asthi engine
- Kundli engine
- product order fulfilment

Admin can:

- search bookings
- filter by booking/payment/capacity/priority/date
- update booking/payment status
- add internal notes
- add customer-visible notes
- view queue position and queue reason
- add/remove queue priority
- promote queued bookings
- assign staff
- manage documents/proof placeholders
- view timeline
- view capacity ledger if slot exists

Customer flow:

1. Open `/services`.
2. Open `/services/[slug]`.
3. Choose package, date/time/location and instructions.
4. Continue to review.
5. Simulate mock payment.
6. Track service booking.

## 25. Service Capacity and Queue Rules

Routes:

- `/admin/capacity`
- `/admin/service-capacity-rules`

Capacity slots:

- Use `/admin/capacity`.
- Create slots by date, service type, title, time and capacity.
- Slot ledgers show hold/confirm/release/cancel movements.

Capacity rules:

- Use `/admin/service-capacity-rules`.
- Set daily/weekly/monthly/total limits.
- Target all services or a specific service/variant.
- Optionally set location/date/range.
- Keep manual review fallback enabled unless the service must be unavailable.

Queue behavior:

- If capacity is full, booking joins queue.
- Payment is paused until admin promotes it.
- Admin can prioritize or promote with manual override.

## 26. Reschedule Requests

Routes:

- `/admin/reschedule-requests`
- `/admin/service-bookings/[id]`
- `/service-bookings/[id]`

Customer can request:

- new date
- new time
- new capacity slot
- new place
- reason

Admin actions:

- approve
- reject
- approve to queue
- priority exception

Rules:

- Request does not change booking immediately.
- Approval re-checks capacity.
- Old capacity is released if needed.
- New capacity is held/confirmed if available.
- Queue or priority exception is audited.

How to process:

1. Open `/admin/reschedule-requests`.
2. Review customer reason and requested schedule.
3. Open booking if more context is needed.
4. Approve if capacity is acceptable.
5. Use Approve to Queue if full but acceptable later.
6. Use Priority Exception only with a clear reason.
7. Reject with a customer-visible note if needed.

## 27. Documents / Proof / Reports

Routes:

- `/admin/documents`
- document panels inside Asthi, Kundli, orders, requests, assignments and service bookings

Document records are placeholders for now.

Document owner types include:

- Asthi application
- Kundli order
- order
- order item
- order request
- assignment
- service booking
- customer
- product
- general

Statuses:

- requested
- uploaded
- under review
- approved
- rejected
- reupload required
- archived

Visibility:

- internal only
- customer visible

How to use:

1. Create requested document placeholder.
2. Add file URL or storage key placeholder.
3. Mark under review.
4. Approve, reject or request reupload.
5. Toggle customer-visible only when safe.

Important:

- No real file upload or private storage exists yet.
- Do not store private production documents in plain public URLs.

## 28. Assignments

Routes:

- `/admin/assignments`
- embedded assignment panels on operational detail pages

Use assignments to route work internally.

Assignment fields:

- work type
- work id
- assigned role
- assigned user
- status
- priority
- due date
- internal note
- customer-visible note

Use cases:

- assign Asthi coordinator
- assign Kundli astrologer
- assign order fulfilment owner
- assign service booking operator
- assign document reviewer

## 29. Customers and CRM

Routes:

- `/admin/customers`
- `/admin/customers/[id]`

Customer detail shows:

- profile and roles
- orders
- active cart
- internal notes
- membership engine data
- legacy membership subscriptions
- Asthi applications
- Kundli orders
- requests
- documents
- assignments
- interest profile
- recent events
- combined timeline

How to use:

1. Search by name, email or phone.
2. Open customer.
3. Review orders and active cart.
4. Add internal note if support context is needed.
5. Review membership benefits and remaining usage.
6. Check timeline before making operational decisions.

Internal notes never appear on customer-facing pages.

## 30. Admin Search

Routes:

- `/admin/search`
- search box in admin header

Use master search when you know only a keyword.

It searches:

- products
- services
- categories
- customers
- orders
- payments
- requests
- documents
- assignments
- Asthi applications
- Kundli orders
- memberships
- tags
- festivals
- promotions
- capacity slots

Good search examples:

- product: `ganga`, `rudraksha`, `kit`
- customer: email or phone
- order: order number
- operations: document title, assignment label, Asthi application number, Kundli order number
- merchandising: tag name, festival name, promotion key

## 31. Reviews

Route:

`/admin/reviews`

Use this to moderate product reviews.

Admin can:

- filter pending/approved/rejected
- approve reviews
- reject reviews
- open product edit page

Reviews affect product trust and product detail credibility.

## 32. Admin Hardening

Routes:

- `/admin/roles`
- `/admin/permissions`
- `/admin/audit-logs`

Roles:

- assign/remove existing roles
- protect final super-admin assignment

Permissions:

- planning/visibility shell for role groups
- not yet full enforcement everywhere

Audit logs:

- filter by actor
- filter by action
- filter by entity
- filter by date
- inspect metadata where role allows

Use audit logs when:

- order state changed unexpectedly
- membership rules changed
- document was approved/rejected
- role was changed
- assignment or request decision needs review

## 33. Notifications, Queues and Reports

Routes:

- `/admin/notifications`
- `/admin/queues`
- `/admin/reports`

Notifications:

- computed internal alerts
- no email/SMS/WhatsApp sending

Queues:

- overdue assignments
- due today
- unassigned
- Asthi
- Kundli
- service bookings
- service queue
- orders
- requests
- reschedules
- documents

Reports:

- order count
- mock paid revenue
- pending requests
- pending documents
- low stock
- Asthi summary
- Kundli summary
- membership summary
- search/event summary
- high intent users

Use reports for status review, not financial reconciliation.

## 34. Customer Events and Interest Profiles

Routes:

- `/admin/customer-events`
- `/admin/interest-profiles`
- `/admin/customers/[id]`
- `/admin/reports`

Events include:

- product view
- category view
- service view
- festival view
- tag click
- search
- add to cart
- wishlist
- checkout started
- order completed
- Asthi started
- Kundli started
- membership viewed
- service booking events
- reschedule events

Use cases:

- understand customer intent
- identify popular searches
- identify high-interest users
- improve tags and merchandising
- improve product/category gaps

Privacy boundary:

- first-party internal analytics only
- no external analytics provider
- production launch needs consent and retention policy

## 35. Settings

Route:

`/admin/settings`

This is currently a deferred/system surface.

Do not expect final production settings here yet.

## 36. Practical Troubleshooting

Product not visible:

1. Is product status active?
2. Is category active?
3. Is product assigned to category/subcategory?
4. Is variant active?
5. Does price exist?
6. Does product have media?
7. Is stock required and available?

Category page empty:

1. Is the slug correct?
2. Is it parent or subcategory?
3. Are products assigned to child subcategories?
4. Are products active?
5. Are filters/search hiding results?

Homepage hero image not showing:

1. Check active `homepage_hero` promotion.
2. Check date range.
3. Check image URL is public.
4. Check priority.
5. Check `/admin/homepage-layout`.

Coupon not applying:

1. Check offer status.
2. Check coupon code.
3. Check date range.
4. Check min cart value.
5. Check target product/category/service.
6. Check checkout quote.

Inventory wrong:

1. Open `/admin/inventory`.
2. Search SKU/product.
3. Review ledger.
4. Check reserved/sold/released movements.
5. Check kit component stock if kit order.

Membership benefit not visible:

1. Check plan active.
2. Check benefit active.
3. Check customer-visible flag.
4. Check validity dates.
5. Check scope.
6. Check `/admin/memberships` preview.

Service booking queued unexpectedly:

1. Check selected slot capacity.
2. Check capacity rules.
3. Check date/location matching.
4. Check queue reason.
5. Promote only when capacity is available or exception is accepted.

Document not visible to customer:

1. Check owner type and owner ID.
2. Check status.
3. Check visibility is customer visible.
4. Check customer page supports that owner document list.

Checklist item not visible to customer:

1. Open `/admin/checklists` and confirm the template step has customer milestone enabled.
2. Open the work detail page, such as service booking, Asthi, Kundli or order.
3. Confirm the checklist instance exists.
4. Add a customer-visible note if the customer should see extra context.
5. Remember internal notes never appear on customer pages.

Workflow has pending required work:

1. Open `/admin/queues`.
2. Review Checklist Pending, Checklist Overdue, Checklist Blocked and Required Checklist Waiting cards.
3. Open the owner record from the relevant queue.
4. Complete, skip with reason or block with reason.
5. Do not close operational workflows when required items remain unless an admin override is explicitly justified.

Admin route redirects to login:

- User is not logged in or session expired.
- Login again with admin credentials.

Admin route not allowed:

- User may not have admin role.
- Check `/admin/roles`.

## 37. Current Boundaries

Do not expect these yet:

- real Razorpay
- real PayPal
- real payment webhooks
- real wallet ledger
- real cashback credit
- real courier API
- real refund execution
- real file upload/storage
- signed URLs
- real invoice PDF
- real Kundli report generation
- real Asthi proof upload
- real email/SMS/WhatsApp notifications
- full fine-grained RBAC enforcement
- 2FA
- external analytics providers
- consent manager
- advanced analytics
- final mobile UI QA

## 38. Best Next Operational Discipline

Before adding more big modules, admins should keep these habits:

- Use tags consistently.
- Keep category hierarchy clean.
- Add real product images.
- Avoid creating kits without components.
- Use customer-visible notes carefully.
- Use internal notes for admin-only context.
- Deactivate records instead of deleting where history exists.
- Use audit logs when investigating changes.
- Test customer journeys after major catalog, offer or membership rule changes.

This guide should be treated as the operating manual for the current admin panel state.
