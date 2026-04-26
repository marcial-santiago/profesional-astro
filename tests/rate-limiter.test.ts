// Tests for rate limiter with mocked Prisma
import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory store shared across mock functions
const store = new Map<string, { key: string; count: number; resetAt: Date }>();

// Mock prisma before importing rate-limiter
vi.mock("../src/lib/prisma", () => {
  const mockTx = {
    rateLimit: {
      findUnique: async ({ where }: { where: { key: string } }) => {
        return store.get(where.key) || null;
      },
      upsert: async ({ where, create, update }: { where: { key: string }; create: any; update: any }) => {
        const existing = store.get(where.key);
        if (!existing) {
          store.set(where.key, { ...create });
          return { ...create };
        }
        const updated = { ...existing, ...update };
        store.set(where.key, updated);
        return updated;
      },
      update: async ({ where, data }: { where: { key: string }; data: any }) => {
        const existing = store.get(where.key);
        if (!existing) throw new Error("Not found");
        let count = existing.count;
        if (data.count && typeof data.count.increment === "number") {
          count = existing.count + data.count.increment;
        } else if (data.count !== undefined) {
          count = data.count;
        }
        const updated = { ...existing, count, ...(data.resetAt && { resetAt: data.resetAt }) };
        store.set(where.key, updated);
        return updated;
      },
      deleteMany: vi.fn(async () => {}),
    },
  };

  const mockPrisma = {
    rateLimit: mockTx.rateLimit,
    $transaction: async (fn: (tx: typeof mockTx) => Promise<any>) => {
      return fn(mockTx);
    },
  };

  return { prisma: mockPrisma };
});

import { checkRateLimit, cleanupExpiredRateLimits } from "../src/lib/rate-limiter";
import { prisma } from "../src/lib/prisma";

const CONFIG = { limit: 5, windowMs: 60_000 }; // 5 requests per minute

describe("Rate Limiter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.clear();
  });

  describe("checkRateLimit", () => {
    it("should allow the first request", async () => {
      const result = await checkRateLimit("1.2.3.4", "/api/test", CONFIG);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("should increment count on subsequent requests", async () => {
      const ip = "1.2.3.5";
      const endpoint = "/api/test-increment";

      const r1 = await checkRateLimit(ip, endpoint, CONFIG);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(4);

      const r2 = await checkRateLimit(ip, endpoint, CONFIG);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(3);

      const r3 = await checkRateLimit(ip, endpoint, CONFIG);
      expect(r3.allowed).toBe(true);
      expect(r3.remaining).toBe(2);
    });

    it("should block when limit is exceeded", async () => {
      const ip = "1.2.3.6";
      const endpoint = "/api/test-block";

      // Use all 5 requests
      for (let i = 0; i < 5; i++) {
        const r = await checkRateLimit(ip, endpoint, CONFIG);
        expect(r.allowed).toBe(true);
      }

      // 6th request should be blocked
      const blocked = await checkRateLimit(ip, endpoint, CONFIG);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it("should track different endpoints separately", async () => {
      const ip = "1.2.3.7";

      // Exhaust limit on endpoint A
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(ip, "/api/endpoint-a", CONFIG);
      }

      // Endpoint B should still be allowed
      const resultB = await checkRateLimit(ip, "/api/endpoint-b", CONFIG);
      expect(resultB.allowed).toBe(true);
    });

    it("should track different IPs separately", async () => {
      const endpoint = "/api/test-ip-separation";

      // Exhaust limit for IP A
      for (let i = 0; i < 5; i++) {
        await checkRateLimit("10.0.0.1", endpoint, CONFIG);
      }

      // IP B should still be allowed
      const resultB = await checkRateLimit("10.0.0.2", endpoint, CONFIG);
      expect(resultB.allowed).toBe(true);
    });

    it("should include rate limit headers info in result", async () => {
      const result = await checkRateLimit("1.2.3.8", "/api/test-headers", CONFIG);
      expect(result).toHaveProperty("allowed");
      expect(result).toHaveProperty("remaining");
      expect(result).toHaveProperty("resetAt");
      expect(typeof result.resetAt).toBe("number");
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });
  });

  describe("cleanupExpiredRateLimits", () => {
    it("should call deleteMany without errors", async () => {
      await cleanupExpiredRateLimits();
      expect(prisma.rateLimit.deleteMany).toHaveBeenCalled();
    });
  });
});
