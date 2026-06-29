import Link from "next/link";
import { formatMoney } from "@/lib/catalog";
import { cartSubtotal, getCurrentCart, itemSubtotal } from "@/lib/cart";
import { applyCouponAction, clearCouponAction, removeCartItemAction, updateCartItemQuantityAction } from "@/lib/cart-actions";
import { getCartStockIssues, getVariantStockSummaries, isPhysicalInventoryType } from "@/lib/inventory";
import { quoteCartPricing } from "@/lib/pricing";
import { BreadcrumbHeader, EmptyState, PrimaryLink, SecondaryLink, SummaryRow } from "@/components/ui";

export default async function CartPage() {
  const cart = await getCurrentCart();
  const items = cart?.items ?? [];
  const subtotal = cart ? cartSubtotal(cart) : 0;
  const [stockIssues, stockByVariant, quote] = await Promise.all([
    getCartStockIssues(items),
    getVariantStockSummaries(
      items
        .filter((item) => isPhysicalInventoryType(item.product.type))
        .map((item) => item.variantId)
        .filter((variantId): variantId is string => Boolean(variantId))
    ),
    quoteCartPricing(cart, cart?.couponCode ?? null)
  ]);
  const issueByItemId = new Map(stockIssues.map((issue) => [issue.itemId, issue]));

  return (
    <div className="grid gap-8">
      <BreadcrumbHeader items={[{ label: "Shop", href: "/shop" }, { label: "Cart" }]} />

      {items.length === 0 ? (
        <EmptyState
          title="Your cart is empty"
          description="Add products, memberships, kits, or services before checkout."
          actions={
            <>
              <PrimaryLink href="/shop">Browse shop</PrimaryLink>
              <SecondaryLink href="/services">Explore services</SecondaryLink>
            </>
          }
        />
      ) : (
        <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4">
            {items.map((item) => (
              <article key={item.id} className="rounded-lg border border-omd-sand bg-white p-5 shadow-sm">
                {(() => {
                  const stock = item.variantId ? stockByVariant.get(item.variantId) : null;
                  const issue = issueByItemId.get(item.id);

                  return (
                    <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">
                      {item.itemType}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-omd-brown">{item.titleSnapshot}</h2>
                    <p className="mt-1 text-sm text-omd-muted">
                      {item.variant?.title ?? item.product.title}
                    </p>
                    {isPhysicalInventoryType(item.product.type) ? (
                      <p className="mt-2 text-sm font-semibold text-omd-brown">
                        Available stock: {stock?.available ?? 0}
                      </p>
                    ) : null}
                    {issue ? (
                      <p className="mt-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-omd-error">
                        {issue.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-lg font-semibold text-omd-brown">
                      {formatMoney(item.priceSnapshot, item.product.currency)}
                    </p>
                    <p className="mt-1 text-sm text-omd-muted">
                      Subtotal {formatMoney(itemSubtotal(item), item.product.currency)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <form action={updateCartItemQuantityAction} className="flex items-center gap-2">
                    <input type="hidden" name="itemId" value={item.id} />
                    <label className="text-sm font-medium text-omd-muted" htmlFor={`quantity-${item.id}`}>
                      Qty
                    </label>
                    <input
                      id={`quantity-${item.id}`}
                      name="quantity"
                      type="number"
                      min="1"
                      max="99"
                      defaultValue={item.quantity}
                      className="h-10 w-20 rounded-md border border-omd-sand bg-omd-ivory/40 px-3 text-sm outline-none focus:border-omd-gold"
                    />
                    <button
                      type="submit"
                      className="h-10 rounded-md border border-omd-sand px-3 text-sm font-semibold text-omd-brown hover:border-omd-gold"
                    >
                      Update
                    </button>
                  </form>
                  <form action={removeCartItemAction}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <button type="submit" className="text-sm font-semibold text-omd-error hover:text-omd-brown">
                      Remove
                    </button>
                  </form>
                </div>
                    </>
                  );
                })()}
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-lg border border-omd-gold bg-white p-5 shadow-sm lg:sticky lg:top-6">
            <h2 className="text-xl font-semibold text-omd-brown">Cart Summary</h2>
            <div className="mt-5 grid gap-3 border-t border-omd-sand pt-4">
              <SummaryRow label="Items" value={items.length} />
              <SummaryRow label="Subtotal" value={formatMoney(subtotal)} />
              {quote.discountLines.map((line) => (
                <SummaryRow key={line.offerRuleId} label={line.code ? `Coupon ${line.code}` : line.title} value={`-${formatMoney(line.amount)}`} />
              ))}
              {quote.cashbackLines.map((line) => (
                <SummaryRow key={`cashback-${line.offerRuleId}`} label={line.title} value={`${formatMoney(line.amount)} promised`} />
              ))}
              <SummaryRow label="Final payable" value={formatMoney(quote.total)} strong />
            </div>
            <form action={applyCouponAction} className="mt-5 grid gap-2 rounded-md border border-dashed border-omd-sand bg-omd-ivory/40 p-3">
              <label htmlFor="couponCode" className="text-sm font-semibold text-omd-brown">Coupon code</label>
              <div className="flex gap-2">
                <input
                  id="couponCode"
                  name="couponCode"
                  defaultValue={cart?.couponCode ?? ""}
                  placeholder="OMD100"
                  className="h-10 min-w-0 flex-1 rounded-md border border-omd-sand bg-white px-3 text-sm uppercase outline-none focus:border-omd-gold"
                />
                <button className="rounded-md bg-omd-brown px-3 text-sm font-semibold text-white hover:bg-omd-saffron">Apply</button>
              </div>
              {quote.couponMessage ? (
                <p className={`text-xs font-semibold ${quote.couponStatus === "applied" ? "text-omd-success" : "text-omd-error"}`}>{quote.couponMessage}</p>
              ) : null}
            </form>
            {cart?.couponCode ? (
              <form action={clearCouponAction} className="mt-2">
                <button className="text-sm font-semibold text-omd-muted hover:text-omd-brown">Remove coupon</button>
              </form>
            ) : null}
            <Link
              href="/checkout"
              aria-disabled={stockIssues.length > 0}
              className={`mt-6 inline-flex w-full justify-center rounded-md px-4 py-2 text-sm font-semibold text-white ${
                stockIssues.length > 0 ? "pointer-events-none bg-omd-muted" : "bg-omd-brown hover:bg-omd-saffron"
              }`}
            >
              Continue to checkout
            </Link>
            {stockIssues.length > 0 ? (
              <p className="mt-3 text-sm font-semibold text-omd-error">
                Adjust cart quantities before checkout.
              </p>
            ) : null}
          </aside>
        </section>
      )}
    </div>
  );
}
