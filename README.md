# OMDivyaDarshan Commerce SaaS

Phase 3 foundation for the OMDivyaDarshan commerce SaaS app at `app.omdivyadarshan.org`.

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

## Phase Boundaries

- Wallet remains disabled/mock only.
- No wallet ledger is created.
- No payment, Asthi, inventory reservation, order fulfillment, or service capacity business logic is included.
- Admin routes remain visually separate and are still route/layout shells.

## Phase 2 Catalog

Phase 2 adds reusable catalog models and demo listings:

- Categories for products, services, and mixed offerings.
- Products/services with variants and placeholder prices.
- `/shop` lists active product/package/membership/digital items.
- `/product/[slug]` shows database-backed catalog detail.
- `/services` lists active service/package items.
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
