import type { APIRoute } from "astro";
import { timingSafeEqual } from "node:crypto";
import { createSessionToken } from "../../../lib/session";
import { generateCsrfToken, CSRF_COOKIE_NAME } from "../../../lib/csrf";

function safeCompare(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  if (bufA.length !== bufB.length) {
    // Run anyway to avoid leaking length info via timing
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const secret = import.meta.env.ADMIN_SESSION_SECRET;
  const adminUser = import.meta.env.ADMIN_USER;
  const adminPassword = import.meta.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPassword || !secret) {
    console.error("Missing required env vars: ADMIN_USER, ADMIN_PASSWORD, ADMIN_SESSION_SECRET");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json().catch(() => null);
  const { user, password } = body ?? {};

  // Constant-time comparison — prevents timing attacks on credentials
  const userMatch = safeCompare(String(user ?? ""), adminUser);
  const passMatch = safeCompare(String(password ?? ""), adminPassword);

  if (!userMatch || !passMatch) {
    return new Response(JSON.stringify({ error: "Credenciales inválidas" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = await createSessionToken(secret);
  const csrfToken = generateCsrfToken();

  cookies.set("admin_session", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: import.meta.env.PROD, // only require HTTPS in production
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });

  // CSRF token cookie — NOT httpOnly so client JS can read it for header
  cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    sameSite: "strict",
    secure: import.meta.env.PROD,
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours (same as session)
  });

  return new Response(JSON.stringify({ ok: true, csrfToken }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
