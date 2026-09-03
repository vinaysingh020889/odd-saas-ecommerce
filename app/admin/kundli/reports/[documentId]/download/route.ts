import { getCurrentUser } from "@/lib/auth/session";
import {
  createAdminKundliReportDownload,
  KundliReportAccessDeniedError,
  KundliReportUnavailableError
} from "@/lib/kundli-report-access";

type RouteProps = { params: Promise<{ documentId: string }> };
const ADMIN_REPORT_ROLES = new Set(["SUPER_ADMIN", "OPERATIONS_ADMIN"]);

export async function GET(_request: Request, { params }: RouteProps) {
  const user = await getCurrentUser();
  if (!user?.roles.some((role) => ADMIN_REPORT_ROLES.has(role))) return new Response("Not found.", { status: 404 });
  try {
    const { documentId } = await params;
    const url = await createAdminKundliReportDownload({ documentId, adminId: user.id });
    return new Response(null, { status: 303, headers: { Location: url, "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof KundliReportAccessDeniedError) return new Response("Not found.", { status: 404 });
    if (error instanceof KundliReportUnavailableError) return new Response("Report temporarily unavailable.", { status: 503 });
    return new Response("Report temporarily unavailable.", { status: 503 });
  }
}
