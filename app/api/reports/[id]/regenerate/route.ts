import { NextResponse } from "next/server";

import { getUser } from "@/lib/auth/session";
import { getReportErrorStatus } from "@/lib/reports/errors";
import { regenerateReport } from "@/lib/reports/generate";

type ReportRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: ReportRouteContext) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const report = await regenerateReport(user.id, id);
    return NextResponse.json({ report });
  } catch (error) {
    console.error("Report regenerate error:", error);
    const message = error instanceof Error ? error.message : "Failed to regenerate report";
    return NextResponse.json({ error: message }, { status: getReportErrorStatus(message) });
  }
}
