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
/**
 * Get a single WorkType by ID or DocumentID.
 */
export async function getWorkType(id: number | string): Promise<{
  id: number;
  documentId?: string;
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
      id: attrs.id ?? (typeof id === "number" ? id : 0),
      documentId: raw.documentId || attrs.documentId,
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
 * Includes workType relation when available and embeds service name in message.
 */
export async function createVisit(data: {
  nombre: string;
  telefono: string;
  email?: string;
  mensaje?: string;
  date: string;
  workType?: number | string;
  status: string;
  stripeSessionId?: string;
  stripeEventId?: string;
}): Promise<any> {
  let docId: string | undefined = undefined;
  let numId: number | undefined = undefined;
  let workTypeName: string | undefined = undefined;

  if (data.workType) {
    if (typeof data.workType === "string") {
      docId = data.workType;
    } else {
      numId = data.workType;
    }

    try {
      const wt = await getWorkType(data.workType);
      if (wt) {
        docId = wt.documentId || docId;
        numId = wt.id || numId;
        workTypeName = wt.name;
      }
    } catch {
      // ignore lookup error
    }
  }

  // Prepend service name to mensaje if not already present so it's always visible in Strapi admin
  let updatedMensaje = data.mensaje || "";
  if (workTypeName && !updatedMensaje.includes(workTypeName)) {
    updatedMensaje = updatedMensaje
      ? `[Servicio: ${workTypeName}] ${updatedMensaje}`
      : `[Servicio: ${workTypeName}]`;
  }

  const baseData = {
    nombre: data.nombre,
    telefono: data.telefono,
    mensaje: updatedMensaje,
    date: data.date,
    status: data.status,
    ...(data.email && { email: data.email }),
    ...(data.stripeSessionId && { stripeSessionId: data.stripeSessionId }),
    ...(data.stripeEventId && { stripeEventId: data.stripeEventId }),
  };

  // Build target identifiers to try linking the workType relation in Strapi v4 / v5
  const targets = Array.from(new Set([docId, numId, data.workType].filter(Boolean)));

  for (const target of targets) {
    // 1. Direct target (Strapi v5 documentId or numeric id)
    const directBody = { data: { ...baseData, workType: target } };
    const directRes = await strapiFetch("/api/visits", {
      method: "POST",
      body: JSON.stringify(directBody),
    });
    if (directRes.ok) {
      console.log(`[Strapi] Visit created with workType relation direct target (${target})`);
      return directRes.json();
    }

    // 2. Connect array (Strapi v5/v4 connect format)
    const connectBody = { data: { ...baseData, workType: { connect: [target] } } };
    const connectRes = await strapiFetch("/api/visits", {
      method: "POST",
      body: JSON.stringify(connectBody),
    });
    if (connectRes.ok) {
      console.log(`[Strapi] Visit created with workType relation connect target (${target})`);
      return connectRes.json();
    }
  }

  // Fallback: If relation linking fails, create visit with baseData (which includes [Servicio: Name] in mensaje)
  const plainBody = { data: baseData };
  const plainRes = await strapiFetch("/api/visits", {
    method: "POST",
    body: JSON.stringify(plainBody),
  });
  if (plainRes.ok) {
    console.log("[Strapi] Visit created without relation, service name embedded in mensaje");
    return plainRes.json();
  }

  const error = await plainRes.json().catch(() => ({}));
  const msg = error.error?.message || error.message || error.error || `Strapi error: ${plainRes.status}`;
  throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
}
