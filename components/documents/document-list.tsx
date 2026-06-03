"use client";

import { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  FileSpreadsheet,
  File,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Archive,
  Clock,
} from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/documents/validation";
import { deleteDocumentAction } from "@/lib/actions/document-actions";
import { appToast } from "@/lib/client/toast";
import type { Document } from "@/lib/db/types";

type DocumentListProps = {
  documents: Document[];
};

function getDocIcon(fileType: string | null) {
  if (fileType?.includes("pdf")) return <FileText className="h-5 w-5 text-red-400" />;
  if (fileType?.includes("csv")) return <FileSpreadsheet className="h-5 w-5 text-green-400" />;
  if (fileType?.includes("markdown")) return <FileText className="h-5 w-5 text-blue-400" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "ready":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[0.65rem] font-medium text-green-500">
          <CheckCircle2 className="h-3 w-3" />
          Ready
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-medium text-primary">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[0.65rem] font-medium text-destructive">
          <AlertCircle className="h-3 w-3" />
          Failed
        </span>
      );
    case "archived":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
          <Archive className="h-3 w-3" />
          Archived
        </span>
      );
    default:
      return null;
  }
}

function getRetrievalMode(doc: Document): string | null {
  const mode = doc.metadata?.retrieval_mode;
  return typeof mode === "string" ? mode : null;
}

export function DocumentList({ documents }: DocumentListProps) {
  const [items, setItems] = useState(documents);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(documents);
  }, [documents]);

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((d) => d.id !== id));
    startTransition(async () => {
      try {
        await deleteDocumentAction(id);
        appToast.success("Document deleted");
      } catch {
        appToast.error("Failed to delete document");
        setItems(documents); // rollback
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-border/60 bg-card/60 p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Image
            src="/images/oraclex-logo.png"
            alt="Oraclex"
            width={32}
            height={32}
            className="rounded-lg"
          />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">No documents yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload PDFs, text files, markdown, or CSVs to build your knowledge base.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {items.map((doc) => {
          const fileSize =
            typeof doc.metadata === "object" &&
            doc.metadata !== null &&
            "file_size" in doc.metadata
              ? (doc.metadata as Record<string, unknown>).file_size as number
              : 0;

          return (
            <motion.div
              key={doc.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className={cn(
                "group flex items-center gap-4 rounded-2xl border border-border/60 bg-card/80 px-4 py-3",
                "transition-colors hover:bg-card",
              )}
            >
              {getDocIcon(doc.file_type)}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {doc.title}
                  </p>
                  {getStatusBadge(doc.status)}
                  {doc.status === "ready" && getRetrievalMode(doc) ? (
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
                      {getRetrievalMode(doc)} retrieval
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  {doc.file_name ? <span>{doc.file_name}</span> : null}
                  {fileSize > 0 ? <span>{formatFileSize(fileSize)}</span> : null}
                  {doc.token_count ? <span>{doc.token_count.toLocaleString()} tokens</span> : null}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 text-destructive hover:text-destructive"
                onClick={() => handleDelete(doc.id)}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
