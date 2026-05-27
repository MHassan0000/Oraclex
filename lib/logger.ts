import { clientEnv } from "@/lib/env/client";

export type LogLevel = "debug" | "info" | "warn" | "error";

const levels: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const level = (clientEnv.NEXT_PUBLIC_LOG_LEVEL ?? "info") as LogLevel;

export const logger = {
  debug: (...args: unknown[]) => {
    if (levels[level] <= levels.debug) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (levels[level] <= levels.info) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (levels[level] <= levels.warn) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (levels[level] <= levels.error) console.error(...args);
  },
};
