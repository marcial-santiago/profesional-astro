// Rate limiter backed by PostgreSQL — works across serverless instances.
// Uses a fixed-window counter stored in the rate_limits table.

import { prisma } from "./prisma";
import type { PrismaClient } from "../../prisma/client";

export interface RateLimitConfig {
  limit: number;    // max requests allowed
  windowMs: number; // window duration in milliseconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // unix ms
}

/**
 * Check rate limit using Prisma/PostgreSQL.
 * Uses Prisma upsert for atomic increment — safe for concurrent requests.
 */
export async function checkRateLimit(
  ip: string,
  endpoint: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const key = `${endpoint}:${ip}`;
  const now = Date.now();
  const resetAt = now + config.windowMs;

  try {
    // Use a transaction to ensure atomicity
    const entry = await prisma.$transaction(async (tx: PrismaClient) => {
      const existing = await tx.rateLimit.findUnique({ where: { key } });

      // No entry or window expired — create/reset
      if (!existing || existing.resetAt.getTime() < now) {
        return tx.rateLimit.upsert({
          where: { key },
          create: { key, count: 1, resetAt: new Date(resetAt) },
          update: { count: 1, resetAt: new Date(resetAt) },
        });
      }

      // Window still active — increment
      return tx.rateLimit.update({
        where: { key },
        data: { count: { increment: 1 } },
      });
    });

    const resetAtMs = entry.resetAt.getTime();
    const count = entry.count;

    if (count > config.limit) {
      return { allowed: false, remaining: 0, resetAt: resetAtMs };
    }

    return {
      allowed: true,
      remaining: config.limit - count,
      resetAt: resetAtMs,
    };
  } catch (error) {
    // On DB failure, fail open — don't block legitimate users
    console.error("Rate limiter DB error:", error);
    return { allowed: true, remaining: config.limit, resetAt: resetAt };
  }
}

/**
 * Cleanup expired entries — run periodically or from a cron job.
 */
export async function cleanupExpiredRateLimits(): Promise<void> {
  try {
    await prisma.rateLimit.deleteMany({
      where: { resetAt: { lt: new Date() } },
    });
  } catch (error) {
    console.error("Rate limit cleanup error:", error);
  }
}
