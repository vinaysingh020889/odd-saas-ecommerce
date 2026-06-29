import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/catalog";
import { requireCurrentUser } from "@/lib/auth/session";
import { BreadcrumbHeader, Panel, PrimaryLink, SecondaryLink, StatusBadge, SummaryRow } from "@/components/ui";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { CustomerChecklistMilestones } from "@/components/customer-checklist-milestones";
import { CustomerDocumentList } from "@/components/customer-document-list";
import { getChecklistMilestones } from "@/lib/checklists";
import { getCustomerVisibleDocuments } from "@/lib/documents";

type PageProps = {
  params: Promise<{ id: string }>;
};

const journeySteps = [
  { status: "PAYMENT_PENDING", title: "Request Created", description: "Review package and confirm mock payment." },
  { status: "DETAILS_PENDING", title: "Payment Confirmed", description: "Submit birth details and optional existing Kundli." },
  { status: "SUBMITTED", title: "Details Submitted", description: "OMD operations receives the request." },
  { status: "ASSIGNED", title: "Assigned", description: "An astrologer/operator is assigned." },
  { status: "IN_REVIEW", title: "In Review", description: "Report preparation or review is underway." },
  { status: "REPORT_READY", title: "Report Ready", description: "Report placeholder is ready for delivery." },
  { status: "CONSULTATION_SCHEDULED", title: "Consultation Scheduled", description: "Consultation details are confirmed by operations." },
  { status: "DELIVERED", title: "Delivered", description: "Report or consultation output has been delivered." },
  { status: "COMPLETED", title: "Completed", description: "The Kundli lifecycle is complete." }
];

function dateText(value: Date | null) {
  return value ? value.toLocaleDateString("en-IN") : "Not provided";
}

function nextActionCopy(status: string) {
  const copy: Record<string, { label: string; description: string }> = {
    PAYMENT_PENDING: { label: "Review / Confirm Booking", description: "Your Kundli request is saved. Confirm mock payment to generate an order number." },
    DETAILS_PENDING: { label: "Complete Birth Details", description: "Payment is confirmed. Add birth details so report preparation can start." },
    SUBMITTED: { label: "Await Guru Assignment", description: "The operations team will review and assign this request." },
    ASSIGNED: { label: "Assigned for Review", description: "A team member is assigned and will move this into review." },
    IN_REVIEW: { label: "Report Being Prepared", description: "Your details are being reviewed for report preparation." },
    REPORT_READY: { label: "Report Ready", description: "A report URL or note is available below if uploaded." },
    CONSULTATION_SCHEDULED: { label: "Consultation Scheduled", description: "Consultation details are visible in the status panel." },
    DELIVERED: { label: "View Report", description: "The report or consultation output has been delivered." },
    COMPLETED: { label: "Completed", description: "The Kundli order lifecycle is complete." },
    CANCELLED: { label: "Cancelled", description: "This Kundli request has been cancelled." },
    REFUNDED: { label: "Refunded", description: "This mock/admin refund state has been recorded." }
  };

  return copy[status] ?? { label: statusLabel(status), description: "Track the latest Kundli status here." };
}

function stepState(stepIndex: number, currentIndex: number, terminalStatus: string) {
  if (["CANCELLED", "REFUNDED"].includes(terminalStatus)) return stepIndex <= currentIndex ? "stopped" : "pending";
  if (stepIndex < currentIndex) return "done";
  if (stepIndex === currentIndex) return "current";
  return "pending";
}

export default async function KundliTrackingPage({ params }: PageProps) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const order = await prisma.kundliOrder.findFirst({
    where: { userId: user.id, OR: [{ orderNo: id }, { id }] },
    include: {
      package: true,
      documents: { orderBy: { createdAt: "asc" } },
      statusHistory: { where: { customerVisible: true }, orderBy: { createdAt: "desc" } }
    }
  });

  if (!order) notFound();
  const [customerAssignments, customerDocuments, checklistMilestones] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        tenantId: order.tenantId,
        workType: "KUNDLI_ORDER",
        workId: order.id,
        customerVisibleNote: { not: null },
        status: { in: ["ASSIGNED", "IN_PROGRESS", "COMPLETED"] }
      },
      orderBy: { updatedAt: "desc" }
    }),
    getCustomerVisibleDocuments("KUNDLI_ORDER", order.id, order.tenantId),
    getChecklistMilestones(order.tenantId, "KUNDLI_ORDER", order.id)
  ]);

  const currentJourneyIndex = Math.max(
    0,
    journeySteps.findIndex((step) => step.status === order.status)
  );
  const completedStepCount = order.status === "COMPLETED" ? journeySteps.length : currentJourneyIndex;
  const pendingStepCount = Math.max(journeySteps.length - completedStepCount - (order.status === "COMPLETED" ? 0 : 1), 0);
  const nextAction = nextActionCopy(order.status);
  const primaryAction =
    order.status === "PAYMENT_PENDING" ? (
      <PrimaryLink href={`/kundli/${order.id}/review`}>Complete Mock Payment</PrimaryLink>
    ) : order.status === "DETAILS_PENDING" ? (
      <PrimaryLink href={`/kundli/${order.orderNo ?? order.id}/complete-details`}>Complete Details</PrimaryLink>
    ) : null;

  return (
    <div className="grid gap-6">
      <BreadcrumbHeader
        items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Kundli" }]}
        title={order.orderNo ?? "Kundli Request"}
        actions={
          <>
            <StatusBadge tone={statusTone(order.status)}>{statusLabel(order.status)}</StatusBadge>
            <StatusBadge tone={statusTone(order.paymentStatus)}>{statusLabel(order.paymentStatus)}</StatusBadge>
          </>
        }
      />

      <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-4">
          <Panel>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-omd-brown">Current Status</h2>
                <p className="mt-2 text-sm leading-6 text-omd-muted">Track payment, details, assignment, report preparation, consultation, delivery and completion.</p>
                <div className="mt-3 rounded-md border border-omd-sand bg-omd-ivory/30 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Next Action</p>
                  <p className="mt-1 font-semibold text-omd-brown">{nextAction.label}</p>
                  <p className="mt-1 text-sm leading-6 text-omd-muted">{nextAction.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {primaryAction}
                <SecondaryLink href="/kundli">Support</SecondaryLink>
              </div>
            </div>
          </Panel>

          <CustomerDocumentList title="Reports & Documents" documents={customerDocuments} />

          <CustomerChecklistMilestones title="Report Milestones" milestones={checklistMilestones} />

          {customerAssignments.length > 0 ? (
            <Panel>
              <h2 className="text-xl font-semibold text-omd-brown">Operations Update</h2>
              <div className="mt-4 grid gap-3">
                {customerAssignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3 text-sm text-omd-muted">
                    <p className="font-semibold text-omd-brown">{statusLabel(assignment.status)}</p>
                    <p className="mt-1">{assignment.customerVisibleNote}</p>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}

          <Panel>
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-omd-brown">Progress Steps</h2>
                <p className="mt-1 text-sm text-omd-muted">{completedStepCount} completed, {pendingStepCount} pending.</p>
              </div>
              <StatusBadge tone={statusTone(order.reportStatus)}>{statusLabel(order.reportStatus)}</StatusBadge>
            </div>
            <div className="mt-5 grid gap-3">
              {journeySteps.map((step, index) => {
                const state = stepState(index, currentJourneyIndex, order.status);
                return (
                  <div key={step.status} className={`rounded-md border p-3 ${state === "done" ? "border-green-100 bg-green-50" : state === "current" ? "border-amber-200 bg-amber-50" : "border-omd-sand bg-white"}`}>
                    <div className="flex gap-3">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${state === "done" ? "bg-omd-success text-white" : state === "current" ? "bg-omd-saffron text-white" : "bg-omd-ivory text-omd-brown"}`}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-omd-brown">{step.title}</p>
                        <p className="mt-1 text-sm text-omd-muted">{step.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-xl font-semibold text-omd-brown">Birth Details</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <SummaryRow label="Applicant" value={order.applicantName} />
              <SummaryRow label="Contact" value={order.applicantPhone} />
              <SummaryRow label="Birth name" value={order.birthName ?? "Pending"} />
              <SummaryRow label="Date of birth" value={dateText(order.dateOfBirth)} />
              <SummaryRow label="Time of birth" value={order.timeOfBirth ?? "Pending"} />
              <SummaryRow label="Place of birth" value={order.placeOfBirth ?? "Pending"} />
              <SummaryRow label="Language" value={order.languagePreference ?? "Not provided"} />
              <SummaryRow label="Assigned to" value={order.assignedTo ?? "Not assigned"} />
            </div>
          </Panel>

          {order.package.deliveryMode === "MATCHMAKING" ? (
            <Panel>
              <h2 className="text-xl font-semibold text-omd-brown">Partner Details</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <SummaryRow label="Partner" value={order.partnerName ?? "Pending"} />
                <SummaryRow label="Date of birth" value={dateText(order.partnerDateOfBirth)} />
                <SummaryRow label="Time of birth" value={order.partnerTimeOfBirth ?? "Pending"} />
                <SummaryRow label="Place of birth" value={order.partnerPlaceOfBirth ?? "Pending"} />
              </div>
            </Panel>
          ) : null}

          <Panel>
            <h2 className="text-xl font-semibold text-omd-brown">Documents</h2>
            <div className="mt-4 grid gap-3">
              {order.documents.map((document) => (
                <div key={document.id} className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-omd-brown">{statusLabel(document.type)}</p>
                    <StatusBadge tone={statusTone(document.status)}>{statusLabel(document.status)}</StatusBadge>
                  </div>
                  <p className="mt-1 text-omd-muted">{document.filename ?? "Upload placeholder pending"}</p>
                  {document.fileUrl ? <Link href={document.fileUrl} className="mt-1 inline-flex text-xs font-semibold text-omd-saffron">View placeholder URL</Link> : null}
                </div>
              ))}
              {order.documents.length === 0 ? <p className="text-sm text-omd-muted">No document placeholders have been submitted.</p> : null}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-xl font-semibold text-omd-brown">Activity History</h2>
            <div className="mt-4 grid gap-3">
              {order.statusHistory.map((history) => (
                <div key={history.id} className="rounded-md border border-omd-sand bg-white p-3 text-sm">
                  <p className="font-semibold text-omd-brown">{statusLabel(history.toStatus)}</p>
                  {history.note ? <p className="mt-1 text-omd-muted">{history.note}</p> : null}
                  <p className="mt-1 text-xs text-omd-muted">{history.createdAt.toLocaleString("en-IN")} {history.actorLabel ? `by ${history.actorLabel}` : ""}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid h-fit gap-4 lg:sticky lg:top-20">
          <Panel>
            <h2 className="text-xl font-semibold text-omd-brown">Selected Package</h2>
            <div className="mt-4 grid gap-3">
              <SummaryRow label="Package" value={order.package.name} />
              <SummaryRow label="Mode" value={statusLabel(order.package.deliveryMode)} />
              <SummaryRow label="Order number" value={order.orderNo ?? "Generated after mock payment"} />
              <SummaryRow label="Expected" value={order.package.estimatedDeliveryDays ? `${order.package.estimatedDeliveryDays} days` : "To be confirmed"} />
              <SummaryRow label="Total" value={formatMoney(order.totalAmount, order.currency)} strong />
              <SummaryRow label="Mock payment" value={order.mockPaymentReference ?? statusLabel(order.paymentStatus)} />
            </div>
          </Panel>

          <Panel>
            <h2 className="text-xl font-semibold text-omd-brown">Report and Consultation</h2>
            <div className="mt-4 grid gap-3 text-sm text-omd-muted">
              <p><strong className="text-omd-brown">Report:</strong> {statusLabel(order.reportStatus)}</p>
              {order.reportUrl ? <Link href={order.reportUrl} className="font-semibold text-omd-saffron">Open report placeholder</Link> : <p>Report URL will appear here when uploaded.</p>}
              {order.reportNote ? <p>{order.reportNote}</p> : null}
              <p><strong className="text-omd-brown">Consultation:</strong> {order.consultationDate ? order.consultationDate.toLocaleString("en-IN") : "Not scheduled"}</p>
              {order.consultationMode ? <p>{order.consultationMode}</p> : null}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}
