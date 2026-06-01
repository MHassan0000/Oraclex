import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/session";
import { ingestDocument } from "@/lib/rag/ingest";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, fileUrl, fileName, fileType } = body;

    if (!documentId || !fileUrl || !fileName || !fileType) {
      return NextResponse.json(
        { error: "Missing required fields: documentId, fileUrl, fileName, fileType" },
        { status: 400 },
      );
    }

    // Run ingestion (this will be fast enough for most documents;
    // for very large files, you'd use a queue system)
    const result = await ingestDocument(
      documentId,
      user.id,
      fileUrl,
      fileName,
      fileType,
    );

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Ingestion error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ingestion failed" },
      { status: 500 },
    );
  }
}
