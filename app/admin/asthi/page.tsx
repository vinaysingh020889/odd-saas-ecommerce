import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { requireAdminRole } from "@/lib/admin-auth";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

function adminNextAction(status: string, documentStatus: string) {
  if (status === "PAYMENT_PENDING") return "Await mock payment";
  if (status === "DETAILS_PENDING") return "Await customer details";
  if (status === "DOCUMENTS_UNDER_REVIEW" && documentStatus === "PENDING_UPLOAD") return "Await missing documents";
  if (status === "DOCUMENTS_UNDER_REVIEW") return "Review documents";
  if (status === "DOCUMENTS_VERIFIED") return "Schedule ritual";
  if (status === "RITUAL_SCHEDULED") return "Start ritual";
  if (status === "IN_PROGRESS") return "Upload proof";
  if (status === "PROOF_UPLOADED") return "Complete application";
  if (status === "COMPLETED") return "Completed";
  if (status === "CANCELLED") return "Cancelled";
  if (status === "REFUNDED") return "Refunded";
  return "Review";
}

export default async function AdminAsthiPage() {
  await requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN"]);
  const tenantId = await getOmdTenantId();
  const applications = await prisma.asthiApplication.findMany({
    where: { tenantId },
    include: {
      user: { select: { name: true, email: true } },
      location: { select: { name: true, city: true } },
      package: { select: { name: true } },
      _count: { select: { documents: true, statusHistory: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  const counts = {
    paymentPending: applications.filter((item) => item.status === "PAYMENT_PENDING").length,
    detailsPending: applications.filter((item) => item.status === "DETAILS_PENDING").length,
    review: applications.filter((item) => item.status === "DOCUMENTS_UNDER_REVIEW").length,
    scheduled: applications.filter((item) => item.status === "RITUAL_SCHEDULED").length,
    completed: applications.filter((item) => item.status === "COMPLETED").length
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Asthi Applications"
        description="Queue for mock payment, family details, document review, scheduling, proof upload, and completion."
        tone="admin"
      />

      <section className="grid gap-3 md:grid-cols-5">
        {[
          ["Payment Pending", counts.paymentPending],
          ["Details Pending", counts.detailsPending],
          ["Under Review", counts.review],
          ["Scheduled", counts.scheduled],
          ["Completed", counts.completed]
        ].map(([label, value]) => (
          <AdminPanel key={label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
          </AdminPanel>
        ))}
      </section>

      {applications.length === 0 ? (
        <EmptyState title="No Asthi applications" description="Applications appear here after a customer starts the Asthi Visarjan intake flow." />
      ) : (
        <AdminPanel className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Application</th>
                  <th className="px-4 py-3">Applicant</th>
                  <th className="px-4 py-3">Seva</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Documents</th>
                  <th className="px-4 py-3">Next Action</th>
                  <th className="px-4 py-3">Scheduled</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {applications.map((application) => (
                  <tr key={application.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/asthi/${application.applicationNo ?? application.id}`} className="font-semibold text-omd-ops">
                        {application.applicationNo ?? "Draft booking"}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">{application.id}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="font-semibold text-slate-950">{application.applicantName}</span>
                      <br />
                      {application.applicantEmail}
                      <br />
                      {application.applicantPhone}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="font-semibold text-slate-950">{application.package?.name ?? "Asthi package"}</span>
                      <br />
                      {application.location ? `${application.location.name}, ${application.location.city}` : application.preferredLocation}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <StatusBadge tone={statusTone(application.status)}>{statusLabel(application.status)}</StatusBadge>
                        <StatusBadge tone={statusTone(application.paymentStatus)}>{statusLabel(application.paymentStatus)}</StatusBadge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <StatusBadge tone={statusTone(application.documentStatus)}>{statusLabel(application.documentStatus)}</StatusBadge>
                      <p className="mt-1 text-xs">{application._count.documents} document record(s)</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{adminNextAction(application.status, application.documentStatus)}</td>
                    <td className="px-4 py-3 text-slate-600">{application.scheduledDate ? application.scheduledDate.toLocaleDateString("en-IN") : "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{application.updatedAt.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      )}
    </div>
  );
}
