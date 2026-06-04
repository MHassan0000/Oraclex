"use client";

import { useState, useTransition } from "react";
import { Bot, RotateCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { appToast } from "@/lib/client/toast";
import { updateSystemPromptAction } from "@/lib/actions/settings-actions";
import {
  MAX_USER_SYSTEM_PROMPT_LENGTH,
  normalizeUserSystemPrompt,
} from "@/lib/settings/system-prompt";

type SystemPromptFormProps = {
  initialSystemPrompt: string;
};

export function SystemPromptForm({ initialSystemPrompt }: SystemPromptFormProps) {
  const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt);
  const [savedPrompt, setSavedPrompt] = useState(initialSystemPrompt);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const normalizedPrompt = normalizeUserSystemPrompt(systemPrompt);
  const remaining = MAX_USER_SYSTEM_PROMPT_LENGTH - systemPrompt.length;
  const hasChanges = normalizedPrompt !== savedPrompt;

  function saveSystemPrompt(nextPrompt: string) {
    setError(null);

    if (nextPrompt.length > MAX_USER_SYSTEM_PROMPT_LENGTH) {
      setError(`System prompt must be ${MAX_USER_SYSTEM_PROMPT_LENGTH} characters or fewer.`);
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateSystemPromptAction(nextPrompt);
        setSystemPrompt(result.systemPrompt);
        setSavedPrompt(result.systemPrompt);
        appToast.success(result.systemPrompt ? "System prompt saved" : "System prompt reset");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save system prompt";
        setError(message);
        appToast.error(message);
      }
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveSystemPrompt(normalizedPrompt);
  }

  return (
    <form className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-sm" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
            <Bot className="h-3.5 w-3.5" /> Assistant behavior
          </div>
          <h2 className="mt-4 text-xl font-semibold text-foreground">Custom system prompt</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Add response-style instructions for your assistant. Oraclex will still enforce document
            grounding, retrieval context, citations, and the full internal RAG pipeline.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <textarea
          name="system-prompt"
          value={systemPrompt}
          onChange={(event) => {
            setSystemPrompt(event.target.value);
            if (error) setError(null);
          }}
          placeholder="Example: Answer in a concise executive style. Prefer bullet points. When useful, include a short next-step recommendation."
          className="min-h-44 w-full resize-y rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
          maxLength={MAX_USER_SYSTEM_PROMPT_LENGTH + 1}
        />
        <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className={remaining < 0 ? "text-destructive" : "text-muted-foreground"}>
            {Math.max(remaining, 0)} characters remaining
          </p>
          {error ? <p className="text-destructive">{error}</p> : null}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          className="gap-2 rounded-2xl"
          disabled={isPending || !savedPrompt}
          onClick={() => {
            setSystemPrompt("");
            saveSystemPrompt("");
          }}
        >
          <RotateCcw className="h-4 w-4" /> Restore default
        </Button>
        <Button type="submit" className="gap-2 rounded-2xl" disabled={isPending || !hasChanges}>
          <Save className="h-4 w-4" /> {isPending ? "Saving..." : "Save prompt"}
        </Button>
      </div>
    </form>
  );
}
