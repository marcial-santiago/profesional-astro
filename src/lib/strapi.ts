/**
 * Strapi API client for server-side requests.
 * 
 * Uses STRAPI_API_TOKEN for authenticated requests (admin-level access).
 * Only call from API routes — never expose the token to the browser.
 */

const STRAPI_URL = process.env.STRAPI_URL || import.meta.env.STRAPI_URL || "http://localhost:1337";

/**
 * Fetch from Strapi with admin auth headers.
 */
export async function strapiFetch(path: string, options?: RequestInit): Promise<Response> {
  const url = path.startsWith("http") ? path : `${STRAPI_URL}${path}`;
  const token = process.env.STRAPI_API_TOKEN || import.meta.env.STRAPI_API_TOKEN;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string>),
  };

  return fetch(url, {
    ...options,
    headers,
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
  try {
    let raw: any = null;
    let res = await strapiFetch(`/api/work-types/${id}`);
    if (res.ok) {
      const json = await res.json();
      raw = json.data;
    } else {
      // Strapi 5 uses documentId for direct routes (/api/work-types/:documentId).
      // Fallback to integer filter query for numeric IDs.
      const filterRes = await strapiFetch(`/api/work-types?filters[id][$eq]=${id}`);
      if (filterRes.ok) {
        const filterJson = await filterRes.json();
        raw = filterJson.data?.[0] || null;
      }
    }

    if (!raw) {
      console.error(`[Strapi] getWorkType(${id}) not found`);
      return null;
    }

    // Handle both Strapi v4 (data.attributes) and Strapi v5 (flat data)
    const attrs = raw.attributes ? { id: raw.id, ...raw.attributes } : raw;

    return {
      id: attrs.id ?? id,
      name: attrs.name || "Service",
      slug: attrs.slug || "",
      description: attrs.description || null,
      category: attrs.category || "",
      duration: attrs.duration ?? 60,
      price: attrs.price ?? 10,
      isActive: attrs.isActive !== false,
    };
  } catch (err) {
    console.error(`[Strapi] getWorkType(${id}) error:`, err);
    return null;
  }
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

  let res = await strapiFetch("/api/visits", {
    method: "POST",
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    console.error("[Strapi] createVisit failed:", JSON.stringify(error, null, 2));

    // Fallback 1: Strapi v5 relation format with connect
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

      // Fallback 2: If workType is not permitted or populated via public API, create without relation
      const plainBody = { data: baseData };
      const plainRes = await strapiFetch("/api/visits", {
        method: "POST",
        body: JSON.stringify(plainBody),
      });
      if (plainRes.ok) {
        console.log("[Strapi] Visit created without workType relation link");
        return plainRes.json();
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
