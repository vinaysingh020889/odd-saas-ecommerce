"use server";

import { addProductToCart, removeCartItem, updateCartItemQuantity } from "@/lib/cart";

export async function addToCartAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const variantId = String(formData.get("variantId") ?? "") || null;

  if (!productId) {
    throw new Error("Product is required.");
  }

  await addProductToCart(productId, variantId);
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
