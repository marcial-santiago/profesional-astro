import type { APIRoute } from "astro";
import { createVisit, getWorkType, strapiFetch } from "../../lib/strapi";
import { getAllowedOrigins } from "../../constants";
import {
  errorResponse,
  internalErrorResponse,
  successResponse,
} from "../../utils/response.utils";
import { z } from "zod";

export const prerender = false;

const bodySchema = z.object({
  nombre: z.string().min(3).max(100),
  telefono: z.string().min(1),
  email: z.string().email().or(z.literal("")).optional(),
  mensaje: z.string().max(500).optional(),
  date: z.string(),
  time: z.string(),
  workTypeId: z.number().int().positive(),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(),
});

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body) {
    return errorResponse("Invalid JSON body", 400);
  }

  // Honeypot check — reject if bot filled the hidden field
  if (body.company && body.company.trim() !== "") {
    return errorResponse("Bad request", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Invalid request data", 400);
  }

  const { nombre, telefono, email, mensaje, date, time, workTypeId, status } = parsed.data;

  // Extract request origin from Origin header, Referer, or Host header
  let rawOrigin = request.headers.get("origin")?.replace(/\/+$/, "") ?? "";
  if (!rawOrigin) {
    const referer = request.headers.get("referer");
    if (referer) {
      try {
        rawOrigin = new URL(referer).origin;
      } catch {
        // ignore
      }
    }
  }
  if (!rawOrigin) {
    const host = request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") || "https";
    if (host) {
      rawOrigin = `${proto}://${host}`.replace(/\/+$/, "");
    }
  }

  const allowedOrigins = getAllowedOrigins();
  const isAllowed = allowedOrigins.some((allowed) => {
    if (allowed === rawOrigin) return true;
    try {
      const rawUrl = new URL(rawOrigin);
      const allowedUrl = new URL(allowed);
      return rawUrl.hostname === allowedUrl.hostname;
    } catch {
      return false;
    }
  });

  if (!isAllowed) {
    console.error(`[Visits] Origin not allowed: "${rawOrigin}". Allowed origins:`, allowedOrigins);
    return errorResponse("Origin not allowed", 400);
  }

  try {
    const workType = await getWorkType(workTypeId);
    if (!workType || !workType.isActive) {
      console.error(`[visits] Service not available for workTypeId: ${workTypeId}`, workType);
      return errorResponse("Service not available", 400);
    }

    const slotsRes = await strapiFetch(
      `/api/work-types/slots?date=${encodeURIComponent(date)}&workTypeId=${encodeURIComponent(String(workTypeId))}`,
    );
    if (!slotsRes.ok) {
      return errorResponse("Could not validate availability", slotsRes.status);
    }

    const slotsData = await slotsRes.json().catch(() => ({ data: [] }));
    const availableSlots = Array.isArray(slotsData.data) ? slotsData.data : [];
    if (!availableSlots.includes(time)) {
      return errorResponse("Selected time is not available", 409);
    }

    // Combine date and time into ISO datetime with timezone
    const datetime = `${date}T${time}:00`;

    console.log("[visits] Creating visit:", { nombre, telefono, email, date: datetime, workTypeId, status });

    const result = await createVisit({
      nombre,
      telefono,
      email: email || undefined,
      mensaje: mensaje || undefined,
      date: datetime,
      workType: workTypeId,
      status,
    });

    console.log("[visits] Created successfully:", result.data?.id);
    return successResponse({ id: result.data?.id }, 201);
  } catch (error) {
    console.error("[visits] Error creating visit:", error);
    // Don't expose internal details to client
    return internalErrorResponse("Could not create appointment. Please try again.");
  }
};
