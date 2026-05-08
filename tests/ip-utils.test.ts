// Tests for IP extraction and validation (anti-spoofing)
import { describe, it, expect } from "vitest";
import { isValidIp, getClientIp } from "../src/lib/ip-utils";

describe("IP Utils", () => {
  describe("isValidIp", () => {
    describe("IPv4", () => {
      it("should accept valid IPv4 addresses", () => {
        expect(isValidIp("192.168.1.1")).toBe(true);
        expect(isValidIp("10.0.0.1")).toBe(true);
        expect(isValidIp("127.0.0.1")).toBe(true);
        expect(isValidIp("255.255.255.255")).toBe(true);
        expect(isValidIp("0.0.0.0")).toBe(true);
      });

      it("should reject invalid IPv4 addresses", () => {
        expect(isValidIp("256.1.1.1")).toBe(false);
        expect(isValidIp("1.1.1")).toBe(false);
        expect(isValidIp("1.1.1.1.1")).toBe(false);
        expect(isValidIp("abc.def.ghi.jkl")).toBe(false);
        expect(isValidIp("999.999.999.999")).toBe(false);
      });
    });

    describe("IPv6", () => {
      it("should accept valid IPv6 addresses", () => {
        expect(isValidIp("::1")).toBe(true);
        expect(isValidIp("fe80::1")).toBe(true);
        expect(isValidIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe(true);
      });

      it("should accept bracketed IPv6", () => {
        expect(isValidIp("[::1]")).toBe(true);
        expect(isValidIp("[2001:db8::1]")).toBe(true);
      });
    });

    describe("invalid formats", () => {
      it("should reject non-IP strings", () => {
        expect(isValidIp("")).toBe(false);
        expect(isValidIp("localhost")).toBe(false);
        expect(isValidIp("not-an-ip")).toBe(false);
        expect(isValidIp("hello world")).toBe(false);
      });

      it("should reject spoofed IP attempts", () => {
        expect(isValidIp("1.2.3.4, 5.6.7.8")).toBe(false);
        expect(isValidIp("192.168.1.1<script>")).toBe(false);
      });
    });
  });

  describe("getClientIp", () => {
    function makeRequest(headers: Record<string, string>) {
      return new Request("http://localhost/api/test", { headers });
    }

    it("should use x-vercel-forwarded-for first", () => {
      const req = makeRequest({
        "x-vercel-forwarded-for": "1.2.3.4, 5.6.7.8",
        "x-forwarded-for": "9.9.9.9",
      });
      expect(getClientIp(req)).toBe("1.2.3.4");
    });

    it("should use x-forwarded-for if vercel header missing", () => {
      const req = makeRequest({
        "x-forwarded-for": "10.0.0.1, 172.16.0.1",
      });
      expect(getClientIp(req)).toBe("10.0.0.1");
    });

    it("should use x-real-ip as fallback", () => {
      const req = makeRequest({
        "x-real-ip": "192.168.0.1",
      });
      expect(getClientIp(req)).toBe("192.168.0.1");
    });

    it("should return 'unknown' if no valid IP found", () => {
      const req = makeRequest({});
      expect(getClientIp(req)).toBe("unknown");
    });

    it("should reject spoofed IPs with script injection in x-forwarded-for", () => {
      const req = makeRequest({
        "x-forwarded-for": "1.2.3.4<script>alert(1)</script>, 5.6.7.8",
      });
      // First IP is invalid due to script tag, falls to x-real-ip or unknown
      expect(getClientIp(req)).toBe("unknown");
    });

    it("should fall through if first IP in chain is invalid", () => {
      const req = makeRequest({
        "x-forwarded-for": "invalid-ip, 1.2.3.4",
        "x-real-ip": "5.6.7.8",
      });
      // First IP invalid, falls to x-real-ip
      expect(getClientIp(req)).toBe("5.6.7.8");
    });

    it("should handle whitespace in headers", () => {
      const req = makeRequest({
        "x-forwarded-for": "  10.0.0.1  ,  172.16.0.1  ",
      });
      expect(getClientIp(req)).toBe("10.0.0.1");
    });
  });
});
