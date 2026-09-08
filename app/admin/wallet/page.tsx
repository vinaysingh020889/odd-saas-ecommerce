import { requireOperationsAdminUser } from "@/lib/admin-auth";
import { getOmdTenantId, formatMoney } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { getWalletSnapshot } from "@/lib/wallet";
import { createWalletAdjustmentAction } from "@/lib/wallet-actions";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export default async function AdminWalletPage({ searchParams }: { searchParams: Promise<{ q?: string; adjusted?: string }> }) {
  await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const params = await searchParams;
  const q = String(params.q ?? "").trim();
  const [users, accounts] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId, status: "ACTIVE", ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}) },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      take: 100
    }),
    prisma.walletAccount.findMany({
      where: { tenantId, ...(q ? { user: { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } } : {}) },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { updatedAt: "desc" },
      take: 50
    })
  ]);
  const snapshots = await Promise.all(accounts.map(async (account) => ({
    account,
    snapshot: await getWalletSnapshot(tenantId, account.userId)
  })));

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Finance" title="ODD Wallet Operations" tone="admin" description="Investigate wallet balances and ledger entries. Every manual credit or debit requires a reason and creates an audit log." />
      {params.adjusted ? <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-800">Wallet adjustment posted successfully.</p> : null}
      <AdminPanel>
        <h2 className="text-lg font-semibold">Find a customer</h2>
        <form className="mt-3 flex flex-wrap gap-2">
          <input name="q" defaultValue={q} placeholder="Name or email" className="h-10 min-w-64 rounded-md border border-slate-300 px-3 text-sm" />
          <button className="rounded-md bg-omd-ops px-4 text-sm font-semibold text-white">Search</button>
        </form>
      </AdminPanel>
      <AdminPanel>
        <h2 className="text-lg font-semibold">Manual adjustment</h2>
        <p className="mt-1 text-sm text-slate-600">Use this only for a verified correction. Debits cannot exceed the customer’s available balance.</p>
        <form action={createWalletAdjustmentAction} className="mt-4 grid gap-3 md:grid-cols-4">
          <select name="userId" required className="h-10 rounded-md border border-slate-300 px-3 text-sm md:col-span-2">
            <option value="">Choose customer</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name || user.email || user.id} {user.email ? "(" + user.email + ")" : ""}</option>)}
          </select>
          <select name="direction" className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="credit">Credit wallet</option>
            <option value="debit">Debit wallet</option>
          </select>
          <input name="amount" type="number" min="0.01" step="0.01" required placeholder="Amount in INR" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <textarea name="reason" minLength={5} required rows={3} placeholder="Required reason and reference" className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-3" />
          <button className="h-fit rounded-md bg-omd-ops px-4 py-2 text-sm font-semibold text-white">Post adjustment</button>
        </form>
      </AdminPanel>
      {snapshots.length === 0 ? <EmptyState title="No wallet accounts found" description="A wallet account appears after cashback or the first audited adjustment." /> : (
        <div className="grid gap-4">
          {snapshots.map(({ account, snapshot }) => (
            <AdminPanel key={account.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{account.user.name || account.user.email || account.userId}</h2>
                  <p className="text-sm text-slate-600">{account.user.email}</p>
                </div>
                <div className="flex gap-2"><StatusBadge tone="success">{account.status}</StatusBadge><StatusBadge tone="neutral">{account.syncStatus}</StatusBadge></div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md bg-green-50 p-3"><p className="text-xs uppercase text-green-700">Available</p><p className="text-xl font-semibold text-green-900">{formatMoney(snapshot.balances.available)}</p></div>
                <div className="rounded-md bg-amber-50 p-3"><p className="text-xs uppercase text-amber-700">Pending</p><p className="text-xl font-semibold text-amber-900">{formatMoney(snapshot.balances.pending)}</p></div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm"><thead><tr className="border-b border-slate-200"><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Type</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Reason</th><th className="py-2 text-right">Amount</th></tr></thead>
                  <tbody>{snapshot.transactions.slice(0, 20).map((item) => <tr key={item.id} className="border-b border-slate-100"><td className="py-2 pr-4 whitespace-nowrap">{item.createdAt.toLocaleString("en-IN")}</td><td className="py-2 pr-4">{item.type.replaceAll("_", " ")}</td><td className="py-2 pr-4">{item.status}</td><td className="py-2 pr-4">{item.description}</td><td className={"py-2 text-right font-semibold " + (Number(item.amount) >= 0 ? "text-green-700" : "text-red-700")}>{Number(item.amount) >= 0 ? "+" : ""}{formatMoney(item.amount)}</td></tr>)}</tbody>
                </table>
              </div>
            </AdminPanel>
          ))}
        </div>
      )}
    </div>
  );
}
