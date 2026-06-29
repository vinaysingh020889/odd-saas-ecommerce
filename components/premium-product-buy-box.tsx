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
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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

function PinIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 21s7-5.1 7-11a7 7 0 0 0-14 0c0 5.9 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function TrustIcon({ label }: { label: string }) {
  return (
    <div className="grid justify-items-center gap-2 text-center text-[11px] font-semibold leading-tight text-omd-brown">
      <span className="flex h-9 w-9 items-center justify-center rounded-md border border-omd-gold/40 text-omd-saffron">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 3l3 6 6 .8-4.5 4.3 1.1 6-5.6-3-5.6 3 1.1-6L3 9.8 9 9z" />
        </svg>
      </span>
      <span>{label}</span>
    </div>
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
      ? "bg-gradient-to-r from-[#f07a00] to-[#e75d00] text-white shadow-sm hover:from-omd-saffron hover:to-[#c84d00]"
      : "border border-omd-saffron bg-white text-omd-saffron hover:bg-omd-ivory";

  return (
    <button
      disabled={disabled || pending}
      className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:border-omd-sand disabled:bg-omd-muted disabled:text-white ${classes}`}
    >
      {variant === "primary" ? <CartIcon /> : null}
      {pending ? "Please wait" : children}
    </button>
  );
}

export function PremiumProductBuyBox({
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

  return (
    <aside className="h-fit rounded-lg border border-[#ead7bf] bg-white p-5 shadow-[0_18px_50px_rgba(59,31,20,0.06)] xl:sticky xl:top-28">
      <h2 className="text-sm font-bold text-omd-brown">Choose Your Variant</h2>
      <div className="mt-3 grid gap-3">
        {variants.map((variant) => {
          const selected = selectedVariantId === variant.id;

          return (
            <label
              key={variant.id}
              className={`grid cursor-pointer grid-cols-[24px_1fr_auto] items-center gap-3 rounded-md border px-4 py-3 transition ${
                selected ? "border-omd-saffron bg-[#fffaf4] shadow-sm" : "border-[#eadfd1] bg-white hover:border-omd-gold"
              } ${variant.disabled ? "opacity-60" : ""}`}
            >
              <input
                type="radio"
                name="variantChoice"
                value={variant.id}
                checked={selected}
                disabled={variant.disabled}
                onChange={() => setSelectedVariantId(variant.id)}
                className="h-4 w-4 accent-omd-saffron"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-omd-brown">{variant.title ?? variant.sku ?? "Default Option"}</span>
                <span className="mt-0.5 block truncate text-xs text-omd-muted">{variant.stockLabel}</span>
              </span>
              <span className="text-sm font-bold text-omd-brown">{formatMoney(variant.price, currency)}</span>
            </label>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <span className="text-sm font-bold text-omd-brown">Quantity</span>
        <div className="inline-grid h-9 grid-cols-3 overflow-hidden rounded-md border border-[#eadfd1] bg-white">
          <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="w-10 text-lg text-omd-brown hover:bg-omd-ivory">-</button>
          <input
            aria-label="Quantity"
            value={quantity}
            onChange={(event) => setQuantity(Math.max(1, Math.min(99, Number(event.target.value) || 1)))}
            className="w-12 border-x border-[#eadfd1] text-center text-sm font-bold outline-none"
          />
          <button type="button" onClick={() => setQuantity((value) => Math.min(99, value + 1))} className="w-10 text-lg text-omd-brown hover:bg-omd-ivory">+</button>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <form action={addToCartAction}>
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="variantId" value={selectedVariant?.id ?? ""} />
          <input type="hidden" name="quantity" value={quantity} />
          <SubmitButton disabled={purchaseDisabled} variant="primary">Add to Cart</SubmitButton>
        </form>
        <form action={buyNowAction}>
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="variantId" value={selectedVariant?.id ?? ""} />
          <input type="hidden" name="quantity" value={quantity} />
          <SubmitButton disabled={purchaseDisabled} variant="secondary">Buy Now</SubmitButton>
        </form>
        <form action={toggleWishlistAction}>
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="variantId" value={selectedVariant?.id ?? ""} />
          <input type="hidden" name="redirectTo" value={`/product/${productSlug}`} />
          <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#eadfd1] bg-white px-4 text-sm font-bold text-omd-brown hover:border-omd-gold">
            <HeartIcon />
            {wishlistActive ? "Remove from Wishlist" : "Add to Wishlist"}
          </button>
        </form>
      </div>

      <div className="mt-6 border-t border-[#eadfd1] pt-5">
        <div className="flex items-center gap-2 text-sm font-bold text-omd-brown">
          <span className="text-omd-saffron"><PinIcon /></span>
          Check Delivery Availability
        </div>
        <form action={`/product/${productSlug}`} className="mt-3 grid gap-2">
          <p className="text-xs text-omd-muted">Enter pincode to check serviceability</p>
          <div className="grid grid-cols-[1fr_88px] gap-2">
            <input
              name="pincode"
              defaultValue={requestedPincode}
              inputMode="numeric"
              placeholder="Enter Pincode"
              className="h-10 min-w-0 rounded-md border border-[#eadfd1] bg-white px-3 text-sm outline-none focus:border-omd-gold"
            />
            <button className="h-10 rounded-md bg-omd-brown px-4 text-sm font-bold text-white hover:bg-omd-saffron">Check</button>
          </div>
          {deliveryResult.kind === "serviceable" ? (
            <p className="text-xs font-bold text-omd-success">
              Delivery available in {deliveryResult.city}, {deliveryResult.state}
              {deliveryResult.estimatedDays ? ` in ${deliveryResult.estimatedDays} days.` : "."}
            </p>
          ) : null}
          {deliveryResult.kind === "unserviceable" ? (
            <p className="text-xs font-bold text-omd-error">Delivery is not yet available in {deliveryResult.city}, {deliveryResult.state}.</p>
          ) : null}
          {deliveryResult.kind === "unknown" ? (
            <p className="text-xs font-bold text-omd-muted">No delivery data found for {deliveryResult.pincode} yet.</p>
          ) : null}
        </form>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 border-t border-[#eadfd1] pt-5">
        <TrustIcon label="Secure Checkout" />
        <TrustIcon label="Packed with Care" />
        <TrustIcon label="Authentic Products" />
      </div>
    </aside>
  );
}