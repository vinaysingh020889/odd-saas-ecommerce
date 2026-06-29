"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { addToCartAction, buyNowAction } from "@/lib/cart-actions";

function SubmitButton({
  children,
  disabled,
  variant
}: {
  children: string;
  disabled?: boolean;
  variant: "secondary" | "primary";
}) {
  const { pending } = useFormStatus();
  const classes =
    variant === "primary"
      ? "bg-omd-brown text-white shadow-sm hover:bg-omd-saffron disabled:bg-omd-muted"
      : "border border-omd-sand bg-white text-omd-brown shadow-sm hover:border-omd-gold hover:bg-omd-ivory disabled:text-omd-muted";

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`h-11 w-full rounded-xl px-3 text-sm font-semibold disabled:cursor-not-allowed ${classes}`}
    >
      {pending ? "Please wait" : children}
    </button>
  );
}

export function ProductPurchaseActions({
  productId,
  variantId,
  disabled
}: {
  productId: string;
  variantId?: string | null;
  disabled?: boolean;
}) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-omd-muted">
        Quantity
        <input
          type="number"
          min="1"
          max="99"
          value={quantity}
          onChange={(event) => setQuantity(Math.max(1, Math.min(99, Number(event.target.value) || 1)))}
          className="h-11 w-28 rounded-xl border border-omd-sand bg-white px-3 text-sm font-normal tracking-normal text-omd-brown"
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <form action={addToCartAction}>
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="variantId" value={variantId ?? ""} />
          <input type="hidden" name="quantity" value={quantity} />
          <SubmitButton disabled={disabled} variant="secondary">
            Add to Cart
          </SubmitButton>
        </form>
        <form action={buyNowAction}>
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="variantId" value={variantId ?? ""} />
          <input type="hidden" name="quantity" value={quantity} />
          <SubmitButton disabled={disabled} variant="primary">
            Buy Now
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
