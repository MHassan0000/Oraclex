import { NextRequest, NextResponse } from "next/server";

import { getUser } from "@/lib/auth/session";
import { getReportErrorStatus } from "@/lib/reports/errors";
import { generateReport } from "@/lib/reports/generate";
import { generateReportSchema } from "@/lib/reports/schemas";
import { validateRequestBody } from "@/lib/security/server-utils";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const validation = validateRequestBody(generateReportSchema, body);
    if (!validation.success) return validation.response;

    const report = await generateReport(user.id, validation.data);
    return NextResponse.json({ report });
  } catch (error) {
    console.error("Report generation error:", error);
    const message = error instanceof Error ? error.message : "Report generation failed";
    return NextResponse.json({ error: message }, { status: getReportErrorStatus(message) });
  }
}
