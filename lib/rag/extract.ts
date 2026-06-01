import "server-only";

import pdf from "pdf-parse";

/**
 * Extract plain text from various file formats.
 */
export async function extractText(
  buffer: Buffer,
  fileType: string,
  fileName: string,
): Promise<string> {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

  switch (true) {
    case fileType === "application/pdf" || extension === "pdf":
      return extractPdf(buffer);
    case fileType === "text/csv" || extension === "csv":
      return extractCsv(buffer);
    case fileType === "text/markdown" ||
      fileType === "text/x-markdown" ||
      extension === "md":
      return extractMarkdown(buffer);
    case fileType === "text/plain" || extension === "txt":
      return buffer.toString("utf-8");
    default:
      // Best-effort: try as UTF-8 text
      return buffer.toString("utf-8");
  }
}

async function extractPdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return cleanText(data.text);
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

function extractCsv(buffer: Buffer): string {
  const raw = buffer.toString("utf-8");
  // Convert CSV rows into readable text blocks
  const lines = raw.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return "";

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1);

  const textBlocks = rows.map((row) => {
    const values = row.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    return headers
      .map((h, i) => `${h}: ${values[i] ?? ""}`)
      .join(" | ");
  });

  return textBlocks.join("\n");
}

function extractMarkdown(buffer: Buffer): string {
  // Markdown is already text-based; strip HTML tags if present
  return buffer
    .toString("utf-8")
    .replace(/<[^>]+>/g, "")
    .trim();
}

/**
 * Clean extracted text: normalize whitespace, remove control characters.
 */
export function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}
