import type { Report, ReportExport, ReportFormat, ReportSourceType } from "@/lib/db/types";

export const REPORT_FORMATS = ["pdf", "markdown", "csv"] as const satisfies readonly ReportFormat[];
export const REPORT_SOURCE_TYPES = [
  "current_chat",
  "selected_documents",
  "knowledge_base",
] as const satisfies readonly ReportSourceType[];

export type ReportCitation = {
  id: string;
  sourceNumber: number;
  documentId: string;
  documentTitle: string;
  chunkId: string;
  chunkIndex?: number;
  similarity?: number;
  excerpt: string;
};

export type StructuredReport = {
  title: string;
  executiveSummary: string;
  keyFindings: string[];
  detailedAnalysis: string;
  sources: ReportCitation[];
  conclusion: string;
  markdown: string;
};

export type ReportListItem = Report & {
  exports: ReportExport[];
};

export type GenerateReportInput = {
  sourceType: ReportSourceType;
  conversationId?: string | null;
  documentIds?: string[];
  formats?: ReportFormat[];
};

export type GeneratedReportPayload = {
  report: ReportListItem;
};

export function getReportFormatLabel(format: ReportFormat): string {
  switch (format) {
    case "pdf":
      return "PDF";
    case "markdown":
      return "Markdown";
    case "csv":
      return "CSV";
  }
}

export function getReportSourceLabel(sourceType: ReportSourceType): string {
  switch (sourceType) {
    case "current_chat":
      return "Current Chat";
    case "selected_documents":
      return "Selected Documents";
    case "knowledge_base":
      return "Entire Knowledge Base";
  }
}
