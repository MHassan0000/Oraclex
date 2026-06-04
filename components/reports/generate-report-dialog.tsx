"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { appToast } from "@/lib/client/toast";
import type { Document, ReportFormat, ReportSourceType } from "@/lib/db/types";
import { REPORT_FORMATS, getReportFormatLabel } from "@/lib/reports/types";

type GenerateReportDialogProps = {
  currentConversationId?: string | null;
  documents: Document[];
};

const SOURCE_OPTIONS: Array<{ value: ReportSourceType; label: string; description: string }> = [
  {
    value: "current_chat",
    label: "Current Chat",
    description: "Build a report from this conversation plus retrieved supporting context.",
  },
  {
    value: "selected_documents",
    label: "Selected Documents",
    description: "Choose specific ready documents from your knowledge base.",
  },
  {
    value: "knowledge_base",
    label: "Entire Knowledge Base",
    description: "Generate a broad report from all ready uploaded documents.",
  },
];

export function GenerateReportDialog({ currentConversationId, documents }: GenerateReportDialogProps) {
  const router = useRouter();
  const readyDocuments = useMemo(() => documents.filter((document) => document.status === "ready"), [documents]);
  const [open, setOpen] = useState(false);
  const [sourceType, setSourceType] = useState<ReportSourceType>(currentConversationId ? "current_chat" : "knowledge_base");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [formats, setFormats] = useState<ReportFormat[]>([...REPORT_FORMATS]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleFormat(format: ReportFormat) {
    setFormats((current) =>
      current.includes(format) ? current.filter((item) => item !== format) : [...current, format],
    );
  }

  function toggleDocument(id: string) {
    setSelectedDocumentIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (formats.length === 0) {
      setError("Select at least one export format.");
      return;
    }

    if (sourceType === "current_chat" && !currentConversationId) {
      setError("Start or open a chat before generating a current chat report.");
      return;
    }

    if (sourceType === "selected_documents" && selectedDocumentIds.length === 0) {
      setError("Select at least one ready document.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          conversationId: sourceType === "current_chat" ? currentConversationId : null,
          documentIds: sourceType === "selected_documents" ? selectedDocumentIds : [],
          formats,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Report generation failed");

      appToast.success("Report generated");
      setOpen(false);
      router.push("/reports");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Report generation failed";
      setError(message);
      appToast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="gap-2 rounded-full" onClick={() => setOpen(true)}>
        <FileText className="h-3.5 w-3.5" /> Generate Report
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-border/70 bg-card p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Generate Report</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a cited report from chat history, selected documents, or your full knowledge base.
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} disabled={isGenerating}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Source</p>
              {SOURCE_OPTIONS.map((option) => {
                const disabled = option.value === "current_chat" && !currentConversationId;
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer gap-3 rounded-3xl border p-4 transition ${
                      sourceType === option.value ? "border-primary/50 bg-primary/5" : "border-border/60 bg-background/50"
                    } ${disabled ? "cursor-not-allowed opacity-50" : "hover:border-primary/30"}`}
                  >
                    <input
                      type="radio"
                      name="sourceType"
                      value={option.value}
                      checked={sourceType === option.value}
                      disabled={disabled || isGenerating}
                      onChange={() => setSourceType(option.value)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium text-foreground">{option.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            {sourceType === "selected_documents" ? (
              <div className="mt-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Documents</p>
                {readyDocuments.length === 0 ? (
                  <p className="rounded-3xl border border-border/60 bg-background/50 p-4 text-sm text-muted-foreground">
                    No ready documents are available yet.
                  </p>
                ) : (
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                    {readyDocuments.map((document) => (
                      <label key={document.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-background/50 p-3 hover:border-primary/30">
                        <input
                          type="checkbox"
                          checked={selectedDocumentIds.includes(document.id)}
                          disabled={isGenerating}
                          onChange={() => toggleDocument(document.id)}
                          className="mt-1"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">{document.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{document.file_name ?? document.file_type ?? "Knowledge document"}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            <div className="mt-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Exports</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {REPORT_FORMATS.map((format) => (
                  <label key={format} className="flex cursor-pointer items-center gap-2 rounded-2xl border border-border/60 bg-background/50 p-3 text-sm text-foreground hover:border-primary/30">
                    <input type="checkbox" checked={formats.includes(format)} disabled={isGenerating} onChange={() => toggleFormat(format)} />
                    {getReportFormatLabel(format)}
                  </label>
                ))}
              </div>
            </div>

            {error ? <p className="mt-4 rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" className="rounded-2xl" onClick={() => setOpen(false)} disabled={isGenerating}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2 rounded-2xl" disabled={isGenerating}>
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {isGenerating ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
