import { NextRequest, NextResponse } from "next/server";

import { getUser } from "@/lib/auth/session";
import { downloadReportExport, getReportExport, incrementReportDownload } from "@/lib/db/reports";
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

function getFileName(path: string, format: ReportFormat): string {
  const name = path.split("/").pop();
  return name || `oraclex-report.${EXTENSIONS[format]}`;
}

export async function GET(request: NextRequest, { params }: ReportRouteContext) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formatResult = reportFormatSchema.safeParse(request.nextUrl.searchParams.get("format"));
    if (!formatResult.success) {
      return NextResponse.json({ error: "Invalid report format" }, { status: 400 });
    }

    const { id } = await params;
    const reportExport = await getReportExport(user.id, id, formatResult.data);
    if (!reportExport) return NextResponse.json({ error: "Report export not found" }, { status: 404 });

    const blob = await downloadReportExport(reportExport.storage_path);
    await incrementReportDownload(user.id, id, reportExport.id);

    return new Response(blob, {
      headers: {
        "Content-Type": CONTENT_TYPES[formatResult.data],
        "Content-Disposition": `attachment; filename="${getFileName(reportExport.storage_path, formatResult.data)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Report download error:", error);
    const message = error instanceof Error ? error.message : "Failed to download report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
