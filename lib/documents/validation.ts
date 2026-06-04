/**
 * Document validation and metadata extraction utilities.
 */

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/x-markdown",
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
  const fileType = resolveDocumentFileType(file.type, extension);

  if (!ALLOWED_EXTENSIONS.includes(extension as typeof ALLOWED_EXTENSIONS[number])) {
    return {
      valid: false,
      error: `Unsupported file type: ${extension}. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
      fileType,
      extension,
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(fileType as typeof ALLOWED_MIME_TYPES[number])) {
    return {
      valid: false,
      error: `Unsupported MIME type: ${fileType}.`,
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

// ── Helpers ──

export function getFileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
}

export function resolveDocumentFileType(
  mimeType: string | null | undefined,
  fileNameOrExtension: string,
): string {
  const extension = fileNameOrExtension.startsWith(".")
    ? fileNameOrExtension.toLowerCase()
    : getFileExtension(fileNameOrExtension);

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
