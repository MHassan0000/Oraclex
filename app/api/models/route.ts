import { NextResponse } from "next/server";

import { getUser } from "@/lib/auth/session";
import { MODEL_LIST } from "@/lib/ai/models";
import { getAvailableOpenRouterModels } from "@/lib/ai/openrouter";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const models = await getAvailableOpenRouterModels();
    return NextResponse.json({ models });
  } catch (error) {
    console.warn("Failed to load OpenRouter model catalog:", error);
    return NextResponse.json({ models: MODEL_LIST });
  }
}
