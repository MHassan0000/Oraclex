import { ReportsPageClient } from "@/components/reports/reports-page-client";
import { requireUser } from "@/lib/auth/session";
import { listReports } from "@/lib/db/reports";
import type { ReportListItem } from "@/lib/reports/types";

export default async function ReportsPage() {
  const user = await requireUser("/reports");

  let reports: ReportListItem[] = [];
  try {
    reports = await listReports(user.id);
  } catch {
    // Keep the page usable even if report metadata is temporarily unavailable.
  }

  return <ReportsPageClient initialReports={reports} />;
}
