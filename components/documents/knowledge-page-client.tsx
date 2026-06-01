"use client";

import { DocumentUpload } from "@/components/documents/document-upload";
import { DocumentList } from "@/components/documents/document-list";
import type { Document } from "@/lib/db/types";

type KnowledgePageClientProps = {
  initialDocuments: Document[];
};

export function KnowledgePageClient({ initialDocuments }: KnowledgePageClientProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 pb-10 pt-8 sm:px-6">
      <DocumentUpload />

      <div>
        <h3 className="mb-4 text-lg font-semibold text-foreground">Knowledge Base</h3>
        <DocumentList documents={initialDocuments} />
      </div>
    </div>
  );
}
