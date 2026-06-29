import Link from "next/link";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { Panel, StatusBadge } from "@/components/ui";

type CustomerDocument = {
  id: string;
  documentType: string;
  title: string;
  description: string | null;
  fileName: string | null;
  fileUrl: string | null;
  storageKey: string | null;
  status: string;
  rejectionReason: string | null;
};

export function CustomerDocumentList({ title, documents }: { title: string; documents: CustomerDocument[] }) {
  if (documents.length === 0) return null;

  return (
    <Panel>
      <h2 className="text-xl font-semibold text-omd-brown">{title}</h2>
      <p className="mt-1 text-sm text-omd-muted">Only customer-visible document placeholders are shown here.</p>
      <div className="mt-4 grid gap-3">
        {documents.map((document) => (
          <div key={document.id} className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-omd-brown">{document.title}</p>
              <StatusBadge tone={statusTone(document.status)}>{statusLabel(document.status)}</StatusBadge>
            </div>
            <p className="mt-1 text-omd-muted">{statusLabel(document.documentType)}{document.fileName ? ` - ${document.fileName}` : ""}</p>
            {document.description ? <p className="mt-1 text-omd-muted">{document.description}</p> : null}
            {document.fileUrl ? <Link href={document.fileUrl} className="mt-2 inline-flex font-semibold text-omd-saffron">Open placeholder</Link> : null}
            {!document.fileUrl && document.storageKey ? <p className="mt-2 text-xs text-omd-muted">Storage key placeholder: {document.storageKey}</p> : null}
            {document.rejectionReason ? <p className="mt-2 rounded-md border border-red-100 bg-red-50 p-2 text-red-700">{document.rejectionReason}</p> : null}
          </div>
        ))}
      </div>
    </Panel>
  );
}
