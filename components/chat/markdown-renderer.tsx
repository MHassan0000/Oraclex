"use client";

import { Children, isValidElement, useCallback, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

type MarkdownRendererProps = {
  content: string;
  className?: string;
};

function extractText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement<{ children?: React.ReactNode }>(node)) return extractText(node.props.children);
  return "";
}

function CodeBlockWrapper({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const handleCopy = useCallback(async () => {
    const text = preRef.current?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silently fail
    }
  }, []);

  return (
    <div className="group relative">
      <pre ref={preRef} className="hljs">
        {children}
      </pre>
      <button
        onClick={handleCopy}
        className={cn(
          "absolute right-3 top-3 rounded-lg border border-border/60 bg-card/90 p-1.5",
          "cursor-pointer text-muted-foreground opacity-0 transition-all duration-200",
          "hover:bg-muted hover:text-foreground",
          "group-hover:opacity-100",
          copied && "text-green-500 opacity-100",
        )}
        aria-label="Copy code"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        "prose-headings:font-heading prose-headings:tracking-tight",
        "prose-pre:rounded-2xl prose-pre:border prose-pre:border-border/60",
        "prose-pre:bg-muted/40 prose-pre:px-4 prose-pre:py-3",
        "prose-code:rounded prose-code:bg-muted/40 prose-code:px-1.5 prose-code:py-0.5",
        "prose-code:text-[0.85em] prose-code:font-mono",
        "prose-a:text-primary hover:prose-a:underline",
        "prose-strong:font-semibold prose-strong:text-foreground",
        "prose-li:marker:text-muted-foreground",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre: ({ children }) => <CodeBlockWrapper>{children}</CodeBlockWrapper>,
          code: ({ children, className: codeClassName, node, ...props }) => {
            void node;
            const text = Children.toArray(children).map(extractText).join("");
            return (
              <code className={codeClassName} {...props}>
                {text}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
