import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { DEFAULT_MODEL } from "@/lib/ai/models";
import { createCompletion, estimateTokens } from "@/lib/ai/openrouter";
import { multiQueryRetrieve, rerankResults, type RetrievalResult } from "@/lib/rag/retrieve";
import type { Document, Message, Report, ReportExport, ReportFormat } from "@/lib/db/types";
import { REPORTS_BUCKET, deleteReport, getReport } from "@/lib/db/reports";
import { renderReportCsv, renderReportMarkdown, renderReportPdf } from "@/lib/reports/exporters";
import {
  REPORT_FORMATS,
  type GenerateReportInput,
  type ReportCitation,
  type ReportListItem,
  type StructuredReport,
} from "@/lib/reports/types";

const MAX_REPORT_DOCUMENTS = 20;
const MAX_CONTEXT_CHUNKS = 18;
const MAX_CHAT_MESSAGES = 40;

type ReportContext = {
  scopeLabel: string;
  transcript: string;
  contextBlock: string;
  citations: ReportCitation[];
  documentIds: string[];
  conversationId: string | null;
};

function normalizeFormats(formats: ReportFormat[] | undefined): ReportFormat[] {
  const values = formats?.length ? formats : [...REPORT_FORMATS];
  return REPORT_FORMATS.filter((format) => values.includes(format));
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "oraclex-report";
}

function getChunkIndex(metadata: Record<string, unknown> | null | undefined): number | undefined {
  const index = metadata?.chunkIndex ?? metadata?.chunk_index;
  return typeof index === "number" ? index : undefined;
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;
}

function dedupeResults(results: RetrievalResult[]): RetrievalResult[] {
  const byChunk = new Map<string, RetrievalResult>();
  for (const result of results) {
    const current = byChunk.get(result.chunk_id);
    if (!current || result.similarity > current.similarity) {
      byChunk.set(result.chunk_id, result);
    }
  }
  return Array.from(byChunk.values()).sort((a, b) => b.similarity - a.similarity);
}

async function fetchDocuments(userId: string, documentIds?: string[]): Promise<Document[]> {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(MAX_REPORT_DOCUMENTS);

  if (documentIds?.length) query = query.in("id", documentIds);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Document[];
}

async function fetchDirectChunks(
  userId: string,
  documentIds: string[] | undefined,
  limit: number,
): Promise<RetrievalResult[]> {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("document_chunks")
    .select("id, document_id, chunk_index, content, metadata")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (documentIds?.length) query = query.in("document_id", documentIds);

  const { data, error } = await query;
  if (error) throw error;

  return (
    (data ?? []) as Array<{
      id: string;
      document_id: string;
      chunk_index: number;
      content: string;
      metadata: Record<string, unknown>;
    }>
  ).map((chunk, index) => ({
    chunk_id: chunk.id,
    document_id: chunk.document_id,
    content: chunk.content,
    metadata: { ...(chunk.metadata ?? {}), chunkIndex: chunk.chunk_index },
    similarity: Math.max(0.35, 0.8 - index * 0.02),
    rank: index + 1,
  }));
}

async function fetchDocumentTitleMap(
  userId: string,
  documentIds: string[],
): Promise<Record<string, string>> {
  if (documentIds.length === 0) return {};

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, title")
    .eq("user_id", userId)
    .in("id", documentIds);

  if (error) throw error;
  return Object.fromEntries(((data ?? []) as Array<{ id: string; title: string }>).map((doc) => [doc.id, doc.title]));
}

function buildCitations(
  results: RetrievalResult[],
  titleMap: Record<string, string>,
): ReportCitation[] {
  return results.slice(0, MAX_CONTEXT_CHUNKS).map((result, index) => ({
    id: `source-${index + 1}`,
    sourceNumber: index + 1,
    documentId: result.document_id,
    documentTitle: titleMap[result.document_id] ?? "Knowledge Base Document",
    chunkId: result.chunk_id,
    chunkIndex: getChunkIndex(result.metadata),
    similarity: result.similarity,
    excerpt: truncate(result.content.replace(/\s+/g, " "), 360),
  }));
}

function buildContextBlock(results: RetrievalResult[], citations: ReportCitation[]): string {
  if (results.length === 0) return "";

  const entries = results.slice(0, MAX_CONTEXT_CHUNKS).map((result, index) => {
    const citation = citations[index];
    return `[Source ${citation.sourceNumber}] ${citation.documentTitle} (relevance: ${(result.similarity * 100).toFixed(1)}%, chunk: ${citation.chunkIndex ?? "?"})\n${result.content}`;
  });

  return `<retrieved_context>\n${entries.join("\n\n---\n\n")}\n</retrieved_context>`;
}

async function buildCurrentChatContext(userId: string, conversationId: string): Promise<ReportContext> {
  const supabase = await createServerSupabaseClient();
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, title")
    .eq("user_id", userId)
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError) throw conversationError;
  if (!conversation) throw new Error("Conversation not found");

  const { data: messages, error: messageError } = await supabase
    .from("messages")
    .select("role, content, created_at")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (messageError) throw messageError;

  const transcript = ((messages ?? []) as Pick<Message, "role" | "content" | "created_at">[])
    .slice(-MAX_CHAT_MESSAGES)
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n\n");

  const query = truncate(
    [conversation.title, transcript]
      .filter(Boolean)
      .join("\n")
      .replace(/\s+/g, " "),
    3000,
  );
  const retrieved = query
    ? await multiQueryRetrieve([query, "key findings detailed analysis cited evidence"], {
        userId,
        matchCount: MAX_CONTEXT_CHUNKS,
      })
    : [];
  const direct = retrieved.length ? [] : await fetchDirectChunks(userId, undefined, 8);
  const results = dedupeResults(rerankResults([...retrieved, ...direct], query || "report"));
  const titleMap = await fetchDocumentTitleMap(userId, [...new Set(results.map((item) => item.document_id))]);
  const citations = buildCitations(results, titleMap);

  return {
    scopeLabel: `Current chat: ${conversation.title}`,
    transcript,
    contextBlock: buildContextBlock(results, citations),
    citations,
    documentIds: [...new Set(results.map((item) => item.document_id))],
    conversationId,
  };
}

async function buildDocumentContext(userId: string, documentIds: string[]): Promise<ReportContext> {
  const documents = await fetchDocuments(userId, documentIds);
  if (documents.length === 0) throw new Error("No ready documents were found for report generation");

  const requestedIds = new Set(documentIds);
  const ownedIds = documents.map((document) => document.id);
  if (requestedIds.size !== ownedIds.length) {
    throw new Error("One or more selected documents are unavailable or still processing");
  }

  const retrievedBatches = await Promise.all(
    documents.map((document) =>
      multiQueryRetrieve(
        [
          `${document.title} executive summary key findings detailed analysis conclusion`,
          `${document.title} important evidence sources citations`,
        ],
        { userId, filterDocumentId: document.id, matchCount: 8 },
      ),
    ),
  );
  const retrieved = retrievedBatches.flat();
  const direct = retrieved.length ? [] : await fetchDirectChunks(userId, ownedIds, MAX_CONTEXT_CHUNKS);
  const query = documents.map((document) => document.title).join(" ");
  const results = dedupeResults(rerankResults([...retrieved, ...direct], query || "report"));
  const titleMap = Object.fromEntries(documents.map((document) => [document.id, document.title]));
  const citations = buildCitations(results, titleMap);

  return {
    scopeLabel: `Selected documents: ${documents.map((document) => document.title).join(", ")}`,
    transcript: "",
    contextBlock: buildContextBlock(results, citations),
    citations,
    documentIds: ownedIds,
    conversationId: null,
  };
}

async function buildKnowledgeBaseContext(userId: string): Promise<ReportContext> {
  const documents = await fetchDocuments(userId);
  if (documents.length === 0) throw new Error("No ready documents were found in the knowledge base");

  const retrieved = await multiQueryRetrieve(
    [
      "executive summary key findings detailed analysis conclusion",
      "important evidence risks opportunities citations sources",
      documents.map((document) => document.title).join(" "),
    ],
    { userId, matchCount: MAX_CONTEXT_CHUNKS },
  );
  const direct = retrieved.length ? [] : await fetchDirectChunks(userId, documents.map((document) => document.id), MAX_CONTEXT_CHUNKS);
  const results = dedupeResults(rerankResults([...retrieved, ...direct], "knowledge base report"));
  const titleMap = Object.fromEntries(documents.map((document) => [document.id, document.title]));
  const citations = buildCitations(results, titleMap);

  return {
    scopeLabel: `Entire knowledge base (${documents.length} ready documents)`,
    transcript: "",
    contextBlock: buildContextBlock(results, citations),
    citations,
    documentIds: documents.map((document) => document.id),
    conversationId: null,
  };
}

async function buildReportContext(input: GenerateReportInput, userId: string): Promise<ReportContext> {
  switch (input.sourceType) {
    case "current_chat":
      if (!input.conversationId) throw new Error("Select an active chat before generating a chat report");
      return buildCurrentChatContext(userId, input.conversationId);
    case "selected_documents":
      if (!input.documentIds?.length) throw new Error("Select at least one document for the report");
      if (input.documentIds.length > MAX_REPORT_DOCUMENTS) {
        throw new Error(`Select ${MAX_REPORT_DOCUMENTS} or fewer documents`);
      }
      return buildDocumentContext(userId, input.documentIds);
    case "knowledge_base":
      return buildKnowledgeBaseContext(userId);
  }
}

function extractSection(markdown: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`##\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, "i");
  return regex.exec(markdown)?.[1]?.trim() ?? "";
}

function extractTitle(markdown: string): string {
  const title = /^#\s+(.+)$/m.exec(markdown)?.[1]?.trim();
  return title ? truncate(title, 180) : "Oraclex Report";
}

function extractFindings(markdown: string): string[] {
  const section = extractSection(markdown, "Key Findings");
  const findings = section
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean);
  return findings.length ? findings : [section].filter(Boolean);
}

function ensureReportMarkdown(markdown: string, citations: ReportCitation[]): string {
  const trimmed = markdown.trim();
  const title = extractTitle(trimmed);
  const sections = [
    "Executive Summary",
    "Key Findings",
    "Detailed Analysis",
    "Sources & Citations",
    "Conclusion",
  ];
  let next = trimmed.startsWith("# ") ? trimmed : `# ${title}\n\n${trimmed}`;

  for (const section of sections) {
    if (!new RegExp(`^##\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "im").test(next)) {
      const fallback = section === "Sources & Citations"
        ? citations.map((citation) => `- [Source ${citation.sourceNumber}] ${citation.documentTitle}: ${citation.excerpt}`).join("\n")
        : "Not enough source-grounded information was available for this section.";
      next += `\n\n## ${section}\n${fallback}`;
    }
  }

  return next.trim();
}

function parseStructuredReport(markdown: string, citations: ReportCitation[]): StructuredReport {
  const safeMarkdown = ensureReportMarkdown(markdown, citations);
  return {
    title: extractTitle(safeMarkdown),
    executiveSummary: extractSection(safeMarkdown, "Executive Summary"),
    keyFindings: extractFindings(safeMarkdown),
    detailedAnalysis: extractSection(safeMarkdown, "Detailed Analysis"),
    sources: citations,
    conclusion: extractSection(safeMarkdown, "Conclusion"),
    markdown: safeMarkdown,
  };
}

async function generateStructuredReport(context: ReportContext): Promise<{
  structured: StructuredReport;
  inputTokens: number;
  outputTokens: number;
}> {
  const sourceList = context.citations
    .map((citation) => `[Source ${citation.sourceNumber}] ${citation.documentTitle}: ${citation.excerpt}`)
    .join("\n");
  const userPrompt = `Generate a production-quality structured report from the Oraclex RAG context.

Report scope: ${context.scopeLabel}

${context.transcript ? `<chat_transcript>\n${context.transcript}\n</chat_transcript>\n\n` : ""}${context.contextBlock}

Available citations:
${sourceList || "No source citations available."}

Output exactly this Markdown structure:
# Title
## Executive Summary
## Key Findings
## Detailed Analysis
## Sources & Citations
## Conclusion

Rules:
- Ground every substantive claim in the provided chat transcript or retrieved context.
- Use [Source N] citation markers in the relevant sections.
- In Sources & Citations, list every source used with its source number and document title.
- If context is limited, state the limitation clearly instead of inventing facts.`;

  const result = await createCompletion({
    model: DEFAULT_MODEL,
    messages: [{ role: "user", content: userPrompt }],
    systemPrompt:
      "You are Oraclex Report Builder. Create accurate, source-grounded business reports for a RAG platform. Never fabricate facts outside the provided context. Preserve citation numbers exactly.",
    temperature: 0.25,
    maxTokens: 3600,
  });

  return {
    structured: parseStructuredReport(result.content, context.citations),
    inputTokens: result.inputTokens || estimateTokens(userPrompt),
    outputTokens: result.outputTokens || estimateTokens(result.content),
  };
}

function getExportPayload(format: ReportFormat, report: StructuredReport): { body: Buffer; contentType: string; extension: string } {
  switch (format) {
    case "pdf":
      return { body: renderReportPdf(report), contentType: "application/pdf", extension: "pdf" };
    case "markdown":
      return { body: Buffer.from(renderReportMarkdown(report), "utf-8"), contentType: "text/markdown", extension: "md" };
    case "csv":
      return { body: Buffer.from(renderReportCsv(report), "utf-8"), contentType: "text/csv", extension: "csv" };
  }
}

async function uploadReportExports(
  userId: string,
  reportId: string,
  title: string,
  formats: ReportFormat[],
  structured: StructuredReport,
): Promise<ReportExport[]> {
  const admin = createAdminSupabaseClient();
  const supabase = await createServerSupabaseClient();
  const slug = slugify(title);
  const rows: Array<{
    user_id: string;
    report_id: string;
    format: ReportFormat;
    storage_path: string;
    file_size: number;
  }> = [];

  for (const format of formats) {
    const payload = getExportPayload(format, structured);
    const storagePath = `${userId}/${reportId}/${slug}.${payload.extension}`;
    const { error } = await admin.storage.from(REPORTS_BUCKET).upload(storagePath, payload.body, {
      contentType: payload.contentType,
      upsert: true,
    });
    if (error) throw new Error(`Failed to upload ${format} export: ${error.message}`);

    rows.push({
      user_id: userId,
      report_id: reportId,
      format,
      storage_path: storagePath,
      file_size: payload.body.byteLength,
    });
  }

  await supabase.from("report_exports").delete().eq("user_id", userId).eq("report_id", reportId);
  const { data, error } = await supabase.from("report_exports").insert(rows).select("*");
  if (error) throw error;
  return (data ?? []) as ReportExport[];
}

async function removeExistingExports(userId: string, report: ReportListItem): Promise<void> {
  const paths = report.exports.map((item) => item.storage_path);
  if (paths.length === 0) return;

  const admin = createAdminSupabaseClient();
  await admin.storage.from(REPORTS_BUCKET).remove(paths);
}

type GenerateReportOptions = {
  replaceReportId?: string;
};

export async function generateReport(
  userId: string,
  input: GenerateReportInput,
  options: GenerateReportOptions = {},
): Promise<ReportListItem> {
  const start = Date.now();
  const formats = normalizeFormats(input.formats);
  const context = await buildReportContext(input, userId);
  const { structured, inputTokens, outputTokens } = await generateStructuredReport(context);
  const generationTimeMs = Date.now() - start;
  const supabase = await createServerSupabaseClient();

  let report: Report;

  if (options.replaceReportId) {
    const existingReport = await getReport(userId, options.replaceReportId);
    if (!existingReport) throw new Error("Report not found");
    await removeExistingExports(userId, existingReport);

    const { data, error } = await supabase
      .from("reports")
      .update({
        title: structured.title,
        source_type: input.sourceType,
        conversation_id: context.conversationId,
        document_ids: context.documentIds,
        formats,
        status: "completed",
        executive_summary: structured.executiveSummary,
        content_markdown: structured.markdown,
        structured,
        source_citations: structured.sources,
        generation_time_ms: generationTimeMs,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        last_generated_at: new Date().toISOString(),
        metadata: { scopeLabel: context.scopeLabel },
      })
      .eq("user_id", userId)
      .eq("id", options.replaceReportId)
      .select("*")
      .single();

    if (error) throw error;
    report = data as Report;
  } else {
    const { data, error } = await supabase
      .from("reports")
      .insert({
        user_id: userId,
        title: structured.title,
        source_type: input.sourceType,
        conversation_id: context.conversationId,
        document_ids: context.documentIds,
        formats,
        status: "completed",
        executive_summary: structured.executiveSummary,
        content_markdown: structured.markdown,
        structured,
        source_citations: structured.sources,
        generation_time_ms: generationTimeMs,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        metadata: { scopeLabel: context.scopeLabel },
      })
      .select("*")
      .single();

    if (error) throw error;
    report = data as Report;
  }

  try {
    const exports = await uploadReportExports(userId, report.id, report.title, formats, structured);
    return { ...report, exports };
  } catch (error) {
    if (!options.replaceReportId) {
      await supabase.from("reports").delete().eq("user_id", userId).eq("id", report.id);
    } else {
      await supabase
        .from("reports")
        .update({ status: "failed", metadata: { error: error instanceof Error ? error.message : "Export upload failed" } })
        .eq("user_id", userId)
        .eq("id", report.id);
    }
    throw error;
  }
}

export async function regenerateReport(userId: string, reportId: string): Promise<ReportListItem> {
  const report = await getReport(userId, reportId);
  if (!report) throw new Error("Report not found");

  return generateReport(
    userId,
    {
      sourceType: report.source_type,
      conversationId: report.conversation_id,
      documentIds: report.document_ids,
      formats: report.formats,
    },
    { replaceReportId: report.id },
  );
}

export { deleteReport };
