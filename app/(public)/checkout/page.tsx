import { getWalletQuote } from "@/lib/wallet-client";
import { formatMoney } from "@/lib/catalog";
import { getCurrentCart, itemSubtotal } from "@/lib/cart";
import { requireCurrentUser } from "@/lib/auth/session";
import { createOrderDraftAction } from "@/lib/order-actions";
import { getCartStockIssues } from "@/lib/inventory";
import { quoteCartPricing } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { buildAddressText, resolveShippingSnapshot } from "@/lib/checkout-maturity";
import { BreadcrumbHeader, EmptyState, PrimaryLink, StatusBadge, SummaryRow } from "@/components/ui";
import Link from "next/link";

export default async function CheckoutPage() {
  const user = await requireCurrentUser();
  const [cart, walletQuote] = await Promise.all([getCurrentCart(), getWalletQuote()]);
  const items = cart?.items ?? [];
  const addresses = await prisma.customerAddress.findMany({
    where: { tenantId: cart?.tenantId ?? "", userId: user.id },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }]
  });
  const [stockIssues, quote] = await Promise.all([
    getCartStockIssues(items),
    quoteCartPricing(cart, cart?.couponCode ?? null, user)
  ]);
  const shippingPreviews = new Map(
    await Promise.all(
      addresses.map(async (address) => [address.id, await resolveShippingSnapshot(address.tenantId, address.pincode)] as const)
    )
  );
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
  const defaultShipping = defaultAddress ? shippingPreviews.get(defaultAddress.id) : null;
  const previewTotal = quote.total + (defaultShipping?.shippingAmount ?? 0);

  return (
    <div className="grid gap-8">
      <BreadcrumbHeader
        items={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]}
        actions={<StatusBadge tone="success">Signed in as {user.name || user.email || "Customer"}</StatusBadge>}
      />

      {items.length === 0 ? (
        <EmptyState
          title="No items to checkout"
          description="Add an item to cart before reviewing checkout."
          actions={<PrimaryLink href="/shop">Browse shop</PrimaryLink>}
        />
      ) : (
        <form action={createOrderDraftAction} className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-5">
            <section className="rounded-lg border border-omd-sand bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-omd-brown text-sm font-semibold text-white">1</span>
                <div>
                  <h2 className="text-xl font-semibold text-omd-brown">Delivery Address</h2>
                  <p className="mt-1 text-sm text-omd-muted">Choose a saved address or add one for this checkout. Orders keep a frozen address snapshot.</p>
                </div>
              </div>

              <input type="hidden" name="customerEmail" value={user.email ?? ""} />
              {addresses.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {addresses.map((address) => {
                    const preview = shippingPreviews.get(address.id);
                    return (
                      <label key={address.id} className="grid cursor-pointer gap-2 rounded-md border border-omd-sand bg-omd-ivory/30 p-4 text-sm hover:border-omd-gold">
                        <span className="flex flex-wrap items-center gap-2 font-semibold text-omd-brown">
                          <input name="addressId" type="radio" value={address.id} defaultChecked={address.id === defaultAddress?.id} />
                          {address.fullName}
                          {address.isDefault ? <StatusBadge tone="success">Default</StatusBadge> : null}
                        </span>
                        <span className="text-omd-muted">{address.phone} - {buildAddressText(address)}</span>
                        <span className="text-xs text-omd-muted">
                          {preview?.shippingServiceable === false
                            ? "Not marked serviceable. Order can be reviewed manually."
                            : preview?.shippingEstimateDays
                              ? `Estimated delivery ${preview.shippingEstimateDays} day(s), shipping ${formatMoney(preview.shippingAmount)}`
                              : "Standard delivery placeholder. Operations will review if needed."}
                        </span>
                      </label>
                    );
                  })}
                  <details className="rounded-md border border-dashed border-omd-sand bg-white p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-omd-brown">Use a new address for this order</summary>
                    <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-omd-brown">
                      <input name="addressId" type="radio" value="new" />
                      Save and use this new address
                    </label>
                    <CheckoutAddressFields userName={user.name ?? ""} required={false} />
                  </details>
                  <Link href="/addresses" className="w-fit text-sm font-semibold text-omd-saffron hover:text-omd-brown">
                    Manage address book
                  </Link>
                </div>
              ) : (
                <div className="mt-4">
                  <input type="hidden" name="addressId" value="new" />
                  <CheckoutAddressFields userName={user.name ?? ""} required />
                </div>
              )}
            </section>

            <section className="rounded-lg border border-omd-sand bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-omd-brown text-sm font-semibold text-white">2</span>
                <div>
                  <h2 className="text-xl font-semibold text-omd-brown">Delivery Review</h2>
                  <p className="mt-1 text-sm text-omd-muted">
                    {defaultShipping?.shippingServiceable === false
                      ? "The selected default pincode is not marked serviceable. This checkout can still be reviewed manually."
                      : defaultShipping?.shippingEstimateDays
                        ? `Default estimate: ${defaultShipping.shippingEstimateDays} day(s).`
                        : "Delivery estimate will be confirmed from the selected address."}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-omd-brown text-sm font-semibold text-white">3</span>
                <h2 className="text-xl font-semibold text-omd-brown">Review Items</h2>
              </div>
              {stockIssues.length > 0 ? (
                <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-semibold text-omd-error">
                  {stockIssues[0].message}
                </div>
              ) : null}
              {items.map((item) => (
                <article key={item.id} className="rounded-lg border border-omd-sand bg-white p-5 shadow-sm">
                  <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">{item.itemType}</p>
                      <h2 className="mt-2 text-lg font-semibold text-omd-brown">{item.titleSnapshot}</h2>
                      <p className="mt-1 text-sm text-omd-muted">
                        Qty {item.quantity} - Unit {formatMoney(item.priceSnapshot, item.product.currency)}
                      </p>
                    </div>
                    <p className="font-semibold text-omd-brown">{formatMoney(itemSubtotal(item), item.product.currency)}</p>
                  </div>
                </article>
              ))}
            </section>
          </div>

          <aside className="h-fit rounded-lg border border-omd-gold bg-white p-5 shadow-sm lg:sticky lg:top-6">
            <h2 className="text-xl font-semibold text-omd-brown">Quote Summary</h2>
            <div className="mt-5 grid gap-3 border-t border-omd-sand pt-4 text-sm">
              <SummaryRow label="Subtotal" value={formatMoney(quote.subtotal)} />
              {quote.discountLines.length === 0 ? <SummaryRow label="Discount" value={formatMoney(0)} /> : null}
              {quote.discountLines.map((line) => (
                <SummaryRow key={line.offerRuleId} label={line.code ? `Coupon ${line.code}` : line.title} value={`-${formatMoney(line.amount)}`} />
              ))}
              <SummaryRow label="Shipping" value={formatMoney(defaultShipping?.shippingAmount ?? quote.shippingTotal)} />
              <SummaryRow label="Tax" value={formatMoney(quote.taxTotal)} />
              <div className="rounded-md border border-dashed border-omd-sand bg-omd-ivory/40 p-3 text-omd-muted">
                <span className="font-semibold text-omd-brown">Coupons</span>
                <br />
                {quote.couponCode
                  ? `${quote.couponCode}: ${quote.couponMessage ?? "Coupon reviewed."}`
                  : "Add or remove coupon codes from your cart before checkout."}
              </div>
              {quote.cashbackLines.length > 0 ? (
                <div className="rounded-md border border-green-100 bg-green-50 p-3 text-omd-success">
                  <span className="font-semibold">Cashback promise</span>
                  <br />
                  {formatMoney(quote.cashbackPromiseTotal)} promised after eligible successful payment. Wallet ledger remains disabled.
                </div>
              ) : null}
              <div className="rounded-md border border-dashed border-omd-sand bg-omd-ivory/40 p-3 text-omd-muted">
                <span className="font-semibold text-omd-brown">Wallet</span>
                <br />
                Loyalty wallet rewards are not active yet. Adapter status: {walletQuote.status}.
              </div>
              <div className="rounded-md border border-dashed border-omd-sand bg-omd-ivory/40 p-3 text-omd-muted">
                <span className="font-semibold text-omd-brown">Payment</span>
                <br />
                A secure mock gateway will open after order creation. Real gateways are still disabled.
              </div>
              <div className="border-t border-omd-sand pt-4">
                <SummaryRow label="Final payable" value={formatMoney(previewTotal)} strong />
              </div>
            </div>
            <button
              disabled={stockIssues.length > 0}
              className="mt-6 inline-flex w-full justify-center rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron disabled:cursor-not-allowed disabled:bg-omd-muted"
            >
              {stockIssues.length > 0 ? "Resolve stock issue" : "Pay now with mock gateway"}
            </button>
          </aside>
        </form>
      )}
    </div>
  );
}

function CheckoutAddressFields({ userName, required }: { userName: string; required: boolean }) {
  const inputClass = "h-11 rounded-md border border-omd-sand bg-omd-ivory/40 px-3 outline-none focus:border-omd-gold";

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <input name="fullName" required={required} defaultValue={userName} placeholder="Full name" className={inputClass} />
      <input name="phone" required={required} placeholder="Phone" className={inputClass} />
      <input name="addressLine1" required={required} placeholder="Address line 1" className={`${inputClass} md:col-span-2`} />
      <input name="addressLine2" placeholder="Address line 2 optional" className={`${inputClass} md:col-span-2`} />
      <input name="city" required={required} placeholder="City" className={inputClass} />
      <input name="state" required={required} placeholder="State" className={inputClass} />
      <input name="pincode" required={required} placeholder="Pincode" className={inputClass} />
      <input name="country" required={required} defaultValue="India" placeholder="Country" className={inputClass} />
      <input name="landmark" placeholder="Landmark optional" className={`${inputClass} md:col-span-2`} />
      <label className="flex items-center gap-2 text-sm font-semibold text-omd-brown md:col-span-2">
        <input name="saveAddress" type="checkbox" defaultChecked />
        Save this address for future checkout
      </label>
    </div>
  );
}
