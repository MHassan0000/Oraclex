import { NextResponse } from "next/server";

import { getUser } from "@/lib/auth/session";
import { deleteReport } from "@/lib/db/reports";

type ReportRouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, { params }: ReportRouteContext) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await deleteReport(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Report delete error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
