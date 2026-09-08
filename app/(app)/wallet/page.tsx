import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/session";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { getWalletSnapshot } from "@/lib/wallet";
import { BreadcrumbHeader, EmptyState, Panel, StatusBadge, SummaryRow } from "@/components/ui";

function transactionTone(status: string) {
  if (status === "POSTED") return "success" as const;
  if (status === "PENDING") return "warning" as const;
  return "neutral" as const;
}

export default async function WalletPage() {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const wallet = await getWalletSnapshot(tenantId, user.id);

  return (
    <div className="grid gap-6">
      <BreadcrumbHeader items={[{ label: "Dashboard", href: "/dashboard" }, { label: "ODD Wallet" }]} />
      <section className="rounded-xl border border-omd-gold bg-gradient-to-br from-omd-brown to-[#6b2417] p-6 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-omd-gold">ODD Wallet</p>
        <h1 className="mt-2 text-3xl font-semibold">Your rewards, clearly tracked.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">Cashback becomes pending after successful payment and available after eligible order delivery. Every change appears in the history below.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-white/10 p-4"><p className="text-sm text-white/70">Available to use</p><p className="mt-2 text-3xl font-bold">{formatMoney(wallet.balances.available, wallet.balances.currency)}</p></div>
          <div className="rounded-lg bg-white/10 p-4"><p className="text-sm text-white/70">Pending cashback</p><p className="mt-2 text-3xl font-bold">{formatMoney(wallet.balances.pending, wallet.balances.currency)}</p></div>
        </div>
      </section>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-xl font-semibold text-omd-brown">Wallet history</h2><p className="mt-1 text-sm text-omd-muted">Credits, spending, releases, and reversals are recorded independently.</p></div>
          <StatusBadge tone="neutral">{wallet.syncStatus === "LOCAL_ONLY" ? "ODD wallet" : wallet.syncStatus}</StatusBadge>
        </div>
        <div className="mt-5 grid gap-3">
          {wallet.transactions.length === 0 ? <EmptyState title="No wallet activity yet" description="Eligible cashback will appear here after a successful order payment." /> : null}
          {wallet.transactions.map((item) => (
            <article key={item.id} className="grid gap-3 rounded-lg border border-omd-sand bg-omd-ivory/30 p-4 sm:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-omd-brown">{item.description}</p><StatusBadge tone={transactionTone(item.status)}>{item.status}</StatusBadge></div>
                <p className="mt-2 text-xs text-omd-muted">{item.createdAt.toLocaleString("en-IN")} - {item.bucket === "PENDING" ? "Pending balance" : "Available balance"}{item.expiresAt ? " - Expires " + item.expiresAt.toLocaleDateString("en-IN") : ""}</p>
                {item.orderId ? <Link href={`/orders/${item.orderId}`} className="mt-2 inline-flex text-xs font-semibold text-omd-saffron">View related order</Link> : null}
              </div>
              <p className={`text-lg font-semibold ${Number(item.amount) >= 0 ? "text-omd-success" : "text-omd-error"}`}>{Number(item.amount) >= 0 ? "+" : ""}{formatMoney(item.amount, item.currency)}</p>
            </article>
          ))}
        </div>
      </Panel>

      <Panel>
        <h2 className="text-lg font-semibold text-omd-brown">How balances move</h2>
        <div className="mt-4 grid gap-3 text-sm text-omd-muted md:grid-cols-4">
          <SummaryRow label="1. Payment succeeds" value="Cashback pending" />
          <SummaryRow label="2. Order delivered" value="Cashback available" />
          <SummaryRow label="3. Wallet payment" value="Reserved, then used" />
          <SummaryRow label="4. Refund or expiry" value="Ledger corrected" />
        </div>
        <p className="mt-4 text-xs leading-5 text-omd-muted">This commerce wallet keeps a stable synchronization reference for the future core wallet application.</p>
      </Panel>
    </div>
  );
}
