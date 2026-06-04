"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/streaming/types";

type CitationListProps = {
  citations: Citation[];
  className?: string;
};

export function CitationList({ citations, className }: CitationListProps) {
  const [expanded, setExpanded] = useState(false);

  if (!citations.length) return null;

  const visibleCitations = expanded ? citations : citations.slice(0, 3);

  return (
    <div className={cn("space-y-2", className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
      >
        <FileText className="h-3.5 w-3.5" />
        {citations.length} Source{citations.length !== 1 ? "s" : ""} Referenced
        {citations.length > 3 ? (
          expanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : null}
      </button>

      <AnimatePresence mode="popLayout">
        <div className="space-y-1.5">
          {visibleCitations.map((citation) => (
            <CitationCard key={citation.id} citation={citation} />
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}

type CitationCardProps = {
  citation: Citation;
};

function CitationCard({ citation }: CitationCardProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={cn(
        "rounded-2xl border border-border/60 bg-card/60 transition-colors",
        "hover:border-primary/30 hover:bg-card/80",
      )}
    >
      <button
        onClick={() => setShowPreview(!showPreview)}
        className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-[0.6rem] font-bold text-primary">
          {citation.id.replace("cite-", "")}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">
            {citation.documentTitle ?? "Document"}
          </p>
          <div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground">
            <span>
              Chunk {citation.chunkIndex ?? "?"} • {(citation.similarity * 100).toFixed(0)}% match
            </span>
          </div>
        </div>

        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            showPreview && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {showPreview ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/40 px-3 py-2.5">
              <p className="text-xs leading-relaxed text-muted-foreground">
                {citation.content}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Inline citation badge — used within message text.
 */
type CitationBadgeProps = {
  index: number;
  citation?: Citation;
  onClick?: () => void;
};

export function CitationBadge({ index, citation, onClick }: CitationBadgeProps) {
  return (
    <button
      onClick={onClick}
      title={citation?.documentTitle ?? `Source ${index}`}
      className={cn(
        "inline-flex h-4.5 min-w-[1.15rem] items-center justify-center rounded-md",
        "bg-primary/15 px-1 text-[0.6rem] font-bold text-primary",
        "transition-colors hover:bg-primary/25",
        "align-super cursor-pointer",
      )}
    >
      {index}
    </button>
  );
}
