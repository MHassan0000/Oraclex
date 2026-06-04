import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Report, ReportExport, ReportFormat } from "@/lib/db/types";
import type { ReportListItem } from "@/lib/reports/types";

const REPORTS_BUCKET = "reports";

export async function listReports(userId: string): Promise<ReportListItem[]> {
  const supabase = await createServerSupabaseClient();
  const { data: reports, error } = await supabase
    .from("reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const reportRows = (reports ?? []) as Report[];
  if (reportRows.length === 0) return [];

  const { data: exports, error: exportError } = await supabase
    .from("report_exports")
    .select("*")
    .eq("user_id", userId)
    .in(
      "report_id",
      reportRows.map((report) => report.id),
    );

  if (exportError) throw exportError;

  const exportsByReport = new Map<string, ReportExport[]>();
  for (const item of (exports ?? []) as ReportExport[]) {
    exportsByReport.set(item.report_id, [...(exportsByReport.get(item.report_id) ?? []), item]);
  }

  return reportRows.map((report) => ({ ...report, exports: exportsByReport.get(report.id) ?? [] }));
}

export async function getReport(userId: string, reportId: string): Promise<ReportListItem | null> {
  const supabase = await createServerSupabaseClient();
  const { data: report, error } = await supabase
    .from("reports")
    .select("*")
    .eq("user_id", userId)
    .eq("id", reportId)
    .maybeSingle();

  if (error) throw error;
  if (!report) return null;

  const { data: exports, error: exportError } = await supabase
    .from("report_exports")
    .select("*")
    .eq("user_id", userId)
    .eq("report_id", reportId);

  if (exportError) throw exportError;

  return { ...(report as Report), exports: (exports ?? []) as ReportExport[] };
}

export async function getReportExport(
  userId: string,
  reportId: string,
  format: ReportFormat,
): Promise<ReportExport | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("report_exports")
    .select("*")
    .eq("user_id", userId)
    .eq("report_id", reportId)
    .eq("format", format)
    .maybeSingle();

  if (error) throw error;
  return (data as ReportExport | null) ?? null;
}

export async function deleteReport(userId: string, reportId: string): Promise<void> {
  const report = await getReport(userId, reportId);
  if (!report) throw new Error("Report not found");

  const admin = createAdminSupabaseClient();
  const paths = report.exports.map((item) => item.storage_path);
  if (paths.length > 0) {
    await admin.storage.from(REPORTS_BUCKET).remove(paths);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("reports").delete().eq("user_id", userId).eq("id", reportId);
  if (error) throw error;
}

export async function incrementReportDownload(
  userId: string,
  reportId: string,
  exportId: string,
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { data: report } = await supabase
    .from("reports")
    .select("export_count")
    .eq("user_id", userId)
    .eq("id", reportId)
    .maybeSingle();

  const { data: exportRow } = await supabase
    .from("report_exports")
    .select("download_count")
    .eq("user_id", userId)
    .eq("id", exportId)
    .maybeSingle();

  await supabase
    .from("reports")
    .update({ export_count: ((report?.export_count as number | undefined) ?? 0) + 1 })
    .eq("user_id", userId)
    .eq("id", reportId);

  await supabase
    .from("report_exports")
    .update({ download_count: ((exportRow?.download_count as number | undefined) ?? 0) + 1 })
    .eq("user_id", userId)
    .eq("id", exportId);
}

export async function downloadReportExport(path: string): Promise<Blob> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.storage.from(REPORTS_BUCKET).download(path);
  if (error || !data) throw new Error(error?.message ?? "Report file not found");
  return data;
}

export { REPORTS_BUCKET };
