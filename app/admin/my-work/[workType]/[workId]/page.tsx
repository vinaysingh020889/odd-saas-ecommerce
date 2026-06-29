import Link from "next/link";
import { getRestrictedWorkDetail, updateRestrictedAssignmentAction, updateRestrictedChecklistItemAction, addRestrictedPlaceholderAction } from "@/lib/restricted-work";
import { formatMoney } from "@/lib/catalog";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, PageHeader, StatusBadge, SummaryRow } from "@/components/ui";

type PageProps = {
  params: Promise<{ workType: string; workId: string }>;
};

type AnyRecord = Record<string, any>;

function titleFor(workType: string, detail: AnyRecord) {
  if (workType === "ORDER") return detail.orderNumber;
  if (workType === "SERVICE_BOOKING") return detail.bookingNo ?? detail.id;
  if (workType === "ASTHI_APPLICATION") return detail.applicationNo ?? detail.id;
  if (workType === "KUNDLI_ORDER") return detail.orderNo ?? detail.id;
  return detail.id;
}

function customerLine(workType: string, detail: AnyRecord) {
  if (workType === "ORDER") return `${detail.customerName} - ${detail.customerPhone}`;
  if (workType === "SERVICE_BOOKING") return `${detail.customerName} - ${detail.customerPhone}`;
  if (workType === "ASTHI_APPLICATION") return `${detail.applicantName} - ${detail.applicantPhone}`;
  if (workType === "KUNDLI_ORDER") return `${detail.applicantName} - ${detail.applicantPhone}`;
  return "Assigned work";
}

function WorkSummary({ workType, detail }: { workType: string; detail: AnyRecord }) {
  if (workType === "ORDER") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <SummaryRow label="Status" value={statusLabel(detail.status)} />
        <SummaryRow label="Fulfilment" value={statusLabel(detail.fulfillmentStatus)} />
        <SummaryRow label="Customer" value={detail.customerName} />
        <SummaryRow label="Contact" value={detail.customerPhone} />
        <SummaryRow label="Total" value={formatMoney(detail.totalAmount, detail.currency)} strong />
        <SummaryRow label="Courier" value={detail.courierName ?? "Not set"} />
        <SummaryRow label="Tracking" value={detail.trackingNumber ?? "Not set"} />
        <SummaryRow label="Items" value={`${detail.items.length} item(s)`} />
      </div>
    );
  }

  if (workType === "SERVICE_BOOKING") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <SummaryRow label="Service" value={detail.service.title} />
        <SummaryRow label="Package" value={detail.variant?.title ?? "Default"} />
        <SummaryRow label="Status" value={statusLabel(detail.status)} />
        <SummaryRow label="Capacity" value={statusLabel(detail.capacityStatus)} />
        <SummaryRow label="Date" value={detail.preferredDate?.toLocaleDateString("en-IN") ?? "Manual review"} />
        <SummaryRow label="Time" value={detail.preferredTime ?? "Manual review"} />
        <SummaryRow label="Place" value={detail.locationText ?? "Manual review"} />
        <SummaryRow label="Participants" value={detail.participantCount} />
      </div>
    );
  }

  if (workType === "ASTHI_APPLICATION") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <SummaryRow label="Status" value={statusLabel(detail.status)} />
        <SummaryRow label="Document status" value={statusLabel(detail.documentStatus)} />
        <SummaryRow label="Location" value={detail.location?.name ?? detail.preferredLocation ?? "Not set"} />
        <SummaryRow label="Preferred date" value={detail.preferredDate?.toLocaleDateString("en-IN") ?? "Not set"} />
        <SummaryRow label="Deceased" value={detail.deceasedName ?? "Pending"} />
        <SummaryRow label="Relation" value={detail.relation ?? detail.relationToDeceased ?? "Pending"} />
        <SummaryRow label="Proof" value={statusLabel(detail.proofStatus)} />
        <SummaryRow label="Mode" value={statusLabel(detail.serviceMode)} />
      </div>
    );
  }

  if (workType === "KUNDLI_ORDER") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <SummaryRow label="Status" value={statusLabel(detail.status)} />
        <SummaryRow label="Report" value={statusLabel(detail.reportStatus)} />
        <SummaryRow label="Package" value={detail.package.name} />
        <SummaryRow label="Language" value={detail.languagePreference ?? "Not set"} />
        <SummaryRow label="Birth name" value={detail.birthName ?? "Pending"} />
        <SummaryRow label="Birth place" value={detail.placeOfBirth ?? "Pending"} />
        <SummaryRow label="Consultation" value={detail.consultationDate?.toLocaleDateString("en-IN") ?? "Not scheduled"} />
        <SummaryRow label="Mode" value={detail.consultationMode ?? "Not set"} />
      </div>
    );
  }

  return null;
}

export default async function RestrictedWorkDetailPage({ params }: PageProps) {
  const { workType, workId } = await params;
  const { user, assignments, checklist, documents, detail } = await getRestrictedWorkDetail(workType, workId);
  const item = detail as AnyRecord;
  const redirectTo = `/admin/my-work/${workType}/${workId}`;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={statusLabel(workType)}
        title={titleFor(workType, item)}
        description={customerLine(workType, item)}
        tone="admin"
        actions={
          <>
            <Link href="/admin/my-work" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Back to my work</Link>
            <StatusBadge tone="ops">{user.roles.join(", ")}</StatusBadge>
          </>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-5">
          <AdminPanel>
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={statusTone(item.status)}>{statusLabel(item.status)}</StatusBadge>
              {item.paymentStatus ? <StatusBadge tone="neutral">Payment hidden from action controls</StatusBadge> : null}
            </div>
            <div className="mt-5">
              <WorkSummary workType={workType} detail={item} />
            </div>
            {item.specialInstructions ? <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">{item.specialInstructions}</p> : null}
            {item.questionOrConcern ? <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">{item.questionOrConcern}</p> : null}
          </AdminPanel>

          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Assignments</h2>
            <div className="mt-4 grid gap-3">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={statusTone(assignment.status)}>{statusLabel(assignment.status)}</StatusBadge>
                    <StatusBadge tone={statusTone(assignment.priority)}>{statusLabel(assignment.priority)}</StatusBadge>
                  </div>
                  <h3 className="mt-3 font-semibold text-slate-950">{assignment.assignmentLabel ?? assignment.assignedRole ?? "Assigned work"}</h3>
                  <p className="mt-1 text-sm text-slate-600">Owner: {assignment.assignedUser?.name ?? assignment.assignedUser?.email ?? assignment.assignedRole ?? "Role assignment"}</p>
                  {assignment.internalNote ? <p className="mt-2 text-sm text-slate-600">{assignment.internalNote}</p> : null}
                  <form action={updateRestrictedAssignmentAction} className="mt-4 grid gap-3 md:grid-cols-[160px_1fr_1fr_auto]">
                    <input type="hidden" name="assignmentId" value={assignment.id} />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <select name="status" defaultValue={assignment.status} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                      <option value="ASSIGNED">Assigned</option>
                      <option value="IN_PROGRESS">In progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                    <input name="internalNote" defaultValue={assignment.internalNote ?? ""} placeholder="Internal progress note" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                    <input name="customerVisibleNote" defaultValue={assignment.customerVisibleNote ?? ""} placeholder="Customer-visible milestone note" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                    <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Update</button>
                  </form>
                </div>
              ))}
            </div>
          </AdminPanel>

          {checklist ? (
            <AdminPanel>
              <h2 className="text-lg font-semibold text-slate-950">Checklist</h2>
              <p className="mt-1 text-sm text-slate-600">{checklist.progressPercent}% complete - {checklist.requiredPendingCount} required pending - {checklist.blockedCount} blocked</p>
              <div className="mt-4 grid gap-3">
                {checklist.items.map((task) => (
                  <div key={task.id} className="rounded-md border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <StatusBadge tone={statusTone(task.status)}>{statusLabel(task.status)}</StatusBadge>
                      <span className="text-xs text-slate-500">{task.dueAt?.toLocaleString("en-IN") ?? "No due date"}</span>
                    </div>
                    <h3 className="mt-3 font-semibold text-slate-950">{task.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">Owner: {task.assignedUser?.name ?? task.assignedUser?.email ?? task.assignedRole ?? "Role assignment"}</p>
                    {task.description ? <p className="mt-2 text-sm text-slate-600">{task.description}</p> : null}
                    <form action={updateRestrictedChecklistItemAction} className="mt-4 grid gap-3 md:grid-cols-[160px_1fr_auto]">
                      <input type="hidden" name="itemId" value={task.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <select name="status" defaultValue={task.status} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                        <option value="pending">Pending</option>
                        <option value="in_progress">In progress</option>
                        <option value="blocked">Blocked</option>
                        <option value="completed">Completed</option>
                      </select>
                      <input name="note" defaultValue={task.internalNote ?? task.blockedReason ?? ""} placeholder="Progress or blocked reason" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                      <button className="rounded-md border border-omd-ops px-3 py-2 text-sm font-semibold text-omd-ops hover:bg-blue-50">Save task</button>
                    </form>
                  </div>
                ))}
              </div>
            </AdminPanel>
          ) : null}
        </div>

        <div className="grid h-fit gap-5">
          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Proof / Report / Dispatch</h2>
            <form action={addRestrictedPlaceholderAction} className="mt-4 grid gap-3">
              <input type="hidden" name="workType" value={workType} />
              <input type="hidden" name="workId" value={workId} />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <input name="title" placeholder="Placeholder title" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
              {workType === "ORDER" ? (
                <>
                  <input name="courierName" defaultValue={item.courierName ?? ""} placeholder="Courier placeholder" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                  <input name="trackingNumber" defaultValue={item.trackingNumber ?? ""} placeholder="Tracking placeholder" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                </>
              ) : null}
              <input name="fileUrl" placeholder="Optional proof/report URL placeholder" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
              <textarea name="note" rows={4} placeholder="Internal/customer-safe progress note" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <button className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-omd-ops">Add placeholder</button>
            </form>
          </AdminPanel>

          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Visible Documents</h2>
            <div className="mt-4 grid gap-3">
              {documents.length === 0 ? <p className="text-sm text-slate-600">No operational placeholders are linked yet.</p> : null}
              {documents.map((document) => (
                <div key={document.id} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={statusTone(document.status)}>{statusLabel(document.status)}</StatusBadge>
                    <StatusBadge tone={document.visibility === "CUSTOMER_VISIBLE" ? "success" : "neutral"}>{statusLabel(document.visibility)}</StatusBadge>
                  </div>
                  <p className="mt-2 font-semibold text-slate-950">{document.title}</p>
                  <p className="mt-1 text-slate-600">{document.fileName ?? document.fileUrl ?? document.description ?? "Placeholder only"}</p>
                </div>
              ))}
            </div>
          </AdminPanel>
        </div>
      </section>
    </div>
  );
}
