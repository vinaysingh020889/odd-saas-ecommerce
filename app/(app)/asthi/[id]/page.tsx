import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/catalog";
import { requireCurrentUser } from "@/lib/auth/session";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { BreadcrumbHeader, Panel, PrimaryLink, SecondaryLink, StatusBadge, SummaryRow } from "@/components/ui";
import { CustomerChecklistMilestones } from "@/components/customer-checklist-milestones";
import { CustomerDocumentList } from "@/components/customer-document-list";
import { getChecklistMilestones } from "@/lib/checklists";
import { getCustomerVisibleDocuments } from "@/lib/documents";

type PageProps = {
  params: Promise<{ id: string }>;
};

const journeySteps = [
  {
    status: "PAYMENT_PENDING",
    title: "Booking Created",
    description: "Review booking and confirm mock payment."
  },
  {
    status: "DETAILS_PENDING",
    title: "Payment Confirmed",
    description: "Complete family, deceased and document details."
  },
  {
    status: "DOCUMENTS_UNDER_REVIEW",
    title: "Documents Under Review",
    description: "OMD team checks the submitted details and placeholders."
  },
  {
    status: "DOCUMENTS_VERIFIED",
    title: "Documents Verified",
    description: "Documents are accepted for ritual scheduling."
  },
  {
    status: "RITUAL_SCHEDULED",
    title: "Ritual Scheduled",
    description: "The ritual date is confirmed by operations."
  },
  {
    status: "IN_PROGRESS",
    title: "Ritual In Progress",
    description: "The seva is being coordinated."
  },
  {
    status: "PROOF_UPLOADED",
    title: "Proof Uploaded",
    description: "Proof and completion notes are available."
  },
  {
    status: "COMPLETED",
    title: "Completed",
    description: "The application lifecycle is complete."
  }
];

function dateText(value: Date | null) {
  return value ? value.toLocaleDateString("en-IN") : "Not provided";
}

function addOns(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is { name: string; price: number } => typeof item === "object" && item !== null && "name" in item) : [];
}

function stepState(stepIndex: number, currentIndex: number, terminalStatus: string) {
  if (["CANCELLED", "REFUNDED"].includes(terminalStatus)) return stepIndex <= currentIndex ? "stopped" : "pending";
  if (stepIndex < currentIndex) return "done";
  if (stepIndex === currentIndex) return "current";
  return "pending";
}

function nextActionCopy(status: string) {
  const copy: Record<string, { label: string; description: string }> = {
    PAYMENT_PENDING: {
      label: "Review / Confirm Booking",
      description: "Your booking is saved. Confirm the mock payment to generate the application number."
    },
    DETAILS_PENDING: {
      label: "Complete Details",
      description: "Payment is confirmed. Add family, deceased, and document placeholder details."
    },
    DOCUMENTS_UNDER_REVIEW: {
      label: "Await Verification",
      description: "The OMD team is reviewing your submitted details and document placeholders."
    },
    DOCUMENTS_VERIFIED: {
      label: "Await Scheduling",
      description: "Documents are verified. Operations will schedule the ritual."
    },
    RITUAL_SCHEDULED: {
      label: "View Schedule",
      description: "The ritual has been scheduled. Watch this page for progress updates."
    },
    IN_PROGRESS: {
      label: "Ritual In Progress",
      description: "The seva is currently being coordinated by operations."
    },
    PROOF_UPLOADED: {
      label: "View Proof",
      description: "Proof and completion notes are available below."
    },
    COMPLETED: {
      label: "Completed",
      description: "The Asthi application lifecycle is complete."
    },
    CANCELLED: {
      label: "Cancelled",
      description: "This application has been cancelled."
    },
    REFUNDED: {
      label: "Refunded",
      description: "This mock/admin refund state has been recorded."
    }
  };

  return copy[status] ?? { label: statusLabel(status), description: "Track the latest status and timeline updates here." };
}

export default async function AsthiTrackingPage({ params }: PageProps) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const application = await prisma.asthiApplication.findFirst({
    where: {
      userId: user.id,
      OR: [{ applicationNo: id }, { id }]
    },
    include: {
      location: true,
      package: true,
      documents: { orderBy: { createdAt: "asc" } },
      statusHistory: { where: { customerVisible: true }, orderBy: { createdAt: "desc" } },
      activities: { where: { customerVisible: true }, orderBy: { createdAt: "desc" } }
    }
  });

  if (!application) notFound();
  const [customerAssignments, customerDocuments, checklistMilestones] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        tenantId: application.tenantId,
        workType: "ASTHI_APPLICATION",
        workId: application.id,
        customerVisibleNote: { not: null },
        status: { in: ["ASSIGNED", "IN_PROGRESS", "COMPLETED"] }
      },
      orderBy: { updatedAt: "desc" }
    }),
    getCustomerVisibleDocuments("ASTHI_APPLICATION", application.id, application.tenantId),
    getChecklistMilestones(application.tenantId, "ASTHI_APPLICATION", application.id)
  ]);

  const selectedAddOns = addOns(application.selectedAddOnsJson);
  const canUpdateDetails = !["DOCUMENTS_VERIFIED", "RITUAL_SCHEDULED", "IN_PROGRESS", "PROOF_UPLOADED", "COMPLETED", "CANCELLED", "REFUNDED"].includes(application.status);
  const documentsNeedAction = application.documents.some((document) => ["PENDING_UPLOAD", "REJECTED"].includes(document.status));
  const currentJourneyIndex = Math.max(
    0,
    journeySteps.findIndex((step) => step.status === application.status)
  );
  const completedStepCount = ["CANCELLED", "REFUNDED"].includes(application.status)
    ? currentJourneyIndex
    : application.status === "COMPLETED"
      ? journeySteps.length
      : currentJourneyIndex;
  const pendingStepCount = Math.max(journeySteps.length - completedStepCount - (application.status === "COMPLETED" ? 0 : 1), 0);
  const nextAction = nextActionCopy(application.status);
  const primaryAction =
    application.status === "PAYMENT_PENDING" ? (
      <PrimaryLink href={`/asthi/${application.id}/review`}>Complete Mock Payment</PrimaryLink>
    ) : application.status === "DETAILS_PENDING" ? (
      <PrimaryLink href={`/asthi/${application.applicationNo ?? application.id}/complete-details`}>Complete Details</PrimaryLink>
    ) : canUpdateDetails && documentsNeedAction ? (
      <PrimaryLink href={`/asthi/${application.applicationNo ?? application.id}/complete-details`}>Update Documents</PrimaryLink>
    ) : null;

  return (
    <div className="grid gap-6">
      <BreadcrumbHeader
        items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Asthi Application" }]}
        title={application.applicationNo ?? "Asthi Booking"}
        actions={
          <>
            <StatusBadge tone={statusTone(application.status)}>{statusLabel(application.status)}</StatusBadge>
            <StatusBadge tone={statusTone(application.paymentStatus)}>{statusLabel(application.paymentStatus)}</StatusBadge>
          </>
        }
      />

      <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-4">
          <Panel>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-omd-brown">Current Status</h2>
                <p className="mt-2 text-sm leading-6 text-omd-muted">
                  Track mock payment, document review, ritual scheduling, proof upload and completion from one place.
                </p>
                <div className="mt-3 rounded-md border border-omd-sand bg-omd-ivory/30 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Next Action</p>
                  <p className="mt-1 font-semibold text-omd-brown">{nextAction.label}</p>
                  <p className="mt-1 text-sm leading-6 text-omd-muted">{nextAction.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {primaryAction}
                <SecondaryLink href="/services/asthi-visarjan">Support</SecondaryLink>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Application</p>
                <p className="mt-1 font-semibold text-omd-brown">{statusLabel(application.status)}</p>
              </div>
              <div className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Documents</p>
                <p className="mt-1 font-semibold text-omd-brown">{statusLabel(application.documentStatus)}</p>
              </div>
              <div className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Proof</p>
                <p className="mt-1 font-semibold text-omd-brown">{statusLabel(application.proofStatus)}</p>
              </div>
            </div>
          </Panel>

          <CustomerDocumentList title="Proofs, Certificates & Requested Documents" documents={customerDocuments} />

          <CustomerChecklistMilestones title="Seva Milestones" milestones={checklistMilestones} />

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
            <h2 className="text-xl font-semibold text-omd-brown">Family Details</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <SummaryRow label="Deceased" value={application.deceasedName ?? "Pending"} />
              <SummaryRow label="Relation" value={application.relation ?? application.relationToDeceased ?? "Pending"} />
              <SummaryRow label="Date of death" value={dateText(application.dateOfDeath)} />
              <SummaryRow label="Gotra" value={application.gotra ?? "Not provided"} />
              <SummaryRow label="Preferred date" value={dateText(application.preferredDate)} />
              <SummaryRow label="Scheduled date" value={dateText(application.scheduledDate)} />
            </div>
            {application.specialInstructions ? <p className="mt-4 rounded-md border border-omd-sand bg-omd-ivory/30 p-3 text-sm leading-6 text-omd-muted">{application.specialInstructions}</p> : null}
          </Panel>

          <Panel>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-omd-brown">Documents</h2>
                {documentsNeedAction ? <p className="mt-1 text-sm text-omd-muted">Some required document placeholders still need filename or URL details.</p> : null}
              </div>
              {canUpdateDetails ? <SecondaryLink href={`/asthi/${application.applicationNo ?? application.id}/complete-details`}>Edit Details & Documents</SecondaryLink> : null}
            </div>
            <div className="mt-4 grid gap-3">
              {application.documents.map((document) => (
                <div key={document.id} className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-omd-brown">{statusLabel(document.type)}</p>
                    <StatusBadge tone={statusTone(document.status)}>{statusLabel(document.status)}</StatusBadge>
                  </div>
                  <p className="mt-1 text-omd-muted">{document.filename ?? document.fileName ?? "Upload pending"}</p>
                  {document.fileUrl ? <Link href={document.fileUrl} className="mt-1 inline-flex text-xs font-semibold text-omd-saffron">View placeholder URL</Link> : null}
                </div>
              ))}
              {application.documents.length === 0 ? <p className="text-sm text-omd-muted">Document placeholders will appear after details are submitted.</p> : null}
            </div>
          </Panel>

          <Panel>
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-omd-brown">Activity History</h2>
                <p className="mt-1 text-sm text-omd-muted">Detailed log of actions and status updates.</p>
              </div>
              <StatusBadge tone={statusTone(application.status)}>{statusLabel(application.status)}</StatusBadge>
            </div>
            <div className="mt-4 grid gap-3">
              {application.statusHistory.map((history) => (
                <div key={history.id} className="rounded-md border border-omd-sand bg-white p-3 text-sm">
                  <p className="font-semibold text-omd-brown">{statusLabel(history.toStatus)}</p>
                  {history.note ? <p className="mt-1 text-omd-muted">{history.note}</p> : null}
                  <p className="mt-1 text-xs text-omd-muted">{history.createdAt.toLocaleString("en-IN")} {history.actorLabel ? `by ${history.actorLabel}` : ""}</p>
                </div>
              ))}
              {application.statusHistory.length === 0 ? <p className="text-sm text-omd-muted">Timeline starts after application submission.</p> : null}
            </div>
          </Panel>

          {application.proofUrl || application.proofNote || application.certificateNote || application.prasadDispatchNote ? (
            <Panel>
              <h2 className="text-xl font-semibold text-omd-brown">Proof and Completion Notes</h2>
              <div className="mt-4 grid gap-3 text-sm text-omd-muted">
                {application.proofUrl ? <SummaryRow label="Proof URL" value={<Link href={application.proofUrl} className="text-omd-saffron">Open proof</Link>} /> : null}
                {application.proofNote ? <p>{application.proofNote}</p> : null}
                {application.certificateNote ? <p><strong className="text-omd-brown">Certificate:</strong> {application.certificateNote}</p> : null}
                {application.prasadDispatchNote ? <p><strong className="text-omd-brown">Prasad:</strong> {application.prasadDispatchNote}</p> : null}
              </div>
            </Panel>
          ) : null}
        </div>

        <aside className="grid h-fit gap-4 lg:sticky lg:top-20">
          <Panel>
            <h2 className="text-xl font-semibold text-omd-brown">Selected Seva</h2>
            <p className="mt-3 font-semibold text-omd-brown">{application.package?.name ?? "Asthi Visarjan Seva"}</p>
            <p className="mt-1 text-sm text-omd-muted">{application.location ? `${application.location.name}, ${application.location.city}` : application.preferredLocation}</p>
            <div className="mt-4 grid gap-3 border-t border-omd-sand pt-4">
              {selectedAddOns.map((addOn) => (
                <SummaryRow key={addOn.name} label={addOn.name} value={formatMoney(addOn.price, application.currency)} />
              ))}
              <SummaryRow label="Total" value={formatMoney(application.totalAmount, application.currency)} strong />
              <SummaryRow label="Mock payment" value={application.mockPaymentReference ?? statusLabel(application.paymentStatus)} />
            </div>
          </Panel>

          <Panel>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-omd-brown">Seva Progress</h2>
                <p className="mt-1 text-sm text-omd-muted">{completedStepCount} done · {pendingStepCount} pending</p>
              </div>
              <StatusBadge tone={statusTone(application.status)}>{statusLabel(application.status)}</StatusBadge>
            </div>
            <div className="mt-5 grid gap-0">
              {journeySteps.map((step, index) => {
                const state = stepState(index, currentJourneyIndex, application.status);
                const isLast = index === journeySteps.length - 1;
                const markerClass =
                  state === "done"
                    ? "border-omd-success bg-omd-success text-white"
                    : state === "current"
                      ? "border-omd-saffron bg-omd-saffron text-white"
                      : state === "stopped"
                        ? "border-omd-error bg-omd-error text-white"
                        : "border-omd-sand bg-white text-omd-muted";
                const lineClass = state === "done" ? "bg-omd-success" : state === "current" ? "bg-omd-saffron/40" : "bg-omd-sand";

                return (
                  <div key={step.status} className="grid grid-cols-[28px_1fr] gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${markerClass}`}>
                        {state === "done" ? "✓" : index + 1}
                      </span>
                      {!isLast ? <span className={`h-full min-h-10 w-px ${lineClass}`} /> : null}
                    </div>
                    <div className={`pb-5 ${state === "pending" ? "opacity-60" : ""}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-omd-brown">{step.title}</p>
                        {state === "current" ? <StatusBadge tone="warning">Next</StatusBadge> : null}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-omd-muted">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {primaryAction ? <div className="mt-1">{primaryAction}</div> : null}
          </Panel>
        </aside>
      </section>
    </div>
  );
}
