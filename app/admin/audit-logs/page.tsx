import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { requireOperationsAdminUser } from "@/lib/admin-auth";
import { statusLabel } from "@/lib/status-labels";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

type PageProps = {
  searchParams: Promise<{ actorId?: string; action?: string; entity?: string; from?: string; to?: string }>;
};

function entityHref(entity?: string | null, entityId?: string | null) {
  if (!entity || !entityId) return null;
  if (entity === "Order") return `/admin/orders/${entityId}`;
  if (entity === "OrderRequest") return `/admin/requests?q=${entityId}`;
  if (entity === "OperationalDocument") return `/admin/documents?q=${entityId}`;
  if (entity === "CustomerNote") return `/admin/customers/${entityId}`;
  if (entity === "User") return `/admin/customers/${entityId}`;
  if (entity === "Assignment") return `/admin/assignments?q=${entityId}`;
  return null;
}

export default async function AdminAuditLogsPage({ searchParams }: PageProps) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const params = await searchParams;
  const actorId = (params.actorId ?? "").trim();
  const action = (params.action ?? "").trim();
  const entity = (params.entity ?? "").trim();
  const from = (params.from ?? "").trim();
  const to = (params.to ?? "").trim();

  const canViewMetadata = admin.roles.includes("SUPER_ADMIN");
  const where: Prisma.AuditLogWhereInput = {
    tenantId,
    ...(actorId ? { actorId } : {}),
    ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
    ...(entity ? { entity } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59`) } : {})
          }
        }
      : {})
  };

  const [logs, actors, actions, entities] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.user.findMany({ where: { tenantId }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
    prisma.auditLog.findMany({ where: { tenantId }, distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    prisma.auditLog.findMany({ where: { tenantId, entity: { not: null } }, distinct: ["entity"], select: { entity: true }, orderBy: { entity: "asc" } })
  ]);
  const actorById = new Map(actors.map((actor) => [actor.id, actor]));

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="System"
        title="Audit Logs"
        description="Review sensitive admin activity such as role changes, request decisions, document review, fulfilment and operational state changes."
        tone="admin"
        actions={<StatusBadge tone={canViewMetadata ? "success" : "warning"}>{canViewMetadata ? "Full metadata" : "Metadata hidden"}</StatusBadge>}
      />

      <AdminPanel>
        <form className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_150px_150px_100px]">
          <select name="actorId" defaultValue={actorId} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All actors</option>
            {actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.name ?? actor.email ?? actor.id}</option>)}
          </select>
          <select name="action" defaultValue={action} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All actions</option>
            {actions.map((item) => <option key={item.action} value={item.action}>{statusLabel(item.action)}</option>)}
          </select>
          <select name="entity" defaultValue={entity} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All entities</option>
            {entities.map((item) => item.entity ? <option key={item.entity} value={item.entity}>{item.entity}</option> : null)}
          </select>
          <input type="date" name="from" defaultValue={from} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <input type="date" name="to" defaultValue={to} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Filter</button>
        </form>
      </AdminPanel>

      {logs.length === 0 ? (
        <EmptyState title="No audit logs" description="No sensitive activity matches the selected filters." />
      ) : (
        <div className="grid gap-3">
          {logs.map((log) => {
            const actor = log.actorId ? actorById.get(log.actorId) : null;
            const href = entityHref(log.entity, log.entityId);
            return (
              <AdminPanel key={log.id}>
                <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone="ops">{statusLabel(log.action)}</StatusBadge>
                      {log.entity ? <StatusBadge tone="neutral">{log.entity}</StatusBadge> : null}
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      Actor: <strong>{actor?.name ?? actor?.email ?? log.actorId ?? "System"}</strong>
                    </p>
                    <p className="mt-1 text-sm text-slate-600">Created: {log.createdAt.toLocaleString("en-IN")}</p>
                    {href ? <Link href={href} className="mt-2 inline-flex text-sm font-semibold text-omd-ops hover:text-slate-950">Open linked record</Link> : null}
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Metadata</p>
                    {canViewMetadata ? (
                      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-700">{JSON.stringify(log.metadata ?? {}, null, 2)}</pre>
                    ) : (
                      <p className="mt-2 text-sm text-slate-600">Only Super Admin can view audit metadata payloads.</p>
                    )}
                  </div>
                </div>
              </AdminPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
