"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChatEditModalProps = {
  open: boolean;
  initialValue: string;
  onCancel: () => void;
  onSave: (value: string) => void;
};

export function ChatEditModal({ open, initialValue, onCancel, onSave }: ChatEditModalProps) {
  const [value, setValue] = useState(initialValue);

  // Sync internal state whenever the modal opens with a new value
  useEffect(() => {
    if (open) {
      setValue(initialValue);
    }
  }, [open, initialValue]);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      onCancel();
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      if (value.trim()) onSave(value.trim());
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onKeyDown={handleKeyDown}
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full max-w-xl rounded-3xl border border-border/60 bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Edit prompt</h3>
              <Button variant="ghost" size="icon" onClick={onCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <textarea
              autoFocus
              className={cn(
                "mt-4 min-h-[140px] w-full rounded-2xl border border-border/60 bg-background/80",
                "px-4 py-3 text-sm text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "resize-none transition-shadow duration-200",
              )}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                <kbd className="rounded border border-border/60 px-1 py-0.5 font-mono text-[0.65rem]">
                  Ctrl + Enter
                </kbd>{" "}
                to save
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onCancel}>
                  Cancel
                </Button>
                <Button onClick={() => onSave(value.trim())} disabled={!value.trim()}>
                  Save changes
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
