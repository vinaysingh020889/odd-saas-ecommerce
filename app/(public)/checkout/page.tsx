import Link from "next/link";
import { getWalletQuote } from "@/lib/wallet-client";
import { formatMoney } from "@/lib/catalog";
import { cartSubtotal, getCurrentCart, itemSubtotal } from "@/lib/cart";
import { requireCurrentUser } from "@/lib/auth/session";
import { createOrderDraftAction } from "@/lib/order-actions";

export default async function CheckoutPage() {
  const user = await requireCurrentUser();
  const [cart, walletQuote] = await Promise.all([getCurrentCart(), getWalletQuote()]);
  const items = cart?.items ?? [];
  const subtotal = cart ? cartSubtotal(cart) : 0;

  return (
    <div className="grid gap-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-omd-saffron">Commerce</p>
        <h1 className="mt-3 text-3xl font-semibold text-omd-brown">Checkout Review</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-omd-muted">
          Review your cart and contact details. This creates an internal payment-pending order draft only.
        </p>
        <p className="mt-3 text-sm font-semibold text-omd-brown">
          Signed in as {user.name || user.email || "Customer"}
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
        <form action={createOrderDraftAction} className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4">
            <section className="rounded-lg border border-omd-sand bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-omd-brown">Contact & Shipping</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <input name="customerName" required defaultValue={user.name ?? ""} placeholder="Full name" className="h-11 rounded-md border border-omd-sand px-3" />
                <input name="customerPhone" required placeholder="Phone" className="h-11 rounded-md border border-omd-sand px-3" />
                <input name="customerEmail" required type="email" defaultValue={user.email ?? ""} placeholder="Email" className="h-11 rounded-md border border-omd-sand px-3" />
                <input name="addressLine" required placeholder="Address line" className="h-11 rounded-md border border-omd-sand px-3" />
                <input name="city" required placeholder="City" className="h-11 rounded-md border border-omd-sand px-3" />
                <input name="state" required placeholder="State" className="h-11 rounded-md border border-omd-sand px-3" />
                <input name="pincode" required placeholder="Pincode" className="h-11 rounded-md border border-omd-sand px-3" />
                <input name="country" required defaultValue="India" placeholder="Country" className="h-11 rounded-md border border-omd-sand px-3" />
              </div>
            </section>

            <section className="grid gap-4">
              {items.map((item) => (
                <article key={item.id} className="rounded-lg border border-omd-sand bg-white p-5 shadow-sm">
                  <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">{item.itemType}</p>
                      <h2 className="mt-2 text-lg font-semibold text-omd-brown">{item.titleSnapshot}</h2>
                      <p className="mt-1 text-sm text-omd-muted">
                        Qty {item.quantity} · Unit {formatMoney(item.priceSnapshot, item.product.currency)}
                      </p>
                    </div>
                    <p className="font-semibold text-omd-brown">{formatMoney(itemSubtotal(item), item.product.currency)}</p>
                  </div>
                </article>
              ))}
            </section>
          </div>

          <aside className="h-fit rounded-lg border border-omd-gold bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-omd-brown">Quote Summary</h2>
            <div className="mt-5 grid gap-3 border-t border-omd-sand pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-omd-muted">Subtotal</span>
                <span className="font-semibold text-omd-brown">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-omd-muted">Discount</span>
                <span className="font-semibold text-omd-brown">{formatMoney(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-omd-muted">Shipping</span>
                <span className="font-semibold text-omd-brown">{formatMoney(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-omd-muted">Tax</span>
                <span className="font-semibold text-omd-brown">{formatMoney(0)}</span>
              </div>
              <div className="rounded-md border border-dashed border-omd-sand p-3 text-omd-muted">
                Coupons will be enabled in a later phase.
              </div>
              <div className="rounded-md border border-dashed border-omd-sand p-3 text-omd-muted">
                Loyalty wallet rewards are not active in this commerce build yet. Adapter status: {walletQuote.status}.
              </div>
              <div className="rounded-md border border-dashed border-omd-sand p-3 text-omd-muted">
                Payment gateway request will be enabled in the next phase.
              </div>
              <div className="flex justify-between border-t border-omd-sand pt-4 text-base">
                <span className="font-semibold text-omd-brown">Final payable</span>
                <span className="font-semibold text-omd-brown">{formatMoney(subtotal)}</span>
              </div>
            </div>
            <button className="mt-6 inline-flex w-full justify-center rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
              Create payment-pending order
            </button>
          </aside>
        </form>
      )}
    </div>
  );
}
