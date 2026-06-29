import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { requireAdminRole } from "@/lib/admin-auth";
import { assignUserRoleAction, removeUserRoleAction } from "@/lib/admin-hardening-actions";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export default async function AdminRolesPage() {
  const admin = await requireAdminRole(["SUPER_ADMIN"]);
  const tenantId = await getOmdTenantId();
  const canEdit = admin.roles.includes("SUPER_ADMIN");
  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId },
      include: { roles: { include: { role: true }, orderBy: { createdAt: "asc" } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100
    }),
    prisma.role.findMany({ where: { tenantId }, orderBy: { name: "asc" } })
  ]);

  const superAdminAssignments = users.flatMap((user) => user.roles).filter((assignment) => assignment.role.key === "SUPER_ADMIN").length;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="System"
        title="Role Management"
        description="Assign existing tenant roles to users. Super Admin removal is protected so the account cannot lock itself out."
        tone="admin"
        actions={<StatusBadge tone={canEdit ? "success" : "warning"}>{canEdit ? "Super Admin editable" : "Read-only for this role"}</StatusBadge>}
      />

      {users.length === 0 ? (
        <EmptyState title="No users found" description="Seed or create users first, then return here to manage role assignments." />
      ) : (
        <div className="grid gap-4">
          {users.map((user) => {
            const assignedRoleIds = new Set(user.roles.map((assignment) => assignment.roleId));
            const availableRoles = roles.filter((role) => !assignedRoleIds.has(role.id));

            return (
              <AdminPanel key={user.id}>
                <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-950">{user.name ?? user.email ?? "User"}</h2>
                      <StatusBadge tone={statusTone(user.status)}>{statusLabel(user.status)}</StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{user.email ?? user.phone ?? user.id}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {user.roles.length === 0 ? <StatusBadge tone="neutral">No Role</StatusBadge> : null}
                      {user.roles.map((assignment) => {
                        const lastSuperAdmin = assignment.role.key === "SUPER_ADMIN" && superAdminAssignments <= 1;
                        return (
                          <form key={assignment.id} action={removeUserRoleAction} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                            <input type="hidden" name="userRoleId" value={assignment.id} />
                            <input type="hidden" name="redirectTo" value="/admin/roles" />
                            <span className="text-xs font-semibold text-slate-700">{assignment.role.name}</span>
                            <button
                              disabled={!canEdit || lastSuperAdmin}
                              className="rounded-full px-2 text-xs font-semibold text-omd-error hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
                              title={lastSuperAdmin ? "Last Super Admin is protected" : "Remove role"}
                            >
                              Remove
                            </button>
                          </form>
                        );
                      })}
                    </div>
                  </div>

                  <form action={assignUserRoleAction} className="grid h-fit gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="redirectTo" value="/admin/roles" />
                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      Assign role
                      <select name="roleId" disabled={!canEdit || availableRoles.length === 0} className="h-10 rounded-md border border-slate-300 px-3 text-sm disabled:bg-slate-100">
                        {availableRoles.length === 0 ? <option value="">All roles assigned</option> : null}
                        {availableRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                      </select>
                    </label>
                    <button disabled={!canEdit || availableRoles.length === 0} className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                      Assign Role
                    </button>
                  </form>
                </div>
              </AdminPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
