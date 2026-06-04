/**
 * Secure file validation with magic byte detection.
 * Prevents malicious file uploads disguised as valid types.
 */

import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  formatFileSize,
  getFileExtension,
  resolveDocumentFileType,
} from "@/lib/documents/validation";

const MAGIC_BYTES: Record<string, number[][]> = {
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
};

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
  const extension = getFileExtension(fileName);
  if (!ALLOWED_EXTENSIONS.includes(extension as typeof ALLOWED_EXTENSIONS[number])) {
    return { valid: false, error: `File type ${extension || "(none)"} is not supported` };
  }

  // 2. MIME type check
  const normalizedFileType = resolveDocumentFileType(fileType, extension);
  if (!ALLOWED_MIME_TYPES.includes(normalizedFileType as typeof ALLOWED_MIME_TYPES[number])) {
    return { valid: false, error: `MIME type ${normalizedFileType} is not allowed` };
  }

  // 3. Size check
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File exceeds maximum size of ${formatFileSize(MAX_FILE_SIZE_BYTES)}` };
  }

  if (fileSize === 0) {
    return { valid: false, error: "File is empty" };
  }

  // 4. Magic bytes check for PDFs
  if (buffer && extension === ".pdf") {
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
