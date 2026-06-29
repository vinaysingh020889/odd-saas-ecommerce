import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { requireAdminRole } from "@/lib/admin-auth";
import { AdminPanel, PageHeader, StatusBadge } from "@/components/ui";

const permissionGroups = [
  "Catalog",
  "Orders",
  "Requests",
  "Payments",
  "Inventory",
  "Asthi",
  "Kundli",
  "Capacity",
  "Assignments",
  "Documents",
  "Memberships",
  "Offers",
  "Reports",
  "Settings"
];

const roleDefaults: Record<string, string[]> = {
  SUPER_ADMIN: permissionGroups,
  OPERATIONS_ADMIN: ["Orders", "Requests", "Inventory", "Asthi", "Kundli", "Capacity", "Assignments", "Documents", "Reports"],
  SUPPORT_AGENT: ["Orders", "Requests", "Asthi", "Kundli", "Documents"],
  CUSTOMER: []
};

export default async function AdminPermissionsPage() {
  await requireAdminRole(["SUPER_ADMIN"]);
  const tenantId = await getOmdTenantId();
  const roles = await prisma.role.findMany({ where: { tenantId }, orderBy: { name: "asc" } });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="System"
        title="Permission Matrix"
        description="Planning and visibility shell for future fine-grained RBAC. Current admin access remains role-gated by the existing admin role check."
        tone="admin"
        actions={<StatusBadge tone="warning">Planning shell</StatusBadge>}
      />

      <AdminPanel className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Permission Group</th>
              {roles.map((role) => <th key={role.id} className="px-4 py-3">{role.name}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {permissionGroups.map((group) => (
              <tr key={group}>
                <td className="px-4 py-3 font-semibold text-slate-950">{group}</td>
                {roles.map((role) => {
                  const enabled = roleDefaults[role.key]?.includes(group) ?? false;
                  return (
                    <td key={role.id} className="px-4 py-3">
                      <StatusBadge tone={enabled ? "success" : "neutral"}>{enabled ? "Planned" : "No access planned"}</StatusBadge>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </AdminPanel>

      <AdminPanel>
        <h2 className="text-lg font-semibold text-slate-950">Important Boundary</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This page documents intended role boundaries only. It does not yet store editable permission rows or enforce fine-grained route/action permissions.
          Production-grade security still needs final RBAC enforcement, 2FA, infrastructure controls, provider credential separation, and audit review workflow.
        </p>
      </AdminPanel>
    </div>
  );
}
