# Razorpay Test Mode: shop checkout

This increment replaces the shop order payment simulator with Razorpay Standard Checkout. It does not certify production or convert the separate membership, Kundli and service-booking payment flows. The existing Phase-1 release checker deliberately remains blocked for production.

## Local configuration

The ignored `.env.local` contains `RAZORPAY_MODE=test`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`. Restart Next.js after changing these. Never commit the credential export or environment file. Live keys are rejected by this increment.

The saved test keys were checked with a read-only Razorpay Orders API request. This proves authentication, not successful checkout or refund processing.

## Hosted webhook setup

1. Deploy this code to the testing service, configuring the four environment values securely. Local `.env.local` is not automatically deployed.
2. In Razorpay Test Mode, add a webhook for `https://omd-phase1-uat-845032306091.asia-southeast1.run.app/api/payments/razorpay/webhook`.
3. Set its secret to the same `RAZORPAY_WEBHOOK_SECRET` configured on that service. This is separate from the API key secret.
4. Subscribe to `payment.captured` and `order.paid`. Configure automatic capture for test payments.
5. Complete a test purchase. Confirm a captured payment in Razorpay, a confirmed order locally, and one stock-sale movement. Repeat with the browser closed after payment and verify webhook delivery.

The browser response is signature checked, then the payment is fetched from Razorpay to validate capture status, order reference, amount and currency. Signed webhooks use the same processing path. An order lock and processed capture record prevent duplicate fulfilment. The customer can use Check payment status to reconcile a captured payment without the browser callback.

## Behaviour and remaining release work

Closing Checkout does not declare payment failure or release inventory: a delayed capture may still arrive. The same pending provider order is reused for retries. Existing unpaid mock attempts are ignored by the new checkout. Existing paid mock history remains historical test data.

Late captures for cancelled/closed orders return a reconciliation error instead of silently reopening the order. Automated refund/reconciliation handling and timed inventory release remain required backlog items. Free-total orders need a separate zero-payment completion path. Membership and other independent purchase modules still use their existing payment flows and must be migrated before the full launch rehearsal.

No webhook was registered and no deployment was performed by this increment. Do not treat authentication and unit tests as end-to-end payment certification.
