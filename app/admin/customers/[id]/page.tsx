import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { createCustomerNoteAction } from "@/lib/admin-hardening-actions";
import { getCustomerInterestProfile, getRecentCustomerEvents } from "@/lib/customer-events";
import { getMembershipBenefitUsageSummary } from "@/lib/membership";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, PageHeader, StatusBadge, SummaryRow } from "@/components/ui";

type PageProps = { params: Promise<{ id: string }> };

function cartSubtotal(cart: { items: Array<{ quantity: number; priceSnapshot: unknown }> }) {
  return cart.items.reduce((total, item) => total + Number(item.priceSnapshot) * item.quantity, 0);
}

export default async function AdminCustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const tenantId = await getOmdTenantId();
  const customer = await prisma.user.findFirst({
    where: { id, tenantId },
    include: {
      roles: { include: { role: { select: { name: true, key: true } } } },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { _count: { select: { items: true } } }
      },
      carts: {
        where: { status: "ACTIVE" },
        include: { items: true },
        orderBy: { updatedAt: "desc" },
        take: 1
      },
      membershipSubscriptions: {
        include: {
          order: { select: { id: true, orderNumber: true } },
          product: { select: { title: true } },
          variant: { select: { title: true, sku: true } }
        },
        orderBy: { createdAt: "desc" }
      },
      userMemberships: {
        include: {
          plan: { include: { benefits: { where: { active: true }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] } } },
          usages: { include: { benefit: { select: { title: true, scope: true } } }, orderBy: { usedAt: "desc" }, take: 10 },
          requests: { orderBy: { createdAt: "desc" }, take: 10 },
          statusHistory: { orderBy: { createdAt: "desc" }, take: 10 }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!customer) notFound();

  const [notes, asthiApplications, kundliOrders, requests, documents, assignments, interestProfile, recentEvents] = await Promise.all([
    prisma.customerNote.findMany({
      where: { tenantId, customerId: customer.id },
      include: { createdBy: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.asthiApplication.findMany({
      where: { tenantId, userId: customer.id },
      select: { id: true, applicationNo: true, status: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 10
    }),
    prisma.kundliOrder.findMany({
      where: { tenantId, userId: customer.id },
      select: { id: true, orderNo: true, status: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 10
    }),
    prisma.orderRequest.findMany({
      where: { tenantId, createdById: customer.id },
      select: { id: true, requestType: true, status: true, createdAt: true, orderId: true, order: { select: { orderNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.operationalDocument.findMany({
      where: { tenantId, ownerType: "CUSTOMER", ownerId: customer.id },
      select: { id: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.assignment.findMany({
      where: { tenantId, workId: customer.id },
      select: { id: true, workType: true, status: true, priority: true, dueAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    getCustomerInterestProfile(tenantId, customer.id),
    getRecentCustomerEvents(tenantId, customer.id, 20)
  ]);

  const timeline = [
    ...customer.orders.map((order) => ({
      key: `order-${order.id}`,
      date: order.createdAt,
      title: `Order ${order.orderNumber}`,
      detail: `${statusLabel(order.status)} - ${formatMoney(order.totalAmount, order.currency)}`,
      href: `/admin/orders/${order.id}`,
      status: order.status
    })),
    ...asthiApplications.map((application) => ({
      key: `asthi-${application.id}`,
      date: application.updatedAt,
      title: `Asthi ${application.applicationNo ?? "draft"}`,
      detail: statusLabel(application.status),
      href: `/admin/asthi/${application.applicationNo ?? application.id}`,
      status: application.status
    })),
    ...kundliOrders.map((order) => ({
      key: `kundli-${order.id}`,
      date: order.updatedAt,
      title: `Kundli ${order.orderNo ?? "draft"}`,
      detail: statusLabel(order.status),
      href: `/admin/kundli/${order.orderNo ?? order.id}`,
      status: order.status
    })),
    ...requests.map((request) => ({
      key: `request-${request.id}`,
      date: request.createdAt,
      title: `${statusLabel(request.requestType)} request`,
      detail: `${request.order.orderNumber} - ${statusLabel(request.status)}`,
      href: `/admin/orders/${request.orderId}`,
      status: request.status
    })),
    ...documents.map((document) => ({
      key: `document-${document.id}`,
      date: document.createdAt,
      title: document.title,
      detail: statusLabel(document.status),
      href: `/admin/documents?q=${document.id}`,
      status: document.status
    })),
    ...assignments.map((assignment) => ({
      key: `assignment-${assignment.id}`,
      date: assignment.createdAt,
      title: `${statusLabel(assignment.workType)} assignment`,
      detail: `${statusLabel(assignment.status)} - ${statusLabel(assignment.priority)}`,
      href: "/admin/assignments",
      status: assignment.status
    })),
    ...customer.userMemberships.map((membership) => ({
      key: `user-membership-${membership.id}`,
      date: membership.updatedAt,
      title: `Membership ${membership.plan.name}`,
      detail: `${statusLabel(membership.status)} - expires ${membership.expiresAt.toLocaleDateString("en-IN")}`,
      href: "/admin/memberships",
      status: membership.status
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 30);

  const activeCart = customer.carts[0] ?? null;
  const activeCartTotal = activeCart ? cartSubtotal(activeCart) : 0;
  const membershipUsageSummaries = new Map(
    await Promise.all(
      customer.userMemberships.map(async (membership) => [membership.id, await getMembershipBenefitUsageSummary(membership.id)] as const)
    )
  );
  const profileItems = (value: unknown) =>
    Array.isArray(value)
      ? value
          .filter((item): item is { id: string; label: string; count: number } => typeof item === "object" && item !== null && "label" in item && "count" in item)
          .slice(0, 5)
      : [];

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Customer"
        title={customer.name ?? customer.email ?? "Customer Profile"}
        description="Customer support view with orders, active cart context, role status, and account metadata."
        tone="admin"
        actions={<StatusBadge tone={statusTone(customer.status)}>{statusLabel(customer.status)}</StatusBadge>}
      />

      <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-5">
          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Orders</h2>
            <div className="mt-4 grid gap-3">
              {customer.orders.length === 0 ? <p className="text-sm text-slate-600">This customer has not created an order draft yet.</p> : null}
              {customer.orders.map((order) => (
                <Link key={order.id} href={`/admin/orders/${order.id}`} className="rounded-md border border-slate-200 p-4 hover:border-omd-ops">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{order.orderNumber}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {order._count.items} items - {order.createdAt.toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-950">{formatMoney(order.totalAmount, order.currency)}</p>
                      <p className="mt-1 text-xs text-slate-500">{statusLabel(order.status)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Active Cart</h2>
            {activeCart ? (
              <div className="mt-4 grid gap-3">
                <SummaryRow label="Cart items" value={activeCart.items.length} />
                <SummaryRow label="Cart subtotal" value={formatMoney(activeCartTotal)} strong />
                <p className="text-xs leading-5 text-slate-500">Cart is support visibility only. Admin checkout and cart mutation are not enabled.</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">No active cart found.</p>
            )}
          </AdminPanel>

          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Internal Notes</h2>
            <form action={createCustomerNoteAction} className="mt-4 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
              <input type="hidden" name="customerId" value={customer.id} />
              <input type="hidden" name="redirectTo" value={`/admin/customers/${customer.id}`} />
              <select name="category" defaultValue="GENERAL" className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                {["GENERAL", "SUPPORT", "RISK", "FULFILMENT", "MEMBERSHIP", "ASTHI", "KUNDLI"].map((category) => (
                  <option key={category} value={category}>{statusLabel(category)}</option>
                ))}
              </select>
              <textarea name="note" rows={3} placeholder="Internal note. This never appears on customer pages." className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <button className="w-fit rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Add internal note</button>
            </form>
            <div className="mt-4 grid gap-3">
              {notes.length === 0 ? <p className="text-sm text-slate-600">No internal notes yet.</p> : null}
              {notes.map((note) => (
                <div key={note.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <StatusBadge tone="neutral">{statusLabel(note.category)}</StatusBadge>
                    <span className="text-xs text-slate-500">{note.createdAt.toLocaleString("en-IN")}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{note.note}</p>
                  <p className="mt-2 text-xs text-slate-500">By {note.createdBy.name ?? note.createdBy.email ?? "Admin"}</p>
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Membership Engine</h2>
            <div className="mt-4 grid gap-3">
              {customer.userMemberships.length === 0 ? <p className="text-sm text-slate-600">No plan-engine memberships found.</p> : null}
              {customer.userMemberships.map((membership) => (
                <div key={membership.id} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{membership.plan.name}</p>
                      <p className="mt-1 text-slate-600">
                        {membership.startsAt.toLocaleDateString("en-IN")} - {membership.expiresAt.toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <StatusBadge tone={statusTone(membership.status)}>{statusLabel(membership.status)}</StatusBadge>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    <div className="rounded-md bg-white p-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Benefits</p>
                      <p className="mt-1 font-semibold text-slate-950">{membership.plan.benefits.length}</p>
                    </div>
                    <div className="rounded-md bg-white p-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Usage</p>
                      <p className="mt-1 font-semibold text-slate-950">{membership.usages.length}</p>
                    </div>
                    <div className="rounded-md bg-white p-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Requests</p>
                      <p className="mt-1 font-semibold text-slate-950">{membership.requests.length}</p>
                    </div>
                  </div>
                  {membership.usages.length > 0 ? (
                    <div className="mt-3 grid gap-2">
                      {membership.usages.slice(0, 3).map((usage) => (
                        <p key={usage.id} className="text-xs text-slate-600">
                          {usage.benefit.title} - {statusLabel(usage.scope)} - {usage.usedAt.toLocaleString("en-IN")}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 grid gap-2">
                    {(membershipUsageSummaries.get(membership.id) ?? []).slice(0, 5).map((item) => (
                      <div key={item.benefit.id} className="rounded-md bg-white p-2 text-xs text-slate-600">
                        <p className="font-semibold text-slate-950">{item.benefit.title}</p>
                        <p className="mt-1">
                          Used {item.usedCount}{item.usageLimit ? ` / ${item.usageLimit}` : ""}{item.usagePeriod ? ` ${statusLabel(item.usagePeriod)}` : ""}
                          {typeof item.remaining === "number" ? ` - ${item.remaining} remaining` : " - unlimited"}
                        </p>
                      </div>
                    ))}
                  </div>
                  {membership.statusHistory[0] ? <p className="mt-3 text-xs text-slate-500">{membership.statusHistory[0].note ?? statusLabel(membership.statusHistory[0].toStatus)}</p> : null}
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Legacy Membership Subscriptions</h2>
            <div className="mt-4 grid gap-3">
              {customer.membershipSubscriptions.length === 0 ? <p className="text-sm text-slate-600">No legacy product-order membership subscriptions found.</p> : null}
              {customer.membershipSubscriptions.map((membership) => (
                <div key={membership.id} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{membership.product.title}</p>
                      <p className="mt-1 text-slate-600">{membership.variant?.title ?? membership.variant?.sku ?? "Default"}</p>
                      <Link href={`/admin/orders/${membership.order.id}`} className="mt-2 inline-flex font-semibold text-omd-ops">
                        {membership.order.orderNumber}
                      </Link>
                    </div>
                    <StatusBadge tone={statusTone(membership.status)}>{statusLabel(membership.status)}</StatusBadge>
                  </div>
                  <p className="mt-2 text-slate-600">
                    {membership.startsAt.toLocaleDateString("en-IN")} - {membership.endsAt.toLocaleDateString("en-IN")}
                  </p>
                </div>
              ))}
            </div>
          </AdminPanel>
        </div>

        <AdminPanel className="h-fit">
          <h2 className="text-lg font-semibold text-slate-950">Account</h2>
          <div className="mt-4 grid gap-3">
            <SummaryRow label="Email" value={customer.email ?? "-"} />
            <SummaryRow label="Phone" value={customer.phone ?? "-"} />
            <SummaryRow label="Roles" value={customer.roles.map((role) => role.role.name).join(", ") || "Customer"} />
            <SummaryRow label="Email verified" value={customer.verifiedEmail ? "Yes" : "No"} />
            <SummaryRow label="Phone verified" value={customer.verifiedPhone ? "Yes" : "No"} />
            <SummaryRow label="Created" value={customer.createdAt.toLocaleDateString("en-IN")} />
          </div>
        </AdminPanel>

        <AdminPanel className="h-fit">
          <h2 className="text-lg font-semibold text-slate-950">Interest Profile</h2>
          {interestProfile ? (
            <div className="mt-4 grid gap-4">
              {[
                ["Top tags", profileItems(interestProfile.topTagsJson)],
                ["Top categories", profileItems(interestProfile.topCategoriesJson)],
                ["Top products", profileItems(interestProfile.topProductsJson)],
                ["Search terms", profileItems(interestProfile.searchTermsJson)]
              ].map(([label, items]) => (
                <div key={String(label)}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{String(label)}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(items as Array<{ id: string; label: string; count: number }>).length === 0 ? <span className="text-sm text-slate-600">No data yet.</span> : null}
                    {(items as Array<{ id: string; label: string; count: number }>).map((item) => (
                      <span key={`${label}-${item.id}`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                        {item.label} ({item.count})
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              <Link href={`/admin/customer-events?userId=${customer.id}`} className="text-sm font-semibold text-omd-ops hover:text-slate-950">
                Open customer events
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">No interest profile yet. It will appear after tracked browsing or checkout activity.</p>
          )}
        </AdminPanel>

        <AdminPanel className="h-fit">
          <h2 className="text-lg font-semibold text-slate-950">Combined Timeline</h2>
          <div className="mt-4 grid gap-3">
            {timeline.length === 0 ? <p className="text-sm text-slate-600">No customer timeline activity yet.</p> : null}
            {timeline.map((item) => (
              <Link key={item.key} href={item.href} className="rounded-md border border-slate-200 p-3 hover:border-omd-ops">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-slate-950">{item.title}</p>
                  <StatusBadge tone={statusTone(item.status)}>{statusLabel(item.status)}</StatusBadge>
                </div>
                <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                <p className="mt-1 text-xs text-slate-500">{item.date.toLocaleString("en-IN")}</p>
              </Link>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel className="h-fit">
          <h2 className="text-lg font-semibold text-slate-950">Recent Customer Events</h2>
          <div className="mt-4 grid gap-3">
            {recentEvents.length === 0 ? <p className="text-sm text-slate-600">No tracked customer events yet.</p> : null}
            {recentEvents.map((event) => (
              <Link key={event.id} href={`/admin/customer-events?userId=${customer.id}`} className="rounded-md border border-slate-200 p-3 hover:border-omd-ops">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <StatusBadge tone={statusTone(event.eventType)}>{statusLabel(event.eventType)}</StatusBadge>
                  <span className="text-xs text-slate-500">{event.createdAt.toLocaleString("en-IN")}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{event.entitySlug ?? event.entityId ?? event.sourcePath ?? "Tracked event"}</p>
              </Link>
            ))}
          </div>
        </AdminPanel>
      </section>
    </div>
  );
}
