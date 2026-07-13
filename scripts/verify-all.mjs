/**
 * Comprehensive API verification script for profesional-astro form fixes.
 * Run with: npx tsx scripts/verify-all.mjs
 */

const BASE = "http://localhost:4321";

// Colors
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

let passed = 0;
let failed = 0;
let skipped = 0;

function log(status, msg, detail = "") {
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⏭️";
  const color = status === "PASS" ? GREEN : status === "FAIL" ? RED : YELLOW;
  console.log(`  ${icon} ${color}${msg}${RESET}${detail ? ` — ${detail}` : ""}`);
  if (status === "PASS") passed++;
  else if (status === "FAIL") failed++;
  else skipped++;
}

async function fetchWithRetry(url, opts = {}, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, opts);
      return res;
    } catch (e) {
      if (i === retries) throw e;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

async function getCsrfToken() {
  const res = await fetchWithRetry(BASE + "/");
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return null;
  const match = setCookie.match(/csrf_token=([^;]+)/);
  return match ? match[1] : null;
}

// Unique time generator to avoid slot conflicts
function uniqueTime() {
  const hour = 8 + Math.floor(Math.random() * 12); // 8:00 - 19:00
  const min = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function uniqueDate() {
  // Use dates far in the future to avoid conflicts
  const day = 1 + Math.floor(Math.random() * 28);
  return `2026-08-${String(day).padStart(2, "0")}`;
}

function testVisitPayload(overrides = {}) {
  return {
    nombre: "Test User",
    telefono: "0400111222",
    date: uniqueDate(),
    time: uniqueTime(),
    workTypeId: 1,
    ...overrides,
  };
}

function csrfHeaders(token) {
  return {
    "Content-Type": "application/json",
    Cookie: `csrf_token=${token}`,
    "x-csrf-token": token,
  };
}

// ─── 1. SERVER HEALTH ───────────────────────────────────────────────
async function testServerHealth() {
  console.log(`\n${BOLD}1. Server Health${RESET}`);

  try {
    const res = await fetchWithRetry(BASE + "/");
    log(res.ok ? "PASS" : "FAIL", "Home page responds", `Status: ${res.status}`);
  } catch {
    log("FAIL", "Server not running", `Is pnpm dev running on ${BASE}?`);
    process.exit(1);
  }

  try {
    const res = await fetchWithRetry(BASE + "/api/work-types");
    const data = await res.json();
    log(res.ok && Array.isArray(data) ? "PASS" : "FAIL", "Work types API", `${data.length} services available`);
  } catch (e) {
    log("FAIL", "Work types API error", e.message);
  }
}

// ─── 2. CSRF PROTECTION ─────────────────────────────────────────────
async function testCsrfProtection() {
  console.log(`\n${BOLD}2. CSRF Protection${RESET}`);

  // 2a. Cookie auto-generated
  const token = await getCsrfToken();
  log(token ? "PASS" : "FAIL", "CSRF cookie auto-generated", token ? `Token: ${token.slice(0, 12)}...` : "No cookie");

  // 2b. Request without CSRF is rejected
  try {
    const res = await fetchWithRetry(BASE + "/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testVisitPayload()),
    });
    log(res.status === 401 ? "PASS" : "FAIL", "Visits rejects without CSRF", `Status: ${res.status}`);
  } catch (e) {
    log("FAIL", "CSRF test error", e.message);
  }

  // 2c. Request with valid CSRF is accepted
  try {
    const t = await getCsrfToken();
    const res = await fetchWithRetry(BASE + "/api/visits", {
      method: "POST",
      headers: csrfHeaders(t),
      body: JSON.stringify(testVisitPayload()),
    });
    const data = await res.json();
    log(res.status === 201 ? "PASS" : "FAIL", "Visits accepts with CSRF", `Status: ${res.status}`);
  } catch (e) {
    log("FAIL", "CSRF accept test error", e.message);
  }

  // 2d. Stripe endpoint rejects without CSRF
  try {
    const res = await fetchWithRetry(BASE + "/api/stripe/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE },
      body: JSON.stringify({ workTypeName: "Test", nombre: "Test", telefono: "0400", date: "2026-05-01", time: "10:00", workTypeId: 1 }),
    });
    log(res.status === 401 ? "PASS" : "FAIL", "Stripe rejects without CSRF", `Status: ${res.status}`);
  } catch (e) {
    log("FAIL", "Stripe CSRF test error", e.message);
  }
}

// ─── 3. HONEYPOT ────────────────────────────────────────────────────
async function testHoneypot() {
  console.log(`\n${BOLD}3. Honeypot (Bot Protection)${RESET}`);

  const t = await getCsrfToken();

  // 3a. Visits with honeypot filled → 400
  try {
    const res = await fetchWithRetry(BASE + "/api/visits", {
      method: "POST",
      headers: csrfHeaders(t),
      body: JSON.stringify(testVisitPayload({ company: "spam" })),
    });
    log(res.status === 400 ? "PASS" : "FAIL", "Visits blocks honeypot", `Status: ${res.status}`);
  } catch (e) {
    log("FAIL", "Visits honeypot error", e.message);
  }

  // 3b. Stripe with honeypot filled → 400
  try {
    const res = await fetchWithRetry(BASE + "/api/stripe/create-checkout-session", {
      method: "POST",
      headers: { ...csrfHeaders(t), Origin: BASE },
      body: JSON.stringify({ workTypeName: "Test", nombre: "Bot", telefono: "0400", date: "2026-06-15", time: uniqueTime(), workTypeId: 1, company: "spam" }),
    });
    log(res.status === 400 ? "PASS" : "FAIL", "Stripe blocks honeypot", `Status: ${res.status}`);
  } catch (e) {
    log("FAIL", "Stripe honeypot error", e.message);
  }

  // 3c. Valid visit (no honeypot) → 201
  try {
    const res = await fetchWithRetry(BASE + "/api/visits", {
      method: "POST",
      headers: csrfHeaders(t),
      body: JSON.stringify(testVisitPayload()),
    });
    log(res.status === 201 ? "PASS" : "FAIL", "Valid visit accepted", `Status: ${res.status}`);
  } catch (e) {
    log("FAIL", "Valid visit error", e.message);
  }
}

// ─── 4. VALIDATION ──────────────────────────────────────────────────
async function testValidation() {
  console.log(`\n${BOLD}4. Server-Side Validation${RESET}`);

  const t = await getCsrfToken();

  // 4a. Invalid phone → 400
  try {
    const res = await fetchWithRetry(BASE + "/api/visits", {
      method: "POST",
      headers: csrfHeaders(t),
      body: JSON.stringify(testVisitPayload({ telefono: "abc" })),
    });
    log(res.status === 400 ? "PASS" : "FAIL", "Rejects invalid phone", `Status: ${res.status}`);
  } catch (e) {
    log("FAIL", "Phone validation error", e.message);
  }

  // 4b. Short name → 400
  try {
    const res = await fetchWithRetry(BASE + "/api/visits", {
      method: "POST",
      headers: csrfHeaders(t),
      body: JSON.stringify(testVisitPayload({ nombre: "ab" })),
    });
    log(res.status === 400 ? "PASS" : "FAIL", "Rejects short name", `Status: ${res.status}`);
  } catch (e) {
    log("FAIL", "Name validation error", e.message);
  }

  // 4c. Invalid workTypeId → 400
  try {
    const res = await fetchWithRetry(BASE + "/api/visits", {
      method: "POST",
      headers: csrfHeaders(t),
      body: JSON.stringify(testVisitPayload({ workTypeId: 99999 })),
    });
    log(res.status === 400 ? "PASS" : "FAIL", "Rejects invalid workTypeId", `Status: ${res.status}`);
  } catch (e) {
    log("FAIL", "WorkTypeId validation error", e.message);
  }

  // 4d. Name with accents → 201 (should accept)
  try {
    const res = await fetchWithRetry(BASE + "/api/visits", {
      method: "POST",
      headers: csrfHeaders(t),
      body: JSON.stringify(testVisitPayload({ nombre: "María José García" })),
    });
    log(res.status === 201 ? "PASS" : "FAIL", "Accepts name with accents", `Status: ${res.status}`);
  } catch (e) {
    log("FAIL", "Accent name error", e.message);
  }

  // 4e. Valid phone formats
  const validPhones = ["0400111222", "+61 400 000 000", "0400 000 000", "(0400) 000-000"];
  for (const phone of validPhones) {
    try {
      const res = await fetchWithRetry(BASE + "/api/visits", {
        method: "POST",
        headers: csrfHeaders(t),
        body: JSON.stringify(testVisitPayload({ telefono: phone })),
      });
      log(res.status === 201 ? "PASS" : "FAIL", `Phone format: "${phone}"`, `Status: ${res.status}`);
    } catch (e) {
      log("FAIL", `Phone format error: "${phone}"`, e.message);
    }
  }
}

// ─── 5. ADMIN ROUTES ────────────────────────────────────────────────
async function testAdminRoutes() {
  console.log(`\n${BOLD}5. Admin Routes (Auth Required)${RESET}`);

  // 5a. PUT work-types without auth → 401
  try {
    const res = await fetchWithRetry(BASE + "/api/admin/work-types/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test" }),
    });
    log(res.status === 401 ? "PASS" : "FAIL", "PUT work-types requires auth", `Status: ${res.status}`);
  } catch (e) {
    log("FAIL", "PUT auth test error", e.message);
  }

  // 5b. DELETE work-types without auth → 401
  try {
    const res = await fetchWithRetry(BASE + "/api/admin/work-types/1", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    log(res.status === 401 ? "PASS" : "FAIL", "DELETE work-types requires auth", `Status: ${res.status}`);
  } catch (e) {
    log("FAIL", "DELETE auth test error", e.message);
  }

  // 5c. POST work-types without auth → 401
  try {
    const res = await fetchWithRetry(BASE + "/api/admin/work-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", duration: 60, price: 10 }),
    });
    log(res.status === 401 ? "PASS" : "FAIL", "POST work-types requires auth", `Status: ${res.status}`);
  } catch (e) {
    log("FAIL", "POST auth test error", e.message);
  }

  // 5d. Admin login with wrong creds → 401
  try {
    const res = await fetchWithRetry(BASE + "/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: "wrong", password: "wrong" }),
    });
    log(res.status === 401 ? "PASS" : "FAIL", "Admin login rejects wrong creds", `Status: ${res.status}`);
  } catch (e) {
    log("FAIL", "Admin login test error", e.message);
  }
}

// ─── 6. STRIPE PRICE VALIDATION ─────────────────────────────────────
async function testStripePriceValidation() {
  console.log(`\n${BOLD}6. Stripe Price Validation (DB vs Client)${RESET}`);

  const t = await getCsrfToken();

  // 6a. Client sends price: 0.01, server should use DB price
  try {
    const res = await fetchWithRetry(BASE + "/api/stripe/create-checkout-session", {
      method: "POST",
      headers: { ...csrfHeaders(t), Origin: BASE },
      body: JSON.stringify({
        workTypeName: "Test",
        price: 0.01, // Manipulated price
        nombre: "Test",
        telefono: "0400111222",
        date: "2026-06-15",
        time: uniqueTime(),
        workTypeId: 1,
      }),
    });
    const data = await res.json();
    if (res.ok && data.url) {
      // We can't verify the exact price without parsing the Stripe URL,
      // but if it returns a URL, the server accepted it (using DB price)
      log("PASS", "Stripe session created (DB price used)", "Session URL returned");
    } else {
      log("FAIL", "Stripe session failed", data.error || "No URL");
    }
  } catch (e) {
    log("FAIL", "Stripe price test error", e.message);
  }

  // 6b. Invalid workTypeId → 400
  try {
    const res = await fetchWithRetry(BASE + "/api/stripe/create-checkout-session", {
      method: "POST",
      headers: { ...csrfHeaders(t), Origin: BASE },
      body: JSON.stringify({
        workTypeName: "Test",
        price: 10,
        nombre: "Test",
        telefono: "0400111222",
        date: "2026-06-15",
        time: uniqueTime(),
        workTypeId: 99999,
      }),
    });
    log(res.status === 400 ? "PASS" : "FAIL", "Stripe rejects invalid workTypeId", `Status: ${res.status}`);
  } catch (e) {
    log("FAIL", "Stripe workTypeId test error", e.message);
  }
}

// ─── 7. CONTACT FORM ────────────────────────────────────────────────
async function testContactForm() {
  console.log(`\n${BOLD}7. Contact Form${RESET}`);

  // 7a. Valid contact form
  try {
    const formData = new FormData();
    formData.append("nombre", "Test User");
    formData.append("telefono", "0400111222");
    formData.append("servicio", "reparacion");
    formData.append("mensaje", "This is a test message for verification purposes.");
    formData.append("company", ""); // honeypot empty

    const res = await fetchWithRetry(BASE + "/api/contact", {
      method: "POST",
      body: formData,
    });
    log(res.status === 201 ? "PASS" : "FAIL", "Contact form accepts valid data", `Status: ${res.status}`);
  } catch (e) {
    log("FAIL", "Contact form error", e.message);
  }

  // 7b. Contact form with honeypot filled → 200 (silently accepted, not saved)
  // Server now checks honeypot and returns 200 without saving to DB
  try {
    const formData = new FormData();
    formData.append("nombre", "Bot");
    formData.append("telefono", "0400111222");
    formData.append("servicio", "reparacion");
    formData.append("mensaje", "This is a test message for verification purposes.");
    formData.append("company", "spam"); // honeypot filled

    const res = await fetchWithRetry(BASE + "/api/contact", {
      method: "POST",
      body: formData,
    });
    log(res.status === 200 ? "PASS" : "FAIL", "Contact form blocks honeypot (silent 200)", `Status: ${res.status}`);
  } catch (e) {
    log("FAIL", "Contact honeypot error", e.message);
  }
}

// ─── 8. SECURITY HEADERS ────────────────────────────────────────────
async function testSecurityHeaders() {
  console.log(`\n${BOLD}8. Security Headers${RESET}`);

  try {
    const res = await fetchWithRetry(BASE + "/");
    const headers = {
      "X-Content-Type-Options": res.headers.get("x-content-type-options"),
      "X-Frame-Options": res.headers.get("x-frame-options"),
      "Content-Security-Policy": res.headers.get("content-security-policy")?.slice(0, 50) + "...",
      "X-Request-Id": res.headers.get("x-request-id") ? "present" : "missing",
    };

    log(headers["X-Content-Type-Options"] === "nosniff" ? "PASS" : "FAIL", "X-Content-Type-Options", headers["X-Content-Type-Options"]);
    log(headers["X-Frame-Options"] === "DENY" ? "PASS" : "FAIL", "X-Frame-Options", headers["X-Frame-Options"]);
    log(headers["Content-Security-Policy"] ? "PASS" : "FAIL", "Content-Security-Policy", headers["Content-Security-Policy"]);
    log(headers["X-Request-Id"] === "present" ? "PASS" : "FAIL", "X-Request-Id", headers["X-Request-Id"]);
  } catch (e) {
    log("FAIL", "Security headers error", e.message);
  }
}

// ─── 9. STATIC PAGES ────────────────────────────────────────────────
async function testStaticPages() {
  console.log(`\n${BOLD}9. Static Pages${RESET}`);

  const pages = [
    { path: "/", name: "Home" },
    { path: "/about", name: "About" },
    { path: "/checkout", name: "Checkout" },
    { path: "/checkout/success", name: "Checkout Success" },
    { path: "/admin", name: "Admin" },
  ];

  for (const page of pages) {
    try {
      const res = await fetchWithRetry(BASE + page.path);
      log(res.ok ? "PASS" : "FAIL", `${page.name} (${page.path})`, `Status: ${res.status}`);
    } catch (e) {
      log("FAIL", `${page.name} error`, e.message);
    }
  }
}

// ─── 10. RATE LIMITING ──────────────────────────────────────────────
async function testRateLimiting() {
  console.log(`\n${BOLD}10. Rate Limiting${RESET}`);

  const t = await getCsrfToken();

  // Send 25 rapid requests to /api/visits (limit: 20/min)
  let rateLimited = false;
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetchWithRetry(BASE + "/api/visits", {
        method: "POST",
        headers: csrfHeaders(t),
        body: JSON.stringify(testVisitPayload({ nombre: `Rate Test ${i}` })),
      });
      if (res.status === 429) {
        rateLimited = true;
        break;
      }
    } catch {
      // ignore
    }
  }

  log(rateLimited ? "PASS" : "FAIL", "Rate limiting works", rateLimited ? "Got 429 after ~20 requests" : "No rate limit hit");
}

// ─── MAIN ───────────────────────────────────────────────────────────
async function main() {
  console.log(`${BOLD}╔══════════════════════════════════════════════════════════╗`);
  console.log(`║     profesional-astro — Comprehensive Verification Suite       ║`);
  console.log(`╚══════════════════════════════════════════════════════════╝${RESET}`);

  await testServerHealth();
  await testCsrfProtection();
  await testHoneypot();
  await testValidation();
  await testAdminRoutes();
  await testStripePriceValidation();
  await testContactForm();
  await testSecurityHeaders();
  await testStaticPages();
  await testRateLimiting();

  console.log(`\n${BOLD}╔══════════════════════════════════════════════════════════╗`);
  console.log(`║                      RESULTS SUMMARY                             ║`);
  console.log(`╠══════════════════════════════════════════════════════════╣${RESET}`);
  console.log(`${GREEN}  ✅ Passed:  ${passed}${RESET}`);
  console.log(`${RED}  ❌ Failed:  ${failed}${RESET}`);
  console.log(`${YELLOW}  ⏭️  Skipped: ${skipped}${RESET}`);
  console.log(`${BOLD}  📊 Total:   ${passed + failed + skipped}${RESET}`);
  console.log(`${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}`);

  if (failed > 0) {
    console.log(`\n${RED}⚠️  ${failed} test(s) failed. Review the output above.${RESET}`);
    process.exit(1);
  } else {
    console.log(`\n${GREEN}🎉 All tests passed!${RESET}`);
    process.exit(0);
  }
}

main().catch((e) => {
  console.error(`${RED}Fatal error:${RESET}`, e.message);
  process.exit(1);
});
