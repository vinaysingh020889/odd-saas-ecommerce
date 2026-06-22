import Link from "next/link";
import { formatMoney } from "@/lib/catalog";
import { cartSubtotal, getCurrentCart, itemSubtotal } from "@/lib/cart";
import { removeCartItemAction, updateCartItemQuantityAction } from "@/lib/cart-actions";

export default async function CartPage() {
  const cart = await getCurrentCart();
  const items = cart?.items ?? [];
  const subtotal = cart ? cartSubtotal(cart) : 0;

  return (
    <div className="grid gap-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-omd-saffron">Commerce</p>
        <h1 className="mt-3 text-3xl font-semibold text-omd-brown">Cart</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-omd-muted">
          Review selected products and services. Checkout is a quote shell only; payment is not live.
        </p>
      </section>

      {items.length === 0 ? (
        <section className="rounded-lg border border-omd-sand bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-omd-brown">Your cart is empty</h2>
          <p className="mt-3 text-sm text-omd-muted">Add demo catalog items from the shop or services page.</p>
          <Link
            href="/shop"
            className="mt-6 inline-flex rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron"
          >
            Browse shop
          </Link>
        </section>
      ) : (
        <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4">
            {items.map((item) => (
              <article key={item.id} className="rounded-lg border border-omd-sand bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">
                      {item.itemType}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-omd-brown">{item.titleSnapshot}</h2>
                    <p className="mt-1 text-sm text-omd-muted">
                      {item.variant?.title ?? item.product.title}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-omd-brown">
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
                      className="h-10 w-20 rounded-md border border-omd-sand px-3 text-sm"
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
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-lg border border-omd-gold bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-omd-brown">Cart Summary</h2>
            <div className="mt-5 flex items-center justify-between border-t border-omd-sand pt-4">
              <span className="text-sm text-omd-muted">Subtotal</span>
              <span className="font-semibold text-omd-brown">{formatMoney(subtotal)}</span>
            </div>
            <Link
              href="/checkout"
              className="mt-6 inline-flex w-full justify-center rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron"
            >
              Continue to checkout
            </Link>
          </aside>
        </section>
      )}
    </div>
  );
}
