# OMDivyaDarshan Commerce SaaS Product Audit

## 1. Executive Summary

The OMDivyaDarshan Commerce SaaS Platform is now a strong early transactional foundation for `app.omdivyadarshan.org`.

It is no longer only a project skeleton. The application currently includes:

- Next.js App Router foundation
- TypeScript and Tailwind CSS setup
- PostgreSQL with Prisma
- Tenant-aware data model
- Customer authentication
- Admin authentication
- Catalog management
- Product, service, membership, kit, and digital listing support
- Product variants
- Guest and logged-in cart
- Checkout review shell
- Internal payment-pending order drafts
- Inventory ledger foundation
- Physical stock reservation at checkout
- Admin inventory adjustment
- Customer order views
- Admin order visibility
- Wallet disabled/mock boundary

However, this is not yet a complete production ecommerce SaaS platform.

The biggest missing pieces are:

- Real payment gateway integration
- Payment success/failure lifecycle
- Order lifecycle management
- Fulfilment and shipping
- Membership activation
- Kit component logic
- Service booking and capacity
- Asthi workflow
- Coupons and discounts
- Customer profile and address book
- Notifications
- Production-grade auth and security hardening

Current product stage:

> A strong Phase 3 transactional foundation with catalog, cart, checkout draft, order shell, and inventory reservation, but without payment, fulfilment, service operations, or post-purchase lifecycle.

---

## 2. Current Tech Stack

### Frontend and App Framework

- Next.js App Router
- React Server Components
- Server Actions
- TypeScript
- Tailwind CSS

### Backend and Data

- PostgreSQL
- Prisma ORM
- Prisma migrations
- Prisma seed script

### Authentication

- Custom email/password authentication
- Signed cookie session
- Role-based admin access

### Configuration

- Environment-based local/staging/production config
- `.env.example`
- Runtime config through `lib/env.ts`
- Tenant config under `tenants/omdivyadarshan/tenant.config.ts`

### Wallet

- Wallet adapter exists
- Wallet remains disabled/mock
- No wallet ledger exists

---

## 3. Application Areas

### Public Storefront

Implemented routes:

```text
/
/shop
/product/[slug]
/services
/services/asthi-visarjan
/cart
/checkout
/login
/signup
/asthi/apply
```

### Customer App

Implemented routes:

```text
/dashboard
/orders
/orders/[id]
/wallet
```

### Admin App

Implemented routes:

```text
/admin
/admin/categories
/admin/categories/new
/admin/categories/[id]/edit
/admin/products
/admin/products/new
/admin/products/[id]/edit
/admin/services
/admin/services/new
/admin/orders
/admin/orders/[id]
/admin/inventory
/admin/queues
/admin/customers
/admin/settings
/admin/asthi
```

Some admin routes are functional. Some are placeholders.

---

## 4. Implemented Data Models

### Tenant and Auth

Implemented:

- `Tenant`
- `User`
- `Role`
- `UserRole`
- `AuditLog`

Current capabilities:

- OMDivyaDarshan tenant exists
- Users can sign up
- Users can log in
- Admin roles exist
- Admin route protection works
- Basic customer/admin users are seeded

Limitations:

- No password reset
- No email verification flow
- No phone OTP
- No MFA
- No session management page
- No user profile edit
- `AuditLog` exists but is not deeply used

---

### Catalog

Implemented:

- `Category`
- `Product`
- `ProductVariant`

Supported catalog types:

```text
PHYSICAL
DIGITAL
SERVICE
MEMBERSHIP
KIT
```

Current catalog supports:

- Products
- Services
- Digital offerings
- Membership products
- Kits
- Variants
- SKU
- Price and MRP
- Status
- Featured flag
- Sort order
- Category assignment
- Image URL
- Description and short description

Important business decisions already reflected:

- `MEMBERSHIP` is for Divya Membership monthly offerings.
- Membership offerings are product variants.
- No Gold/Silver/Lifetime membership language.
- Current seeded membership variants:
  - `Nitya Seva Monthly`
  - `Puja Sahyog Monthly`
  - `Kutumb Seva Monthly`
- `KIT` is used for grouped/bundled physical offerings.
- Kundli supports both delivery variants:
  - Digital Kundli Report
  - Printed Kundli Report

Limitations:

- Product types are still stored as strings, not strict enums.
- No product media gallery.
- No SEO metadata fields.
- No variant-specific images.
- No visibility schedule.
- No product approval workflow.
- No rich content editor.
- No kit component mapping yet.
- No structured membership benefits model yet.

---

### Cart

Implemented:

- `Cart`
- `CartItem`

Current behavior:

- Guest cart using signed cookie
- Logged-in customer cart
- Guest cart merge on login/signup
- Add to cart
- Quantity update
- Remove item
- Cart subtotal
- Variant-specific cart lines
- Cart stock warnings for physical products
- Checkout is blocked when physical quantity exceeds available stock

Important architecture rule:

> Cart does not reduce stock.

Limitations:

- No saved carts
- No cart expiry cleanup job
- No coupon application
- No shipping estimate
- No tax estimate
- No item-level personalization
- No advanced quantity rules
- Server action errors need better UI handling

---

### Checkout and Orders

Implemented:

- `Order`
- `OrderItem`

Current behavior:

- `/checkout` requires login
- Shows cart review
- Captures contact and shipping address
- Shows subtotal
- Shows coupon placeholder
- Shows wallet placeholder
- Shows payment gateway placeholder
- Creates internal order draft
- Order status is `payment_pending`
- Payment status is `not_started`
- Cart becomes `CONVERTED`
- Order item snapshots title, SKU, type, quantity, unit price, and line total
- Customer can view their own orders
- Admin can view tenant orders

Limitations:

- No real payment
- No payment attempt model
- No payment event model
- No gateway redirect
- No webhooks
- No cancellation flow
- No refund flow
- No invoice
- No tax invoice
- No shipment tracking
- No order timeline
- No customer-editable address after order draft
- No full order lifecycle

---

### Inventory

Implemented:

- `InventoryLedger`
- `InventoryMovementType`

Movement types:

```text
initial
adjustment
reserved
released
sold
returned
damaged
```

Actively used now:

```text
initial
adjustment
reserved
released
```

Current behavior:

- Physical products have inventory ledger tracking.
- Seed creates initial stock for seeded physical products.
- Admin can adjust stock.
- Stock adjustment requires a reason.
- Stock adjustment cannot make available stock negative.
- Checkout validates stock for physical products.
- Checkout creates reservation movements inside the order draft transaction.
- Admin order detail shows reservation summary.
- Admin can manually release reserved stock for payment-pending orders.

Important architecture rule:

> Checkout reserves stock. Payment success should later convert reserved stock to sold. Payment failure or expiry should release reserved stock.

Limitations:

- No automatic reservation expiry.
- No payment failure release job.
- No reserved-to-sold conversion.
- No returns or damaged stock workflow.
- No warehouse/location support.
- No inventory import/export.
- Low stock threshold is simple/hardcoded.
- Kit inventory is not component-aware yet.

---

### Wallet

Implemented:

- Wallet adapter/module boundary
- Mock wallet methods:
  - `getWalletQuote`
  - `lockWalletAmount`
  - `confirmWalletDebit`
  - `releaseWalletLock`
  - `reverseWalletDebit`

Current behavior:

- Wallet remains disabled/mock.
- Checkout shows wallet placeholder.
- No wallet tables.
- No wallet ledger.

Limitations:

- No wallet balance.
- No rewards.
- No redemption.
- No ledger.
- No reconciliation.

---

## 5. Current Customer Features

Available today:

- Browse shop
- Browse services
- View product/service detail
- View variants on detail page
- Add selected variant to cart
- Use guest cart
- Sign up
- Log in
- Merge guest cart into account
- View cart
- Update cart quantity
- Remove cart item
- See stock warnings for physical items
- Checkout review
- Create payment-pending order draft
- View own orders
- View own order detail

Not available yet:

- Pay online
- Receive payment confirmation
- Receive email/SMS notifications
- Track order
- Cancel order
- Download invoice
- Manage profile
- Save addresses
- Apply coupon
- Use wallet
- Activate membership
- Book service date/time
- Upload Asthi documents

---

## 6. Current Admin Features

Available today:

- Admin login
- Admin protected layout
- Admin overview metrics
- Manage categories
- Manage products/services
- Manage variants/SKUs
- View catalog table
- Create product
- Edit product
- Create service
- View orders
- View order detail
- View inventory
- Adjust stock
- View inventory movement history
- Release reserved stock manually

Partially available:

- Customers page exists but is not a real CRM yet.
- Queues page exists but no operational queue engine exists yet.
- Settings page exists but no deep settings management exists yet.
- Asthi admin page exists but no Asthi workflow exists yet.

Not available yet:

- Admin order status updates
- Payment capture/refund tools
- Fulfilment tools
- Shipping/dispatch tools
- Service capacity calendar
- Vendor management
- Staff assignment
- Coupon management
- Membership management
- Kit component builder
- Audit log viewer
- Role/user management UI
- Reporting/dashboard analytics

---

## 7. What Is Done Well

### 1. Phased foundation

The app has been built carefully in phases and has avoided premature payment/fulfilment complexity.

### 2. Clear transaction boundary

The architecture separates:

```text
Cart = intent
Checkout = order draft + reservation
Payment = future phase
Fulfilment = future phase
```

### 3. Ledger-based inventory

Using an inventory ledger instead of a single mutable stock number is the right long-term choice.

### 4. Variant-driven catalog

Variants already support:

- Membership monthly offerings
- Kundli delivery choices
- Future size/format/pricing options

### 5. Wallet boundary is safe

The wallet API boundary exists, but no fake real wallet ledger was created.

### 6. Admin and customer separation

Public, customer, and admin areas are structurally separated.

---

## 8. What Is Done But Incomplete

### Auth

Status: basic working.

Missing:

- Password reset
- Email verification
- Phone verification
- OTP
- Rate limiting
- Admin user management
- Session management

Priority: high before production.

---

### Catalog

Status: functional foundation.

Missing:

- Product media gallery
- SEO metadata
- Better type enforcement
- Product approval workflow
- Variant-specific images
- Kit component builder
- Membership benefits model

Priority: high.

---

### Cart

Status: functional.

Missing:

- Better server-action error UI
- Cart cleanup job
- Coupon integration
- Shipping/tax estimate
- Better cart merge conflict handling

Priority: medium-high.

---

### Checkout

Status: order draft shell.

Missing:

- Payment gateway
- Address book
- Shipping method
- Tax calculation
- Coupon validation
- Terms/consent
- Better validation messages
- Payment retry

Priority: very high.

---

### Orders

Status: read-only draft visibility.

Missing:

- Full lifecycle
- Admin actions
- Timeline/history
- Cancellation
- Refund
- Fulfilment status
- Customer notifications

Priority: very high.

---

### Inventory

Status: good foundation.

Missing:

- Reservation expiry
- Convert reserved to sold
- Release on payment failure
- Kit component inventory
- Low stock config
- Inventory reports
- Movement filters

Priority: high.

---

### Membership

Status: catalog-only.

Current:

- Membership product exists.
- Monthly variants exist.
- Can be added to cart.
- Can be included in order draft.

Missing:

- Membership activation after payment
- Start/end date
- Renewal logic
- Benefit entitlement
- Customer membership dashboard
- Admin membership view
- Cancellation/expiry

Priority: high after payment.

---

### Kit

Status: catalog-only.

Current:

- `KIT` type exists.
- Kit can be sold as one item.

Missing:

- Kit component model
- Component quantity mapping
- Component inventory reservation
- Kit order snapshot
- Kit fulfilment logic

Priority: medium-high.

---

### Services

Status: catalog/cart/order shell.

Current:

- Services can be listed.
- Services can be added to cart.
- Services can create order draft.

Missing:

- Booking date/time
- Capacity
- Priest/vendor assignment
- Service status lifecycle
- Customer requirements form
- Operational queue
- Completion proof

Priority: high for service business.

---

### Asthi Visarjan

Status: placeholder only.

Missing:

- Application workflow
- Applicant details
- Ritual location/date preferences
- Document upload
- Case status
- Operations queue
- Payment linkage
- Communication flow
- Completion proof

Priority: high if Asthi Visarjan is part of first commercial launch.

---

## 9. Missing Basic SaaS Ecommerce Features

### Payment

Required:

- Razorpay payment order creation
- Payment attempt model
- Payment event model
- Webhook verification
- Payment success/failure handling
- Retry payment
- Admin payment visibility
- Gateway reference IDs

This should be the next major milestone.

---

### Order Lifecycle

Needed statuses:

```text
payment_pending
paid
confirmed
processing
ready_to_ship
shipped
delivered
cancelled
refunded
failed
expired
```

For services:

```text
requested
scheduled
assigned
in_progress
completed
cancelled
```

For membership:

```text
pending_payment
active
expired
cancelled
```

---

### Fulfilment

Required for physical products:

- Shipping address validation
- Dispatch status
- Courier/tracking info
- Delivery status
- Admin fulfilment queue

---

### Notifications

Minimum:

- Signup/login email
- Order draft created
- Payment success
- Payment failure
- Order status updates
- Admin alerts

---

### Customer Account

Minimum:

- Profile
- Address book
- Order history
- Membership status
- Saved phone/email
- Communication preferences

---

### Admin Operations

Minimum:

- Order management actions
- Inventory filters
- Customer lookup
- Payment lookup
- Service queues
- Audit log viewer
- Staff role management

---

### Coupons and Discounts

Minimum:

- Coupon model
- Coupon validation
- Usage limits
- Expiry
- Cart/order discount snapshot

---

### Production Hardening

Minimum:

- Rate limiting
- CSRF/security review for server actions
- Better error states
- Logging
- Monitoring
- Backup strategy
- Environment validation
- Secret management
- Deployment pipeline

---

## 10. Recommended Roadmap

### Phase 4: Payment Foundation

Build:

- `PaymentAttempt`
- `PaymentEvent`
- Razorpay test mode integration
- Create payment request from payment-pending order
- Webhook verification
- Payment success updates order to paid
- Payment failure keeps/retries order
- On success, convert reserved stock to `sold`
- On failure/expiry, release reserved stock

Recommendation:

> Start with Razorpay only. Do not add PayPal yet unless business requires it immediately.

---

### Phase 4A: Order Lifecycle Foundation

Build:

- Formal order status constants
- Admin order actions
- Order timeline/history
- Customer order status display
- Admin notes
- Payment retry

---

### Phase 4B: Fulfilment Shell

Build:

- Fulfilment model
- Shipment/tracking placeholder
- Admin fulfilment queue
- Physical order processing status

---

### Phase 5: Membership Activation

Build:

- `MembershipSubscription`
- Start/end dates
- Membership status
- Plan snapshot
- Customer membership dashboard
- Admin membership view

Rule:

> Membership activates only after successful payment.

---

### Phase 6: Kit Components

Build:

- `KitComponent`
- Kit product component mapping
- Component quantity
- Component inventory reservation
- Component snapshot at order time

---

### Phase 7: Service Booking and Capacity

Build:

- Service booking model
- Date/time preferences
- Capacity ledger
- Admin scheduling
- Assignment queue

---

### Phase 8: Asthi Workflow

Build:

- Asthi application model
- Applicant details
- Document upload
- Status workflow
- Admin queue
- Payment linkage
- Completion records

---

## 11. Product Manager Judgment

The application is in a good place for its current phase.

It has real structural foundations:

- Tenant model
- Auth
- Admin separation
- Catalog variants
- Cart
- Order draft
- Inventory ledger
- Reservation logic

But it should not be considered launch-ready yet.

The strongest next move is not to add more storefront surface area. The strongest next move is to complete the transaction lifecycle:

1. Payment
2. Payment webhook
3. Stock sold/released
4. Order status progression
5. Admin order operations

Until payment and lifecycle are built, the app can demonstrate commerce intent but cannot safely operate as a real ecommerce engine.

Recommended immediate priority:

1. Razorpay test payment foundation
2. Payment webhook and order status update
3. Convert reserved stock to sold
4. Release reservation on failure/expiry
5. Admin order lifecycle controls
6. Customer order status polish

After this, membership activation and kit component logic become much safer to build.
