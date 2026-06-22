import Link from "next/link";
import { getWalletQuote } from "@/lib/wallet-client";
import { formatMoney } from "@/lib/catalog";
import { cartSubtotal, getCurrentCart, itemSubtotal } from "@/lib/cart";
import { requireCurrentUser } from "@/lib/auth/session";

export default async function CheckoutPage() {
  await requireCurrentUser();
  const [cart, walletQuote] = await Promise.all([getCurrentCart(), getWalletQuote()]);
  const items = cart?.items ?? [];
  const subtotal = cart ? cartSubtotal(cart) : 0;

  return (
    <div className="grid gap-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-omd-saffron">Commerce</p>
        <h1 className="mt-3 text-3xl font-semibold text-omd-brown">Checkout Review</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-omd-muted">
          This is a quote and review shell. No payment, order, inventory reservation, or fulfillment workflow is created.
        </p>
      </section>

      {items.length === 0 ? (
        <section className="rounded-lg border border-omd-sand bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-omd-brown">No items to checkout</h2>
          <p className="mt-3 text-sm text-omd-muted">Add an item to cart before reviewing checkout.</p>
          <Link href="/shop" className="mt-6 inline-flex rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
            Browse shop
          </Link>
        </section>
      ) : (
        <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="grid gap-4">
            {items.map((item) => (
              <article key={item.id} className="rounded-lg border border-omd-sand bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">
                      {item.itemType}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-omd-brown">{item.titleSnapshot}</h2>
                    <p className="mt-1 text-sm text-omd-muted">Qty {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-omd-brown">
                    {formatMoney(itemSubtotal(item), item.product.currency)}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-lg border border-omd-gold bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-omd-brown">Quote Summary</h2>
            <div className="mt-5 grid gap-3 border-t border-omd-sand pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-omd-muted">Subtotal</span>
                <span className="font-semibold text-omd-brown">{formatMoney(subtotal)}</span>
              </div>
              <div className="rounded-md border border-dashed border-omd-sand p-3 text-omd-muted">
                Coupons coming later.
              </div>
              <div className="rounded-md border border-dashed border-omd-sand p-3 text-omd-muted">
                Wallet is disabled/mock in this phase. Adapter status: {walletQuote.status}.
              </div>
              <div className="flex justify-between border-t border-omd-sand pt-4 text-base">
                <span className="font-semibold text-omd-brown">Final payable</span>
                <span className="font-semibold text-omd-brown">{formatMoney(subtotal)}</span>
              </div>
            </div>
            <button
              type="button"
              disabled
              className="mt-6 inline-flex w-full cursor-not-allowed justify-center rounded-md bg-omd-muted px-4 py-2 text-sm font-semibold text-white"
            >
              Payment coming in Phase 4
            </button>
          </aside>
        </section>
      )}
    </div>
  );
}
