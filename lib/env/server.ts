import { z } from "zod";

import { assertServer } from "@/lib/server/guards";
import { clientEnv } from "@/lib/env/client";

assertServer();

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENROUTER_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
  UPLOADTHING_TOKEN: z.string().min(1),
  ADMIN_USER_IDS: z.string().optional(),
  ADMIN_EMAILS: z.string().optional(),
});

const parsed = serverEnvSchema.safeParse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN,
  ADMIN_USER_IDS: process.env.ADMIN_USER_IDS,
  ADMIN_EMAILS: process.env.ADMIN_EMAILS,
});

if (!parsed.success) {
  const formatted = parsed.error.flatten().fieldErrors;
  const error = new Error(
    `Invalid server environment variables:\n${JSON.stringify(formatted, null, 2)}`,
  );
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.error(error);
  }
  throw error;
}

export const serverEnv = {
  ...clientEnv,
  ...parsed.data,
};
