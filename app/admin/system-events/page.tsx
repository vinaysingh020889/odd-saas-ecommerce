import { Prisma } from "@prisma/client";
import Link from "next/link";
import { requireOperationsAdminUser } from "@/lib/admin-auth";
import { getOmdTenantId } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

type Props = { searchParams: Promise<{ severity?: string; module?: string; actorRole?: string; errorRef?: string; from?: string; to?: string }> };

export default async function SystemEventsPage({ searchParams }: Props) {
  await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const p = await searchParams;
  const severity = ["SUCCESS", "WARNING", "ERROR"].includes(p.severity ?? "") ? p.severity : "";
  const moduleFilter = (p.module ?? "").trim();
  const actorRole = (p.actorRole ?? "").trim();
  const errorRef = (p.errorRef ?? "").trim();
  const where: Prisma.SystemEventWhereInput = { tenantId,
    ...(severity ? { severity: severity as "SUCCESS" | "WARNING" | "ERROR" } : {}),
    ...(moduleFilter ? { module: moduleFilter } : {}), ...(actorRole ? { actorRole } : {}), ...(errorRef ? { errorRef } : {}),
    ...(p.from || p.to ? { createdAt: { ...(p.from ? { gte: new Date(`${p.from}T00:00:00`) } : {}), ...(p.to ? { lte: new Date(`${p.to}T23:59:59`) } : {}) } } : {})
  };
  const [events, modules, roles] = await Promise.all([
    prisma.systemEvent.findMany({ where, orderBy: { createdAt: "desc" }, take: 150, include: { actor: { select: { name: true, email: true } } } }),
    prisma.systemEvent.findMany({ where: { tenantId }, distinct: ["module"], select: { module: true }, orderBy: { module: "asc" } }),
    prisma.systemEvent.findMany({ where: { tenantId, actorRole: { not: null } }, distinct: ["actorRole"], select: { actorRole: true }, orderBy: { actorRole: "asc" } })
  ]);
  const tone = (value: string) => value === "ERROR" ? "error" : value === "WARNING" ? "warning" : "success";
  return <div className="grid gap-6">
    <PageHeader eyebrow="System" title="System Events" description="Sanitized operational outcomes. Audit Logs remain the accountability record." tone="admin" actions={<StatusBadge tone="ops">{events.length} result(s)</StatusBadge>}/>
    <AdminPanel><form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[150px_1fr_1fr_1fr_150px_150px_auto]">
      <select name="severity" defaultValue={severity} className="h-10 rounded-md border border-slate-300 px-3 text-sm"><option value="">All results</option>{["SUCCESS","WARNING","ERROR"].map(v => <option key={v}>{v}</option>)}</select>
      <select name="module" defaultValue={moduleFilter} className="h-10 rounded-md border border-slate-300 px-3 text-sm"><option value="">All modules</option>{modules.map(v => <option key={v.module}>{v.module}</option>)}</select>
      <select name="actorRole" defaultValue={actorRole} className="h-10 rounded-md border border-slate-300 px-3 text-sm"><option value="">All actor roles</option>{roles.map(v => v.actorRole ? <option key={v.actorRole}>{v.actorRole}</option> : null)}</select>
      <input name="errorRef" defaultValue={errorRef} placeholder="Exact error reference" className="h-10 rounded-md border border-slate-300 px-3 text-sm"/>
      <input type="date" name="from" defaultValue={p.from} className="h-10 rounded-md border border-slate-300 px-3 text-sm"/><input type="date" name="to" defaultValue={p.to} className="h-10 rounded-md border border-slate-300 px-3 text-sm"/>
      <button className="rounded-md bg-omd-ops px-4 py-2 text-sm font-semibold text-white">Filter</button>
    </form></AdminPanel>
    {events.length === 0 ? <EmptyState title="No system events" description="No operational outcomes match these filters."/> : <div className="grid gap-3">{events.map(event => <AdminPanel key={event.id}>
      <div className="flex flex-wrap items-center gap-2"><StatusBadge tone={tone(event.severity)}>{event.severity}</StatusBadge><StatusBadge tone="neutral">{event.module}</StatusBadge><strong>{event.action}</strong></div>
      <p className="mt-3 text-sm text-slate-700">{event.outcome}</p><p className="mt-2 text-xs text-slate-500">{event.createdAt.toLocaleString("en-IN")} · {event.actor?.name ?? event.actor?.email ?? event.actorRole ?? "System"}</p>
      {event.errorRef ? <p className="mt-2 font-mono text-xs">Reference: {event.errorRef}</p> : null}{event.entityType && event.entityId ? <Link className="mt-2 inline-flex text-sm font-semibold text-omd-ops" href={`/admin/search?q=${encodeURIComponent(event.entityId)}`}>Find linked record</Link> : null}
    </AdminPanel>)}</div>}
  </div>;
}
