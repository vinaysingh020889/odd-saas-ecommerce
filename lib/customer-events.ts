import { createHash, randomUUID } from "crypto";
import { cookies, headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { getOmdTenantId } from "@/lib/catalog";
import { runtimeConfig } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const CUSTOMER_ANONYMOUS_COOKIE = "omd_anon";
const ANONYMOUS_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type CustomerEventType =
  | "PRODUCT_VIEW"
  | "CATEGORY_VIEW"
  | "SERVICE_VIEW"
  | "FESTIVAL_VIEW"
  | "TAG_CLICK"
  | "SEARCH"
  | "ADD_TO_CART"
  | "REMOVE_FROM_CART"
  | "WISHLIST_ADD"
  | "WISHLIST_REMOVE"
  | "CHECKOUT_STARTED"
  | "ORDER_COMPLETED"
  | "ASTHI_STARTED"
  | "KUNDLI_STARTED"
  | "MEMBERSHIP_VIEWED"
  | "MEMBERSHIP_RENEWAL_STARTED"
  | "MEMBERSHIP_CANCELLATION_REQUESTED"
  | "MEMBERSHIP_UPGRADE_STARTED"
  | "MEMBERSHIP_BENEFIT_USED"
  | "SERVICE_DETAIL_VIEWED"
  | "SERVICE_BOOKING_STARTED"
  | "SERVICE_BOOKING_SUBMITTED"
  | "SERVICE_BOOKING_PAID_MOCK"
  | "SERVICE_BOOKING_QUEUED"
  | "SERVICE_BOOKING_PRIORITIZED"
  | "SERVICE_BOOKING_PRIORITY_REMOVED"
  | "QUEUED_BOOKING_PROMOTED"
  | "CAPACITY_LIMIT_REACHED"
  | "CAPACITY_RELEASED"
  | "SERVICE_BOOKING_TRACKING_VIEWED"
  | "SERVICE_BOOKING_COMPLETED"
  | "RESCHEDULE_REQUESTED"
  | "RESCHEDULE_APPROVED"
  | "RESCHEDULE_REJECTED"
  | "RESCHEDULE_MOVED_TO_QUEUE"
  | "RESCHEDULE_PRIORITY_EXCEPTION"
  | "SERVICE_BOOKING_SCHEDULE_CHANGED"
  | "CAPACITY_RELEASED_FOR_RESCHEDULE"
  | "CAPACITY_CONFIRMED_FOR_RESCHEDULE"
  | "COUPON_APPLIED";

export type CustomerEventEntityType =
  | "PRODUCT"
  | "CATEGORY"
  | "SERVICE"
  | "FESTIVAL"
  | "TAG"
  | "ORDER"
  | "CART"
  | "ASTHI_APPLICATION"
  | "KUNDLI_ORDER"
  | "SERVICE_BOOKING"
  | "MEMBERSHIP_PLAN"
  | "SEARCH_QUERY";

type TrackInput = {
  eventType: CustomerEventType;
  entityType?: CustomerEventEntityType | null;
  entityId?: string | null;
  entitySlug?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  sourcePath?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  ipHash?: string | null;
  userId?: string | null;
  anonymousId?: string | null;
  sessionId?: string | null;
  tenantId?: string | null;
  recompute?: boolean;
};

function compactText(value: string | null | undefined, max = 500) {
  const text = value?.trim();
  return text ? text.slice(0, max) : null;
}

export function hashIp(value: string | null | undefined) {
  const ip = value?.split(",")[0]?.trim();
  if (!ip) return null;
  return createHash("sha256").update(`${runtimeConfig.sessionSecret}:${ip}`).digest("hex");
}

export async function getOrCreateAnonymousId() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CUSTOMER_ANONYMOUS_COOKIE)?.value;
  if (existing) return existing;

  const anonymousId = randomUUID();
  // Future consent/privacy control should decide whether this cookie is set before production launch.
  cookieStore.set(CUSTOMER_ANONYMOUS_COOKIE, anonymousId, {
    httpOnly: true,
    sameSite: "lax",
    secure: runtimeConfig.appEnv === "production",
    path: "/",
    maxAge: ANONYMOUS_MAX_AGE_SECONDS
  });
  return anonymousId;
}

async function requestContext() {
  const [cookieStore, headerStore, user] = await Promise.all([cookies(), headers(), getCurrentUser()]);
  const anonymousId = cookieStore.get(CUSTOMER_ANONYMOUS_COOKIE)?.value ?? null;
  const cartToken = cookieStore.get("omd_cart")?.value ?? null;
  const sessionId = cartToken?.split(".")[0] ?? null;

  return {
    user,
    anonymousId,
    sessionId,
    referrer: headerStore.get("referer"),
    userAgent: headerStore.get("user-agent"),
    ipHash: hashIp(headerStore.get("x-forwarded-for") ?? headerStore.get("x-real-ip"))
  };
}

function increment(map: Map<string, { label: string; count: number }>, key: string | null | undefined, label?: string | null) {
  const cleanKey = key?.trim();
  if (!cleanKey) return;
  const current = map.get(cleanKey) ?? { label: label?.trim() || cleanKey, count: 0 };
  current.count += 1;
  map.set(cleanKey, current);
}

function topItems(map: Map<string, { label: string; count: number }>, limit = 10) {
  return [...map.entries()]
    .map(([id, value]) => ({ id, label: value.label, count: value.count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, limit);
}

function metadataObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function metadataArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item)) : [];
}

async function recomputeProfile(where: Prisma.CustomerEventWhereInput) {
  const events = await prisma.customerEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500
  });

  const tags = new Map<string, { label: string; count: number }>();
  const categories = new Map<string, { label: string; count: number }>();
  const products = new Map<string, { label: string; count: number }>();
  const services = new Map<string, { label: string; count: number }>();
  const festivals = new Map<string, { label: string; count: number }>();
  const searches = new Map<string, { label: string; count: number }>();

  for (const event of events) {
    const metadata = metadataObject(event.metadataJson);
    const title = typeof metadata.title === "string" ? metadata.title : event.entitySlug;
    const categoryId = typeof metadata.categoryId === "string" ? metadata.categoryId : null;
    const categoryName = typeof metadata.categoryName === "string" ? metadata.categoryName : categoryId;
    const query = typeof metadata.query === "string" ? metadata.query : null;

    if (event.entityType === "PRODUCT") increment(products, event.entityId ?? event.entitySlug, title);
    if (event.entityType === "SERVICE") increment(services, event.entityId ?? event.entitySlug, title);
    if (event.entityType === "CATEGORY") increment(categories, event.entityId ?? event.entitySlug, title);
    if (event.entityType === "FESTIVAL") increment(festivals, event.entityId ?? event.entitySlug, title);
    if (categoryId) increment(categories, categoryId, categoryName);
    if (event.eventType === "SEARCH") increment(searches, query ?? event.entitySlug, query ?? event.entitySlug);

    for (const tag of metadataArray(metadata.tags)) {
      const id = typeof tag.id === "string" ? tag.id : typeof tag.slug === "string" ? tag.slug : null;
      const label = typeof tag.name === "string" ? tag.name : id;
      increment(tags, id, label);
    }
  }

  return {
    topTagsJson: topItems(tags) as Prisma.InputJsonValue,
    topCategoriesJson: topItems(categories) as Prisma.InputJsonValue,
    topProductsJson: topItems(products) as Prisma.InputJsonValue,
    topServicesJson: topItems(services) as Prisma.InputJsonValue,
    topFestivalsJson: topItems(festivals) as Prisma.InputJsonValue,
    searchTermsJson: topItems(searches) as Prisma.InputJsonValue,
    lastActivityAt: events[0]?.createdAt ?? null
  };
}

export async function recomputeCustomerInterestProfile(tenantId: string, userId: string) {
  const data = await recomputeProfile({ tenantId, userId });
  return prisma.customerInterestProfile.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    update: data,
    create: { tenantId, userId, ...data }
  });
}

export async function recomputeAnonymousInterestProfile(tenantId: string, anonymousId: string) {
  const data = await recomputeProfile({ tenantId, anonymousId });
  return prisma.anonymousInterestProfile.upsert({
    where: { tenantId_anonymousId: { tenantId, anonymousId } },
    update: data,
    create: { tenantId, anonymousId, ...data }
  });
}

export async function trackCustomerEvent(input: TrackInput) {
  try {
    const tenantId = input.tenantId ?? (await getOmdTenantId());
    const context = input.userId || input.anonymousId || input.sessionId ? null : await requestContext();
    const userId = input.userId ?? context?.user?.id ?? null;
    const anonymousId = input.anonymousId ?? context?.anonymousId ?? null;
    const sessionId = input.sessionId ?? context?.sessionId ?? null;

    const event = await prisma.customerEvent.create({
      data: {
        tenantId,
        userId,
        anonymousId,
        sessionId,
        eventType: input.eventType,
        entityType: input.entityType ?? null,
        entityId: compactText(input.entityId, 120),
        entitySlug: compactText(input.entitySlug, 180),
        metadataJson: input.metadata ?? undefined,
        sourcePath: compactText(input.sourcePath, 500),
        referrer: compactText(input.referrer ?? context?.referrer, 500),
        userAgent: compactText(input.userAgent ?? context?.userAgent, 500),
        ipHash: compactText(input.ipHash ?? context?.ipHash, 128)
      }
    });

    if (input.recompute !== false) {
      if (userId) await recomputeCustomerInterestProfile(tenantId, userId);
      else if (anonymousId) await recomputeAnonymousInterestProfile(tenantId, anonymousId);
    }

    return event;
  } catch (error) {
    console.error("Customer event tracking failed", error);
    return null;
  }
}

export function trackProductView(input: Omit<TrackInput, "eventType" | "entityType">) {
  return trackCustomerEvent({ ...input, eventType: "PRODUCT_VIEW", entityType: "PRODUCT" });
}

export function trackCategoryView(input: Omit<TrackInput, "eventType" | "entityType">) {
  return trackCustomerEvent({ ...input, eventType: "CATEGORY_VIEW", entityType: "CATEGORY" });
}

export function trackServiceView(input: Omit<TrackInput, "eventType" | "entityType">) {
  return trackCustomerEvent({ ...input, eventType: "SERVICE_VIEW", entityType: "SERVICE" });
}

export function trackFestivalView(input: Omit<TrackInput, "eventType" | "entityType">) {
  return trackCustomerEvent({ ...input, eventType: "FESTIVAL_VIEW", entityType: "FESTIVAL" });
}

export function trackTagClick(input: Omit<TrackInput, "eventType" | "entityType">) {
  return trackCustomerEvent({ ...input, eventType: "TAG_CLICK", entityType: "TAG" });
}

export function trackSearchEvent(input: Omit<TrackInput, "eventType" | "entityType">) {
  return trackCustomerEvent({ ...input, eventType: "SEARCH", entityType: "SEARCH_QUERY" });
}

export function trackAddToCartEvent(input: Omit<TrackInput, "eventType" | "entityType">) {
  return trackCustomerEvent({ ...input, eventType: "ADD_TO_CART", entityType: "PRODUCT" });
}

export function trackWishlistEvent(input: Omit<TrackInput, "eventType"> & { eventType: "WISHLIST_ADD" | "WISHLIST_REMOVE" }) {
  return trackCustomerEvent({ ...input, entityType: input.entityType ?? "PRODUCT" });
}

export function trackCheckoutStarted(input: Omit<TrackInput, "eventType" | "entityType">) {
  return trackCustomerEvent({ ...input, eventType: "CHECKOUT_STARTED", entityType: "CART" });
}

export function trackOrderCompleted(input: Omit<TrackInput, "eventType" | "entityType">) {
  return trackCustomerEvent({ ...input, eventType: "ORDER_COMPLETED", entityType: "ORDER" });
}

export function trackAsthiStarted(input: Omit<TrackInput, "eventType" | "entityType">) {
  return trackCustomerEvent({ ...input, eventType: "ASTHI_STARTED", entityType: "ASTHI_APPLICATION" });
}

export function trackKundliStarted(input: Omit<TrackInput, "eventType" | "entityType">) {
  return trackCustomerEvent({ ...input, eventType: "KUNDLI_STARTED", entityType: "KUNDLI_ORDER" });
}

export function trackMembershipViewed(input: Omit<TrackInput, "eventType" | "entityType">) {
  return trackCustomerEvent({ ...input, eventType: "MEMBERSHIP_VIEWED", entityType: "MEMBERSHIP_PLAN" });
}

export async function mergeAnonymousEventsToUserOnLogin(userId: string) {
  const tenantId = await getOmdTenantId();
  const cookieStore = await cookies();
  const anonymousId = cookieStore.get(CUSTOMER_ANONYMOUS_COOKIE)?.value;
  if (!anonymousId) return;

  await prisma.customerEvent.updateMany({
    where: { tenantId, anonymousId, userId: null },
    data: { userId }
  });
  await recomputeCustomerInterestProfile(tenantId, userId);
}

export function getCustomerInterestProfile(tenantId: string, userId: string) {
  return prisma.customerInterestProfile.findUnique({
    where: { tenantId_userId: { tenantId, userId } }
  });
}

export function getRecentCustomerEvents(tenantId: string, userId: string, take = 30) {
  return prisma.customerEvent.findMany({
    where: { tenantId, userId },
    orderBy: { createdAt: "desc" },
    take
  });
}
