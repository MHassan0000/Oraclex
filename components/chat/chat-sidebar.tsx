"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pin,
  PinOff,
  Plus,
  Search,
  History,
  Trash2,
  Pencil,
  MoreHorizontal,
  Check,
  X,
  FileText,
  BarChart3,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { Brand } from "@/components/brand";
import type { ChatConversation, ChatSearchResult } from "@/components/chat/chat-types";
import { ChatEmptySidebar } from "@/components/chat/chat-empty-sidebar";

type ChatSidebarProps = {
  conversations: ChatConversation[];
  activeConversationId?: string | null;
  query: string;
  onQueryChange: (value: string) => void;
  searchResults: ChatSearchResult[];
  mobile?: boolean;
  onClose?: () => void;
  onDeleteConversation?: (id: string) => void;
  onRenameConversation?: (id: string, title: string) => void;
  onPinConversation?: (id: string, pinned: boolean) => void;
  isAdmin?: boolean;
  minimal?: boolean;
};

function formatConversationDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity";

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  query,
  onQueryChange,
  searchResults,
  mobile,
  onClose,
  onDeleteConversation,
  onRenameConversation,
  onPinConversation,
  isAdmin = false,
  minimal = false,
}: ChatSidebarProps) {
  const router = useRouter();

  const pinned = useMemo(
    () => conversations.filter((conversation) => conversation.pinned),
    [conversations],
  );
  const recent = useMemo(
    () => conversations.filter((conversation) => !conversation.pinned),
    [conversations],
  );

  function handleNewChat() {
    onClose?.();
    router.push("/chat");
  }

  return (
    <div className="flex h-full w-full flex-col bg-sidebar/90 text-sidebar-foreground">
      {!minimal ? (
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-5">
          <Brand name="Oraclex" label="Chat Studio" />
          <ThemeToggle />
        </div>
      ) : null}

      <div className={cn("px-6", minimal ? "pt-5" : "pt-6")}>
        <Button className="w-full gap-2" onClick={handleNewChat}>
          <Plus className="h-4 w-4" />
          New chat
        </Button>
      </div>

      <div className="px-6 pt-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search conversations"
            className="pl-9"
          />
        </div>
        {query ? (
          <div className="mt-4 space-y-2">
            {searchResults.length === 0 ? (
              <p className="text-xs text-muted-foreground">No matching chats.</p>
            ) : (
              searchResults.map((item) => (
                <Link
                  key={item.id}
                  href={`/chat/${item.id}`}
                  className={cn(
                    "block rounded-xl border border-transparent px-3 py-2 text-sm",
                    "transition hover:bg-muted/60",
                  )}
                  onClick={onClose}
                >
                  <div className="font-medium text-foreground">{item.title}</div>
                  {item.snippet ? (
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.snippet}</p>
                  ) : null}
                </Link>
              ))
            )}
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-6">
        {pinned.length ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <Pin className="h-3.5 w-3.5" />
              Pinned
            </div>
            <AnimatePresence mode="popLayout">
              <div className="space-y-2">
                {pinned.map((conversation) => (
                  <motion.div
                    key={conversation.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ConversationRow
                      conversation={conversation}
                      active={conversation.id === activeConversationId}
                      onClick={onClose}
                      onDelete={onDeleteConversation}
                      onRename={onRenameConversation}
                      onPin={onPinConversation}
                    />
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            Recent
          </div>
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {recent.length === 0 ? (
                <ChatEmptySidebar />
              ) : (
                recent.map((conversation) => (
                  <motion.div
                    key={conversation.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ConversationRow
                      conversation={conversation}
                      active={conversation.id === activeConversationId}
                      onClick={onClose}
                      onDelete={onDeleteConversation}
                      onRename={onRenameConversation}
                      onPin={onPinConversation}
                    />
                  </motion.div>
                ))
              )}
            </div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom nav links */}
      {!minimal ? (
      <div className="border-t border-border/60 px-6 py-4 space-y-1.5">
        <Link
          href="/knowledge"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          onClick={onClose}
        >
          <FileText className="h-4 w-4" />
          Knowledge Base
        </Link>
        {isAdmin ? (
          <Link
            href="/admin"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            onClick={onClose}
          >
            <BarChart3 className="h-4 w-4" />
            Admin Dashboard
          </Link>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}

// ──────────────────────────────────────────
// Conversation Row with actions
// ──────────────────────────────────────────

type ConversationRowProps = {
  conversation: ChatConversation;
  active?: boolean;
  onClick?: () => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, title: string) => void;
  onPin?: (id: string, pinned: boolean) => void;
};

function ConversationRow({
  conversation,
  active,
  onClick,
  onDelete,
  onRename,
  onPin,
}: ConversationRowProps) {
  const [showActions, setShowActions] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(conversation.title);

  function handleRenameSubmit() {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== conversation.title) {
      onRename?.(conversation.id, trimmed);
    }
    setRenaming(false);
    setShowActions(false);
  }

  if (renaming) {
    return (
      <div className="rounded-2xl border border-primary/40 bg-primary/5 px-3 py-2">
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit();
              if (e.key === "Escape") {
                setRenaming(false);
                setShowActions(false);
              }
            }}
            className="flex-1 bg-transparent text-sm text-foreground outline-none"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleRenameSubmit}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              setRenaming(false);
              setShowActions(false);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative block rounded-2xl border border-border/30 px-3 py-2",
        "transition hover:border-border/70 hover:bg-muted/40",
        active && "border-primary/40 bg-primary/10",
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Link
        href={`/chat/${conversation.id}`}
        onClick={onClick}
        className="block"
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-foreground line-clamp-1 pr-8">
            {conversation.title}
          </div>
          {conversation.pinned ? <Pin className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
        </div>
        {conversation.preview ? (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {conversation.preview}
          </p>
        ) : null}
        <div className="mt-2 flex items-center justify-between text-[0.7rem] text-muted-foreground">
          <span>{formatConversationDate(conversation.lastMessageAt)}</span>
          {conversation.messageCount ? <span>{conversation.messageCount} msgs</span> : null}
        </div>
      </Link>

      {/* Action buttons overlay */}
      <AnimatePresence>
        {showActions ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute right-2 top-2 flex items-center gap-0.5 rounded-xl border border-border/60 bg-card/95 px-1 py-0.5 shadow-sm backdrop-blur"
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label={conversation.pinned ? "Unpin" : "Pin"}
              onClick={(e) => {
                e.stopPropagation();
                onPin?.(conversation.id, !conversation.pinned);
              }}
            >
              {conversation.pinned ? (
                <PinOff className="h-3 w-3" />
              ) : (
                <Pin className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label="Rename"
              onClick={(e) => {
                e.stopPropagation();
                setRenameValue(conversation.title);
                setRenaming(true);
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              aria-label="Delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(conversation.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
