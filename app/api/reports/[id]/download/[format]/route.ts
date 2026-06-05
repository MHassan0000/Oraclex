import { NextResponse } from "next/server";

import { getUser } from "@/lib/auth/session";
import { downloadReportExport, getReportExport, incrementReportDownload } from "@/lib/db/reports";
import { getReportErrorStatus } from "@/lib/reports/errors";
import { reportFormatSchema } from "@/lib/reports/schemas";
import type { ReportFormat } from "@/lib/db/types";

type ReportDownloadRouteContext = {
  params: Promise<{ id: string; format: string }>;
};

const CONTENT_TYPES: Record<ReportFormat, string> = {
  pdf: "application/pdf",
  markdown: "text/markdown; charset=utf-8",
  csv: "text/csv; charset=utf-8",
};

const EXTENSIONS: Record<ReportFormat, string> = {
  pdf: "pdf",
  markdown: "md",
  csv: "csv",
};

function getFileName(path: string, format: ReportFormat): string {
  return path.split("/").pop() || `oraclex-report.${EXTENSIONS[format]}`;
}

export async function GET(_request: Request, { params }: ReportDownloadRouteContext) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, format } = await params;
    const formatResult = reportFormatSchema.safeParse(format);
    if (!formatResult.success) {
      return NextResponse.json({ error: "Invalid report format" }, { status: 400 });
    }

    const reportExport = await getReportExport(user.id, id, formatResult.data);
    if (!reportExport) return NextResponse.json({ error: "Report export not found" }, { status: 404 });

    const blob = await downloadReportExport(reportExport.storage_path);
    await incrementReportDownload(user.id, id, reportExport.id);

    return new Response(blob, {
      headers: {
        "Content-Type": CONTENT_TYPES[reportExport.format],
        "Content-Disposition": `attachment; filename="${getFileName(reportExport.storage_path, reportExport.format)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Report download error:", error);
    const message = error instanceof Error ? error.message : "Failed to download report";
    return NextResponse.json({ error: message }, { status: getReportErrorStatus(message) });
  }
}
