import type { APIRoute } from "astro";
import { timingSafeEqual } from "node:crypto";
import { createSessionToken } from "../../../lib/session";

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

  cookies.set("admin_session", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: true, // always — even in dev, avoids http interception
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
