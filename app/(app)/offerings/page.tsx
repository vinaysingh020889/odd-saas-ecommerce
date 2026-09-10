import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { BreadcrumbHeader, EmptyState, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { offeringDueState } from "@/lib/offerings";

export default async function OfferingsPage() {
  const user = await requireCurrentUser();
  const requests = await prisma.offeringRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return <div className="grid gap-6"><PageHeader eyebrow="Circular seva" title="Offerings to Blessings" description="Send eligible devotional materials for careful collection, processing, and a trackable reward." actions={<Link href="/offerings/new" className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white">Start request</Link>} />
    {requests.length === 0 ? <EmptyState title="No offerings requests" description="Start a request to describe your materials and choose pickup, drop-off, or courier." /> :
    <section className="grid gap-3">{requests.map((item) => <Link key={item.id} href={`/offerings/${item.id}`} className="rounded-lg border border-omd-sand bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold text-omd-brown">{item.requestNumber}</p><p className="mt-1 line-clamp-2 text-sm text-omd-muted">{item.materialDescription}</p></div><StatusBadge tone={offeringDueState(item) === "OVERDUE" ? "error" : item.status === "CLOSED" ? "success" : "warning"}>{item.status.replaceAll("_", " ")}</StatusBadge></div></Link>)}</section>}
  </div>;
}
