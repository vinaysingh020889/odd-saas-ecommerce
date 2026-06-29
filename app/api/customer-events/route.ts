import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_ANONYMOUS_COOKIE, hashIp, trackCustomerEvent, type CustomerEventEntityType, type CustomerEventType } from "@/lib/customer-events";
import { runtimeConfig } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/session";
import { getOmdTenantId } from "@/lib/catalog";

const allowedEvents = new Set<CustomerEventType>([
  "PRODUCT_VIEW",
  "CATEGORY_VIEW",
  "SERVICE_VIEW",
  "FESTIVAL_VIEW",
  "TAG_CLICK",
  "SEARCH",
  "ADD_TO_CART",
  "REMOVE_FROM_CART",
  "WISHLIST_ADD",
  "WISHLIST_REMOVE",
  "CHECKOUT_STARTED",
  "ORDER_COMPLETED",
  "ASTHI_STARTED",
  "KUNDLI_STARTED",
  "MEMBERSHIP_VIEWED",
  "COUPON_APPLIED"
]);

const allowedEntities = new Set<CustomerEventEntityType>([
  "PRODUCT",
  "CATEGORY",
  "SERVICE",
  "FESTIVAL",
  "TAG",
  "ORDER",
  "CART",
  "ASTHI_APPLICATION",
  "KUNDLI_ORDER",
  "MEMBERSHIP_PLAN",
  "SEARCH_QUERY"
]);

function text(value: unknown, max = 500) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const eventType = text(body?.eventType, 80) as CustomerEventType | null;

  if (!eventType || !allowedEvents.has(eventType)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  const anonymousId = request.cookies.get(CUSTOMER_ANONYMOUS_COOKIE)?.value ?? randomUUID();
  if (!request.cookies.get(CUSTOMER_ANONYMOUS_COOKIE)?.value) {
    // Future consent/privacy control should decide whether this cookie is set before production launch.
    response.cookies.set(CUSTOMER_ANONYMOUS_COOKIE, anonymousId, {
      httpOnly: true,
      sameSite: "lax",
      secure: runtimeConfig.appEnv === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365
    });
  }

  const user = await getCurrentUser();
  const entityType = text(body?.entityType, 80) as CustomerEventEntityType | null;
  const tenantId = await getOmdTenantId();
  const cartToken = request.cookies.get("omd_cart")?.value ?? null;

  await trackCustomerEvent({
    tenantId,
    userId: user?.id ?? null,
    anonymousId,
    sessionId: cartToken?.split(".")[0] ?? null,
    eventType,
    entityType: entityType && allowedEntities.has(entityType) ? entityType : null,
    entityId: text(body?.entityId, 120),
    entitySlug: text(body?.entitySlug, 180),
    sourcePath: text(body?.sourcePath, 500),
    referrer: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
    ipHash: hashIp(request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip")),
    metadata: typeof body?.metadata === "object" && body.metadata !== null ? body.metadata : undefined
  });

  return response;
}
