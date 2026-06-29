import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { requireOperationsAdminUser } from "@/lib/admin-auth";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

type PageProps = {
  searchParams: Promise<{ eventType?: string; userId?: string; anonymousId?: string; entityType?: string; from?: string; to?: string }>;
};

function metadataSummary(value: unknown) {
  if (!value || typeof value !== "object") return "No metadata";
  const object = value as Record<string, unknown>;
  const parts = [
    typeof object.title === "string" ? object.title : null,
    typeof object.query === "string" ? `Query: ${object.query}` : null,
    typeof object.resultCount === "number" ? `${object.resultCount} result(s)` : null
  ].filter(Boolean);
  return parts.join(" - ") || JSON.stringify(value).slice(0, 180);
}

export default async function AdminCustomerEventsPage({ searchParams }: PageProps) {
  await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const params = await searchParams;
  const eventType = (params.eventType ?? "").trim();
  const userId = (params.userId ?? "").trim();
  const anonymousId = (params.anonymousId ?? "").trim();
  const entityType = (params.entityType ?? "").trim();
  const from = (params.from ?? "").trim();
  const to = (params.to ?? "").trim();

  const where: Prisma.CustomerEventWhereInput = {
    tenantId,
    ...(eventType ? { eventType } : {}),
    ...(userId ? { userId } : {}),
    ...(anonymousId ? { anonymousId: { contains: anonymousId, mode: "insensitive" } } : {}),
    ...(entityType ? { entityType } : {}),
    ...(from || to
      ? { createdAt: { ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}) } }
      : {})
  };

  const [events, users, eventTypes, entityTypes] = await Promise.all([
    prisma.customerEvent.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 150
    }),
    prisma.user.findMany({ where: { tenantId }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
    prisma.customerEvent.findMany({ where: { tenantId }, distinct: ["eventType"], select: { eventType: true }, orderBy: { eventType: "asc" } }),
    prisma.customerEvent.findMany({ where: { tenantId, entityType: { not: null } }, distinct: ["entityType"], select: { entityType: true }, orderBy: { entityType: "asc" } })
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Analytics"
        title="Customer Events"
        description="Internal first-party event log for browsing, search, cart, wishlist, checkout and service intent. No external analytics providers are connected."
        tone="admin"
        actions={<StatusBadge tone="ops">{events.length} shown</StatusBadge>}
      />

      <AdminPanel>
        <form className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_1fr_150px_150px_100px]">
          <select name="eventType" defaultValue={eventType} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All events</option>
            {eventTypes.map((item) => <option key={item.eventType} value={item.eventType}>{statusLabel(item.eventType)}</option>)}
          </select>
          <select name="userId" defaultValue={userId} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All users</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name ?? user.email ?? user.id}</option>)}
          </select>
          <input name="anonymousId" defaultValue={anonymousId} placeholder="Anonymous ID" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <select name="entityType" defaultValue={entityType} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All entities</option>
            {entityTypes.map((item) => item.entityType ? <option key={item.entityType} value={item.entityType}>{statusLabel(item.entityType)}</option> : null)}
          </select>
          <input type="date" name="from" defaultValue={from} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <input type="date" name="to" defaultValue={to} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Filter</button>
        </form>
      </AdminPanel>

      {events.length === 0 ? (
        <EmptyState title="No customer events" description="Events will appear here after customers browse products, categories, services, festivals, search, wishlist or checkout." />
      ) : (
        <div className="grid gap-3">
          {events.map((event) => (
            <AdminPanel key={event.id}>
              <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone={statusTone(event.eventType)}>{statusLabel(event.eventType)}</StatusBadge>
                    {event.entityType ? <StatusBadge tone="neutral">{statusLabel(event.entityType)}</StatusBadge> : null}
                  </div>
                  <h2 className="mt-3 font-semibold text-slate-950">
                    {event.user ? (
                      <Link href={`/admin/customers/${event.user.id}`} className="hover:text-omd-ops">{event.user.name ?? event.user.email ?? "Customer"}</Link>
                    ) : (
                      <span>Anonymous {event.anonymousId?.slice(0, 8) ?? "visitor"}</span>
                    )}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">{event.entitySlug ?? event.entityId ?? "No entity"} - {event.sourcePath ?? "unknown path"}</p>
                  <p className="mt-1 text-xs text-slate-500">{event.createdAt.toLocaleString("en-IN")}</p>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Metadata</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{metadataSummary(event.metadataJson)}</p>
                  {event.anonymousId && !event.userId ? <p className="mt-2 break-all text-xs text-slate-500">Anon: {event.anonymousId}</p> : null}
                </div>
              </div>
            </AdminPanel>
          ))}
        </div>
      )}
    </div>
  );
}
