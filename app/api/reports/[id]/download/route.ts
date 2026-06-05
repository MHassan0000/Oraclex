import { NextRequest, NextResponse } from "next/server";

import { getUser } from "@/lib/auth/session";
import {
  downloadReportExport,
  getReportExport,
  getReportExports,
  incrementReportDownload,
} from "@/lib/db/reports";
import { getReportErrorStatus } from "@/lib/reports/errors";
import { reportFormatSchema } from "@/lib/reports/schemas";
import type { ReportFormat } from "@/lib/db/types";

type ReportRouteContext = {
  params: Promise<{ id: string }>;
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

const FORMAT_PRIORITY: ReportFormat[] = ["pdf", "markdown", "csv"];

function getFileName(path: string, format: ReportFormat): string {
  const name = path.split("/").pop();
  return name || `oraclex-report.${EXTENSIONS[format]}`;
}

export async function GET(request: NextRequest, { params }: ReportRouteContext) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const requestedFormat = request.nextUrl.searchParams.get("format");
    const formatResult = reportFormatSchema.safeParse(requestedFormat);
    const reportExport = formatResult.success
      ? await getReportExport(user.id, id, formatResult.data)
      : (await getReportExports(user.id, id)).sort(
          (a, b) => FORMAT_PRIORITY.indexOf(a.format) - FORMAT_PRIORITY.indexOf(b.format),
        )[0];

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
