import { AlertTriangle, Database, FileSearch, Gauge, Layers3 } from "lucide-react";

import { getDocumentsAction } from "@/lib/actions/document-actions";
import { requireUser } from "@/lib/auth/session";

export default async function RetrievalPage() {
  await requireUser("/retrieval");

  const documents = await getDocumentsAction().catch(() => []);
  const ready = documents.filter((document) => document.status === "ready").length;
  const processing = documents.filter((document) => document.status === "processing").length;
  const failed = documents.filter((document) => document.status === "failed").length;
  const totalTokens = documents.reduce((sum, document) => sum + (document.token_count ?? 0), 0);

  const metrics = [
    { label: "Ready documents", value: ready.toLocaleString(), icon: Database },
    { label: "Processing", value: processing.toLocaleString(), icon: Gauge },
    { label: "Failed", value: failed.toLocaleString(), icon: AlertTriangle },
    { label: "Indexed tokens", value: totalTokens.toLocaleString(), icon: Layers3 },
  ];

  return (
    <div className="min-w-0 space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
              <FileSearch className="h-3.5 w-3.5" /> Retrieval Engine
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Monitor how your knowledge base is retrieved and grounded.
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              Oraclex uses upload ingestion, chunking, embeddings, pgvector similarity search,
              reranking, memory, and citations to ground every answer in your documents.
            </p>
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-4 text-2xl font-semibold text-foreground">{metric.value}</p>
            </div>
          );
        })}
      </section>

      <section className="min-w-0 rounded-[2rem] border border-border/60 bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Indexed sources</h2>
            <p className="text-sm text-muted-foreground">
              Document readiness for semantic retrieval.
            </p>
          </div>
        </div>
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="pb-3 font-medium">Document</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 text-right font-medium">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {documents.length ? (
                documents.slice(0, 12).map((document) => (
                  <tr key={document.id} className="border-b border-border/40 last:border-0">
                    <td className="max-w-[18rem] truncate py-4 font-medium text-foreground">
                      {document.title}
                    </td>
                    <td className="py-4 capitalize text-muted-foreground">{document.status}</td>
                    <td className="py-4 text-muted-foreground">
                      {document.file_type ?? "unknown"}
                    </td>
                    <td className="py-4 text-right text-muted-foreground">
                      {(document.token_count ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-muted-foreground">
                    Upload documents in Knowledge to activate retrieval monitoring.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
