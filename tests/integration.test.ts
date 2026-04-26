// Integration tests against real PostgreSQL database
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { checkRateLimit } from "../src/lib/rate-limiter";
import { createSessionToken, verifySessionToken, revokeToken } from "../src/lib/session";

const TEST_SECRET = "integration-test-secret-key-2024";

describe("Integration: PostgreSQL Backend", () => {
  // Clean up test data before and after
  beforeAll(async () => {
    await prisma.rateLimit.deleteMany({ where: { key: { startsWith: "test:" } } });
    await prisma.revokedToken.deleteMany({});
  });

  afterAll(async () => {
    await prisma.rateLimit.deleteMany({ where: { key: { startsWith: "test:" } } });
    await prisma.revokedToken.deleteMany({});
    await prisma.$disconnect();
  });

  describe("Rate Limiter (real DB)", () => {
    it("should persist rate limit data to PostgreSQL", async () => {
      const result = await checkRateLimit("10.10.10.10", "test:integration-rl", {
        limit: 10,
        windowMs: 60_000,
      });
      expect(result.allowed).toBe(true);

      // Verify data was persisted
      const dbEntry = await prisma.rateLimit.findFirst({
        where: { key: "test:integration-rl:10.10.10.10" },
      });
      expect(dbEntry).not.toBeNull();
      expect(dbEntry!.count).toBe(1);
    });

    it("should increment count across multiple calls", async () => {
      const key = "test:integration-increment";
      const ip = "10.10.10.11";

      await checkRateLimit(ip, key, { limit: 10, windowMs: 60_000 });
      await checkRateLimit(ip, key, { limit: 10, windowMs: 60_000 });
      await checkRateLimit(ip, key, { limit: 10, windowMs: 60_000 });

      const dbEntry = await prisma.rateLimit.findFirst({
        where: { key: `${key}:${ip}` },
      });
      expect(dbEntry!.count).toBe(3);
    });

    it("should block after exceeding limit", async () => {
      const key = "test:integration-block";
      const ip = "10.10.10.12";
      const config = { limit: 3, windowMs: 60_000 };

      // Exhaust limit
      await checkRateLimit(ip, key, config);
      await checkRateLimit(ip, key, config);
      await checkRateLimit(ip, key, config);

      // Should be blocked
      const blocked = await checkRateLimit(ip, key, config);
      expect(blocked.allowed).toBe(false);
    });
  });

  describe("Session Tokens (real DB)", () => {
    it("should create and verify a valid token", async () => {
      const token = await createSessionToken(TEST_SECRET);
      const valid = await verifySessionToken(token, TEST_SECRET);
      expect(valid).toBe(true);
    });

    it("should reject a revoked token", async () => {
      const token = await createSessionToken(TEST_SECRET);

      // Verify it's valid first
      expect(await verifySessionToken(token, TEST_SECRET)).toBe(true);

      // Revoke it
      await revokeToken(token);

      // Should now be invalid
      const valid = await verifySessionToken(token, TEST_SECRET);
      expect(valid).toBe(false);
    });

    it("should store revoked token in database", async () => {
      const token = await createSessionToken(TEST_SECRET);
      await revokeToken(token);

      // Extract jti
      const payloadB64 = token.split(".")[0];
      const padded = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(Buffer.from(padded, "base64").toString());

      const revoked = await prisma.revokedToken.findFirst({
        where: { jti: payload.jti },
      });
      expect(revoked).not.toBeNull();
    });

    it("should reject token with wrong secret", async () => {
      const token = await createSessionToken(TEST_SECRET);
      const valid = await verifySessionToken(token, "completely-different-secret");
      expect(valid).toBe(false);
    });

    it("should reject tampered token", async () => {
      const token = await createSessionToken(TEST_SECRET);
      const tampered = token.slice(0, -10) + "0000000000";
      const valid = await verifySessionToken(tampered, TEST_SECRET);
      expect(valid).toBe(false);
    });
  });

  describe("Contact validation (Zod)", () => {
    it("should accept valid contact data", async () => {
      const { contactSchema } = await import("../src/services/validation.service");
      const result = contactSchema.safeParse({
        nombre: "Juan Pérez",
        telefono: "+54 11 1234-5678",
        servicio: "reparacion",
        mensaje: "Necesito reparar una cañería con fuga urgente",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid contact data", async () => {
      const { contactSchema } = await import("../src/services/validation.service");
      const result = contactSchema.safeParse({
        nombre: "Jo",
        telefono: "abc",
        servicio: "invalido",
        mensaje: "corto",
      });
      expect(result.success).toBe(false);
    });
  });
});
