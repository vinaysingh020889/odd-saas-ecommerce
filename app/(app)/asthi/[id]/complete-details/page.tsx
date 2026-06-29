import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";
import { completeAsthiDetailsAction } from "@/lib/asthi-actions";
import { BreadcrumbHeader, Panel, SecondaryLink, StatusBadge, SummaryRow } from "@/components/ui";
import { statusLabel, statusTone } from "@/lib/status-labels";

type PageProps = {
  params: Promise<{ id: string }>;
};

function SubmitButton() {
  return (
    <button type="submit" className="rounded-md bg-omd-brown px-5 py-3 text-sm font-semibold text-white hover:bg-omd-saffron">
      Save Details & Documents
    </button>
  );
}

export default async function AsthiCompleteDetailsPage({ params }: PageProps) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const application = await prisma.asthiApplication.findFirst({
    where: { userId: user.id, OR: [{ id }, { applicationNo: id }] },
    include: { location: true, package: true, documents: { orderBy: { createdAt: "asc" } } }
  });

  if (!application) notFound();

  if (application.paymentStatus !== "CONFIRMED") {
    redirect(`/asthi/${application.id}/review`);
  }

  const documentByType = new Map(application.documents.map((document) => [document.type, document]));
  const deathCertificate = documentByType.get("DEATH_CERTIFICATE");
  const applicantId = documentByType.get("APPLICANT_ID");
  const relationProof = documentByType.get("RELATION_PROOF");
  const otherDocument = documentByType.get("OTHER");
  const isUpdate = application.status !== "DETAILS_PENDING";

  return (
    <div className="grid gap-6">
      <BreadcrumbHeader
        items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Asthi Details" }]}
        title={application.applicationNo ?? "Details Pending"}
        actions={
          <>
            <SecondaryLink href={`/asthi/${application.applicationNo ?? application.id}`}>Back to Tracking</SecondaryLink>
            <StatusBadge tone={statusTone(application.status)}>{statusLabel(application.status)}</StatusBadge>
            <StatusBadge tone={statusTone(application.paymentStatus)}>{statusLabel(application.paymentStatus)}</StatusBadge>
          </>
        }
      />

      <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Private Details</p>
          <h1 className="mt-2 text-2xl font-semibold text-omd-brown">{isUpdate ? "Update family and document details" : "Complete family and document details"}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-omd-muted">
            For this MVP, document upload is represented by filename or URL placeholders only. Private storage and real document handling are deferred.
          </p>

          <form action={completeAsthiDetailsAction} className="mt-6 grid gap-5">
            <input type="hidden" name="applicationIdentifier" value={application.applicationNo ?? application.id} />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-omd-brown">
                Deceased full name
                <input name="deceasedName" defaultValue={application.deceasedName ?? ""} required className="h-10 rounded-md border border-omd-sand px-3" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-omd-brown">
                Date of death
                <input name="dateOfDeath" type="date" defaultValue={application.dateOfDeath?.toISOString().slice(0, 10) ?? ""} className="h-10 rounded-md border border-omd-sand px-3" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-omd-brown">
                Gotra optional
                <input name="gotra" defaultValue={application.gotra ?? ""} className="h-10 rounded-md border border-omd-sand px-3" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-omd-brown">
                Relation with deceased
                <input name="relation" defaultValue={application.relation ?? application.relationToDeceased ?? ""} required className="h-10 rounded-md border border-omd-sand px-3" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-omd-brown md:col-span-2">
                Family details
                <textarea name="familyDetails" defaultValue={application.familyDetails ?? ""} rows={4} className="rounded-md border border-omd-sand px-3 py-2" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-omd-brown md:col-span-2">
                Special instructions
                <textarea name="specialInstructions" defaultValue={application.specialInstructions ?? ""} rows={4} className="rounded-md border border-omd-sand px-3 py-2" />
              </label>
            </div>

            <div className="rounded-lg border border-omd-sand bg-omd-ivory/30 p-4">
              <h2 className="font-semibold text-omd-brown">Document Placeholders</h2>
              <p className="mt-1 text-sm text-omd-muted">Enter file names or temporary URLs so admin can review the request in this MVP.</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-omd-brown">Death certificate filename<input name="deathCertificateFilename" defaultValue={deathCertificate?.filename ?? deathCertificate?.fileName ?? ""} className="h-10 rounded-md border border-omd-sand px-3" /></label>
                <label className="grid gap-2 text-sm font-medium text-omd-brown">Death certificate URL<input name="deathCertificateUrl" defaultValue={deathCertificate?.fileUrl ?? ""} className="h-10 rounded-md border border-omd-sand px-3" /></label>
                <label className="grid gap-2 text-sm font-medium text-omd-brown">Applicant ID filename<input name="applicantIdFilename" defaultValue={applicantId?.filename ?? applicantId?.fileName ?? ""} className="h-10 rounded-md border border-omd-sand px-3" /></label>
                <label className="grid gap-2 text-sm font-medium text-omd-brown">Applicant ID URL<input name="applicantIdUrl" defaultValue={applicantId?.fileUrl ?? ""} className="h-10 rounded-md border border-omd-sand px-3" /></label>
                <label className="grid gap-2 text-sm font-medium text-omd-brown">Relation proof filename<input name="relationProofFilename" defaultValue={relationProof?.filename ?? relationProof?.fileName ?? ""} className="h-10 rounded-md border border-omd-sand px-3" /></label>
                <label className="grid gap-2 text-sm font-medium text-omd-brown">Relation proof URL<input name="relationProofUrl" defaultValue={relationProof?.fileUrl ?? ""} className="h-10 rounded-md border border-omd-sand px-3" /></label>
                <label className="grid gap-2 text-sm font-medium text-omd-brown">Other document filename<input name="otherDocumentFilename" defaultValue={otherDocument?.filename ?? otherDocument?.fileName ?? ""} className="h-10 rounded-md border border-omd-sand px-3" /></label>
                <label className="grid gap-2 text-sm font-medium text-omd-brown">Other document URL<input name="otherDocumentUrl" defaultValue={otherDocument?.fileUrl ?? ""} className="h-10 rounded-md border border-omd-sand px-3" /></label>
              </div>
            </div>

            <div className="flex justify-end">
              <SubmitButton />
            </div>
          </form>
        </Panel>

        <Panel className="h-fit lg:sticky lg:top-20">
          <h2 className="text-xl font-semibold text-omd-brown">Application Summary</h2>
          <div className="mt-4 grid gap-3">
            <SummaryRow label="Location" value={application.location?.name ?? application.preferredLocation ?? "Not set"} />
            <SummaryRow label="Package" value={application.package?.name ?? "Asthi package"} />
            <SummaryRow label="Applicant" value={application.applicantName} />
            <SummaryRow label="Documents" value={`${application.documents.length} record(s)`} />
          </div>
          <p className="mt-5 rounded-md border border-omd-sand bg-omd-ivory/40 p-3 text-sm leading-6 text-omd-muted">
            Once submitted, the application moves to document review for admin action.
          </p>
        </Panel>
      </section>
    </div>
  );
}
