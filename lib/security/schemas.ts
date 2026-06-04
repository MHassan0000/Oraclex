import { z } from "zod";

// ──────────────────────────────────────────
// Chat input schemas
// ──────────────────────────────────────────

export const chatMessageSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(32000, "Message too long (max 32,000 characters)")
    .transform((val) => sanitizeText(val)),
  model: z.string().max(100).optional(),
  stream: z.boolean().optional().default(true),
});

// ──────────────────────────────────────────
// Document input schemas
// ──────────────────────────────────────────

export const documentCreateSchema = z.object({
  title: z
    .string()
    .min(1, "Title required")
    .max(255, "Title too long")
    .transform((val) => sanitizeText(val)),
  fileName: z
    .string()
    .min(1)
    .max(255)
    .transform((val) => sanitizeFileName(val)),
  fileType: z.string().min(1).max(100),
  storageUrl: z
    .string()
    .url("Invalid URL")
    .refine((value) => isAllowedUploadedFileUrl(value), "Invalid upload URL"),
  fileSize: z
    .number()
    .positive()
    .max(16 * 1024 * 1024, "File too large"),
  checksum: z.string().max(128).optional(),
});

export const ingestionSchema = z.object({
  documentId: z.string().uuid("Invalid document ID"),
  fileUrl: z
    .string()
    .url("Invalid file URL")
    .refine((value) => isAllowedUploadedFileUrl(value), "Invalid upload URL"),
  fileName: z
    .string()
    .min(1)
    .max(255)
    .transform((val) => sanitizeFileName(val)),
  fileType: z.string().min(1).max(100),
});

// ──────────────────────────────────────────
// Conversation schemas
// ──────────────────────────────────────────

export const conversationRenameSchema = z.object({
  id: z.string().uuid(),
  title: z
    .string()
    .min(1, "Title required")
    .max(255, "Title too long")
    .transform((val) => sanitizeText(val)),
});

export const conversationIdSchema = z.object({
  id: z.string().uuid(),
});

// ──────────────────────────────────────────
// Sanitization utilities
// ──────────────────────────────────────────

/**
 * Sanitize general text: strip control characters, trim.
 * Preserves newlines and markdown formatting.
 */
export function sanitizeText(input: string): string {
  return (
    input
      // Remove null bytes and other control chars except newlines/tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .trim()
  );
}

/**
 * Sanitize file names: strip path traversal, special chars.
 */
export function sanitizeFileName(name: string): string {
  return (
    name
      // Remove path traversal
      .replace(/\.\./g, "")
      .replace(/[/\\]/g, "")
      // Remove null bytes
      .replace(/[\x00-\x1F\x7F]/g, "")
      .trim()
  );
}

/**
 * Validate and sanitize a URL to prevent SSRF.
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Only allow HTTPS and known hosts
    if (parsed.protocol !== "https:") return null;
    // Block local/private IPs
    const hostname = parsed.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("172.") ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".local")
    ) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function isAllowedUploadedFileUrl(url: string): boolean {
  const sanitized = sanitizeUrl(url);
  if (!sanitized) return false;

  const { hostname } = new URL(sanitized);
  return hostname === "utfs.io" || hostname === "ufs.sh" || hostname.endsWith(".ufs.sh");
}
