import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { requireAdminRole } from "@/lib/admin-auth";
import { updateAsthiAdminAction } from "@/lib/asthi-actions";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, PageHeader, StatusBadge, SummaryRow } from "@/components/ui";
import { AdminAssignmentPanel } from "@/components/admin-assignment-panel";
import { AdminChecklistPanel } from "@/components/admin-checklist-panel";
import { AdminDocumentPanel } from "@/components/admin-document-panel";
import { getDocumentsForOwner } from "@/lib/documents";
import { getOrCreateChecklistForOwner } from "@/lib/checklists";

type PageProps = {
  params: Promise<{ applicationNo: string }>;
};

const statuses = [
  "PAYMENT_PENDING",
  "DETAILS_PENDING",
  "DOCUMENTS_UNDER_REVIEW",
  "DOCUMENTS_VERIFIED",
  "RITUAL_SCHEDULED",
  "IN_PROGRESS",
  "PROOF_UPLOADED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED"
];

const allowedAdminTransitions: Record<string, string[]> = {
  DRAFT: ["PAYMENT_PENDING", "CANCELLED"],
  PAYMENT_PENDING: ["PAYMENT_PENDING", "DETAILS_PENDING", "CANCELLED"],
  DETAILS_PENDING: ["DETAILS_PENDING", "DOCUMENTS_UNDER_REVIEW", "CANCELLED"],
  SUBMITTED: ["SUBMITTED", "DOCUMENTS_UNDER_REVIEW", "CANCELLED"],
  DOCUMENTS_UNDER_REVIEW: ["DOCUMENTS_UNDER_REVIEW", "DETAILS_PENDING", "DOCUMENTS_VERIFIED", "CANCELLED"],
  DOCUMENTS_VERIFIED: ["DOCUMENTS_VERIFIED", "RITUAL_SCHEDULED", "CANCELLED"],
  RITUAL_SCHEDULED: ["RITUAL_SCHEDULED", "IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["IN_PROGRESS", "PROOF_UPLOADED", "CANCELLED"],
  PROOF_UPLOADED: ["PROOF_UPLOADED", "COMPLETED"],
  COMPLETED: ["COMPLETED"],
  CANCELLED: ["CANCELLED", "REFUNDED"],
  REFUNDED: ["REFUNDED"]
};

function dateInput(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function addOns(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is { name: string; price: number } => typeof item === "object" && item !== null && "name" in item) : [];
}

export default async function AdminAsthiDetailPage({ params }: PageProps) {
  await requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN"]);
  const tenantId = await getOmdTenantId();
  const { applicationNo } = await params;
  const application = await prisma.asthiApplication.findFirst({
    where: { tenantId, OR: [{ applicationNo }, { id: applicationNo }] },
    include: {
      user: { select: { name: true, email: true } },
      location: true,
      package: true,
      documents: { orderBy: { createdAt: "asc" } },
      statusHistory: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!application) notFound();
  const [assignments, users, operationalDocuments, checklist] = await Promise.all([
    prisma.assignment.findMany({
      where: { tenantId, workType: "ASTHI_APPLICATION", workId: application.id },
      include: { assignedUser: { select: { name: true, email: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    }),
    prisma.user.findMany({
      where: { tenantId, status: "ACTIVE" },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      take: 100
    }),
    getDocumentsForOwner("ASTHI_APPLICATION", application.id, tenantId),
    getOrCreateChecklistForOwner({ tenantId, relatedType: "ASTHI_APPLICATION", relatedId: application.id })
  ]);

  const selectedAddOns = addOns(application.selectedAddOnsJson);
  const availableStatuses = statuses.filter((status) => allowedAdminTransitions[application.status]?.includes(status));

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Asthi Operations"
        title={application.applicationNo ?? "Draft Asthi Booking"}
        description="Manage document review, scheduling, ritual progress, proof notes, and completion placeholders."
        tone="admin"
        actions={<Link href="/admin/asthi" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">Back to queue</Link>}
      />

      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-5">
          <AdminPanel>
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={statusTone(application.status)}>{statusLabel(application.status)}</StatusBadge>
              <StatusBadge tone={statusTone(application.paymentStatus)}>{statusLabel(application.paymentStatus)}</StatusBadge>
              <StatusBadge tone={statusTone(application.documentStatus)}>{statusLabel(application.documentStatus)}</StatusBadge>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <SummaryRow label="Applicant" value={application.applicantName} />
              <SummaryRow label="Phone" value={application.applicantPhone} />
              <SummaryRow label="Email" value={application.applicantEmail} />
              <SummaryRow label="Country" value={application.country ?? "Not set"} />
              <SummaryRow label="City" value={application.city ?? "Not set"} />
              <SummaryRow label="Customer" value={application.user?.email ?? "No user linked"} />
            </div>
          </AdminPanel>

          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Seva and Quote</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <SummaryRow label="Location" value={application.location ? `${application.location.name}, ${application.location.city}` : application.preferredLocation ?? "Not set"} />
              <SummaryRow label="Package" value={application.package?.name ?? "Asthi package"} />
              <SummaryRow label="Service mode" value={statusLabel(application.serviceMode)} />
              <SummaryRow label="Preferred date" value={application.preferredDate ? application.preferredDate.toLocaleDateString("en-IN") : "Not set"} />
              {selectedAddOns.map((addOn) => (
                <SummaryRow key={addOn.name} label={addOn.name} value={formatMoney(addOn.price, application.currency)} />
              ))}
              <SummaryRow label="Total" value={formatMoney(application.totalAmount, application.currency)} strong />
            </div>
          </AdminPanel>

          <AdminAssignmentPanel
            title="Pandit / Operator Assignment"
            helper="Assign ritual operator, pandit placeholder, or internal user. Customer-visible note can appear in tracking."
            workType="ASTHI_APPLICATION"
            workId={application.id}
            redirectTo={`/admin/asthi/${application.applicationNo ?? application.id}`}
            defaultRole="Asthi Operations"
            assignments={assignments}
            users={users}
          />

          <AdminChecklistPanel checklist={checklist} users={users} redirectTo={`/admin/asthi/${application.applicationNo ?? application.id}`} />

          <AdminDocumentPanel
            title="Operational Documents / Proof"
            ownerType="ASTHI_APPLICATION"
            ownerId={application.id}
            redirectTo={`/admin/asthi/${application.applicationNo ?? application.id}`}
            documents={operationalDocuments}
          />

          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Family and Ritual Details</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <SummaryRow label="Deceased" value={application.deceasedName ?? "Pending"} />
              <SummaryRow label="Relation" value={application.relation ?? application.relationToDeceased ?? "Pending"} />
              <SummaryRow label="Date of death" value={application.dateOfDeath ? application.dateOfDeath.toLocaleDateString("en-IN") : "Not provided"} />
              <SummaryRow label="Gotra" value={application.gotra ?? "Not provided"} />
            </div>
            {application.familyDetails ? <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">{application.familyDetails}</p> : null}
            {application.specialInstructions ? <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">{application.specialInstructions}</p> : null}
          </AdminPanel>

          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Document Review</h2>
            <div className="mt-4 grid gap-3">
              {application.documents.map((document) => (
                <div key={document.id} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{statusLabel(document.type)}</p>
                    <StatusBadge tone={statusTone(document.status)}>{statusLabel(document.status)}</StatusBadge>
                  </div>
                  <p className="mt-1 text-slate-600">{document.filename ?? document.fileName ?? "Upload pending"}</p>
                  {document.fileUrl ? <Link href={document.fileUrl} className="mt-1 inline-flex text-xs font-semibold text-omd-ops">Open placeholder URL</Link> : null}
                </div>
              ))}
              {application.documents.length === 0 ? <p className="text-sm text-slate-600">No document placeholders have been submitted yet.</p> : null}
            </div>
          </AdminPanel>

          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Timeline</h2>
            <div className="mt-4 grid gap-3">
              {application.statusHistory.map((history) => (
                <div key={history.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                  <p className="font-semibold text-slate-950">{statusLabel(history.toStatus)}</p>
                  {history.note ? <p className="mt-1 text-slate-600">{history.note}</p> : null}
                  <p className="mt-1 text-xs text-slate-500">{history.createdAt.toLocaleString("en-IN")} {history.actorLabel ? `by ${history.actorLabel}` : ""}</p>
                </div>
              ))}
            </div>
          </AdminPanel>
        </div>

        <AdminPanel className="h-fit xl:sticky xl:top-20">
          <h2 className="text-lg font-semibold text-slate-950">Admin Action</h2>
          <form action={updateAsthiAdminAction} className="mt-4 grid gap-4">
            <input type="hidden" name="applicationId" value={application.id} />
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Status
              <select name="status" defaultValue={application.status} className="h-10 rounded-md border border-slate-300 px-3">
                {availableStatuses.map((status) => (
                  <option key={status} value={status}>{statusLabel(status)}</option>
                ))}
              </select>
              <span className="text-xs font-normal leading-5 text-slate-500">Only valid next states for the current application are shown.</span>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Scheduled date
              <input name="scheduledDate" type="date" defaultValue={dateInput(application.scheduledDate)} className="h-10 rounded-md border border-slate-300 px-3" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Assigned to
              <input name="assignedTo" defaultValue={application.assignedTo ?? ""} className="h-10 rounded-md border border-slate-300 px-3" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Proof URL placeholder
              <input name="proofUrl" defaultValue={application.proofUrl ?? ""} className="h-10 rounded-md border border-slate-300 px-3" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Proof note
              <textarea name="proofNote" defaultValue={application.proofNote ?? ""} rows={3} className="rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Certificate note
              <textarea name="certificateNote" defaultValue={application.certificateNote ?? ""} rows={3} className="rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Prasad dispatch note
              <textarea name="prasadDispatchNote" defaultValue={application.prasadDispatchNote ?? ""} rows={3} className="rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Internal note
              <textarea name="internalNote" defaultValue={application.internalNote ?? ""} rows={3} className="rounded-md border border-slate-300 px-3 py-2" />
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
              Save Admin Update
            </button>
          </form>
        </AdminPanel>
      </section>
    </div>
  );
}
