import { getWalletSnapshot, WALLET_PAYMENT_MAX_PERCENT } from "@/lib/wallet";
import { formatMoney } from "@/lib/catalog";
import { getCurrentCart, itemSubtotal } from "@/lib/cart";
import { createOrderDraftAction } from "@/lib/order-actions";
import { COMMERCE_MEMBERSHIP_MESSAGE, requireCommerceMembership } from "@/lib/commerce-membership-gate";
import { getCartStockIssues } from "@/lib/inventory";
import { quoteCartPricing } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { buildAddressText, calculateCartInclusiveTax, resolveShippingSnapshot } from "@/lib/checkout-maturity";
import { BreadcrumbHeader, EmptyState, PrimaryLink, StatusBadge, SummaryRow } from "@/components/ui";
import Link from "next/link";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ addressId?: string }> }) {
  const params = await searchParams;
  const { user, membership } = await requireCommerceMembership("/checkout");
  const cart = await getCurrentCart();
  const wallet = await getWalletSnapshot(cart?.tenantId ?? membership.tenantId, user.id);
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
  const selectedAddress = params.addressId === "new"
    ? null
    : addresses.find((address) => address.id === params.addressId) ?? defaultAddress;
  const selectedAddressId = params.addressId === "new" ? "new" : selectedAddress?.id ?? "new";
  const selectedShipping = selectedAddress ? shippingPreviews.get(selectedAddress.id) : null;
  const tax = calculateCartInclusiveTax(
    items.map((item) => ({ id: item.id, itemType: item.itemType, lineTotal: itemSubtotal(item), taxPercent: item.product.taxPercent })),
    quote.discountTotal
  );
  const totalBeforeWallet = quote.total + (selectedShipping?.shippingAmount ?? 0);
  const walletAmount = cart?.useWallet ? Math.min(wallet.balances.available, totalBeforeWallet * (WALLET_PAYMENT_MAX_PERCENT / 100)) : 0;
  const previewTotal = totalBeforeWallet - walletAmount;
  const deliveryBlocked = selectedAddress ? selectedShipping?.shippingServiceable !== true : false;

  return (
    <div className="grid gap-8">
      <BreadcrumbHeader
        items={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]}
        actions={<StatusBadge tone="success">Signed in as {user.name || user.email || "Customer"}</StatusBadge>}
      />
      <div className="rounded-lg border border-omd-gold bg-omd-ivory/60 p-4 text-sm text-omd-brown">
        <span className="font-semibold">{membership.plan.name} active.</span>{" "}
        {Number(membership.plan.price) > 0
          ? `Your paid membership benefits and savings are applied automatically below. Active until ${membership.expiresAt.toLocaleDateString("en-IN")}.`
          : "Your complimentary membership is active and checkout is unlocked."}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No items to checkout"
          description="Add an item to cart before reviewing checkout."
          actions={<PrimaryLink href="/shop">Browse shop</PrimaryLink>}
        />
      ) : (
        <form action={createOrderDraftAction} className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <input type="hidden" name="addressId" value={selectedAddressId} />
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
                      <Link href={`/checkout?addressId=${address.id}`} key={address.id} className={`grid cursor-pointer gap-2 rounded-md border p-4 text-sm ${address.id === selectedAddress?.id ? "border-omd-gold bg-omd-ivory" : "border-omd-sand bg-omd-ivory/30 hover:border-omd-gold"}`}>
                        <span className="flex flex-wrap items-center gap-2 font-semibold text-omd-brown">
                          <span aria-hidden="true">{address.id === selectedAddress?.id ? "●" : "○"}</span>
                          {address.fullName}
                          {address.isDefault ? <StatusBadge tone="success">Default</StatusBadge> : null}
                        </span>
                        <span className="text-omd-muted">{address.phone} - {buildAddressText(address)}</span>
                        <span className="text-xs text-omd-muted">
                          {preview?.shippingServiceable === false
                            ? "Delivery is not available for this pincode."
                            : preview?.shippingEstimateDays
                              ? `Estimated delivery ${preview.shippingEstimateDays} day(s), shipping ${formatMoney(preview.shippingAmount)}`
                              : "Delivery is not configured for this pincode."}
                        </span>
                      </Link>
                    );
                  })}
                  {selectedAddressId === "new" ? (
                    <section className="rounded-md border border-omd-gold bg-white p-4">
                      <p className="text-sm font-semibold text-omd-brown">New delivery address</p>
                      <CheckoutAddressFields userName={user.name ?? ""} required />
                    </section>
                  ) : (
                    <Link href="/checkout?addressId=new" className="rounded-md border border-dashed border-omd-sand bg-white p-4 text-sm font-semibold text-omd-brown">
                      Use a new address for this order
                    </Link>
                  )}
                  <Link href="/addresses" className="w-fit text-sm font-semibold text-omd-saffron hover:text-omd-brown">
                    Manage address book
                  </Link>
                </div>
              ) : (
                <div className="mt-4">
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
                    {selectedShipping?.shippingServiceable === false
                      ? "The selected pincode is not marked serviceable. Choose a serviceable address to continue."
                      : selectedShipping?.shippingEstimateDays
                        ? `Selected address estimate: ${selectedShipping.shippingEstimateDays} day(s).`
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
                      <p className="mt-1 text-xs text-omd-muted">
                        Price includes {Number(item.product.taxPercent ?? (item.product.type === "SERVICE" ? 18 : 5))}% GST
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
              <SummaryRow label="Shipping" value={formatMoney(selectedShipping?.shippingAmount ?? quote.shippingTotal)} />
              <SummaryRow label="Included tax" value={formatMoney(tax.taxAmount)} />
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
                  {formatMoney(quote.cashbackPromiseTotal)} promised after eligible successful payment. It will appear as pending in your ODD wallet after successful payment.
                </div>
              ) : null}
              <div className="rounded-md border border-dashed border-omd-sand bg-omd-ivory/40 p-3 text-omd-muted">
                <span className="font-semibold text-omd-brown">Wallet</span>
                <br />
                Available {formatMoney(wallet.balances.available)}. Pending cashback {formatMoney(wallet.balances.pending)}. {cart?.useWallet ? `${formatMoney(walletAmount)} will be reserved for this order; Razorpay charges the remainder.` : "Wallet use is off. Return to the cart to use your available balance."}
              </div>
              <div className="rounded-md border border-dashed border-omd-sand bg-omd-ivory/40 p-3 text-omd-muted">
                <span className="font-semibold text-omd-brown">Payment</span>
                <br />
                Razorpay Test Mode checkout opens after order creation. No real money is charged.
              </div>
              {walletAmount > 0 ? <SummaryRow label="ODD Wallet" value={`-${formatMoney(walletAmount)}`} /> : null}
              <div className="border-t border-omd-sand pt-4">
                <SummaryRow label="Final payable" value={formatMoney(previewTotal)} strong />
              </div>
            </div>
            <button
              disabled={stockIssues.length > 0 || deliveryBlocked}
              className="mt-6 inline-flex w-full justify-center rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron disabled:cursor-not-allowed disabled:bg-omd-muted"
            >
              {stockIssues.length > 0 ? "Resolve stock issue" : deliveryBlocked ? "Choose a serviceable address" : "Continue to Razorpay"}
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
