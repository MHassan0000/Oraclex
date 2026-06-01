import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/session";
import { ingestDocument } from "@/lib/rag/ingest";
import { ingestionSchema } from "@/lib/security/schemas";
import { validateRequestBody } from "@/lib/security/server-utils";
import { checkRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const rl = checkRateLimit(user.id, "ingest");
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before uploading more." },
        { status: 429, headers: rateLimitHeaders(rl.remaining, rl.resetAt) },
      );
    }

    const body = await request.json();

    // Validate & sanitize input
    const validation = validateRequestBody(ingestionSchema, body);
    if (!validation.success) return validation.response;

    const { documentId, fileUrl, fileName, fileType } = validation.data;

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
      { error: "Ingestion failed" },
      { status: 500 },
    );
  }
}
