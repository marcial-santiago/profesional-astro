// IP extraction and validation utilities for rate limiting and security.

/**
 * Validate an IP address format (IPv4 or IPv6).
 */
export function isValidIp(ip: string): boolean {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  const ipv6Bracket = /^\[[0-9a-fA-F:]+\]$/;

  if (ipv4.test(ip)) {
    const parts = ip.split(".");
    return parts.every((p) => {
      const n = parseInt(p, 10);
      return n >= 0 && n <= 255;
    });
  }

  return ipv6.test(ip) || ipv6Bracket.test(ip);
}

/**
 * Extract client IP from request headers with anti-spoofing validation.
 * Prioritizes Vercel-specific header, then standard proxy headers.
 * Only uses the FIRST IP in the chain (the real client IP).
 */
export function getClientIp(request: Request): string {
  // Vercel-specific header (most trustworthy on Vercel)
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    const first = vercelIp.split(",")[0].trim();
    if (isValidIp(first)) return first;
  }

  // Standard proxy header — take only the first IP
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (isValidIp(first)) return first;
  }

  // Fallback
  const realIp = request.headers.get("x-real-ip");
  if (realIp && isValidIp(realIp)) return realIp;

  return "unknown";
}
