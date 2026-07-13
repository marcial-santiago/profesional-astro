// CSRF protection using the Double-Submit Cookie pattern.
// The client must send the CSRF token both as a cookie AND as a header (X-CSRF-Token).
// Since both must match and the cookie is httpOnly=false (readable by JS),
// an attacker cannot forge requests from another origin.

import { ERROR_MESSAGES } from "../constants";
import { unauthorizedResponse } from "../utils/response.utils";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically random CSRF token.
 */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(CSRF_TOKEN_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify the CSRF token from the request.
 * Compares the token in the X-CSRF-Token header against the csrf_token cookie.
 * Returns null if valid, or a 403 Response if invalid/missing.
 */
export function verifyCsrfToken(request: Request): Response | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  // Extract CSRF token from cookie
  const cookieMatch = cookieHeader.match(new RegExp(`${CSRF_COOKIE_NAME}=([^;]+)`));
  const cookieToken = cookieMatch ? cookieMatch[1] : null;

  if (!cookieToken || !headerToken) {
    return unauthorizedResponse(ERROR_MESSAGES.UNAUTHORIZED);
  }

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeCompare(cookieToken, headerToken)) {
    return new Response(JSON.stringify({ error: "Invalid CSRF token" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return null;
}

/**
 * Timing-safe string comparison.
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
