"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Clock3,
  History,
  MessageSquareText,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appToast } from "@/lib/client/toast";
import {
  deleteConversationAction,
  pinConversationAction,
  renameConversationAction,
} from "@/lib/actions/chat-actions";
import type { Conversation } from "@/lib/db/types";

type ConversationHistoryClientProps = {
  initialConversations: Conversation[];
};

function getConversationTime(conversation: Conversation): number {
  return Date.parse(conversation.last_message_at ?? conversation.created_at) || 0;
}

function sortConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return getConversationTime(b) - getConversationTime(a);
  });
}

function formatDate(value: string | null): string {
  if (!value) return "No activity yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity yet";

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hour}:${minute} UTC`;
}

export function ConversationHistoryClient({
  initialConversations,
}: ConversationHistoryClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [conversations, setConversations] = useState(() => sortConversations(initialConversations));
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const sorted = sortConversations(conversations);
    if (!normalizedQuery) return sorted;

    return sorted.filter((conversation) =>
      `${conversation.title} ${conversation.summary ?? ""}`.toLowerCase().includes(normalizedQuery),
    );
  }, [conversations, query]);

  const pinned = filtered.filter((conversation) => conversation.pinned);
  const recent = filtered.filter((conversation) => !conversation.pinned);

  function startRename(conversation: Conversation) {
    setRenamingId(conversation.id);
    setRenameValue(conversation.title);
  }

  function submitRename(id: string) {
    const title = renameValue.trim();
    if (!title) return;

    const previous = conversations;
    setConversations((current) =>
      sortConversations(current.map((item) => (item.id === id ? { ...item, title } : item))),
    );
    setRenamingId(null);

    startTransition(async () => {
      try {
        const updated = await renameConversationAction(id, title);
        setConversations((current) =>
          sortConversations(current.map((item) => (item.id === id ? updated : item))),
        );
        router.refresh();
      } catch {
        setConversations(previous);
        appToast.error("Failed to rename conversation");
      }
    });
  }

  function togglePin(id: string, pinned: boolean) {
    const previous = conversations;
    setConversations((current) =>
      sortConversations(current.map((item) => (item.id === id ? { ...item, pinned } : item))),
    );

    startTransition(async () => {
      try {
        const updated = await pinConversationAction(id, pinned);
        setConversations((current) =>
          sortConversations(current.map((item) => (item.id === id ? updated : item))),
        );
        router.refresh();
      } catch {
        setConversations(previous);
        appToast.error("Failed to update conversation");
      }
    });
  }

  function deleteConversation(id: string) {
    const previous = conversations;
    setConversations((current) => current.filter((item) => item.id !== id));

    startTransition(async () => {
      try {
        await deleteConversationAction(id);
        router.refresh();
        appToast.success("Conversation deleted");
      } catch {
        setConversations(previous);
        appToast.error("Failed to delete conversation");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-10 pt-8 sm:px-6">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-border/60 bg-card/60 p-5 shadow-xl shadow-black/5 backdrop-blur sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <History className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-foreground">Chat history</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Search, reopen, pin, rename, or delete previous conversations.
            </p>
          </div>
        </div>
        <Button asChild className="gap-2 rounded-2xl px-5">
          <Link href="/chat">
            <Plus className="h-4 w-4" />
            New chat
          </Link>
        </Button>
      </div>

      <div className="rounded-[2rem] border border-border/60 bg-card/50 p-4 shadow-sm sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search conversations"
            className="h-12 rounded-2xl border-border/70 bg-background/70 pl-11"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[2rem] border border-border/60 bg-card/50 p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MessageSquareText className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">No conversations found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Start a new chat or adjust your search query.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {pinned.length > 0 ? (
            <ConversationSection
              title="Pinned"
              conversations={pinned}
              renamingId={renamingId}
              renameValue={renameValue}
              isPending={isPending}
              onRenameValueChange={setRenameValue}
              onStartRename={startRename}
              onSubmitRename={submitRename}
              onCancelRename={() => setRenamingId(null)}
              onTogglePin={togglePin}
              onDelete={deleteConversation}
            />
          ) : null}
          <ConversationSection
            title="Recent"
            conversations={recent}
            renamingId={renamingId}
            renameValue={renameValue}
            isPending={isPending}
            onRenameValueChange={setRenameValue}
            onStartRename={startRename}
            onSubmitRename={submitRename}
            onCancelRename={() => setRenamingId(null)}
            onTogglePin={togglePin}
            onDelete={deleteConversation}
          />
        </div>
      )}
    </div>
  );
}

type ConversationSectionProps = {
  title: string;
  conversations: Conversation[];
  renamingId: string | null;
  renameValue: string;
  isPending: boolean;
  onRenameValueChange: (value: string) => void;
  onStartRename: (conversation: Conversation) => void;
  onSubmitRename: (id: string) => void;
  onCancelRename: () => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
};

function ConversationSection({
  title,
  conversations,
  renamingId,
  renameValue,
  isPending,
  onRenameValueChange,
  onStartRename,
  onSubmitRename,
  onCancelRename,
  onTogglePin,
  onDelete,
}: ConversationSectionProps) {
  if (conversations.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {title === "Pinned" ? <Pin className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
        {title}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {conversations.map((conversation) => (
          <ConversationHistoryRow
            key={conversation.id}
            conversation={conversation}
            renaming={renamingId === conversation.id}
            renameValue={renameValue}
            isPending={isPending}
            onRenameValueChange={onRenameValueChange}
            onStartRename={() => onStartRename(conversation)}
            onSubmitRename={() => onSubmitRename(conversation.id)}
            onCancelRename={onCancelRename}
            onTogglePin={() => onTogglePin(conversation.id, !conversation.pinned)}
            onDelete={() => onDelete(conversation.id)}
          />
        ))}
      </div>
    </section>
  );
}

type ConversationHistoryRowProps = {
  conversation: Conversation;
  renaming: boolean;
  renameValue: string;
  isPending: boolean;
  onRenameValueChange: (value: string) => void;
  onStartRename: () => void;
  onSubmitRename: () => void;
  onCancelRename: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
};

function ConversationHistoryRow({
  conversation,
  renaming,
  renameValue,
  isPending,
  onRenameValueChange,
  onStartRename,
  onSubmitRename,
  onCancelRename,
  onTogglePin,
  onDelete,
}: ConversationHistoryRowProps) {
  if (renaming) {
    return (
      <div className="rounded-3xl border border-primary/40 bg-primary/5 p-4">
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={renameValue}
            onChange={(event) => onRenameValueChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSubmitRename();
              if (event.key === "Escape") onCancelRename();
            }}
            className="h-10 rounded-2xl bg-background/80"
          />
          <Button size="icon" variant="ghost" onClick={onSubmitRename} disabled={isPending}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onCancelRename} disabled={isPending}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <article className="group rounded-3xl border border-border/60 bg-card/70 p-4 shadow-sm transition hover:border-primary/30 hover:bg-card">
      <div className="flex min-w-0 items-start gap-3">
        <Link href={`/chat/${conversation.id}`} className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-base font-semibold text-foreground">
              {conversation.title}
            </h2>
            {conversation.pinned ? <Pin className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
          </div>
          {conversation.summary ? (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {conversation.summary}
            </p>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground">
            Last activity {formatDate(conversation.last_message_at ?? conversation.created_at)}
          </p>
        </Link>
        <div className="flex shrink-0 items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={conversation.pinned ? "Unpin conversation" : "Pin conversation"}
            onClick={onTogglePin}
            disabled={isPending}
          >
            {conversation.pinned ? (
              <PinOff className="h-3.5 w-3.5" />
            ) : (
              <Pin className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Rename conversation"
            onClick={onStartRename}
            disabled={isPending}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Delete conversation"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
            disabled={isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </article>
  );
}
