import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireAdminUser } from "@/lib/admin-auth";
import { getOmdTenantId } from "@/lib/catalog";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/notification-actions";
import { prisma } from "@/lib/prisma";

export default async function AdminNotificationsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const [user, tenantId, params] = await Promise.all([requireAdminUser(), getOmdTenantId(), searchParams]);
  const unreadOnly = params.view !== "all";
  const notifications = await prisma.notification.findMany({ where: { tenantId, recipientId: user.id, archivedAt: null, ...(unreadOnly ? { readAt: null } : {}) }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100 });
  const unreadCount = await prisma.notification.count({ where: { tenantId, recipientId: user.id, archivedAt: null, readAt: null } });
  return <div className="grid min-w-0 gap-6">
    <PageHeader eyebrow="System" title="Notifications" description="Persisted, private operational notifications for your account." tone="admin" actions={<StatusBadge tone={unreadCount ? "warning" : "success"}>{unreadCount} unread</StatusBadge>} />
    <div className="flex flex-wrap items-center gap-2"><Link href="/admin/notifications" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">Unread</Link><Link href="/admin/notifications?view=all" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">All</Link>{unreadCount ? <form action={markAllNotificationsReadAction}><button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Mark all read</button></form> : null}</div>
    {notifications.length ? <div className="grid gap-3">{notifications.map((item) => <article key={item.id} className={`min-w-0 rounded-lg border p-4 shadow-sm ${item.readAt ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.type.replaceAll("_", " ")}</p><h2 className="mt-1 break-words font-semibold text-slate-950">{item.title}</h2><p className="mt-2 break-words text-sm leading-6 text-slate-600">{item.message}</p><p className="mt-2 text-xs text-slate-500">{item.createdAt.toLocaleString("en-IN")}</p></div><div className="flex shrink-0 flex-wrap gap-2">{item.destination ? <Link href={item.destination} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Open</Link> : null}{!item.readAt ? <form action={markNotificationReadAction}><input type="hidden" name="notificationId" value={item.id}/><button className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Mark read</button></form> : null}</div></div></article>)}</div> : <EmptyState title={unreadOnly ? "No unread notifications" : "No notifications yet"} description="Kundli assignments, report submissions, corrections and deliveries will appear here." />}
  </div>;
}
