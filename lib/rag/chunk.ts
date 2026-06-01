import "server-only";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export type ChunkResult = {
  content: string;
  index: number;
  tokenCount: number;
  metadata: Record<string, unknown>;
};

export type ChunkOptions = {
  chunkSize?: number;
  chunkOverlap?: number;
  /** Additional metadata to attach to each chunk */
  metadata?: Record<string, unknown>;
};

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

/**
 * Split text into semantically meaningful chunks using
 * LangChain's RecursiveCharacterTextSplitter.
 */
export async function chunkText(
  text: string,
  options: ChunkOptions = {},
): Promise<ChunkResult[]> {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap = DEFAULT_CHUNK_OVERLAP,
    metadata = {},
  } = options;

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: [
      "\n\n",   // Paragraph breaks
      "\n",     // Line breaks
      ". ",     // Sentences
      "? ",     // Questions
      "! ",     // Exclamations
      "; ",     // Semicolons
      ", ",     // Commas
      " ",      // Words
      "",       // Characters
    ],
    lengthFunction: (text) => text.length,
  });

  const documents = await splitter.createDocuments([text], [metadata]);

  return documents.map((doc, index) => ({
    content: doc.pageContent,
    index,
    tokenCount: estimateTokenCount(doc.pageContent),
    metadata: {
      ...doc.metadata,
      chunkIndex: index,
      charCount: doc.pageContent.length,
    },
  }));
}

/**
 * Chunk text with awareness of document structure (headers, sections).
 * Better for structured documents like markdown or technical docs.
 */
export async function chunkMarkdown(
  text: string,
  options: ChunkOptions = {},
): Promise<ChunkResult[]> {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap = DEFAULT_CHUNK_OVERLAP,
    metadata = {},
  } = options;

  const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
    chunkSize,
    chunkOverlap,
  });

  const documents = await splitter.createDocuments([text], [metadata]);

  return documents.map((doc, index) => ({
    content: doc.pageContent,
    index,
    tokenCount: estimateTokenCount(doc.pageContent),
    metadata: {
      ...doc.metadata,
      chunkIndex: index,
      charCount: doc.pageContent.length,
      type: "markdown",
    },
  }));
}

/**
 * Rough token estimation (1 token ≈ 4 characters for English text).
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
