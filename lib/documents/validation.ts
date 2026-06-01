/**
 * Document validation and metadata extraction utilities.
 */

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/x-markdown",
  "application/octet-stream", // fallback for .md files
] as const;

export const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".md", ".csv"] as const;

export const MAX_FILE_SIZE_BYTES = 16 * 1024 * 1024; // 16MB

export type FileValidationResult = {
  valid: boolean;
  error?: string;
  fileType: string;
  extension: string;
};

/**
 * Validate a file before upload.
 */
export function validateFile(file: File): FileValidationResult {
  const extension = getFileExtension(file.name);
  const fileType = resolveFileType(file.type, extension);

  if (!ALLOWED_EXTENSIONS.includes(extension as typeof ALLOWED_EXTENSIONS[number])) {
    return {
      valid: false,
      error: `Unsupported file type: ${extension}. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
      fileType,
      extension,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File too large: ${formatFileSize(file.size)}. Maximum: ${formatFileSize(MAX_FILE_SIZE_BYTES)}`,
      fileType,
      extension,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: "File is empty",
      fileType,
      extension,
    };
  }

  return { valid: true, fileType, extension };
}

/**
 * Extract metadata from a file.
 */
export function extractFileMetadata(file: File) {
  const extension = getFileExtension(file.name);
  return {
    fileName: file.name,
    fileType: resolveFileType(file.type, extension),
    fileSize: file.size,
    extension,
    lastModified: new Date(file.lastModified).toISOString(),
  };
}

/**
 * Generate a checksum for duplicate detection.
 */
export async function generateFileChecksum(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Helpers ──

function getFileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
}

function resolveFileType(mimeType: string, extension: string): string {
  if (mimeType && mimeType !== "application/octet-stream") return mimeType;
  switch (extension) {
    case ".pdf": return "application/pdf";
    case ".txt": return "text/plain";
    case ".md": return "text/markdown";
    case ".csv": return "text/csv";
    default: return "application/octet-stream";
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
