import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { updateOperationalDocumentStatusAction, updateOperationalDocumentVisibilityAction } from "@/lib/documents";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

type PageProps = {
  searchParams: Promise<{ ownerType?: string; documentType?: string; status?: string; visibility?: string; q?: string }>;
};

const ownerTypes = ["ASTHI_APPLICATION", "KUNDLI_ORDER", "ORDER", "ORDER_ITEM", "ORDER_REQUEST", "ASSIGNMENT", "SERVICE_BOOKING", "CUSTOMER", "PRODUCT", "GENERAL"];
const documentTypes = ["DEATH_CERTIFICATE", "ID_PROOF", "RELATION_PROOF", "KUNDLI_UPLOAD", "KUNDLI_REPORT", "RITUAL_PROOF", "CERTIFICATE", "PRASAD_DISPATCH_PROOF", "RETURN_PROOF", "REFUND_PROOF", "INTERNAL_NOTE_FILE", "OTHER"];
const statuses = ["REQUESTED", "UPLOADED", "UNDER_REVIEW", "APPROVED", "REJECTED", "REUPLOAD_REQUIRED", "ARCHIVED"];
const visibilities = ["INTERNAL_ONLY", "CUSTOMER_VISIBLE"];

function ownerHref(ownerType: string, ownerId: string) {
  if (ownerType === "ORDER") return `/admin/orders/${ownerId}`;
  if (ownerType === "ASTHI_APPLICATION") return `/admin/asthi/${ownerId}`;
  if (ownerType === "KUNDLI_ORDER") return `/admin/kundli/${ownerId}`;
  if (ownerType === "ORDER_REQUEST") return `/admin/requests?q=${encodeURIComponent(ownerId)}`;
  return null;
}

export default async function AdminDocumentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tenantId = await getOmdTenantId();
  const docs = await prisma.operationalDocument.findMany({
    where: {
      tenantId,
      ...(params.ownerType ? { ownerType: params.ownerType } : {}),
      ...(params.documentType ? { documentType: params.documentType } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.visibility ? { visibility: params.visibility } : {}),
      ...(params.q
        ? {
            OR: [
              { title: { contains: params.q, mode: "insensitive" } },
              { ownerId: { contains: params.q, mode: "insensitive" } },
              { fileName: { contains: params.q, mode: "insensitive" } },
              { fileUrl: { contains: params.q, mode: "insensitive" } },
              { storageKey: { contains: params.q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    include: {
      uploadedBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 3 }
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Documents"
        description="Global document/proof/report placeholder queue. No real object storage or signed URL handling is connected."
        tone="admin"
      />
      <AdminPanel>
        <form className="grid gap-3 xl:grid-cols-[1fr_170px_170px_170px_170px_100px]">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Title, owner ID, file URL/key" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <select name="ownerType" defaultValue={params.ownerType ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All owners</option>
            {ownerTypes.map((type) => <option key={type} value={type}>{statusLabel(type)}</option>)}
          </select>
          <select name="documentType" defaultValue={params.documentType ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All document types</option>
            {documentTypes.map((type) => <option key={type} value={type}>{statusLabel(type)}</option>)}
          </select>
          <select name="status" defaultValue={params.status ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All statuses</option>
            {statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
          </select>
          <select name="visibility" defaultValue={params.visibility ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All visibility</option>
            {visibilities.map((visibility) => <option key={visibility} value={visibility}>{statusLabel(visibility)}</option>)}
          </select>
          <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Filter</button>
        </form>
      </AdminPanel>

      {docs.length === 0 ? (
        <EmptyState title="No documents found" description={params.q || params.status || params.ownerType ? "No document matches these filters." : "Document placeholders will appear here when admins request proofs, reports or customer-visible files."} />
      ) : (
        <div className="grid gap-4">
          {docs.map((doc) => {
            const href = ownerHref(doc.ownerType, doc.ownerId);
            return (
              <AdminPanel key={doc.id}>
                <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={statusTone(doc.ownerType)}>{statusLabel(doc.ownerType)}</StatusBadge>
                      <StatusBadge tone={statusTone(doc.documentType)}>{statusLabel(doc.documentType)}</StatusBadge>
                      <StatusBadge tone={statusTone(doc.status)}>{statusLabel(doc.status)}</StatusBadge>
                      <StatusBadge tone={doc.visibility === "CUSTOMER_VISIBLE" ? "success" : "neutral"}>{statusLabel(doc.visibility)}</StatusBadge>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-slate-950">{doc.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">Owner ID: {doc.ownerId}</p>
                    {doc.fileName ? <p className="mt-1 text-sm text-slate-600">{doc.fileName}</p> : null}
                    {doc.fileUrl ? <Link href={doc.fileUrl} className="mt-1 inline-flex text-sm font-semibold text-omd-ops">Open URL placeholder</Link> : null}
                    {doc.storageKey ? <p className="mt-1 text-xs text-slate-500">Storage key: {doc.storageKey}</p> : null}
                    {href ? <Link href={href} className="mt-3 inline-flex text-sm font-semibold text-omd-ops hover:text-omd-brown">Open owner record</Link> : null}
                  </div>
                  <div className="grid gap-3">
                    <form action={updateOperationalDocumentStatusAction} className="grid gap-2">
                      <input type="hidden" name="id" value={doc.id} />
                      <input type="hidden" name="redirectTo" value="/admin/documents" />
                      <select name="status" defaultValue={doc.status} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                        {statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                      </select>
                      <input name="note" placeholder="Review note" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                      <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white">Save review</button>
                    </form>
                    <form action={updateOperationalDocumentVisibilityAction} className="grid gap-2">
                      <input type="hidden" name="id" value={doc.id} />
                      <input type="hidden" name="redirectTo" value="/admin/documents" />
                      <select name="visibility" defaultValue={doc.visibility} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                        {visibilities.map((visibility) => <option key={visibility} value={visibility}>{statusLabel(visibility)}</option>)}
                      </select>
                      <input name="note" placeholder="Visibility note" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                      <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:border-omd-ops">Save visibility</button>
                    </form>
                  </div>
                </div>
              </AdminPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
