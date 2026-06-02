"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { BrainCircuit, Send, CornerDownLeft, Square } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ChatComposerProps = {
  onSend: (message: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
};

export function ChatComposer({
  onSend,
  onCancel,
  disabled,
  isStreaming,
  placeholder,
}: ChatComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function handleSubmit() {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleInput(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(event.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full rounded-3xl border border-border/60 bg-card/80 p-4 shadow-lg backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <BrainCircuit className="h-3.5 w-3.5" />
        Oraclex RAG Assistant
        {isStreaming ? (
          <motion.span
            className="rounded-full bg-primary/20 px-2 py-0.5 text-[0.6rem] text-primary"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            streaming…
          </motion.span>
        ) : null}
      </div>
      <div className="mt-3 flex gap-3">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={
              isStreaming
                ? "Waiting for response..."
                : placeholder ?? "Ask anything about your knowledge base..."
            }
            disabled={disabled}
            className={cn(
              "min-h-[80px] w-full resize-none rounded-2xl border border-border/60 bg-background/70",
              "px-4 py-3 text-sm text-foreground shadow-sm",
              "placeholder:text-muted-foreground/60",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-shadow duration-200",
            )}
            rows={3}
          />
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <kbd className="inline-flex items-center gap-1 rounded-md border border-border/60 px-1.5 py-0.5 font-mono text-[0.65rem]">
              <CornerDownLeft className="h-2.5 w-2.5" />
              Enter
            </kbd>
            <span>to send</span>
            <span className="text-border">•</span>
            <kbd className="rounded-md border border-border/60 px-1.5 py-0.5 font-mono text-[0.65rem]">
              Shift + Enter
            </kbd>
            <span>for new line</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          {isStreaming ? (
            <Button
              className="h-12 w-12 rounded-2xl bg-destructive hover:bg-destructive/90"
              aria-label="Stop generation"
              onClick={onCancel}
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              className={cn(
                "h-12 w-12 rounded-2xl transition-all duration-200",
                canSend && "shadow-md shadow-primary/25",
              )}
              aria-label="Send message"
              disabled={!canSend}
              onClick={handleSubmit}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
