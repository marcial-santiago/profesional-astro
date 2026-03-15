import { defineMiddleware } from "astro:middleware";
import { checkRateLimit } from "./lib/rate-limiter";
import { ALLOWED_ORIGINS } from "./constants";

// Per-endpoint rate limit configs
const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  "/api/admin/login": { limit: 5,  windowMs: 15 * 60 * 1000 }, // 5 per 15 min
  "/api/contact":     { limit: 10, windowMs: 60 * 1000 },       // 10 per min
  "/api/visits":      { limit: 20, windowMs: 60 * 1000 },       // 20 per min
  "/api/slots":       { limit: 30, windowMs: 60 * 1000 },       // 30 per min
};

const DEFAULT_RATE_LIMIT = { limit: 60, windowMs: 60 * 1000 };

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url } = context;
  const { pathname } = url;
  const method = request.method;

  // ── 1. Rate limiting on all API routes ────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    const ip = getClientIp(request);
    const config = RATE_LIMITS[pathname] ?? DEFAULT_RATE_LIMIT;
    const result = checkRateLimit(ip, pathname, config);

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Intentá más tarde." }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(result.resetAt),
        },
      });
    }
  }

  // ── 2. Content-Type validation for JSON API endpoints ────────────────────
  if (
    pathname.startsWith("/api/") &&
    MUTATING_METHODS.has(method) &&
    pathname !== "/api/contact" // contact uses multipart/form-data
  ) {
    const ct = request.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
      return new Response(JSON.stringify({ error: "Content-Type must be application/json" }), {
        status: 415,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // ── 4. CSRF — Origin check on mutating admin requests ─────────────────────
  if (pathname.startsWith("/api/admin/") && MUTATING_METHODS.has(method)) {
    const origin = request.headers.get("origin");

    // Requests with no Origin header are same-origin form submissions — allow.
    // Requests WITH an Origin header must be in the whitelist.
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // ── 5. Process request ────────────────────────────────────────────────────
  const response = await next();

  // ── 6. Security headers on every response ─────────────────────────────────
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
});
