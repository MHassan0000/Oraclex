import { requireUser } from "@/lib/auth/session";
import { getDocumentsAction } from "@/lib/actions/document-actions";
import { KnowledgePageClient } from "@/components/documents/knowledge-page-client";
import type { Document } from "@/lib/db/types";

export default async function KnowledgePage() {
  await requireUser("/knowledge");

  let documents: Document[] = [];
  try {
    documents = await getDocumentsAction();
  } catch {
    // Fall through with empty array
  }

  return <KnowledgePageClient initialDocuments={documents} />;
}
