import { Bot, BrainCircuit, DatabaseZap, MessagesSquare, Network, Quote } from "lucide-react";

import { requireUser } from "@/lib/auth/session";
import { getWorkspaceDashboardData } from "@/lib/db/dashboard";

function statusLabel(isReady: boolean, fallback: string) {
  return isReady ? "Ready" : fallback;
}

export default async function AgentsPage() {
  await requireUser("/agents");
  const stats = await getWorkspaceDashboardData();

  const agents = [
    {
      name: "Workflow Orchestrator",
      description:
        "Coordinates input validation, memory, query expansion, retrieval, citations, streaming, and persistence.",
      icon: Network,
      status: statusLabel(stats.totalConversations > 0 || stats.totalDocuments > 0, "Configured"),
      detail: `${stats.totalConversations.toLocaleString()} conversations processed`,
    },
    {
      name: "Retrieval Agent",
      description:
        "Runs multi-query semantic search over pgvector document chunks with reranking and compression.",
      icon: DatabaseZap,
      status: statusLabel(stats.readyDocuments > 0, "Waiting for indexed documents"),
      detail: `${stats.readyDocuments.toLocaleString()} ready documents`,
    },
    {
      name: "Memory Agent",
      description:
        "Builds short-term conversation context and long-term summaries for more coherent answers.",
      icon: BrainCircuit,
      status: statusLabel(stats.totalMessages > 0, "Ready for first chat"),
      detail: `${stats.totalMessages.toLocaleString()} persisted messages`,
    },
    {
      name: "Citation Agent",
      description:
        "Maps retrieved chunks to source cards so answers can show grounded document citations.",
      icon: Quote,
      status: statusLabel(stats.readyDocuments > 0, "Waiting for sources"),
      detail: `${stats.retrievalRuns.toLocaleString()} retrieval runs logged`,
    },
  ];

  return (
    <div className="min-w-0 space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
          <Bot className="h-3.5 w-3.5" /> Agent Runtime
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:items-end">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Multi-agent RAG orchestration for production chat workflows.
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              The backend wires the chat API into workflow state, OpenRouter streaming, Supabase persistence, memory summaries, document retrieval, and source citations.
            </p>
          </div>
          <div className="rounded-3xl border border-border/60 bg-background/60 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <MessagesSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Streaming API</p>
                <p className="text-xs text-muted-foreground">
                  {stats.totalMessages.toLocaleString()} messages stored with SSE responses
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-4 md:grid-cols-2">
        {agents.map((agent) => {
          const Icon = agent.icon;
          return (
            <article key={agent.name} className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="font-semibold text-foreground">{agent.name}</h2>
                    <span className="w-fit rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-500">
                      {agent.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{agent.description}</p>
                  <p className="mt-4 rounded-2xl border border-border/60 bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                    {agent.detail}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
