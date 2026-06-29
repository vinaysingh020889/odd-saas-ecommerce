import Link from "next/link";
import { saveOperationalDocumentAction, updateOperationalDocumentStatusAction, updateOperationalDocumentVisibilityAction } from "@/lib/documents";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, StatusBadge } from "@/components/ui";

type DocumentRecord = {
  id: string;
  ownerType: string;
  ownerId: string;
  documentType: string;
  title: string;
  description: string | null;
  fileName: string | null;
  fileUrl: string | null;
  storageKey: string | null;
  mimeType: string | null;
  fileSize: number | null;
  visibility: string;
  status: string;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  activities?: Array<{ id: string; action: string; note: string | null; createdAt: Date; actor?: { name: string | null; email: string | null } | null }>;
};

type AdminDocumentPanelProps = {
  title?: string;
  ownerType: string;
  ownerId: string;
  redirectTo: string;
  documents: DocumentRecord[];
};

const documentTypes = [
  "DEATH_CERTIFICATE",
  "ID_PROOF",
  "RELATION_PROOF",
  "KUNDLI_UPLOAD",
  "KUNDLI_REPORT",
  "RITUAL_PROOF",
  "CERTIFICATE",
  "PRASAD_DISPATCH_PROOF",
  "RETURN_PROOF",
  "REFUND_PROOF",
  "INTERNAL_NOTE_FILE",
  "OTHER"
];
const statuses = ["REQUESTED", "UPLOADED", "UNDER_REVIEW", "APPROVED", "REJECTED", "REUPLOAD_REQUIRED", "ARCHIVED"];
const visibilities = ["INTERNAL_ONLY", "CUSTOMER_VISIBLE"];

export function AdminDocumentPanel({ title = "Documents", ownerType, ownerId, redirectTo, documents }: AdminDocumentPanelProps) {
  return (
    <AdminPanel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">URL/storage-key placeholder shell. No real private storage or signed URLs are connected.</p>
        </div>
        <StatusBadge tone={documents.length ? "warning" : "neutral"}>{documents.length} document(s)</StatusBadge>
      </div>

      <div className="mt-4 grid gap-3">
        {documents.length === 0 ? <p className="text-sm text-slate-600">No operational documents have been requested yet.</p> : null}
        {documents.map((document) => (
          <div key={document.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={statusTone(document.documentType)}>{statusLabel(document.documentType)}</StatusBadge>
              <StatusBadge tone={statusTone(document.status)}>{statusLabel(document.status)}</StatusBadge>
              <StatusBadge tone={document.visibility === "CUSTOMER_VISIBLE" ? "success" : "neutral"}>{statusLabel(document.visibility)}</StatusBadge>
            </div>
            <p className="mt-2 font-semibold text-slate-950">{document.title}</p>
            {document.description ? <p className="mt-1 text-sm text-slate-600">{document.description}</p> : null}
            <p className="mt-1 text-sm text-slate-600">{document.fileName ?? "No file name"} {document.mimeType ? `- ${document.mimeType}` : ""}</p>
            {document.fileUrl ? <Link href={document.fileUrl} className="mt-1 inline-flex text-sm font-semibold text-omd-ops">Open URL placeholder</Link> : null}
            {document.storageKey ? <p className="mt-1 text-xs text-slate-500">Storage key: {document.storageKey}</p> : null}
            {document.rejectionReason ? <p className="mt-2 rounded-md border border-red-100 bg-red-50 p-2 text-sm text-red-700">{document.rejectionReason}</p> : null}

            <form action={saveOperationalDocumentAction} className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
              <input type="hidden" name="id" value={document.id} />
              <input type="hidden" name="ownerType" value={ownerType} />
              <input type="hidden" name="ownerId" value={ownerId} />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <input name="fileName" defaultValue={document.fileName ?? ""} placeholder="File name" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
              <input name="fileUrl" defaultValue={document.fileUrl ?? ""} placeholder="File URL placeholder" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
              <input name="storageKey" defaultValue={document.storageKey ?? ""} placeholder="Storage key placeholder" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
              <button className="rounded-md border border-omd-ops px-3 py-2 text-sm font-semibold text-omd-ops hover:bg-slate-50">Save file</button>
            </form>

            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr]">
              <form action={updateOperationalDocumentStatusAction} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                <input type="hidden" name="id" value={document.id} />
                <input type="hidden" name="redirectTo" value={redirectTo} />
                <select name="status" defaultValue={document.status} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                  {statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                </select>
                <input name="note" placeholder="Review note" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Review</button>
              </form>
              <form action={updateOperationalDocumentVisibilityAction} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                <input type="hidden" name="id" value={document.id} />
                <input type="hidden" name="redirectTo" value={redirectTo} />
                <select name="visibility" defaultValue={document.visibility} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                  {visibilities.map((visibility) => <option key={visibility} value={visibility}>{statusLabel(visibility)}</option>)}
                </select>
                <input name="note" placeholder="Visibility note" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:border-omd-ops">Visibility</button>
              </form>
            </div>

            {document.activities && document.activities.length > 0 ? (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-semibold text-slate-700">Activity trail</summary>
                <div className="mt-2 grid gap-2">
                  {document.activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="rounded border border-slate-200 bg-white px-3 py-2">
                      <p className="font-semibold">{statusLabel(activity.action)}</p>
                      {activity.note ? <p className="text-slate-600">{activity.note}</p> : null}
                      <p className="text-xs text-slate-500">{activity.createdAt.toLocaleString("en-IN")} {activity.actor ? `by ${activity.actor.name ?? activity.actor.email}` : ""}</p>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        ))}
      </div>

      <details className="mt-4 rounded-md border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-950">Request / create document placeholder</summary>
        <form action={saveOperationalDocumentAction} className="mt-4 grid gap-3">
          <input type="hidden" name="ownerType" value={ownerType} />
          <input type="hidden" name="ownerId" value={ownerId} />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <select name="documentType" defaultValue="OTHER" className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            {documentTypes.map((type) => <option key={type} value={type}>{statusLabel(type)}</option>)}
          </select>
          <input name="title" required placeholder="Document title" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <textarea name="description" rows={2} placeholder="Description / request instructions" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <div className="grid gap-3 md:grid-cols-2">
            <input name="fileName" placeholder="File name optional" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
            <input name="fileUrl" placeholder="File URL placeholder optional" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
            <input name="storageKey" placeholder="Storage key placeholder optional" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
            <select name="visibility" defaultValue="INTERNAL_ONLY" className="h-10 rounded-md border border-slate-300 px-3 text-sm">
              {visibilities.map((visibility) => <option key={visibility} value={visibility}>{statusLabel(visibility)}</option>)}
            </select>
          </div>
          <button className="w-fit rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Create placeholder</button>
        </form>
      </details>
    </AdminPanel>
  );
}
