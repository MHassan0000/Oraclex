import "server-only";

import type { ReportCitation, StructuredReport } from "@/lib/reports/types";

const PDF_PAGE_WIDTH = 612;
const PDF_PAGE_HEIGHT = 792;
const PDF_MARGIN_X = 54;
const PDF_START_Y = 740;
const PDF_LINE_HEIGHT = 14;
const PDF_MAX_LINES_PER_PAGE = 50;
const PDF_MAX_LINE_CHARS = 92;

function escapeCsv(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function stripMarkdown(value: string): string {
  return value
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function csvRowsForCitations(citations: ReportCitation[]): string[][] {
  return citations.map((citation) => [
    "Source Citation",
    `Source ${citation.sourceNumber}`,
    citation.documentTitle,
    citation.excerpt,
  ]);
}

export function renderReportMarkdown(report: StructuredReport): string {
  return report.markdown.trim() + "\n";
}

export function renderReportCsv(report: StructuredReport): string {
  const rows = [
    ["Section", "Title", "Source", "Content"],
    ["Title", report.title, "", report.title],
    ["Executive Summary", report.title, "", report.executiveSummary],
    ...report.keyFindings.map((finding, index) => ["Key Finding", `Finding ${index + 1}`, "", finding]),
    ["Detailed Analysis", report.title, "", stripMarkdown(report.detailedAnalysis)],
    ...csvRowsForCitations(report.sources),
    ["Conclusion", report.title, "", report.conclusion],
  ];

  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n") + "\n";
}

function normalizePdfText(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");
}

function escapePdfText(value: string): string {
  return normalizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(line: string): string[] {
  const normalized = normalizePdfText(line).replace(/\s+/g, " ").trim();
  if (!normalized) return [""];

  const wrapped: string[] = [];
  let current = "";

  for (const word of normalized.split(" ")) {
    if ((current + " " + word).trim().length <= PDF_MAX_LINE_CHARS) {
      current = (current + " " + word).trim();
    } else {
      if (current) wrapped.push(current);
      current = word;
    }
  }

  if (current) wrapped.push(current);
  return wrapped;
}

function markdownToPdfLines(markdown: string): string[] {
  const lines: string[] = [];

  for (const rawLine of markdown.split(/\r?\n/)) {
    const withoutMarkdown = rawLine
      .replace(/^#{1,6}\s+/g, "")
      .replace(/^[-*]\s+/g, "- ")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1");

    lines.push(...wrapLine(withoutMarkdown));
  }

  return lines;
}

export function renderReportPdf(report: StructuredReport): Buffer {
  const lines = markdownToPdfLines(renderReportMarkdown(report));
  const pages: string[][] = [];

  for (let i = 0; i < lines.length; i += PDF_MAX_LINES_PER_PAGE) {
    pages.push(lines.slice(i, i + PDF_MAX_LINES_PER_PAGE));
  }

  if (pages.length === 0) pages.push([report.title]);

  const objects: string[] = [];
  const addObject = (content: string) => {
    objects.push(content);
    return objects.length;
  };

  const catalogRef = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesRef = addObject("PAGES_PLACEHOLDER");
  const fontRef = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageRefs: number[] = [];

  for (const pageLines of pages) {
    const textOps = pageLines
      .map((line, index) => {
        const y = PDF_START_Y - index * PDF_LINE_HEIGHT;
        return `BT /F1 10 Tf ${PDF_MARGIN_X} ${y} Td (${escapePdfText(line)}) Tj ET`;
      })
      .join("\n");
    const contentRef = addObject(`<< /Length ${Buffer.byteLength(textOps)} >>\nstream\n${textOps}\nendstream`);
    const pageRef = addObject(
      `<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRef} 0 R >> >> /Contents ${contentRef} 0 R >>`,
    );
    pageRefs.push(pageRef);
  }

  objects[pagesRef - 1] = `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogRef} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf-8");
}
