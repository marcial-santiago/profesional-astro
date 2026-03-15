interface RateEntry {
  count: number;
  resetAt: number;
}

// In-memory store — works for single-server / dev.
// For multi-instance production (Vercel Edge), swap for Redis/Upstash.
const store = new Map<string, RateEntry>();

// Prune expired entries every minute to avoid memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 60_000);

export interface RateLimitConfig {
  limit: number;    // max requests allowed
  windowMs: number; // sliding window in milliseconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // unix ms
}

export function checkRateLimit(
  ip: string,
  endpoint: string,
  config: RateLimitConfig,
): RateLimitResult {
  const key = `${endpoint}:${ip}`;
  const now = Date.now();
  const entry = store.get(key);

  // First request or window expired — reset
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.limit - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  };
}
