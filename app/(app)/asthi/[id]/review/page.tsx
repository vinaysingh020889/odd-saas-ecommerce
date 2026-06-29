import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/catalog";
import { requireCurrentUser } from "@/lib/auth/session";
import { confirmAsthiMockPaymentAction } from "@/lib/asthi-actions";
import { BreadcrumbHeader, Panel, StatusBadge, SummaryRow } from "@/components/ui";
import { statusLabel, statusTone } from "@/lib/status-labels";

type PageProps = {
  params: Promise<{ id: string }>;
};

function addOns(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is { name: string; price: number } => typeof item === "object" && item !== null && "name" in item) : [];
}

function SubmitButton() {
  return (
    <button type="submit" className="w-full rounded-md bg-omd-brown px-4 py-3 text-sm font-semibold text-white hover:bg-omd-saffron">
      Confirm Mock Payment
    </button>
  );
}

export default async function AsthiReviewPage({ params }: PageProps) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const application = await prisma.asthiApplication.findFirst({
    where: { userId: user.id, OR: [{ id }, { applicationNo: id }] },
    include: { location: true, package: true }
  });

  if (!application) notFound();

  const selectedAddOns = addOns(application.selectedAddOnsJson);

  return (
    <div className="grid gap-6">
      <BreadcrumbHeader
        items={[{ label: "Asthi Visarjan", href: "/services/asthi-visarjan" }, { label: "Review" }]}
        actions={<StatusBadge tone={statusTone(application.paymentStatus)}>{statusLabel(application.paymentStatus)}</StatusBadge>}
      />

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Booking Review</p>
          <h1 className="mt-2 text-3xl font-semibold text-omd-brown">Confirm your Asthi Seva request</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-omd-muted">
            Please review the selected holy place, package, applicant contact, and quote. Family and deceased details are collected after this mock payment step.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-omd-sand bg-omd-ivory/30 p-4">
              <h2 className="font-semibold text-omd-brown">Holy place</h2>
              <p className="mt-2 text-sm text-omd-muted">{application.location?.name ?? application.preferredLocation}</p>
              <p className="text-sm text-omd-muted">{application.location ? `${application.location.city}, ${application.location.state}` : ""}</p>
            </div>
            <div className="rounded-lg border border-omd-sand bg-omd-ivory/30 p-4">
              <h2 className="font-semibold text-omd-brown">Service mode</h2>
              <p className="mt-2 text-sm text-omd-muted">{statusLabel(application.serviceMode)}</p>
            </div>
            <div className="rounded-lg border border-omd-sand bg-omd-ivory/30 p-4">
              <h2 className="font-semibold text-omd-brown">Applicant</h2>
              <p className="mt-2 text-sm text-omd-muted">{application.applicantName}</p>
              <p className="text-sm text-omd-muted">{application.applicantPhone}</p>
              <p className="text-sm text-omd-muted">{application.applicantEmail}</p>
            </div>
            <div className="rounded-lg border border-omd-sand bg-omd-ivory/30 p-4">
              <h2 className="font-semibold text-omd-brown">Preferred date</h2>
              <p className="mt-2 text-sm text-omd-muted">{application.preferredDate ? application.preferredDate.toLocaleDateString("en-IN") : "To be coordinated"}</p>
            </div>
          </div>
        </Panel>

        <Panel className="h-fit lg:sticky lg:top-20">
          <h2 className="text-xl font-semibold text-omd-brown">Quote Summary</h2>
          <div className="mt-5 grid gap-3">
            <SummaryRow label={application.package?.name ?? "Package"} value={formatMoney(application.package?.price ?? application.totalAmount, application.currency)} />
            {selectedAddOns.map((addOn) => (
              <SummaryRow key={addOn.name} label={String(addOn.name)} value={formatMoney(Number(addOn.price), application.currency)} />
            ))}
            <div className="border-t border-omd-sand pt-3">
              <SummaryRow label="Total payable" value={formatMoney(application.totalAmount, application.currency)} strong />
            </div>
          </div>
          <p className="mt-5 rounded-md border border-omd-sand bg-omd-ivory/40 p-3 text-sm leading-6 text-omd-muted">
            This confirms a mock payment only. No real Razorpay, PayPal, wallet, or ledger action happens here.
          </p>
          <form action={confirmAsthiMockPaymentAction} className="mt-5">
            <input type="hidden" name="applicationId" value={application.id} />
            <SubmitButton />
          </form>
        </Panel>
      </section>
    </div>
  );
}
