import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/catalog";
import { requireCurrentUser } from "@/lib/auth/session";
import { evaluateMembershipForScope } from "@/lib/membership";
import { RazorpayPaymentPanel } from "@/components/razorpay-payment-panel";
import { BreadcrumbHeader, Panel, StatusBadge, SummaryRow } from "@/components/ui";
import { statusLabel, statusTone } from "@/lib/status-labels";

type PageProps = {
  params: Promise<{ id: string }>;
};

function inclusions(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

export default async function KundliReviewPage({ params }: PageProps) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const [order, membershipPreview] = await Promise.all([
    prisma.kundliOrder.findFirst({
      where: { userId: user.id, OR: [{ id }, { orderNo: id }] },
      include: { package: true }
    }),
    evaluateMembershipForScope(user.id, "KUNDLI", { relatedType: "KUNDLI" })
  ]);

  if (!order) notFound();

  const alreadyConfirmedHref =
    order.status === "DETAILS_PENDING"
      ? `/kundli/${order.orderNo ?? order.id}/complete-details`
      : `/kundli/${order.orderNo ?? order.id}`;
  const latestAttempt = await prisma.paymentAttempt.findFirst({ where: { userId: user.id, subjectType: "KUNDLI", subjectId: order.id, provider: "RAZORPAY_TEST" }, orderBy: { createdAt: "desc" } });

  return (
    <div className="grid gap-6">
      <BreadcrumbHeader
        items={[{ label: "Kundli", href: "/kundli" }, { label: "Review" }]}
        actions={<StatusBadge tone={statusTone(order.paymentStatus)}>{statusLabel(order.paymentStatus)}</StatusBadge>}
      />

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Step 2 of 3</p>
          <h1 className="mt-2 text-3xl font-semibold text-omd-brown">Review Kundli request</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-omd-muted">
            Confirm the selected package and contact details. Birth details are collected after the payment is verified.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-omd-sand bg-omd-ivory/30 p-4">
              <h2 className="font-semibold text-omd-brown">Package</h2>
              <p className="mt-2 text-sm text-omd-muted">{order.package.name}</p>
              <p className="text-sm text-omd-muted">{statusLabel(order.package.deliveryMode)}</p>
            </div>
            <div className="rounded-lg border border-omd-sand bg-omd-ivory/30 p-4">
              <h2 className="font-semibold text-omd-brown">Applicant</h2>
              <p className="mt-2 text-sm text-omd-muted">{order.applicantName}</p>
              <p className="text-sm text-omd-muted">{order.applicantPhone}</p>
              <p className="text-sm text-omd-muted">{order.applicantEmail}</p>
            </div>
          </div>

          {membershipPreview.hasActiveMembership ? (
            <div className="mt-5 rounded-md border border-omd-sand bg-omd-ivory/40 p-4">
              <p className="font-semibold text-omd-brown">Membership benefit preview</p>
              <p className="mt-1 text-sm leading-6 text-omd-muted">{order.membershipSavingAmount.gt(0) ? `${formatMoney(order.membershipSavingAmount, order.currency)} was reserved from ${membershipPreview.plan?.name ?? "your membership"}.` : "No membership saving applies to this package."}</p>
            </div>
          ) : null}
        </Panel>

        <Panel className="h-fit lg:sticky lg:top-20">
          <h2 className="text-xl font-semibold text-omd-brown">Quote Summary</h2>
          <div className="mt-5 grid gap-3">
            <SummaryRow label={order.package.name} value={formatMoney(order.listAmount, order.currency)} />
            {order.membershipSavingAmount.gt(0) ? <SummaryRow label="Membership benefit" value={`-${formatMoney(order.membershipSavingAmount, order.currency)}`} /> : null}
            <div className="border-t border-omd-sand pt-3">
              <SummaryRow label="Total payable" value={formatMoney(order.totalAmount, order.currency)} strong />
            </div>
          </div>
          <ul className="mt-4 grid gap-2 text-sm text-omd-muted">
            {inclusions(order.package.inclusionsJson).map((inclusion) => (
              <li key={inclusion}>- {inclusion}</li>
            ))}
          </ul>
          <p className="mt-5 rounded-md border border-omd-sand bg-omd-ivory/40 p-3 text-sm leading-6 text-omd-muted">
            Razorpay Test Mode verifies the complete payment flow without charging real money.
          </p>
          {order.package.status !== "ACTIVE" && order.paymentStatus !== "CONFIRMED" ? (
            <p className="mt-5 rounded-md border border-red-100 bg-red-50 p-3 text-sm leading-6 text-omd-error">
              This Kundli package is inactive now. Please choose another active package.
            </p>
          ) : order.paymentStatus === "CONFIRMED" ? (
            <Link href={alreadyConfirmedHref} className="mt-5 inline-flex w-full justify-center rounded-md bg-omd-brown px-4 py-3 text-sm font-semibold text-white hover:bg-omd-saffron">
              Continue Kundli Request
            </Link>
          ) : (
            <div className="mt-5"><RazorpayPaymentPanel orderId={order.id} orderNumber={order.package.name} orderStatus={order.status} paymentStatus={latestAttempt?.status ?? order.paymentStatus} customerName={order.applicantName} customerEmail={order.applicantEmail} subjectType="KUNDLI" entityLabel="Kundli request" redirectTo={alreadyConfirmedHref} /></div>
          )}
        </Panel>
      </section>
    </div>
  );
}
