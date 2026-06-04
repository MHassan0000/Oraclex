import "server-only";

import { NextResponse } from "next/server";
import type { ZodSchema, ZodError } from "zod";

/**
 * Validate request body against a Zod schema.
 * Returns parsed data or a JSON error response.
 */
export function validateRequestBody<T>(
  schema: ZodSchema<T>,
  body: unknown,
): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(body);

  if (!result.success) {
    const errors = formatZodErrors(result.error);
    return {
      success: false,
      response: NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 }),
    };
  }

  return { success: true, data: result.data };
}

function formatZodErrors(error: ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

/**
 * Strip sensitive fields from objects before sending to clients.
 */
export function stripSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  sensitiveKeys: string[] = ["user_id", "storage_path", "checksum", "content_hash", "embedding"],
): Partial<T> {
  const cleaned = { ...obj };
  for (const key of sensitiveKeys) {
    if (key in cleaned) {
      delete cleaned[key];
    }
  }
  return cleaned;
}

/**
 * Redact environment variable values for logging.
 */
export function redactEnvForLogging(
  env: Record<string, string | undefined>,
): Record<string, string> {
  const redacted: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (!value) {
      redacted[key] = "(not set)";
    } else if (
      key.includes("KEY") ||
      key.includes("SECRET") ||
      key.includes("TOKEN") ||
      key.includes("PASSWORD")
    ) {
      redacted[key] = `${value.slice(0, 4)}...${value.slice(-4)}`;
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}
