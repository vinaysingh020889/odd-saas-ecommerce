import Link from "next/link";
import { requireAdminRole } from "@/lib/admin-auth";
import { getOmdTenantId } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { PageHeader, AdminPanel, StatusBadge } from "@/components/ui";
import { offeringDueState } from "@/lib/offerings";
import { processExpiredMembershipReservations, syncOfferingReminders } from "@/lib/entitlement-operations";

export default async function AdminOfferingsPage() {
  await requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN"]); const tenantId = await getOmdTenantId();
  await processExpiredMembershipReservations(tenantId); await syncOfferingReminders(tenantId);
  const rows = await prisma.offeringRequest.findMany({ where: { tenantId }, include: { user: { select: { name: true, email: true } } }, orderBy: [{ priorityScore: "desc" }, { createdAt: "asc" }] });
  return <div className="grid gap-6"><PageHeader eyebrow="Operations" title="Offerings to Blessings" description="Accept, collect, receive, process, reward, and close every material request. Priority membership requests sort first." tone="admin" />
    <section className="grid gap-3 sm:grid-cols-4">{["SUBMITTED","PROCESSING","REWARD_SELECTION","OVERDUE"].map((s)=><AdminPanel key={s}><p className="text-xs uppercase text-slate-500">{s.replaceAll("_"," ")}</p><p className="mt-2 text-2xl font-semibold">{rows.filter((r)=>s==="OVERDUE"?offeringDueState(r)==="OVERDUE":r.status===s).length}</p></AdminPanel>)}</section>
    <AdminPanel className="overflow-x-auto p-0"><table className="min-w-[900px] w-full text-left text-sm"><caption className="sr-only">Offerings requests ordered by membership priority and submission date</caption><thead className="bg-slate-100"><tr>{["Request","Customer","Transfer","Status","Due","Reward"].map((h)=><th scope="col" className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r)=><tr className="border-t" key={r.id}><td className="p-3"><Link className="font-semibold text-omd-ops" href={`/admin/offerings/${r.id}`}>{r.requestNumber}</Link>{r.priorityScore ? <p className="text-xs text-amber-700">Membership priority</p>:null}</td><td className="p-3">{r.user.name??r.user.email}</td><td className="p-3">{r.transferMethod.replaceAll("_"," ")}</td><td className="p-3"><StatusBadge tone={r.status==="CLOSED"?"success":"warning"}>{r.status.replaceAll("_"," ")}</StatusBadge></td><td className="p-3"><StatusBadge tone={offeringDueState(r)==="OVERDUE"?"error":"neutral"}>{offeringDueState(r).replaceAll("_"," ")}</StatusBadge></td><td className="p-3">{r.rewardOrderId?<Link className="text-omd-ops" href={`/admin/orders/${r.rewardOrderId}`}>Order</Link>:"—"}</td></tr>)}</tbody></table></AdminPanel>
  </div>;
}
