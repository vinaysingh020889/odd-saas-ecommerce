"use server";

import { addProductToCart, applyCartCoupon, removeCartItem, updateCartItemQuantity } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth/session";

export async function addToCartAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const variantId = String(formData.get("variantId") ?? "") || null;
  const quantity = Number(formData.get("quantity") ?? 1);

  if (!productId) {
    throw new Error("Product is required.");
  }

  await addProductToCart(productId, variantId, quantity);
}

export async function buyNowAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const variantId = String(formData.get("variantId") ?? "") || null;
  const quantity = Number(formData.get("quantity") ?? 1);
  const user = await getCurrentUser();

  if (!productId) {
    throw new Error("Product is required.");
  }

  await addProductToCart(productId, variantId, quantity, user ? "/checkout" : "/login?redirectTo=/checkout");
}

export async function updateCartItemQuantityAction(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);

  if (!itemId) {
    throw new Error("Cart item is required.");
  }

  await updateCartItemQuantity(itemId, quantity);
}

export async function removeCartItemAction(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");

  if (!itemId) {
    throw new Error("Cart item is required.");
  }

  await removeCartItem(itemId);
}

export async function applyCouponAction(formData: FormData) {
  const couponCode = String(formData.get("couponCode") ?? "");
  await applyCartCoupon(couponCode);
}

export async function clearCouponAction() {
  await applyCartCoupon(null);
}
