"use client";

import { motion } from "framer-motion";
import { FileSearch, BookOpen, Rocket } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";

type EmptyChatStateProps = {
  onStart?: (prompt?: string) => void;
};

export function EmptyChatState({ onStart }: EmptyChatStateProps) {
  const suggestions = [
    {
      icon: FileSearch,
      label: "Audit retrieval",
      prompt: "Audit retrieval quality for the last 24h.",
    },
    {
      icon: BookOpen,
      label: "Summarize docs",
      prompt: "Summarize our newest knowledge uploads.",
    },
    {
      icon: Rocket,
      label: "Launch plan",
      prompt: "Create a launch plan for a new RAG workspace.",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-3xl border border-border/60 bg-card/80 p-8"
    >
      <div className="flex flex-col gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 overflow-hidden">
          <Image
            src="/images/oraclex-logo.png"
            alt="Oraclex"
            width={36}
            height={36}
            className="rounded-lg"
          />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Start a new thread</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask the RAG engine to synthesize, audit, or explore any knowledge source. We will
            surface answers with citations and next actions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.label}
                variant="outline"
                className="gap-2"
                onClick={() => onStart?.(item.prompt)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
