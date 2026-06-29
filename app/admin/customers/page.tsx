import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tenantId = await getOmdTenantId();
  const q = (params.q ?? "").trim();
  const status = (params.status ?? "").trim();

  const customers = await prisma.user.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    include: {
      roles: { include: { role: { select: { name: true, key: true } } } },
      _count: { select: { orders: true, carts: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="CRM"
        title="Customers"
        description="Search customer accounts, see roles, order activity, and support context without entering payment or fulfillment workflows."
        tone="admin"
      />

      <AdminPanel>
        <form className="grid gap-3 md:grid-cols-[1fr_180px_110px]">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, email, or phone"
            className="h-10 rounded-md border border-slate-300 px-3 text-sm"
          />
          <select name="status" defaultValue={status} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All statuses</option>
            {["ACTIVE", "INACTIVE"].map((option) => (
              <option key={option} value={option}>{statusLabel(option)}</option>
            ))}
          </select>
          <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Filter</button>
        </form>
      </AdminPanel>

      {customers.length === 0 ? (
        <EmptyState title="No customers found" description={q || status ? "No customer matches this search or status. Clear filters to return to the full customer list." : "Customer accounts appear here after signup, demo seed, or checkout activity."} />
      ) : (
        <AdminPanel className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Roles</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {customers.map((customer) => (
                  <tr key={customer.id} className="align-top">
                    <td className="px-4 py-3 font-semibold text-slate-950">{customer.name ?? "Unnamed customer"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {customer.email ?? "-"}
                      <br />
                      {customer.phone ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {customer.roles.map((role) => role.role.name).join(", ") || "Customer"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={statusTone(customer.status)}>{statusLabel(customer.status)}</StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{customer._count.orders}</td>
                    <td className="px-4 py-3 text-slate-600">{customer.createdAt.toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/customers/${customer.id}`} className="font-semibold text-omd-ops hover:text-omd-brown">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      )}
    </div>
  );
}
