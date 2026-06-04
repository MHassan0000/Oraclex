"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Loader2, RefreshCcw, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appToast } from "@/lib/client/toast";
import type { ReportFormat } from "@/lib/db/types";
import {
  getReportFormatLabel,
  getReportSourceLabel,
  type GeneratedReportPayload,
  type ReportListItem,
} from "@/lib/reports/types";

type ReportsPageClientProps = {
  initialReports: ReportListItem[];
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function ReportsPageClient({ initialReports }: ReportsPageClientProps) {
  const router = useRouter();
  const [reports, setReports] = useState(initialReports);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredReports = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return reports;

    return reports.filter((report) =>
      [report.title, report.executive_summary, getReportSourceLabel(report.source_type)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [query, reports]);

  function downloadReport(reportId: string, format: ReportFormat) {
    window.location.href = `/api/reports/${reportId}/download?format=${format}`;
  }

  function deleteReport(reportId: string) {
    setPendingId(reportId);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Failed to delete report");

        setReports((current) => current.filter((report) => report.id !== reportId));
        appToast.success("Report deleted");
        router.refresh();
      } catch (error) {
        appToast.error(error instanceof Error ? error.message : "Failed to delete report");
      } finally {
        setPendingId(null);
      }
    });
  }

  function regenerateReport(reportId: string) {
    setPendingId(reportId);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/reports/${reportId}/regenerate`, { method: "POST" });
        const payload = (await response.json()) as Partial<GeneratedReportPayload> & { error?: string };
        if (!response.ok || !payload.report) {
          throw new Error(payload.error ?? "Failed to regenerate report");
        }

        setReports((current) => current.map((report) => (report.id === reportId ? payload.report! : report)));
        appToast.success("Report regenerated");
        router.refresh();
      } catch (error) {
        appToast.error(error instanceof Error ? error.message : "Failed to regenerate report");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-10 pt-8 sm:px-6">
      <section className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-sm sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" /> Reports
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">Generated reports</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Search, download, regenerate, or delete source-grounded reports exported from Chat Studio and your knowledge base.
        </p>
      </section>

      <section className="rounded-[2rem] border border-border/60 bg-card/60 p-4 shadow-sm sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search reports"
            className="h-12 rounded-2xl border-border/70 bg-background/70 pl-11"
          />
        </div>
      </section>

      {filteredReports.length === 0 ? (
        <section className="rounded-[2rem] border border-border/60 bg-card/50 p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">No reports found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Generate a report from Chat Studio to see it here.
          </p>
        </section>
      ) : (
        <section className="grid gap-4">
          {filteredReports.map((report) => {
            const loading = pendingId === report.id || (isPending && pendingId === report.id);
            return (
              <article key={report.id} className="rounded-[2rem] border border-border/60 bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        {getReportSourceLabel(report.source_type)}
                      </span>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                        {formatDate(report.last_generated_at)}
                      </span>
                    </div>
                    <h2 className="mt-3 truncate text-xl font-semibold text-foreground">{report.title}</h2>
                    {report.executive_summary ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {report.executive_summary}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{formatDuration(report.generation_time_ms)} generation</span>
                      <span>{(report.input_tokens + report.output_tokens).toLocaleString()} tokens</span>
                      <span>{report.export_count.toLocaleString()} downloads</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                    <Button
                      type="button"
                      variant="ghost"
                      className="gap-2 rounded-2xl"
                      disabled={loading}
                      onClick={() => regenerateReport(report.id)}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                      Regenerate
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="gap-2 rounded-2xl text-destructive hover:text-destructive"
                      disabled={loading}
                      onClick={() => deleteReport(report.id)}
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {report.exports.map((reportExport) => (
                    <Button
                      key={reportExport.id}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-2 rounded-full"
                      onClick={() => downloadReport(report.id, reportExport.format)}
                    >
                      <Download className="h-3.5 w-3.5" /> {getReportFormatLabel(reportExport.format)}
                    </Button>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
