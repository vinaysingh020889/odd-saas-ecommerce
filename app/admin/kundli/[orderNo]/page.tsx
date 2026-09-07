import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { requireAdminRole } from "@/lib/admin-auth";
import { updateKundliAdminAction } from "@/lib/kundli-actions";
import { evaluateMembershipForScope } from "@/lib/membership";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, PageHeader, StatusBadge, SummaryRow } from "@/components/ui";
import { AdminChecklistPanel } from "@/components/admin-checklist-panel";
import { AdminDocumentPanel } from "@/components/admin-document-panel";
import { getDocumentsForOwner } from "@/lib/documents";
import { getOrCreateChecklistForOwner, syncKundliChecklistFromAuthoritativeState } from "@/lib/checklists";
import { getKundliAssignmentCandidateEvaluation, getKundliDeliveryRisk, getKundliPractitionerQueue } from "@/lib/kundli-assignment-engine";
import { recalculateKundliDeliveryPromiseAction, reassignKundliOrderAction, retryKundliAutomaticAssignmentAction } from "@/lib/kundli-assignment-actions";
import { deliverKundliReportAction, returnKundliReportForCorrectionAction } from "@/lib/kundli-report-review";
import { KUNDLI_REPORT_MIME_TYPE, kundliReportVersionFromStorageKey } from "@/lib/kundli-report-storage";

type PageProps = {
  params: Promise<{ orderNo: string }>;
};

const statuses = [
  "PAYMENT_PENDING",
  "DETAILS_PENDING",
  "SUBMITTED",
  "ASSIGNED",
  "IN_REVIEW",
  "REPORT_READY",
  "CONSULTATION_SCHEDULED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED"
];

function isSecureKundliReport(report: { fileUrl: string | null; storageKey: string | null; mimeType: string | null }) {
  return report.fileUrl === null && Boolean(report.storageKey) && report.mimeType === KUNDLI_REPORT_MIME_TYPE;
}

const allowedAdminTransitions: Record<string, string[]> = {
  DRAFT: ["PAYMENT_PENDING", "CANCELLED"],
  PAYMENT_PENDING: ["PAYMENT_PENDING", "DETAILS_PENDING", "CANCELLED"],
  DETAILS_PENDING: ["DETAILS_PENDING", "SUBMITTED", "CANCELLED"],
  SUBMITTED: ["SUBMITTED", "ASSIGNED", "IN_REVIEW", "CANCELLED"],
  ASSIGNED: ["ASSIGNED", "IN_REVIEW", "CONSULTATION_SCHEDULED", "CANCELLED"],
  IN_REVIEW: ["IN_REVIEW", "REPORT_READY", "CONSULTATION_SCHEDULED", "CANCELLED"],
  REPORT_READY: ["REPORT_READY", "DELIVERED"],
  CONSULTATION_SCHEDULED: ["CONSULTATION_SCHEDULED", "REPORT_READY", "DELIVERED", "CANCELLED"],
  DELIVERED: ["DELIVERED", "COMPLETED"],
  COMPLETED: ["COMPLETED"],
  CANCELLED: ["CANCELLED", "REFUNDED"],
  REFUNDED: ["REFUNDED"]
};

function dateInput(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function AdminKundliDetailPage({ params }: PageProps) {
  await requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN"]);
  const tenantId = await getOmdTenantId();
  const { orderNo } = await params;
  const order = await prisma.kundliOrder.findFirst({
    where: { tenantId, OR: [{ orderNo }, { id: orderNo }] },
    include: {
      user: { select: { name: true, email: true } },
      package: true,
      documents: { orderBy: { createdAt: "asc" } },
      statusHistory: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!order) notFound();
  const [assignments, users, operationalDocuments, initialChecklist, candidateEvaluation] = await Promise.all([
    prisma.assignment.findMany({
      where: { tenantId, workType: "KUNDLI_ORDER", workId: order.id },
      include: { assignedUser: { select: { name: true, email: true, kundliPractitionerProfile: { select: { displayName: true } } } }, createdBy: { select: { name: true, email: true } }, updatedBy: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.user.findMany({
      where: { tenantId, status: "ACTIVE" },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      take: 100
    }),
    getDocumentsForOwner("KUNDLI_ORDER", order.id, tenantId),
    getOrCreateChecklistForOwner({ tenantId, relatedType: "KUNDLI_ORDER", relatedId: order.id }),
    getKundliAssignmentCandidateEvaluation({ tenantId, packageId: order.packageId, excludeOrderId: order.id })
  ]);
  await syncKundliChecklistFromAuthoritativeState(tenantId, order.id);
  const checklist = initialChecklist ? await getOrCreateChecklistForOwner({ tenantId, relatedType: "KUNDLI_ORDER", relatedId: order.id }) : initialChecklist;

  const candidates = candidateEvaluation.candidates;
  const queuePreviews = new Map((await Promise.all(candidates.map(async (candidate) => [candidate.id, await getKundliPractitionerQueue({ tenantId, practitionerUserId: candidate.userId })] as const))));
  const currentAssignment = assignments.find((item) => item.isPrimary && !item.endedAt && !["COMPLETED", "CANCELLED"].includes(item.status)) ?? null;
  const assignableCandidates = candidates.filter((item) => !item.unavailable && item.capacityValid);
  const deliveryRisk = order.promisedDeliveryAt ? getKundliDeliveryRisk(order.promisedDeliveryAt) : null;
  const internalReports = operationalDocuments.filter((document) => document.documentType === "KUNDLI_REPORT");

  const membershipPreview = await evaluateMembershipForScope(order.userId, "KUNDLI", { relatedType: "KUNDLI", relatedId: order.id });
  const availableStatuses = statuses.filter((status) => status !== "DELIVERED" && allowedAdminTransitions[order.status]?.includes(status));

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Kundli Operations"
        title={order.orderNo ?? "Draft Kundli Request"}
        description="Manage intake review, astrologer assignment, report upload placeholder, consultation scheduling, and customer-visible updates."
        tone="admin"
        actions={<Link href="/admin/kundli" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">Back to queue</Link>}
      />

      <section className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
        <div className="grid min-w-0 gap-5">
          <AdminPanel>
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={statusTone(order.status)}>{statusLabel(order.status)}</StatusBadge>
              <StatusBadge tone={statusTone(order.paymentStatus)}>{statusLabel(order.paymentStatus)}</StatusBadge>
              <StatusBadge tone={statusTone(order.reportStatus)}>{statusLabel(order.reportStatus)}</StatusBadge>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <SummaryRow label="Applicant" value={order.applicantName} />
              <SummaryRow label="Phone" value={order.applicantPhone} />
              <SummaryRow label="Email" value={order.applicantEmail} />
              <SummaryRow label="Customer" value={order.user?.email ?? "No user linked"} />
              <SummaryRow label="Mock payment" value={order.mockPaymentReference ?? statusLabel(order.paymentStatus)} />
              <SummaryRow label="Total" value={formatMoney(order.totalAmount, order.currency)} strong />
            </div>
          </AdminPanel>

          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Package and Intake</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <SummaryRow label="Package" value={order.package.name} />
              <SummaryRow label="Mode" value={statusLabel(order.package.deliveryMode)} />
              <SummaryRow label="Estimated delivery" value={order.package.estimatedDeliveryDays ? `${order.package.estimatedDeliveryDays} days` : "Not set"} />
              <SummaryRow label="Language" value={order.languagePreference ?? "Not provided"} />
            </div>
            {order.questionOrConcern ? <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">{order.questionOrConcern}</p> : null}
          </AdminPanel>

          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Membership Preview</h2>
            {membershipPreview.hasActiveMembership ? (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                <p className="font-semibold text-slate-950">{membershipPreview.plan?.name ?? "Active membership"}</p>
                <p className="mt-1">
                  Kundli benefits are visible for this customer. Membership benefit application will be enabled in a later benefit-consumption pass; no benefit usage is consumed here.
                </p>
                <ul className="mt-2 grid gap-1">
                  {membershipPreview.applicableBenefits.slice(0, 3).map((benefit) => (
                    <li key={benefit.id}>- {benefit.title}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600">No active Kundli membership benefit applies to this customer.</p>
            )}
          </AdminPanel>

          <AdminPanel>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">Guruji Assignment</h2><p className="mt-1 text-sm text-slate-600">{candidateEvaluation.restrictToSelectedPractitioners ? "This package is restricted to explicitly selected Guruji." : "All active Guruji are eligible for this package."} Availability and capacity are always enforced.</p></div><StatusBadge tone={currentAssignment ? "success" : "warning"}>{currentAssignment ? "Primary assignment active" : "Unassigned"}</StatusBadge></div>
            {currentAssignment ? <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-4"><p className="font-semibold text-slate-950">{currentAssignment.assignedUser?.kundliPractitionerProfile?.displayName ?? currentAssignment.assignmentLabel ?? "Assigned Guruji"}</p><div className="mt-2 flex flex-wrap gap-2"><StatusBadge tone="ops">{statusLabel(currentAssignment.source)}</StatusBadge><StatusBadge tone={statusTone(currentAssignment.priority)}>{statusLabel(currentAssignment.priority)}</StatusBadge></div><p className="mt-2 text-sm text-slate-600">{currentAssignment.assignmentReason ?? "No assignment reason recorded."}</p></div> : null}
            {assignableCandidates.length === 0 ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">{candidateEvaluation.blockingReason ?? "No assignable Guruji."}</p> : <form action={reassignKundliOrderAction} className="mt-4 grid gap-3"><input type="hidden" name="orderId" value={order.id}/><label className="grid gap-2 text-sm font-medium text-slate-700">Eligible Guruji<select name="practitionerProfileId" required className="h-10 rounded-md border border-slate-300 px-3"><option value="">Select Guruji</option>{assignableCandidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.displayName} · active {candidate.capacity.active} · D/W/M {candidate.capacity.daily}/{candidate.capacity.weekly}/{candidate.capacity.monthly}</option>)}</select></label><label className="grid gap-2 text-sm font-medium text-slate-700">Assignment / reassignment reason<textarea name="reason" required rows={3} className="rounded-md border border-slate-300 px-3 py-2" placeholder="Required operational reason"/></label><button className="w-fit rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white">{currentAssignment ? "Reassign Guruji" : "Assign Guruji"}</button></form>}
            {order.assignmentState === "AWAITING_ASSIGNMENT" && !currentAssignment ? <form action={retryKundliAutomaticAssignmentAction} className="mt-3"><input type="hidden" name="orderId" value={order.id}/><button className="rounded-md bg-omd-ops px-4 py-2 text-sm font-semibold text-white">Retry automatic assignment</button></form> : null}
            <div className="mt-5 grid gap-3 md:grid-cols-2">{candidates.map((candidate) => { const preview = queuePreviews.get(candidate.id) ?? []; return <div key={candidate.id} className={`rounded-md border p-3 ${candidate.unavailable || !candidate.capacityValid ? "border-red-200 bg-red-50" : "border-slate-200"}`}><div className="flex justify-between gap-2"><p className="font-semibold text-slate-950">{candidate.displayName}</p><StatusBadge tone={candidate.unavailable || !candidate.capacityValid ? "error" : "success"}>{candidate.unavailable ? "Unavailable" : candidate.capacityValid ? "Capacity available" : "Full"}</StatusBadge></div><p className="mt-1 text-xs text-slate-600">Workload {candidate.capacity.active}; limits {candidate.dailyActiveOrderLimit}/{candidate.weeklyActiveOrderLimit}/{candidate.monthlyActiveOrderLimit}</p><p className="mt-2 text-xs font-semibold uppercase text-slate-500">Queue preview</p>{preview.slice(0, 3).map((item, index) => <p key={item.id} className="mt-1 text-xs text-slate-600">{index + 1}. {statusLabel(item.priority)} · {item.workId}</p>)}{preview.length === 0 ? <p className="mt-1 text-xs text-slate-500">No active work.</p> : null}</div>; })}</div>
          </AdminPanel>

          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Assignment and Promise History</h2><div className="mt-4 grid gap-3">{assignments.map((assignment) => <div key={assignment.id} className="rounded-md border border-slate-200 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-slate-950">{assignment.assignedUser?.kundliPractitionerProfile?.displayName ?? assignment.assignmentLabel ?? "Unlinked assignment"}</p><div className="flex gap-2"><StatusBadge tone="ops">{statusLabel(assignment.source)}</StatusBadge><StatusBadge tone={assignment.endedAt ? "neutral" : "success"}>{assignment.endedAt ? "Historical" : "Current"}</StatusBadge></div></div><p className="mt-1 text-slate-600">Assigned {assignment.createdAt.toLocaleString("en-IN")} by {assignment.createdBy.name ?? assignment.createdBy.email ?? "System"}</p><p className="mt-1 text-slate-600">Reason: {assignment.assignmentReason ?? "Not recorded"}</p>{assignment.endedAt ? <p className="mt-1 text-slate-600">Ended {assignment.endedAt.toLocaleString("en-IN")}: {assignment.endedReason ?? "No closure reason"}</p> : null}</div>)}{assignments.length === 0 ? <p className="text-sm text-slate-600">No assignment history yet.</p> : null}<div className="rounded-md bg-slate-50 p-3 text-sm"><p><strong>Current promise:</strong> {order.promisedDeliveryAt ? order.promisedDeliveryAt.toLocaleString("en-IN") : "Not set"}</p>{deliveryRisk ? <StatusBadge tone={deliveryRisk === "OVERDUE" ? "error" : deliveryRisk === "DUE_SOON" ? "warning" : "success"}>{statusLabel(deliveryRisk)}</StatusBadge> : null}{order.deliveryPromiseChangedReason ? <p className="mt-1 text-slate-600">Last change reason: {order.deliveryPromiseChangedReason}</p> : null}</div></div>
            {currentAssignment ? <form action={recalculateKundliDeliveryPromiseAction} className="mt-4 grid gap-3"><input type="hidden" name="orderId" value={order.id}/><label className="grid gap-2 text-sm font-medium text-slate-700">Promise recalculation reason<textarea name="reason" required rows={2} className="rounded-md border border-slate-300 px-3 py-2"/></label><button className="w-fit rounded-md border border-slate-400 px-4 py-2 text-sm font-semibold">Recalculate delivery promise</button></form> : null}
          </AdminPanel>

          <AdminPanel>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-lg font-semibold text-slate-950">Kundli Report Review</h2><p className="mt-1 text-sm text-slate-600">Guruji reports remain internal until an operations admin approves and delivers one.</p></div>
              <StatusBadge tone={order.status === "REPORT_READY" ? "warning" : order.status === "DELIVERED" ? "success" : "neutral"}>{order.status === "REPORT_READY" ? "Awaiting report review" : order.status === "DELIVERED" ? "Report delivered" : statusLabel(order.reportStatus)}</StatusBadge>
            </div>
            <div className="mt-4 grid gap-3">
              {internalReports.map((report) => <div key={report.id} className="rounded-md border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-slate-950">{report.title}</p><p className="mt-1 text-xs text-slate-500">Prepared by {report.uploadedBy?.name ?? report.uploadedBy?.email ?? "Guruji"} · {report.createdAt.toLocaleString("en-IN")}</p></div><div className="flex gap-2"><StatusBadge tone={statusTone(report.status)}>{statusLabel(report.status)}</StatusBadge><StatusBadge tone={report.visibility === "CUSTOMER_VISIBLE" ? "success" : "neutral"}>{statusLabel(report.visibility)}</StatusBadge></div></div>
                {isSecureKundliReport(report) ? <div className="mt-3 text-sm"><p className="text-slate-600">Version {kundliReportVersionFromStorageKey(report.storageKey) ?? "unknown"} · {report.fileName ?? "kundli-report.pdf"} · {report.fileSize ? Math.ceil(report.fileSize / 1024) + " KB" : "size unavailable"}</p><Link href={`/admin/kundli/reports/${report.id}/download`} className="mt-1 inline-flex font-semibold text-omd-ops">Open private report</Link></div> : report.fileUrl ? <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Legacy external report — retained for history and not eligible for secure delivery.</p> : <p className="mt-3 text-sm text-red-700">No private report file attached.</p>}
                {report.description ? <p className="mt-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600"><strong>Guruji report note:</strong> {report.description}</p> : null}
                {report.rejectionReason ? <p className="mt-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><strong>Correction requested:</strong> {report.rejectionReason}</p> : null}
                {order.status === "REPORT_READY" && report.status === "UPLOADED" && report.visibility === "INTERNAL_ONLY" && isSecureKundliReport(report) ? <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 lg:grid-cols-2">
                  <form action={deliverKundliReportAction} className="grid gap-3 rounded-md border border-green-200 bg-green-50 p-3"><input type="hidden" name="orderId" value={order.id}/><input type="hidden" name="documentId" value={report.id}/><label className="grid gap-2 text-sm font-medium">Customer-visible delivery note<textarea name="deliveryNote" rows={3} className="rounded-md border border-slate-300 px-3 py-2" placeholder="Optional note shown in the customer timeline"/></label><button className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white">Approve and deliver report</button></form>
                  <form action={returnKundliReportForCorrectionAction} className="grid gap-3 rounded-md border border-amber-200 bg-amber-50 p-3"><input type="hidden" name="orderId" value={order.id}/><input type="hidden" name="documentId" value={report.id}/><label className="grid gap-2 text-sm font-medium">Internal correction reason<textarea name="reason" required rows={3} className="rounded-md border border-slate-300 px-3 py-2" placeholder="Required; visible internally to the assigned Guruji"/></label><button className="rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white">Return to Guruji for correction</button></form>
                </div> : null}
              </div>)}
              {internalReports.length === 0 ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">No internal KUNDLI_REPORT exists. Delivery is blocked until the assigned Guruji attaches a report.</p> : null}
            </div>
            <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600"><p><strong>Promised delivery:</strong> {order.promisedDeliveryAt ? order.promisedDeliveryAt.toLocaleString("en-IN") : "Not set"}</p>{currentAssignment?.internalNote ? <p className="mt-1"><strong>Current Guruji work note:</strong> {currentAssignment.internalNote}</p> : null}</div>
          </AdminPanel>

          <AdminChecklistPanel checklist={checklist} users={users} redirectTo={`/admin/kundli/${order.orderNo ?? order.id}`} />

          <AdminDocumentPanel
            title="Kundli Uploads / Reports"
            ownerType="KUNDLI_ORDER"
            ownerId={order.id}
            redirectTo={`/admin/kundli/${order.orderNo ?? order.id}`}
            documents={operationalDocuments.filter((document) => document.documentType !== "KUNDLI_REPORT")}
          />

          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Birth Details</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <SummaryRow label="Birth name" value={order.birthName ?? "Pending"} />
              <SummaryRow label="Gender" value={order.gender ?? "Not provided"} />
              <SummaryRow label="Date of birth" value={order.dateOfBirth ? order.dateOfBirth.toLocaleDateString("en-IN") : "Pending"} />
              <SummaryRow label="Time of birth" value={order.timeOfBirth ?? "Pending"} />
              <SummaryRow label="Place of birth" value={order.placeOfBirth ?? "Pending"} />
            </div>
          </AdminPanel>

          {order.package.deliveryMode === "MATCHMAKING" ? (
            <AdminPanel>
              <h2 className="text-lg font-semibold text-slate-950">Partner Details</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <SummaryRow label="Partner" value={order.partnerName ?? "Pending"} />
                <SummaryRow label="Date of birth" value={order.partnerDateOfBirth ? order.partnerDateOfBirth.toLocaleDateString("en-IN") : "Pending"} />
                <SummaryRow label="Time of birth" value={order.partnerTimeOfBirth ?? "Pending"} />
                <SummaryRow label="Place of birth" value={order.partnerPlaceOfBirth ?? "Pending"} />
              </div>
            </AdminPanel>
          ) : null}

          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Documents</h2>
            <div className="mt-4 grid gap-3">
              {order.documents.map((document) => (
                <div key={document.id} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{statusLabel(document.type)}</p>
                    <StatusBadge tone={statusTone(document.status)}>{statusLabel(document.status)}</StatusBadge>
                  </div>
                  <p className="mt-1 text-slate-600">{document.filename ?? "Upload placeholder pending"}</p>
                  {document.fileUrl ? <Link href={document.fileUrl} className="mt-1 inline-flex text-xs font-semibold text-omd-ops">Open placeholder URL</Link> : null}
                  {document.adminNote ? <p className="mt-2 text-xs text-slate-500">{document.adminNote}</p> : null}
                </div>
              ))}
              {order.documents.length === 0 ? <p className="text-sm text-slate-600">No Kundli document placeholders submitted yet.</p> : null}
            </div>
          </AdminPanel>

          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Timeline</h2>
            <div className="mt-4 grid gap-3">
              {order.statusHistory.map((history) => (
                <div key={history.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                  <p className="font-semibold text-slate-950">{statusLabel(history.toStatus)}</p>
                  {history.note ? <p className="mt-1 text-slate-600">{history.note}</p> : null}
                  <p className="mt-1 text-xs text-slate-500">{history.createdAt.toLocaleString("en-IN")} {history.actorLabel ? `by ${history.actorLabel}` : ""}</p>
                </div>
              ))}
              {order.statusHistory.length === 0 ? <p className="text-sm text-slate-600">No timeline events yet.</p> : null}
            </div>
          </AdminPanel>
        </div>

        <AdminPanel className="min-w-0 h-fit 2xl:sticky 2xl:top-20">
          <h2 className="text-lg font-semibold text-slate-950">Admin Action</h2>
          <form action={updateKundliAdminAction} className="mt-4 grid gap-4">
            <input type="hidden" name="orderId" value={order.id} />
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Status
              <select name="status" defaultValue={order.status} className="h-10 min-w-0 w-full rounded-md border border-slate-300 px-3">
                {availableStatuses.map((status) => (
                  <option key={status} value={status}>{statusLabel(status)}</option>
                ))}
              </select>
              <span className="text-xs font-normal leading-5 text-slate-500">Only valid next states are shown.</span>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Consultation date
              <input name="consultationDate" type="date" defaultValue={dateInput(order.consultationDate)} className="h-10 min-w-0 w-full rounded-md border border-slate-300 px-3" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Consultation mode
              <input name="consultationMode" defaultValue={order.consultationMode ?? ""} placeholder="Phone, video, in-person placeholder" className="h-10 min-w-0 w-full rounded-md border border-slate-300 px-3" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Report note
              <textarea name="reportNote" defaultValue={order.reportNote ?? ""} rows={3} className="min-w-0 w-full rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Customer note
              <textarea name="customerNote" defaultValue={order.customerNote ?? ""} rows={3} className="min-w-0 w-full rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Internal note
              <textarea name="internalNote" defaultValue={order.internalNote ?? ""} rows={3} className="min-w-0 w-full rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Timeline note
              <textarea name="note" rows={3} className="min-w-0 w-full rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="flex gap-2 text-sm text-slate-600">
              <input name="customerVisible" type="checkbox" defaultChecked />
              Show this timeline note to customer
            </label>
            <button type="submit" className="rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-omd-ops">
              Save Kundli Update
            </button>
          </form>
        </AdminPanel>
      </section>
    </div>
  );
}
