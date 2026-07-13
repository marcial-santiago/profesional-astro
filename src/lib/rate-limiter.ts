// Rate limiter using in-memory Map — works for single-instance deployments.
// Uses a fixed-window counter stored in memory.

export interface RateLimitConfig {
  limit: number;    // max requests allowed
  windowMs: number; // window duration in milliseconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // unix ms
}

// In-memory store: key -> { count, resetAt }
const store = new Map<string, { count: number; resetAt: number }>();

// Periodic cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Check rate limit using in-memory Map.
 */
export async function checkRateLimit(
  ip: string,
  endpoint: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const key = `${endpoint}:${ip}`;
  const now = Date.now();
  const resetAt = now + config.windowMs;

  const entry = store.get(key);

  // No entry or window expired — create/reset
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.limit - 1, resetAt };
  }

  // Window still active — increment
  entry.count += 1;
  store.set(key, entry);

  if (entry.count > config.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return {
    allowed: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  };
}
