import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { requireAdminRole } from "@/lib/admin-auth";
import { updateKundliAdminAction } from "@/lib/kundli-actions";
import { evaluateMembershipForScope } from "@/lib/membership";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, PageHeader, StatusBadge, SummaryRow } from "@/components/ui";
import { AdminAssignmentPanel } from "@/components/admin-assignment-panel";
import { AdminChecklistPanel } from "@/components/admin-checklist-panel";
import { AdminDocumentPanel } from "@/components/admin-document-panel";
import { getDocumentsForOwner } from "@/lib/documents";
import { getOrCreateChecklistForOwner } from "@/lib/checklists";

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
  const [assignments, users, operationalDocuments, checklist] = await Promise.all([
    prisma.assignment.findMany({
      where: { tenantId, workType: "KUNDLI_ORDER", workId: order.id },
      include: { assignedUser: { select: { name: true, email: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    }),
    prisma.user.findMany({
      where: { tenantId, status: "ACTIVE" },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      take: 100
    }),
    getDocumentsForOwner("KUNDLI_ORDER", order.id, tenantId),
    getOrCreateChecklistForOwner({ tenantId, relatedType: "KUNDLI_ORDER", relatedId: order.id })
  ]);

  const membershipPreview = await evaluateMembershipForScope(order.userId, "KUNDLI", { relatedType: "KUNDLI", relatedId: order.id });
  const availableStatuses = statuses.filter((status) => allowedAdminTransitions[order.status]?.includes(status));

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Kundli Operations"
        title={order.orderNo ?? "Draft Kundli Request"}
        description="Manage intake review, astrologer assignment, report upload placeholder, consultation scheduling, and customer-visible updates."
        tone="admin"
        actions={<Link href="/admin/kundli" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">Back to queue</Link>}
      />

      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-5">
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

          <AdminAssignmentPanel
            title="Astrologer / Guru Assignment"
            helper="Assign report reviewer, astrologer placeholder, or internal user. Customer-visible note can appear in tracking."
            workType="KUNDLI_ORDER"
            workId={order.id}
            redirectTo={`/admin/kundli/${order.orderNo ?? order.id}`}
            defaultRole="Kundli Astrologer"
            assignments={assignments}
            users={users}
          />

          <AdminChecklistPanel checklist={checklist} users={users} redirectTo={`/admin/kundli/${order.orderNo ?? order.id}`} />

          <AdminDocumentPanel
            title="Kundli Uploads / Reports"
            ownerType="KUNDLI_ORDER"
            ownerId={order.id}
            redirectTo={`/admin/kundli/${order.orderNo ?? order.id}`}
            documents={operationalDocuments}
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

        <AdminPanel className="h-fit xl:sticky xl:top-20">
          <h2 className="text-lg font-semibold text-slate-950">Admin Action</h2>
          <form action={updateKundliAdminAction} className="mt-4 grid gap-4">
            <input type="hidden" name="orderId" value={order.id} />
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Status
              <select name="status" defaultValue={order.status} className="h-10 rounded-md border border-slate-300 px-3">
                {availableStatuses.map((status) => (
                  <option key={status} value={status}>{statusLabel(status)}</option>
                ))}
              </select>
              <span className="text-xs font-normal leading-5 text-slate-500">Only valid next states are shown.</span>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Assigned to
              <input name="assignedTo" defaultValue={order.assignedTo ?? ""} className="h-10 rounded-md border border-slate-300 px-3" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Consultation date
              <input name="consultationDate" type="date" defaultValue={dateInput(order.consultationDate)} className="h-10 rounded-md border border-slate-300 px-3" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Consultation mode
              <input name="consultationMode" defaultValue={order.consultationMode ?? ""} placeholder="Phone, video, in-person placeholder" className="h-10 rounded-md border border-slate-300 px-3" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Report URL placeholder
              <input name="reportUrl" defaultValue={order.reportUrl ?? ""} className="h-10 rounded-md border border-slate-300 px-3" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Report note
              <textarea name="reportNote" defaultValue={order.reportNote ?? ""} rows={3} className="rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Customer note
              <textarea name="customerNote" defaultValue={order.customerNote ?? ""} rows={3} className="rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Internal note
              <textarea name="internalNote" defaultValue={order.internalNote ?? ""} rows={3} className="rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Timeline note
              <textarea name="note" rows={3} className="rounded-md border border-slate-300 px-3 py-2" />
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
