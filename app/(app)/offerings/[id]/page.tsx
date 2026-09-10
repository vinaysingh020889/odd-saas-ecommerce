import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { BreadcrumbHeader, Panel, StatusBadge } from "@/components/ui";
import { cancelOfferingRequestAction, selectOfferingRewardAction } from "@/lib/offering-actions";
import { formatMoney } from "@/lib/catalog";

export default async function OfferingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser(); const { id } = await params;
  const [item, addresses, products] = await Promise.all([
    prisma.offeringRequest.findFirst({ where: { id, userId: user.id }, include: { activities: { where: { customerVisible: true }, orderBy: { createdAt: "asc" } } } }),
    prisma.customerAddress.findMany({ where: { userId: user.id } }),
    prisma.product.findMany({ where: { status: "ACTIVE", type: "PHYSICAL", variants: { some: { active: true } } }, include: { variants: { where: { active: true } }, category: true }, take: 30 })
  ]); if (!item) notFound();
  return <div className="grid gap-6"><BreadcrumbHeader items={[{ label: "Offerings", href: "/offerings" }, { label: item.requestNumber }]} />
    <Panel><div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-semibold text-omd-brown">{item.requestNumber}</h1><p className="mt-2 text-sm text-omd-muted">{item.materialDescription}</p></div><StatusBadge tone={item.status === "CLOSED" ? "success" : item.status === "CANCELLED" || item.status === "REJECTED" ? "neutral" : "warning"}>{item.status.replaceAll("_", " ")}</StatusBadge></div>{["SUBMITTED","ACCEPTED","COLLECTION_SCHEDULED"].includes(item.status) ? <form action={cancelOfferingRequestAction} className="mt-4"><input type="hidden" name="id" value={item.id}/><button className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Cancel before collection</button></form> : null}<dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-omd-muted">Transfer</dt><dd className="font-semibold">{item.transferMethod.replaceAll("_", " ")}</dd></div><div><dt className="text-omd-muted">Pickup saving</dt><dd className="font-semibold">{formatMoney(item.pickupSavingAmount)}</dd></div><div><dt className="text-omd-muted">Reward order</dt><dd>{item.rewardOrderId ? <Link className="font-semibold text-omd-saffron" href={`/orders/${item.rewardOrderId}`}>Track order</Link> : "Not created"}</dd></div></dl></Panel>
    {item.status === "REWARD_SELECTION" ? <Panel><h2 className="text-xl font-semibold text-omd-brown">Choose your blessing reward</h2><p className="mt-2 text-sm text-omd-muted">Your reward is fulfilled as a normal order. Any balance and delivery charge are shown in that order.</p><form action={selectOfferingRewardAction} className="mt-4 grid gap-4"><input type="hidden" name="id" value={item.id} /><label className="grid gap-1 text-sm font-semibold">Reward<select required name="rewardChoice" className="rounded-md border p-3" onChange={undefined}>{products.flatMap((p) => p.variants.map((v) => <option key={v.id} value={`${p.id}|${v.id}`}>{p.title} — {v.title ?? v.sku}</option>))}</select></label><label className="grid gap-1 text-sm font-semibold">Delivery address<select required name="addressId" className="rounded-md border p-3">{addresses.map((a)=><option key={a.id} value={a.id}>{a.addressLine1}, {a.city} {a.pincode}</option>)}</select></label><button disabled={!products.length || !addresses.length} className="w-fit rounded-md bg-omd-brown px-4 py-2 font-semibold text-white disabled:opacity-50">Create reward order</button></form></Panel> : null}
    <Panel><h2 className="text-xl font-semibold text-omd-brown">Timeline</h2><ol className="mt-4 grid gap-3">{item.activities.map((a) => <li key={a.id} className="border-l-2 border-omd-gold pl-4"><p className="font-semibold">{(a.toStatus ?? a.action).replaceAll("_", " ")}</p><p className="text-xs text-omd-muted">{a.createdAt.toLocaleString("en-IN")}</p>{a.note ? <p className="mt-1 text-sm">{a.note}</p> : null}</li>)}</ol></Panel>
  </div>;
}
