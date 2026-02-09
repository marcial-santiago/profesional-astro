import type { AstroCookies } from "astro";
import { unauthorizedResponse } from "../utils/response.utils";
import { ERROR_MESSAGES } from "../constants";

/**
 * Middleware to check if user is authenticated as admin
 */
export function requireAdminAuth(cookies: AstroCookies): Response | null {
  if (cookies.get("admin_session")?.value !== "ok") {
    return unauthorizedResponse(ERROR_MESSAGES.UNAUTHORIZED);
  }
  return null;
}

/**
 * Check if admin is authenticated (returns boolean)
 */
export function isAdminAuthenticated(cookies: AstroCookies): boolean {
  return cookies.get("admin_session")?.value === "ok";
}
