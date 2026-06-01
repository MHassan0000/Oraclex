import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/session";
import { executeWorkflow } from "@/lib/agent/orchestrator";
import { DEFAULT_MODEL } from "@/lib/ai/models";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, message, model = DEFAULT_MODEL } = body;

    if (!conversationId || !message) {
      return NextResponse.json(
        { error: "Missing required fields: conversationId, message" },
        { status: 400 },
      );
    }

    // Execute the full LangGraph workflow and return SSE stream
    return await executeWorkflow(conversationId, user.id, message, model);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat completion failed" },
      { status: 500 },
    );
  }
}
