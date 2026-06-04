import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/session";
import { executeWorkflow } from "@/lib/agent/orchestrator";
import { DEFAULT_MODEL, isAllowedModelId } from "@/lib/ai/models";
import { chatMessageSchema } from "@/lib/security/schemas";
import { validateRequestBody } from "@/lib/security/server-utils";
import { checkRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const rl = checkRateLimit(user.id, "chat");
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: rateLimitHeaders(rl.remaining, rl.resetAt) },
      );
    }

    const body = await request.json();

    // Validate & sanitize input
    const validation = validateRequestBody(chatMessageSchema, body);
    if (!validation.success) return validation.response;

    const { conversationId, message, model } = validation.data;

    const selectedModel = model && isAllowedModelId(model) ? model : DEFAULT_MODEL;

    return await executeWorkflow(conversationId, user.id, message, selectedModel);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Chat completion failed" }, { status: 500 });
  }
}
