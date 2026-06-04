import { z } from "zod";

import { REPORT_FORMATS, REPORT_SOURCE_TYPES } from "@/lib/reports/types";

export const reportFormatSchema = z.enum(REPORT_FORMATS);
export const reportSourceTypeSchema = z.enum(REPORT_SOURCE_TYPES);

export const generateReportSchema = z
  .object({
    sourceType: reportSourceTypeSchema,
    conversationId: z.string().uuid().nullable().optional(),
    documentIds: z.array(z.string().uuid()).max(20).optional(),
    formats: z.array(reportFormatSchema).min(1).max(3).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.sourceType === "current_chat" && !value.conversationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["conversationId"],
        message: "Conversation is required for a current chat report",
      });
    }

    if (value.sourceType === "selected_documents" && !value.documentIds?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["documentIds"],
        message: "Select at least one document",
      });
    }
  });
