import { getCurrentUser } from "@/lib/auth/session";
import {
  createCustomerKundliReportDownload,
  KundliReportAccessDeniedError,
  KundliReportUnavailableError
} from "@/lib/kundli-report-access";

type RouteProps = { params: Promise<{ documentId: string }> };

export async function GET(_request: Request, { params }: RouteProps) {
  const user = await getCurrentUser();
  if (!user) return new Response("Not found.", { status: 404 });
  try {
    const { documentId } = await params;
    const url = await createCustomerKundliReportDownload({ documentId, userId: user.id });
    return new Response(null, { status: 303, headers: { Location: url, "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof KundliReportAccessDeniedError) return new Response("Not found.", { status: 404 });
    if (error instanceof KundliReportUnavailableError) return new Response("Report temporarily unavailable.", { status: 503 });
    return new Response("Report temporarily unavailable.", { status: 503 });
  }
}
