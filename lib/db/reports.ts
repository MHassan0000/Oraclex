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

export async function getReportExports(userId: string, reportId: string): Promise<ReportExport[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("report_exports")
    .select("*")
    .eq("user_id", userId)
    .eq("report_id", reportId);

  if (error) throw error;
  return (data ?? []) as ReportExport[];
}

export async function deleteReport(userId: string, reportId: string): Promise<void> {
  const report = await getReport(userId, reportId);
  if (!report) throw new Error("Report not found");

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("reports").delete().eq("user_id", userId).eq("id", reportId);
  if (error) throw error;

  const paths = [...new Set(report.exports.map((item) => item.storage_path))];
  if (paths.length > 0) {
    const admin = createAdminSupabaseClient();
    const { error: storageError } = await admin.storage.from(REPORTS_BUCKET).remove(paths);
    if (storageError) {
      console.warn("Failed to remove report export files after deleting report:", storageError);
    }
  }
}

export async function incrementReportDownload(
  userId: string,
  reportId: string,
  exportId: string,
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("export_count")
    .eq("user_id", userId)
    .eq("id", reportId)
    .maybeSingle();

  if (reportError) {
    console.warn("Failed to read report download count:", reportError);
    return;
  }

  const { data: exportRow, error: exportError } = await supabase
    .from("report_exports")
    .select("download_count")
    .eq("user_id", userId)
    .eq("report_id", reportId)
    .eq("id", exportId)
    .maybeSingle();

  if (exportError) {
    console.warn("Failed to read report export download count:", exportError);
    return;
  }

  if (!report || !exportRow) return;

  const { error: reportUpdateError } = await supabase
    .from("reports")
    .update({ export_count: ((report?.export_count as number | undefined) ?? 0) + 1 })
    .eq("user_id", userId)
    .eq("id", reportId);

  if (reportUpdateError) {
    console.warn("Failed to update report download count:", reportUpdateError);
  }

  const { error: exportUpdateError } = await supabase
    .from("report_exports")
    .update({ download_count: ((exportRow?.download_count as number | undefined) ?? 0) + 1 })
    .eq("user_id", userId)
    .eq("report_id", reportId)
    .eq("id", exportId);

  if (exportUpdateError) {
    console.warn("Failed to update report export download count:", exportUpdateError);
  }
}

export async function downloadReportExport(path: string): Promise<Blob> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.storage.from(REPORTS_BUCKET).download(path);
  if (error || !data) throw new Error(error?.message ?? "Report file not found");
  return data;
}

export { REPORTS_BUCKET };
