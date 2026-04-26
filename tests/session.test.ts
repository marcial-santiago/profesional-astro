// Tests for session token creation, verification, and revocation
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock prisma before importing session module
vi.mock("../src/lib/prisma", () => ({
  prisma: {
    revokedToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { createSessionToken, verifySessionToken, revokeToken } from "../src/lib/session";
import { prisma } from "../src/lib/prisma";

const TEST_SECRET = "test-secret-key-for-session-testing-only";

describe("Session Token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createSessionToken", () => {
    it("should create a token with two base64url parts separated by a dot", async () => {
      const token = await createSessionToken(TEST_SECRET);
      const parts = token.split(".");
      expect(parts).toHaveLength(2);
      expect(parts[0]).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(parts[1]).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("should include jti in the payload", async () => {
      const token = await createSessionToken(TEST_SECRET);
      const payloadB64 = token.split(".")[0];
      const padded = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(Buffer.from(padded, "base64").toString());
      expect(payload).toHaveProperty("sub", "admin");
      expect(payload).toHaveProperty("iat");
      expect(payload).toHaveProperty("jti");
      expect(typeof payload.jti).toBe("string");
      expect(payload.jti).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it("should generate unique tokens each time", async () => {
      const token1 = await createSessionToken(TEST_SECRET);
      const token2 = await createSessionToken(TEST_SECRET);
      expect(token1).not.toBe(token2);
    });
  });

  describe("verifySessionToken", () => {
    it("should verify a valid token", async () => {
      const token = await createSessionToken(TEST_SECRET);
      vi.mocked(prisma.revokedToken.findUnique).mockResolvedValue(null);
      const valid = await verifySessionToken(token, TEST_SECRET);
      expect(valid).toBe(true);
    });

    it("should reject a token with wrong secret", async () => {
      const token = await createSessionToken(TEST_SECRET);
      const valid = await verifySessionToken(token, "wrong-secret");
      expect(valid).toBe(false);
    });

    it("should reject a tampered token", async () => {
      const token = await createSessionToken(TEST_SECRET);
      const tampered = token.slice(0, -5) + "XXXXX";
      const valid = await verifySessionToken(tampered, TEST_SECRET);
      expect(valid).toBe(false);
    });

    it("should reject a malformed token (no dot)", async () => {
      const valid = await verifySessionToken("not-a-valid-token", TEST_SECRET);
      expect(valid).toBe(false);
    });

    it("should reject an empty token", async () => {
      const valid = await verifySessionToken("", TEST_SECRET);
      expect(valid).toBe(false);
    });

    it("should reject a revoked token", async () => {
      const token = await createSessionToken(TEST_SECRET);
      // Extract jti from token
      const payloadB64 = token.split(".")[0];
      const padded = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(Buffer.from(padded, "base64").toString());

      vi.mocked(prisma.revokedToken.findUnique).mockResolvedValue({
        id: 1,
        jti: payload.jti,
        revokedAt: new Date(),
      });

      const valid = await verifySessionToken(token, TEST_SECRET);
      expect(valid).toBe(false);
    });

    it("should accept a non-revoked token", async () => {
      const token = await createSessionToken(TEST_SECRET);
      vi.mocked(prisma.revokedToken.findUnique).mockResolvedValue(null);
      const valid = await verifySessionToken(token, TEST_SECRET);
      expect(valid).toBe(true);
    });
  });

  describe("revokeToken", () => {
    it("should store the jti in the database", async () => {
      const token = await createSessionToken(TEST_SECRET);
      const payloadB64 = token.split(".")[0];
      const padded = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(Buffer.from(padded, "base64").toString());

      await revokeToken(token);

      expect(prisma.revokedToken.create).toHaveBeenCalledWith({
        data: { jti: payload.jti },
      });
    });

    it("should silently fail on malformed token", async () => {
      await expect(revokeToken("malformed-token")).resolves.not.toThrow();
    });
  });
});
