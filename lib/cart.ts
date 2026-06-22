import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { runtimeConfig } from "@/lib/env";
import type { AuthenticatedUser } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/session";
import { getOmdTenantId } from "@/lib/catalog";
import { getVariantStockSummary, isPhysicalInventoryType } from "@/lib/inventory";

const CART_COOKIE = "omd_cart";
const CART_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type CartWithItems = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        product: {
          select: {
            slug: true;
            title: true;
            type: true;
            currency: true;
          };
        };
        variant: {
          select: {
            title: true;
            sku: true;
          };
        };
      };
    };
  };
}>;

export type CartLineItem = CartWithItems["items"][number];

type CartScope =
  | { kind: "user"; user: AuthenticatedUser }
  | { kind: "guest"; sessionId: string };

function sign(value: string) {
  return createHmac("sha256", runtimeConfig.sessionSecret).update(value).digest("base64url");
}

function signaturesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function createCartToken(sessionId: string) {
  return `${sessionId}.${sign(sessionId)}`;
}

function readCartToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [sessionId, signature] = token.split(".");

  if (!sessionId || !signature || !signaturesMatch(signature, sign(sessionId))) {
    return null;
  }

  return sessionId;
}

async function getCartSessionId(createIfMissing: boolean) {
  const cookieStore = await cookies();
  const existingSessionId = readCartToken(cookieStore.get(CART_COOKIE)?.value);

  if (existingSessionId || !createIfMissing) {
    return existingSessionId;
  }

  const sessionId = randomUUID();

  cookieStore.set(CART_COOKIE, createCartToken(sessionId), {
    httpOnly: true,
    sameSite: "lax",
    secure: runtimeConfig.appEnv === "production",
    path: "/",
    maxAge: CART_MAX_AGE_SECONDS
  });

  return sessionId;
}

async function getCartScope(createGuestIfMissing: boolean): Promise<CartScope | null> {
  const user = await getCurrentUser();

  if (user) {
    return { kind: "user", user };
  }

  const sessionId = await getCartSessionId(createGuestIfMissing);

  return sessionId ? { kind: "guest", sessionId } : null;
}

function cartScopeWhere(scope: CartScope) {
  return scope.kind === "user" ? { userId: scope.user.id } : { sessionId: scope.sessionId };
}

export function toNumber(value: unknown) {
  return Number(value ?? 0);
}

export function itemSubtotal(item: Pick<CartLineItem, "quantity" | "priceSnapshot">) {
  return item.quantity * toNumber(item.priceSnapshot);
}

export function cartSubtotal(cart: CartWithItems) {
  return cart.items.reduce((total: number, item: CartLineItem) => total + itemSubtotal(item), 0);
}

export async function getOrCreateActiveCart(scope: CartScope) {
  const existingCart = await prisma.cart.findFirst({
    where: {
      ...cartScopeWhere(scope),
      status: "ACTIVE"
    },
    orderBy: { createdAt: "desc" }
  });

  if (existingCart) {
    return existingCart;
  }

  const tenantId =
    scope.kind === "user"
      ? (
          await prisma.user.findUniqueOrThrow({
            where: { id: scope.user.id },
            select: { tenantId: true }
          })
        ).tenantId
      : await getOmdTenantId();

  return prisma.cart.create({
    data: {
      tenantId,
      userId: scope.kind === "user" ? scope.user.id : null,
      sessionId: scope.kind === "guest" ? scope.sessionId : null,
      status: "ACTIVE"
    }
  });
}

export async function getCurrentCart(): Promise<CartWithItems | null> {
  const scope = await getCartScope(false);

  if (!scope) {
    return null;
  }

  return prisma.cart.findFirst({
    where: {
      ...cartScopeWhere(scope),
      status: "ACTIVE"
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              slug: true,
              title: true,
              type: true,
              currency: true
            }
          },
          variant: {
            select: {
              title: true,
              sku: true
            }
          }
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });
}

export async function mergeGuestCartToUser(userId: string) {
  const sessionId = await getCartSessionId(false);

  if (!sessionId) {
    return;
  }

  const guestCart = await prisma.cart.findFirst({
    where: { sessionId, status: "ACTIVE" },
    include: { items: true },
    orderBy: { createdAt: "desc" }
  });

  if (!guestCart) {
    return;
  }

  let userCart = await prisma.cart.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" }
  });

  if (!userCart) {
    userCart = await prisma.cart.update({
      where: { id: guestCart.id },
      data: { userId, sessionId: null }
    });
    return;
  }

  for (const item of guestCart.items) {
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: userCart.id,
        productId: item.productId,
        variantId: item.variantId
      }
    });

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + item.quantity }
      });
      await prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { cartId: userCart.id }
      });
    }
  }

  await prisma.cart.update({
    where: { id: guestCart.id },
    data: { status: "CONVERTED", sessionId: null }
  });
}

export async function addProductToCart(productId: string, variantId?: string | null) {
  const scope = await getCartScope(true);

  if (!scope) {
    throw new Error("Cart session could not be created.");
  }

  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      status: "ACTIVE"
    },
    include: {
      variants: {
        where: variantId ? { id: variantId, active: true } : { active: true },
        orderBy: { createdAt: "asc" },
        take: 1
      }
    }
  });

  if (!product) {
    throw new Error("Product is not available.");
  }

  const variant = product.variants[0] ?? null;
  const resolvedVariantId = variant?.id ?? null;
  const unitPrice = variant?.price ?? product.basePrice;

  if (unitPrice === null) {
    throw new Error("This item does not have a price yet.");
  }

  const cart = await getOrCreateActiveCart(scope);
  const existingItem = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId: product.id,
      variantId: resolvedVariantId
    }
  });

  if (isPhysicalInventoryType(product.type)) {
    if (!resolvedVariantId) {
      throw new Error("This physical item is not inventory-ready yet.");
    }

    const stock = await getVariantStockSummary(resolvedVariantId);
    const requestedQuantity = (existingItem?.quantity ?? 0) + 1;

    if (requestedQuantity > stock.available) {
      throw new Error("This item is out of stock.");
    }
  }

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: {
        quantity: existingItem.quantity + 1,
        priceSnapshot: unitPrice,
        titleSnapshot: product.title
      }
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        variantId: resolvedVariantId,
        quantity: 1,
        itemType:
          product.type === "SERVICE"
            ? "SERVICE"
            : product.type === "MEMBERSHIP"
              ? "MEMBERSHIP"
              : product.type === "KIT"
                ? "KIT"
                : product.type === "DIGITAL"
                  ? "DIGITAL"
                  : "PRODUCT",
        priceSnapshot: unitPrice,
        titleSnapshot: product.title,
        metadataJson: variant?.title ? { variantTitle: variant.title } : undefined
      }
    });
  }

  revalidatePath("/cart");
  redirect("/cart");
}

export async function updateCartItemQuantity(itemId: string, quantity: number) {
  const scope = await getCartScope(false);

  if (!scope) {
    return;
  }

  const safeQuantity = Math.max(1, Math.min(99, quantity));

  await prisma.cartItem.updateMany({
    where: {
      id: itemId,
      cart: {
        ...cartScopeWhere(scope),
        status: "ACTIVE"
      }
    },
    data: {
      quantity: safeQuantity
    }
  });

  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function removeCartItem(itemId: string) {
  const scope = await getCartScope(false);

  if (!scope) {
    return;
  }

  await prisma.cartItem.deleteMany({
    where: {
      id: itemId,
      cart: {
        ...cartScopeWhere(scope),
        status: "ACTIVE"
      }
    }
  });

  revalidatePath("/cart");
  revalidatePath("/checkout");
}
