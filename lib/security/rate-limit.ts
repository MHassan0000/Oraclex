import "server-only";

/**
 * In-memory rate limiter for API routes.
 * Uses a sliding window counter per key.
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt < now) store.delete(key);
    }
  },
  5 * 60 * 1000,
);

export type RateLimitConfig = {
  /** Max requests per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
};

const DEFAULTS: Record<string, RateLimitConfig> = {
  chat: { maxRequests: 30, windowMs: 60_000 },
  ingest: { maxRequests: 10, windowMs: 60_000 },
  upload: { maxRequests: 20, windowMs: 60_000 },
  auth: { maxRequests: 10, windowMs: 60_000 },
  default: { maxRequests: 60, windowMs: 60_000 },
};

export function checkRateLimit(
  key: string,
  route: string = "default",
): { allowed: boolean; remaining: number; resetAt: number } {
  const config = DEFAULTS[route] ?? DEFAULTS.default;
  const now = Date.now();
  const storeKey = `${route}:${key}`;

  let entry = store.get(storeKey);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + config.windowMs };
    store.set(storeKey, entry);
  }

  entry.count++;

  return {
    allowed: entry.count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}

export function rateLimitHeaders(remaining: number, resetAt: number) {
  return {
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
  };
}
