import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/session";
import { getActiveMembershipForUser, getLatestMembershipForUser } from "@/lib/membership";
import { prisma } from "@/lib/prisma";
import { versionBenefits } from "@/lib/membership-plan-versioning";
import { membershipPeriodKey } from "@/lib/membership-entitlements";
import { BreadcrumbHeader, EmptyState, Panel, StatusBadge } from "@/components/ui";
import { formatMoney } from "@/lib/catalog";

export default async function MyBenefitsPage() {
  const user = await requireCurrentUser();
  const [active, latest, redemptions] = await Promise.all([
    getActiveMembershipForUser(user.id), getLatestMembershipForUser(user.id),
    prisma.membershipBenefitRedemption.findMany({ where: { userId: user.id }, include: { benefit: true }, orderBy: { createdAt: "desc" } })
  ]);
  const relatedIds = redemptions.map((item) => item.relatedId).filter((id): id is string => Boolean(id));
  const orders = await prisma.kundliOrder.findMany({ where: { id: { in: relatedIds } }, select: { id: true, orderNo: true, status: true, package: { select: { name: true } } } });
  const orderById = new Map(orders.map((item) => [item.id, item]));
  const shopItems = await prisma.orderItem.findMany({ where: { id: { in: relatedIds } }, include: { product: { select: { title: true } }, order: { select: { id: true, orderNumber: true, status: true, fulfillmentStatus: true } } } });
  const shopById = new Map(shopItems.map((item) => [item.id, item]));
  const fulfilmentStatus = (relatedId: string | null) => { const kundli = orderById.get(relatedId ?? ""); const shop = shopById.get(relatedId ?? ""); return kundli?.status ?? shop?.order.fulfillmentStatus ?? shop?.order.status ?? ""; };
  const benefits = active ? (active.planVersion ? versionBenefits(active.planVersion) : active.plan.benefits).filter((item) => item.customerVisible) : [];
  const available = benefits.filter((benefit) => benefit.method === "CLAIM").map((benefit) => {
    const key = active ? membershipPeriodKey(benefit.usagePeriod, active.id) : "";
    const used = redemptions.filter((item) => item.benefitId === benefit.id && item.periodKey === key && (item.status === "CONSUMED" || (item.status === "RESERVED" && (!item.reservationExpiresAt || item.reservationExpiresAt > new Date())))).reduce((sum, item) => sum + item.quantity, 0);
    return { benefit, used, remaining: benefit.usageLimit === null ? null : Math.max(0, benefit.usageLimit - used) };
  }).filter((item) => item.remaining === null || item.remaining > 0);
  const inProgress = redemptions.filter((item) => ["RESERVED", "CONSUMED"].includes(item.status) && !["COMPLETED", "DELIVERED", "CANCELLED", "REFUNDED"].includes(fulfilmentStatus(item.relatedId)));
  const used = redemptions.filter((item) => item.status === "CONSUMED" && ["COMPLETED", "DELIVERED"].includes(fulfilmentStatus(item.relatedId)));
  const closed = redemptions.filter((item) => ["RELEASED", "REVERSED"].includes(item.status) || (item.status === "RESERVED" && item.reservationExpiresAt !== null && item.reservationExpiresAt <= new Date()));
  const history = (items: typeof redemptions) => items.length ? <div className="grid gap-3">{items.map((item) => { const order = orderById.get(item.relatedId ?? ""); const shopItem = shopById.get(item.relatedId ?? ""); return <div key={item.id} className="rounded-md border border-omd-sand p-3"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold text-omd-brown">{item.benefit.title}</p><StatusBadge tone={item.status === "CONSUMED" ? "success" : item.status === "RESERVED" ? "warning" : "neutral"}>{item.status}</StatusBadge></div><p className="mt-1 text-sm text-omd-muted">{order?.package.name ?? shopItem?.product.title ?? item.scope} · Saved {formatMoney(item.savingAmount)}</p>{order ? <Link className="mt-2 inline-flex text-sm font-semibold text-omd-saffron" href={`/kundli/${order.orderNo ?? order.id}`}>Track claim</Link> : shopItem ? <Link className="mt-2 inline-flex text-sm font-semibold text-omd-saffron" href={`/orders/${shopItem.order.id}`}>Track claim</Link> : null}</div>; })}</div> : <p className="text-sm text-omd-muted">Nothing here yet.</p>;
  return <div className="grid gap-6"><BreadcrumbHeader items={[{ label: "Dashboard", href: "/dashboard" }, { label: "My Benefits" }]} title="My Benefits" />
    <Panel><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold text-omd-brown">{active?.plan.name ?? latest?.plan.name ?? "Membership benefits"}</h1><p className="mt-2 text-sm text-omd-muted">See what you can claim, what is being fulfilled, and your completed benefit history.</p></div>{active ? <StatusBadge tone="success">Active until {active.expiresAt.toLocaleDateString("en-IN")}</StatusBadge> : <StatusBadge tone="neutral">No active membership</StatusBadge>}</div></Panel>
    <section className="grid gap-4 lg:grid-cols-2"><Panel><h2 className="text-xl font-semibold text-omd-brown">Available</h2><div className="mt-4 grid gap-3">{available.map(({ benefit, remaining }) => <div key={benefit.id} className="rounded-md border border-omd-sand p-3"><p className="font-semibold">{benefit.title}</p><p className="mt-1 text-sm text-omd-muted">{remaining === null ? "Available" : `${remaining} remaining this ${benefit.usagePeriod?.toLowerCase() ?? "membership"}`}</p>{benefit.scope === "KUNDLI" || benefit.scope === "GLOBAL" ? <Link href="/kundli/apply" className="mt-3 inline-flex rounded-md bg-omd-brown px-3 py-2 text-sm font-semibold text-white">Claim Kundli benefit</Link> : benefit.scope === "SHOP" ? <Link href="/shop/category/prasad" className="mt-3 inline-flex rounded-md bg-omd-brown px-3 py-2 text-sm font-semibold text-white">Choose Prasad</Link> : null}</div>)}{available.length === 0 ? <EmptyState title="No benefits available to claim" description="Used, expired, or automatic benefits appear in the sections below." /> : null}</div></Panel>
      <Panel><h2 className="text-xl font-semibold text-omd-brown">In Progress</h2><div className="mt-4">{history(inProgress)}</div></Panel><Panel><h2 className="text-xl font-semibold text-omd-brown">Used</h2><div className="mt-4">{history(used)}</div></Panel><Panel><h2 className="text-xl font-semibold text-omd-brown">Expired / Cancelled</h2><div className="mt-4">{history(closed)}</div></Panel></section>
  </div>;
}
