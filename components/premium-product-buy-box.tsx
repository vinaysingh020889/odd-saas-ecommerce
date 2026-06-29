"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { addToCartAction, buyNowAction } from "@/lib/cart-actions";
import { toggleWishlistAction } from "@/lib/wishlist-actions";
import { formatMoney } from "@/lib/catalog";

type BuyBoxVariant = {
  id: string;
  title: string | null;
  sku: string | null;
  price: number;
  mrp: number | null;
  stockLabel: string;
  disabled: boolean;
};

type DeliveryResult =
  | { kind: "none" }
  | { kind: "unknown"; pincode: string }
  | { kind: "serviceable"; pincode: string; city: string; state: string; estimatedDays: number | null }
  | { kind: "unserviceable"; pincode: string; city: string; state: string };

function CartIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 6h15l-2 8H8L6 3H3" />
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

function SubmitButton({
  children,
  variant,
  disabled
}: {
  children: string;
  variant: "primary" | "secondary";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const classes =
    variant === "primary"
      ? "border border-omd-saffron bg-white text-omd-saffron hover:bg-omd-ivory"
      : "bg-omd-brown text-white hover:bg-omd-saffron";

  return (
    <button
      disabled={disabled || pending}
      className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-omd-muted ${classes}`}
    >
      {variant === "secondary" ? <CartIcon /> : null}
      {pending ? "Please wait" : children}
    </button>
  );
}

export function PremiumProductBuyBox({
  title,
  eyebrow,
  description,
  productId,
  productSlug,
  variants,
  requestedPincode,
  deliveryResult,
  wishlistActive,
  currency
}: {
  title: string;
  eyebrow: string;
  description?: string | null;
  productId: string;
  productSlug: string;
  variants: BuyBoxVariant[];
  requestedPincode: string;
  deliveryResult: DeliveryResult;
  wishlistActive: boolean;
  currency: string;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) ?? variants[0],
    [selectedVariantId, variants]
  );
  const purchaseDisabled = !selectedVariant || selectedVariant.disabled;
  const selectedMrp = selectedVariant?.mrp ?? null;
  const selectedPrice = selectedVariant?.price ?? 0;
  const discount =
    selectedMrp && selectedMrp > selectedPrice
      ? Math.round(((selectedMrp - selectedPrice) / selectedMrp) * 100)
      : null;

  return (
    <aside className="h-fit rounded-2xl border border-[#ead7bf] bg-white p-5 shadow-[0_14px_45px_rgba(59,31,20,0.07)] xl:sticky xl:top-28">
      <p className="text-xs font-bold uppercase tracking-wide text-omd-saffron">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold leading-tight text-omd-brown lg:text-4xl">{title}</h1>
      {description ? <p className="mt-3 text-sm leading-6 text-omd-muted">{description}</p> : null}

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <p className="text-3xl font-semibold text-omd-brown">{formatMoney(selectedPrice, currency)}</p>
        {selectedMrp ? <p className="pb-1 text-base text-omd-muted line-through">{formatMoney(selectedMrp, currency)}</p> : null}
        {discount ? <p className="pb-1 text-sm font-semibold text-omd-success">{discount}% off</p> : null}
      </div>
      <p className="mt-1 text-xs text-omd-muted">Inclusive of all taxes. Payment remains mock in this phase.</p>

      <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-omd-brown">
        {selectedVariant?.sku ? <span className="rounded-full border border-omd-sand bg-omd-ivory px-3 py-1.5">SKU: {selectedVariant.sku}</span> : null}
        {selectedVariant?.stockLabel ? <span className="rounded-full border border-omd-sand bg-omd-ivory px-3 py-1.5">{selectedVariant.stockLabel}</span> : null}
      </div>

      <div className="mt-6 border-t border-[#eadfd1] pt-5">
        <h2 className="text-sm font-semibold text-omd-brown">Select Variant</h2>
      </div>
      <div className="mt-4 grid gap-3">
        {variants.map((variant) => {
          const selected = selectedVariantId === variant.id;

          return (
            <label
              key={variant.id}
              className={`grid cursor-pointer grid-cols-[24px_1fr_auto] gap-3 rounded-lg border px-4 py-3 transition ${
                selected ? "border-omd-saffron bg-[#fffaf2] shadow-sm" : "border-[#eadfd1] bg-white hover:border-omd-gold"
              } ${variant.disabled ? "opacity-60" : ""}`}
            >
              <input
                type="radio"
                name="variantChoice"
                value={variant.id}
                checked={selected}
                disabled={variant.disabled}
                onChange={() => setSelectedVariantId(variant.id)}
                className="mt-1 h-4 w-4 accent-omd-saffron"
              />
              <span>
                <span className="block text-sm font-semibold text-omd-brown">{variant.title ?? variant.sku ?? "Default Option"}</span>
                <span className="mt-0.5 block text-xs text-omd-muted">{variant.stockLabel}</span>
              </span>
              <span className="text-sm font-semibold text-omd-brown">{formatMoney(variant.price, currency)}</span>
            </label>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <span className="text-sm font-semibold text-omd-brown">Quantity</span>
        <div className="inline-grid h-9 grid-cols-3 overflow-hidden rounded-md border border-[#eadfd1] bg-white">
          <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="w-10 text-lg text-omd-brown hover:bg-omd-ivory">-</button>
          <input
            aria-label="Quantity"
            value={quantity}
            onChange={(event) => setQuantity(Math.max(1, Math.min(99, Number(event.target.value) || 1)))}
            className="w-12 border-x border-[#eadfd1] text-center text-sm font-semibold outline-none"
          />
          <button type="button" onClick={() => setQuantity((value) => Math.min(99, value + 1))} className="w-10 text-lg text-omd-brown hover:bg-omd-ivory">+</button>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <form action={addToCartAction}>
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="variantId" value={selectedVariant?.id ?? ""} />
          <input type="hidden" name="quantity" value={quantity} />
          <SubmitButton disabled={purchaseDisabled} variant="secondary">Add to Cart</SubmitButton>
        </form>
        <form action={buyNowAction}>
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="variantId" value={selectedVariant?.id ?? ""} />
          <input type="hidden" name="quantity" value={quantity} />
          <SubmitButton disabled={purchaseDisabled} variant="primary">Buy Now</SubmitButton>
        </form>
        <form action={toggleWishlistAction}>
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="variantId" value={selectedVariant?.id ?? ""} />
          <input type="hidden" name="redirectTo" value={`/product/${productSlug}`} />
          <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#eadfd1] bg-white px-4 text-sm font-semibold text-omd-brown hover:border-omd-gold">
            <HeartIcon />
            {wishlistActive ? "Remove from Wishlist" : "Add to Wishlist"}
          </button>
        </form>
      </div>

      <div className="mt-6 border-t border-[#eadfd1] pt-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-omd-brown">
          <svg className="h-4 w-4 text-omd-saffron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 7h11v10H3z" />
            <path d="M14 10h4l3 3v4h-7z" />
            <circle cx="7" cy="19" r="2" />
            <circle cx="17" cy="19" r="2" />
          </svg>
          Check Delivery
        </div>
        <form action={`/product/${productSlug}`} className="mt-3 grid gap-2">
          <p className="text-xs text-omd-muted">Enter pincode to check delivery estimate</p>
          <div className="flex gap-2">
            <input
              name="pincode"
              defaultValue={requestedPincode}
              inputMode="numeric"
              placeholder="Enter Pincode"
              className="h-10 min-w-0 flex-1 rounded-md border border-[#eadfd1] bg-white px-3 text-sm outline-none focus:border-omd-gold"
            />
            <button className="h-10 rounded-md bg-omd-brown px-4 text-sm font-semibold text-white hover:bg-omd-saffron">Check</button>
          </div>
          {deliveryResult.kind === "serviceable" ? (
            <p className="text-xs font-semibold text-omd-success">
              Delivery available in {deliveryResult.city}, {deliveryResult.state}
              {deliveryResult.estimatedDays ? ` in ${deliveryResult.estimatedDays} days.` : "."}
            </p>
          ) : null}
          {deliveryResult.kind === "unserviceable" ? (
            <p className="text-xs font-semibold text-omd-error">Delivery is not yet available in {deliveryResult.city}, {deliveryResult.state}.</p>
          ) : null}
          {deliveryResult.kind === "unknown" ? (
            <p className="text-xs font-semibold text-omd-muted">No delivery data found for {deliveryResult.pincode} yet.</p>
          ) : null}
        </form>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 border-t border-[#eadfd1] pt-5 text-center sm:grid-cols-4">
        {[
          ["Authentic", "Products"],
          ["Secure", "Checkout"],
          ["Packed", "with Care"],
          ["Guided", "Ritual Use"]
        ].map(([title, subtitle]) => (
          <div key={title} className="grid justify-items-center gap-1 text-[10px] font-semibold leading-tight text-omd-brown">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-omd-gold/40 text-[9px] text-omd-saffron">OMD</span>
            <span>{title}</span>
            <span>{subtitle}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
