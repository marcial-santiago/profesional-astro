import type { APIRoute } from "astro";
import { strapiFetch } from "../../lib/strapi";
import { errorResponse, internalErrorResponse, successResponse } from "../../utils/response.utils";
import { z } from "zod";

export const prerender = false;

const bodySchema = z.object({
  nombre: z.string().min(3).max(100),
  telefono: z.string().min(8).max(20),
  servicio: z.string().min(1).max(100),
  mensaje: z.string().min(10).max(1000),
  // Honeypot
  company: z.string().optional(),
});

/**
 * Same-origin contact proxy.
 * Browser requests hit Astro (/api/contact), then Astro writes to Strapi internally.
 * This avoids exposing Docker-internal STRAPI_URL or fighting browser CORS in production.
 */
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body) {
    return errorResponse("Invalid JSON body", 400);
  }

  if (body.company && body.company.trim() !== "") {
    return errorResponse("Bad request", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Invalid request data", 400);
  }

  try {
    const res = await strapiFetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: parsed.data }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error("[contact] Strapi error:", data);
      return errorResponse("Could not send message", res.status);
    }

    return successResponse(data, 201);
  } catch (error) {
    console.error("[contact] Error:", error);
    return internalErrorResponse("Could not send message");
  }
};
