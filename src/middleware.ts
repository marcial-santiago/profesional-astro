import { defineMiddleware } from "astro:middleware";
import { checkRateLimit } from "./lib/rate-limiter";
import { verifyCsrfToken, generateCsrfToken, CSRF_COOKIE_NAME } from "./lib/csrf";
import { getClientIp } from "./lib/ip-utils";

// Per-endpoint rate limit configs
const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  "/api/admin/login": { limit: 5,  windowMs: 15 * 60 * 1000 }, // 5 per 15 min
  "/api/contact":     { limit: 10, windowMs: 60 * 1000 },       // 10 per min
  "/api/visits":      { limit: 20, windowMs: 60 * 1000 },       // 20 per min
  "/api/slots":       { limit: 30, windowMs: 60 * 1000 },       // 30 per min
};

const DEFAULT_RATE_LIMIT = { limit: 60, windowMs: 60 * 1000 };

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Endpoints exempt from content-type validation and rate limiting
const STRIPE_WEBHOOK_PATH = "/api/stripe/webhook";

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url } = context;
  const { pathname } = url;
  const method = request.method;

  // ── 0. Generate request ID for correlation ────────────────────────────────
  const requestId = crypto.randomUUID();

  // ── 1. Rate limiting on all API routes (except Stripe webhook) ────────────
  if (pathname.startsWith("/api/") && pathname !== STRIPE_WEBHOOK_PATH) {
    const ip = getClientIp(request);
    const config = RATE_LIMITS[pathname] ?? DEFAULT_RATE_LIMIT;
    const result = await checkRateLimit(ip, pathname, config);

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
          "X-Request-Id": requestId,
        },
      });
    }
  }

  // ── 2. Content-Type validation for JSON API endpoints (except Stripe webhook) ─
  if (
    pathname.startsWith("/api/") &&
    pathname !== STRIPE_WEBHOOK_PATH &&
    MUTATING_METHODS.has(method) &&
    pathname !== "/api/contact" // contact uses multipart/form-data
  ) {
    const ct = request.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
      return new Response(JSON.stringify({ error: "Content-Type must be application/json" }), {
        status: 415,
        headers: { "Content-Type": "application/json", "X-Request-Id": requestId },
      });
    }
  }

  // ── 2. CSRF — Token verification on mutating requests ─────────────────────
  // Admin endpoints + public state-changing endpoints
  const csrfProtectedPaths = [
    "/api/admin/",
    "/api/visits",
    "/api/stripe/create-checkout-session",
  ];
  const isCsrfProtected = csrfProtectedPaths.some(p =>
    p.endsWith("/") ? pathname.startsWith(p) : pathname === p
  );

  if (isCsrfProtected && MUTATING_METHODS.has(method) && pathname !== "/api/admin/login") {
    const csrfError = verifyCsrfToken(request);
    if (csrfError) {
      csrfError.headers.set("X-Request-Id", requestId);
      return csrfError;
    }
  }

  // ── 3. Process request ────────────────────────────────────────────────────
  const response = await next();

  // ── 4. Set CSRF cookie if not present (for all visitors) ──────────────────
  const hasCsrfCookie = (request.headers.get("cookie") ?? "").includes(CSRF_COOKIE_NAME);
  if (!hasCsrfCookie) {
    const newToken = generateCsrfToken();
    response.headers.set("Set-Cookie",
      `${CSRF_COOKIE_NAME}=${newToken}; Path=/; SameSite=Strict; ${import.meta.env.PROD ? "Secure; " : ""}Max-Age=86400`
    );
  }

  // ── 5. Security headers on every response ─────────────────────────────────
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("X-Request-Id", requestId);

  // CSP — restrict resource loading to same-origin + trusted CDNs
  // Allow inline styles needed by Astro/Tailwind, block inline scripts
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https://media.istockphoto.com https://www.jkfm.com.au; " +
    "font-src 'self'; " +
    "connect-src 'self' https://api.stripe.com; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );

  // HSTS — force HTTPS (production only)
  if (import.meta.env.PROD) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  return response;
});
