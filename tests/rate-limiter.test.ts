// Tests for in-memory rate limiter
import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit } from "../src/lib/rate-limiter";

const CONFIG = { limit: 5, windowMs: 60_000 }; // 5 requests per minute

describe("Rate Limiter", () => {
  beforeEach(() => {
    // Clear the in-memory store by reimporting
    vi.resetModules();
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
});
