// Tests for CSRF token generation and verification
import { describe, it, expect } from "vitest";
import {
  generateCsrfToken,
  verifyCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from "../src/lib/csrf";

describe("CSRF Token", () => {
  describe("generateCsrfToken", () => {
    it("should generate a 64-character hex string (32 bytes)", () => {
      const token = generateCsrfToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should generate unique tokens each time", () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe("verifyCsrfToken", () => {
    function makeRequest(cookieToken: string | null, headerToken: string | null) {
      const headers = new Headers();
      if (cookieToken) headers.set("cookie", `${CSRF_COOKIE_NAME}=${cookieToken}`);
      if (headerToken) headers.set(CSRF_HEADER_NAME, headerToken);
      return new Request("http://localhost/api/admin/test", {
        method: "POST",
        headers,
      });
    }

    it("should return null (valid) when tokens match", () => {
      const token = generateCsrfToken();
      const result = verifyCsrfToken(makeRequest(token, token));
      expect(result).toBeNull();
    });

    it("should return 401 when cookie token is missing", () => {
      const result = verifyCsrfToken(makeRequest(null, "some-token"));
      expect(result).not.toBeNull();
      expect(result!.status).toBe(401);
    });

    it("should return 401 when header token is missing", () => {
      const token = generateCsrfToken();
      const result = verifyCsrfToken(makeRequest(token, null));
      expect(result).not.toBeNull();
      expect(result!.status).toBe(401);
    });

    it("should return 403 when tokens do not match", () => {
      const result = verifyCsrfToken(makeRequest("token-a", "token-b"));
      expect(result).not.toBeNull();
      expect(result!.status).toBe(403);
    });

    it("should reject empty tokens", () => {
      const result = verifyCsrfToken(makeRequest("", ""));
      expect(result).not.toBeNull();
      expect(result!.status).toBe(401);
    });

    it("should reject tokens that differ by one character", () => {
      const token = generateCsrfToken();
      const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
      const result = verifyCsrfToken(makeRequest(token, tampered));
      expect(result).not.toBeNull();
      expect(result!.status).toBe(403);
    });
  });

  describe("constants", () => {
    it("should export CSRF_COOKIE_NAME", () => {
      expect(CSRF_COOKIE_NAME).toBe("csrf_token");
    });

    it("should export CSRF_HEADER_NAME", () => {
      expect(CSRF_HEADER_NAME).toBe("x-csrf-token");
    });
  });
});
