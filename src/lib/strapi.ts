/**
 * Strapi API client for server-side requests.
 * 
 * Uses STRAPI_API_TOKEN for authenticated requests (admin-level access).
 * Only call from API routes — never expose the token to the browser.
 */

const STRAPI_URL = process.env.STRAPI_URL || import.meta.env.STRAPI_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = import.meta.env.STRAPI_API_TOKEN;

if (!STRAPI_API_TOKEN) {
  console.warn("[Strapi] STRAPI_API_TOKEN not set — admin requests will fail");
}

const authHeaders: Record<string, string> = {
  "Content-Type": "application/json",
};

if (STRAPI_API_TOKEN) {
  authHeaders.Authorization = `Bearer ${STRAPI_API_TOKEN}`;
}

/**
 * Fetch from Strapi with admin auth headers.
 */
export async function strapiFetch(path: string, options?: RequestInit): Promise<Response> {
  const url = path.startsWith("http") ? path : `${STRAPI_URL}${path}`;
  
  return fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...options?.headers,
    },
  });
}

/**
 * Get a single WorkType by ID.
 */
export async function getWorkType(id: number): Promise<{
  id: number;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  duration: number;
  price: number;
  isActive: boolean;
} | null> {
  const res = await strapiFetch(`/api/work-types/${id}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || null;
}

/**
 * Find visits by stripeSessionId (for idempotency checks).
 */
export async function findVisitsByStripeSession(sessionId: string): Promise<any[]> {
  const res = await strapiFetch(
    `/api/visits?filters[stripeSessionId][$eq]=${encodeURIComponent(sessionId)}`
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

/**
 * Find visits by stripeEventId (secondary idempotency guard).
 */
export async function findVisitsByStripeEvent(eventId: string): Promise<any[]> {
  const res = await strapiFetch(
    `/api/visits?filters[stripeEventId][$eq]=${encodeURIComponent(eventId)}`
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

/**
 * Create a visit in Strapi.
 * Includes workType relation when available.
 */
export async function createVisit(data: {
  nombre: string;
  telefono: string;
  email?: string;
  mensaje?: string;
  date: string;
  workType?: number;
  status: string;
  stripeSessionId?: string;
  stripeEventId?: string;
}): Promise<any> {
  const baseData = {
    nombre: data.nombre,
    telefono: data.telefono,
    mensaje: data.mensaje || "",
    date: data.date,
    status: data.status,
    ...(data.email && { email: data.email }),
    ...(data.stripeSessionId && { stripeSessionId: data.stripeSessionId }),
    ...(data.stripeEventId && { stripeEventId: data.stripeEventId }),
  };

  const body = {
    data: {
      ...baseData,
      ...(data.workType && { workType: data.workType }),
    },
  };

  console.log("[Strapi] createVisit payload:", JSON.stringify(body, null, 2));

  const res = await strapiFetch("/api/visits", {
    method: "POST",
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    console.error("[Strapi] createVisit failed:", JSON.stringify(error, null, 2));

    // Fallback relation payload for Strapi v5 relation parser differences.
    if (data.workType) {
      const fallbackBody = {
        data: {
          ...baseData,
          workType: { connect: [data.workType] },
        },
      };
      const fallbackRes = await strapiFetch("/api/visits", {
        method: "POST",
        body: JSON.stringify(fallbackBody),
      });
      if (fallbackRes.ok) {
        return fallbackRes.json();
      }

      const fallbackErr = await fallbackRes.json().catch(() => ({}));
      console.error("[Strapi] createVisit fallback failed:", JSON.stringify(fallbackErr, null, 2));
      const fbMsg =
        fallbackErr.error?.message ||
        fallbackErr.message ||
        fallbackErr.error ||
        `Strapi error: ${fallbackRes.status}`;
      throw new Error(typeof fbMsg === "string" ? fbMsg : JSON.stringify(fbMsg));
    }

    const msg = error.error?.message || error.message || error.error || `Strapi error: ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  
  return res.json();
}
