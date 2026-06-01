"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Pencil, RefreshCcw, TriangleAlert, User } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/components/chat/chat-types";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";

type ChatMessageProps = {
  message: ChatMessage;
  isStreaming?: boolean;
  onEdit?: (id: string, content: string) => void;
  onRegenerate?: (id: string) => void;
};

export function ChatMessageCard({ message, isStreaming, onEdit, onRegenerate }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isAssistant = message.role === "assistant";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "group relative flex w-full gap-4 rounded-3xl border border-border/60 p-5",
        isAssistant
          ? "bg-card/80 shadow-sm"
          : "bg-primary/[0.06] border-primary/20",
        message.error && "border-destructive/50 bg-destructive/10",
        isStreaming && "animate-pulse",
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-semibold overflow-hidden",
          isAssistant
            ? "bg-primary/10"
            : "bg-foreground/10 text-foreground",
          message.error && "bg-destructive text-destructive-foreground",
        )}
      >
        {isAssistant ? (
          <Image src="/images/oraclex-logo.png" alt="Oraclex" width={24} height={24} className="rounded-lg" />
        ) : (
          <User className="h-4 w-4" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-3 overflow-hidden">
        {/* Role label */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isAssistant ? "Oraclex" : "You"}
          </span>
          {message.edited ? (
            <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[0.6rem] text-muted-foreground">
              edited
            </span>
          ) : null}
          {isStreaming ? (
            <motion.span
              className="rounded-full bg-primary/20 px-2 py-0.5 text-[0.6rem] text-primary"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              generating…
            </motion.span>
          ) : null}
        </div>

        {/* Error state */}
        {message.error ? (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <TriangleAlert className="h-4 w-4" />
            <span>Something went wrong. Try again.</span>
          </div>
        ) : null}

        {/* Message content */}
        {isAssistant ? (
          <MarkdownRenderer content={message.content} />
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {message.content}
          </p>
        )}

        {/* Citations */}
        {message.citations?.length ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {message.citations.map((citation) => (
              <a
                key={citation.id}
                href={citation.url ?? "#"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-border/60",
                  "px-3 py-1 text-xs text-muted-foreground",
                  "transition-colors hover:border-primary/60 hover:text-primary",
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                {citation.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Copy message"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
        {isAssistant ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Regenerate response"
            onClick={() => onRegenerate?.(message.id)}
          >
            <RefreshCcw className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Edit prompt"
            onClick={() => onEdit?.(message.id, message.content)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}
