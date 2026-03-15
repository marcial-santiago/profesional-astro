import type { AstroCookies } from "astro";
import { verifySessionToken } from "../lib/session";
import { unauthorizedResponse } from "../utils/response.utils";
import { ERROR_MESSAGES } from "../constants";

/**
 * Verify admin session cookie. Returns a 401 Response if invalid, null if ok.
 * Must be awaited — token verification is async (HMAC-SHA256).
 */
export async function requireAdminAuth(
  cookies: AstroCookies,
): Promise<Response | null> {
  const token = cookies.get("admin_session")?.value;
  const secret = import.meta.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    console.error("Missing env var: ADMIN_SESSION_SECRET");
    return unauthorizedResponse(ERROR_MESSAGES.UNAUTHORIZED);
  }

  if (!token) {
    return unauthorizedResponse(ERROR_MESSAGES.UNAUTHORIZED);
  }

  const valid = await verifySessionToken(token, secret);
  if (!valid) {
    return unauthorizedResponse(ERROR_MESSAGES.UNAUTHORIZED);
  }

  return null;
}

/**
 * Boolean check — use when you only need to conditionally render UI.
 */
export async function isAdminAuthenticated(
  cookies: AstroCookies,
): Promise<boolean> {
  const token = cookies.get("admin_session")?.value;
  const secret = import.meta.env.ADMIN_SESSION_SECRET;
  if (!token || !secret) return false;
  return verifySessionToken(token, secret);
}
