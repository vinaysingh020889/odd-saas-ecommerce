"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOmdTenantId } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth/session";
import { trackWishlistEvent } from "@/lib/customer-events";
import { prisma } from "@/lib/prisma";

export async function toggleWishlistAction(formData: FormData) {
  const user = await getCurrentUser();
  const productId = String(formData.get("productId") ?? "");
  const variantId = String(formData.get("variantId") ?? "") || null;
  const redirectTo = String(formData.get("redirectTo") ?? "/shop");

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  if (!productId) {
    throw new Error("Product is required.");
  }

  const tenantId = await getOmdTenantId();
  const existing = await prisma.wishlistItem.findFirst({
    where: {
      tenantId,
      userId: user.id,
      productId,
      variantId
    },
    select: { id: true }
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    await trackWishlistEvent({
      eventType: "WISHLIST_REMOVE",
      entityId: productId,
      sourcePath: redirectTo,
      userId: user.id,
      metadata: { productId, variantId }
    });
  } else {
    await prisma.wishlistItem.create({
      data: {
        tenantId,
        userId: user.id,
        productId,
        variantId
      }
    });
    await trackWishlistEvent({
      eventType: "WISHLIST_ADD",
      entityId: productId,
      sourcePath: redirectTo,
      userId: user.id,
      metadata: { productId, variantId }
    });
  }

  revalidatePath(redirectTo);
}
