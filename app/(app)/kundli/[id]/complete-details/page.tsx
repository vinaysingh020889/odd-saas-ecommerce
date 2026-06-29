import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";
import { completeKundliDetailsAction } from "@/lib/kundli-actions";
import { BreadcrumbHeader, Panel, StatusBadge } from "@/components/ui";
import { statusLabel, statusTone } from "@/lib/status-labels";

type PageProps = {
  params: Promise<{ id: string }>;
};

function dateInput(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function KundliCompleteDetailsPage({ params }: PageProps) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const order = await prisma.kundliOrder.findFirst({
    where: { userId: user.id, OR: [{ id }, { orderNo: id }] },
    include: { package: true, documents: true }
  });

  if (!order) notFound();
  if (order.paymentStatus !== "CONFIRMED") redirect(`/kundli/${order.id}/review`);
  if (!order.orderNo) redirect(`/kundli/${order.id}/review`);
  if (["ASSIGNED", "IN_REVIEW", "REPORT_READY", "CONSULTATION_SCHEDULED", "DELIVERED", "COMPLETED", "CANCELLED", "REFUNDED"].includes(order.status)) {
    redirect(`/kundli/${order.orderNo}`);
  }

  const existingKundli = order.documents.find((document) => document.type === "EXISTING_KUNDLI");
  const isMatching = order.package.deliveryMode === "MATCHMAKING";

  return (
    <div className="grid gap-6">
      <BreadcrumbHeader
        items={[{ label: "Kundli", href: "/kundli" }, { label: order.orderNo ?? "Details" }]}
        title="Complete Kundli Details"
        actions={<StatusBadge tone={statusTone(order.status)}>{statusLabel(order.status)}</StatusBadge>}
      />

      <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Step 3 of 3</p>
          <h1 className="mt-2 text-3xl font-semibold text-omd-brown">Birth details and optional document</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-omd-muted">
            These details are used by the operations team to prepare the report placeholder. For matching packages, partner details are required.
          </p>

          <form action={completeKundliDetailsAction} className="mt-6 grid gap-5">
            <input type="hidden" name="orderIdentifier" value={order.orderNo ?? order.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-omd-brown">
                Birth name
                <input name="birthName" defaultValue={order.birthName ?? order.applicantName} required className="h-11 rounded-md border border-omd-sand px-3" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-omd-brown">
                Gender
                <select name="gender" defaultValue={order.gender ?? ""} className="h-11 rounded-md border border-omd-sand px-3">
                  <option value="">Prefer not to say</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-omd-brown">
                Date of birth
                <input name="dateOfBirth" type="date" defaultValue={dateInput(order.dateOfBirth)} required className="h-11 rounded-md border border-omd-sand px-3" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-omd-brown">
                Time of birth
                <input name="timeOfBirth" type="time" defaultValue={order.timeOfBirth ?? ""} required className="h-11 rounded-md border border-omd-sand px-3" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-omd-brown md:col-span-2">
                Place of birth
                <input name="placeOfBirth" defaultValue={order.placeOfBirth ?? ""} required placeholder="City, State, Country" className="h-11 rounded-md border border-omd-sand px-3" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-omd-brown">
                Language preference
                <input name="languagePreference" defaultValue={order.languagePreference ?? ""} className="h-11 rounded-md border border-omd-sand px-3" />
              </label>
            </div>

            {isMatching ? (
              <div className="rounded-lg border border-omd-sand bg-omd-ivory/30 p-4">
                <h2 className="font-semibold text-omd-brown">Partner Details</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-omd-brown">
                    Partner name
                    <input name="partnerName" defaultValue={order.partnerName ?? ""} required className="h-11 rounded-md border border-omd-sand px-3" />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-omd-brown">
                    Partner date of birth
                    <input name="partnerDateOfBirth" type="date" defaultValue={dateInput(order.partnerDateOfBirth)} required className="h-11 rounded-md border border-omd-sand px-3" />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-omd-brown">
                    Partner time of birth
                    <input name="partnerTimeOfBirth" type="time" defaultValue={order.partnerTimeOfBirth ?? ""} required className="h-11 rounded-md border border-omd-sand px-3" />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-omd-brown">
                    Partner place of birth
                    <input name="partnerPlaceOfBirth" defaultValue={order.partnerPlaceOfBirth ?? ""} required className="h-11 rounded-md border border-omd-sand px-3" />
                  </label>
                </div>
              </div>
            ) : null}

            <div className="rounded-lg border border-omd-sand bg-white p-4">
              <h2 className="font-semibold text-omd-brown">Existing Kundli Placeholder</h2>
              <p className="mt-1 text-sm text-omd-muted">No file upload is active yet. Add a filename or URL placeholder only.</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-omd-brown">
                  Filename
                  <input name="existingKundliFilename" defaultValue={existingKundli?.filename ?? ""} className="h-11 rounded-md border border-omd-sand px-3" />
                </label>
                <label className="grid gap-2 text-sm font-medium text-omd-brown">
                  File URL placeholder
                  <input name="existingKundliUrl" defaultValue={existingKundli?.fileUrl ?? ""} className="h-11 rounded-md border border-omd-sand px-3" />
                </label>
              </div>
            </div>

            <label className="grid gap-2 text-sm font-medium text-omd-brown">
              Customer note
              <textarea name="customerNote" defaultValue={order.customerNote ?? ""} rows={4} className="rounded-md border border-omd-sand px-3 py-2" />
            </label>

            <button type="submit" className="rounded-md bg-omd-brown px-5 py-3 text-sm font-semibold text-white hover:bg-omd-saffron">
              Submit Kundli Details
            </button>
          </form>
        </Panel>

        <Panel className="h-fit lg:sticky lg:top-20">
          <h2 className="text-xl font-semibold text-omd-brown">Request Summary</h2>
          <p className="mt-4 font-semibold text-omd-brown">{order.package.name}</p>
          <p className="mt-1 text-sm text-omd-muted">{statusLabel(order.package.deliveryMode)}</p>
          <p className="mt-4 rounded-md border border-omd-sand bg-omd-ivory/30 p-3 text-sm leading-6 text-omd-muted">
            After submission, admin can assign, review, schedule consultation, upload a report URL placeholder, and mark delivered/completed.
          </p>
        </Panel>
      </section>
    </div>
  );
}
