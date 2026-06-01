/**
 * Secure file validation with magic byte detection.
 * Prevents malicious file uploads disguised as valid types.
 */

const MAGIC_BYTES: Record<string, number[][]> = {
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
};

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/markdown",
  "text/x-markdown",
]);

const ALLOWED_EXTENSIONS_SET = new Set([
  "pdf", "txt", "csv", "md",
]);

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB

export type FileValidationResult = {
  valid: boolean;
  error?: string;
};

/**
 * Validate a file for upload — checks extension, MIME type, size,
 * and magic bytes for PDFs.
 */
export function validateFileSecure(
  fileName: string,
  fileType: string,
  fileSize: number,
  buffer?: ArrayBuffer,
): FileValidationResult {
  // 1. Extension check
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS_SET.has(ext)) {
    return { valid: false, error: `File type .${ext} is not supported` };
  }

  // 2. MIME type check
  if (!ALLOWED_MIME_TYPES.has(fileType) && !fileType.startsWith("text/")) {
    return { valid: false, error: `MIME type ${fileType} is not allowed` };
  }

  // 3. Size check
  if (fileSize > MAX_FILE_SIZE) {
    return { valid: false, error: `File exceeds maximum size of 16MB` };
  }

  if (fileSize === 0) {
    return { valid: false, error: "File is empty" };
  }

  // 4. Magic bytes check for PDFs
  if (buffer && ext === "pdf") {
    const bytes = new Uint8Array(buffer.slice(0, 4));
    const expected = MAGIC_BYTES["application/pdf"];
    if (expected) {
      const matches = expected.some((pattern) =>
        pattern.every((byte, i) => bytes[i] === byte),
      );
      if (!matches) {
        return { valid: false, error: "File content does not match PDF format" };
      }
    }
  }

  // 5. Filename sanitization check
  if (/[<>:"/\\|?*\x00-\x1F]/.test(fileName)) {
    return { valid: false, error: "File name contains invalid characters" };
  }

  if (fileName.startsWith(".")) {
    return { valid: false, error: "Hidden files are not allowed" };
  }

  return { valid: true };
}
