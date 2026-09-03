export type CustomerKundliDocument = {
  id: string;
  documentType: string;
  status: string;
  visibility: string;
  fileUrl: string | null;
  storageKey: string | null;
  mimeType: string | null;
  description?: string | null;
  rejectionReason?: string | null;
};

export function filterReleasedKundliCustomerDocuments<T extends CustomerKundliDocument>(orderStatus: string, documents: T[]) {
  return documents
    .filter((document) =>
      document.documentType !== "KUNDLI_REPORT"
      || (
        ["DELIVERED", "COMPLETED"].includes(orderStatus)
        && document.status === "APPROVED"
        && document.visibility === "CUSTOMER_VISIBLE"
        && document.fileUrl === null
        && Boolean(document.storageKey)
        && document.mimeType === "application/pdf"
      )
    )
    .map((document) => document.documentType === "KUNDLI_REPORT"
      ? {
          ...document,
          description: null,
          rejectionReason: null,
          fileUrl: null,
          storageKey: null,
          downloadHref: `/kundli/reports/${document.id}/download`
        }
      : document
    );
}
