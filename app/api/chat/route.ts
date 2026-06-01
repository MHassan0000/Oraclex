import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  retrieveChunks,
  multiQueryRetrieve,
  rerankResults,
  compressContext,
} from "@/lib/rag/retrieve";
import { generateMultiQueries } from "@/lib/ai/rag-service";
import {
  createCompletion,
  createStreamingCompletion,
  calculateCost,
  type ChatCompletionMessage,
} from "@/lib/ai/openrouter";
import { DEFAULT_MODEL } from "@/lib/ai/models";
import type { Message } from "@/lib/db/types";

const RAG_SYSTEM_PROMPT = `You are Oraclex, an advanced AI assistant powered by a Retrieval-Augmented Generation (RAG) system. Your responses are grounded in the user's knowledge base.

Guidelines:
- Base your answers primarily on the provided context from the user's documents
- When the context contains relevant information, cite it naturally in your response
- If the context doesn't contain enough information to answer fully, say so clearly
- Never fabricate information not present in the provided context
- Be concise, accurate, and helpful
- Use markdown formatting for readability (headers, lists, code blocks, bold)
- If asked about topics outside the provided context, acknowledge the limitation`;

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      conversationId,
      message,
      model = DEFAULT_MODEL,
      temperature = 0.4,
      stream = true,
    } = body;

    if (!conversationId || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();

    // 1. Save user message
    const { data: userMsg, error: userMsgError } = await supabase
      .from("messages")
      .insert({
        user_id: user.id,
        conversation_id: conversationId,
        role: "user",
        content: message,
        status: "complete",
      })
      .select()
      .single();

    if (userMsgError) throw userMsgError;

    // Update conversation timestamp
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    // 2. Multi-query retrieval
    let contexts;
    try {
      const queries = await generateMultiQueries(message);
      const rawResults = await multiQueryRetrieve(queries, { matchCount: 8 });
      const reranked = rerankResults(rawResults, message);

      contexts = reranked.map((r) => ({
        chunkId: r.chunk_id,
        documentId: r.document_id,
        content: compressContext(r.content, message),
        similarity: r.similarity,
        metadata: r.metadata,
      }));
    } catch {
      // If retrieval fails, continue without context
      contexts = [];
    }

    // 3. Build conversation history
    const { data: historyData } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    const history: ChatCompletionMessage[] = (historyData ?? [])
      .filter((m: any) => m.role === "user" || m.role === "assistant")
      .map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // 4. Build context block
    let contextBlock = "";
    if (contexts.length > 0) {
      const entries = contexts
        .map(
          (ctx, i) =>
            `[Document ${i + 1}] (relevance: ${(ctx.similarity * 100).toFixed(1)}%)\n${ctx.content}`,
        )
        .join("\n\n---\n\n");
      contextBlock = `\n\n<retrieved_context>\n${entries}\n</retrieved_context>`;
    }

    const systemPrompt = RAG_SYSTEM_PROMPT + contextBlock;

    // 5. Generate response
    if (stream) {
      // Create placeholder assistant message
      const { data: assistantMsg } = await supabase
        .from("messages")
        .insert({
          user_id: user.id,
          conversation_id: conversationId,
          role: "assistant",
          content: "",
          status: "streaming",
          model,
        })
        .select()
        .single();

      const readableStream = await createStreamingCompletion({
        model,
        messages: history,
        systemPrompt,
        temperature,
        stream: true,
      });

      // Wrap stream to collect full content and update DB on completion
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      let fullContent = "";

      const transformedStream = new ReadableStream({
        async start(controller) {
          const reader = readableStream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const text = decoder.decode(value, { stream: true });
              controller.enqueue(value);

              // Parse SSE data to collect content
              const lines = text.split("\n");
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  try {
                    const parsed = JSON.parse(line.slice(6));
                    if (parsed.content) fullContent += parsed.content;
                  } catch {
                    // skip
                  }
                }
              }
            }

            // Update assistant message with full content
            if (assistantMsg) {
              await supabase
                .from("messages")
                .update({
                  content: fullContent,
                  status: "complete",
                })
                .eq("id", assistantMsg.id);
            }

            // Send final event with message ID
            const finalEvent = `data: ${JSON.stringify({
              done: true,
              messageId: assistantMsg?.id,
              contexts: contexts.map((c) => ({
                documentId: c.documentId,
                similarity: c.similarity,
              })),
            })}\n\n`;
            controller.enqueue(encoder.encode(finalEvent));
            controller.close();
          } catch (error) {
            controller.error(error);
          } finally {
            reader.releaseLock();
          }
        },
      });

      return new Response(transformedStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      // Non-streaming response
      const result = await createCompletion({
        model,
        messages: history,
        systemPrompt,
        temperature,
      });

      // Save assistant message
      const { data: assistantMsg } = await supabase
        .from("messages")
        .insert({
          user_id: user.id,
          conversation_id: conversationId,
          role: "assistant",
          content: result.content,
          status: "complete",
          model: result.model,
          token_count: result.inputTokens + result.outputTokens,
          prompt_tokens: result.inputTokens,
          completion_tokens: result.outputTokens,
        })
        .select()
        .single();

      // Log usage
      const cost = calculateCost(model, result.inputTokens, result.outputTokens);
      await supabase.from("usage_logs").insert({
        user_id: user.id,
        conversation_id: conversationId,
        message_id: assistantMsg?.id,
        event_type: "chat_completion",
        tokens: result.inputTokens + result.outputTokens,
        cost_usd: cost,
        metadata: {
          model: result.model,
          latency_ms: result.latencyMs,
          contexts_used: contexts.length,
        },
      });

      return NextResponse.json({
        message: assistantMsg,
        contexts: contexts.map((c) => ({
          documentId: c.documentId,
          similarity: c.similarity,
        })),
        usage: {
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          cost,
          latencyMs: result.latencyMs,
        },
      });
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat completion failed" },
      { status: 500 },
    );
  }
}
