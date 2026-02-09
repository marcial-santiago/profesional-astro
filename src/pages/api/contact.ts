import type { APIRoute } from "astro";
import { contactSchema } from "../../services/validation.service";
import { prisma } from "../../lib/prisma";
import {
  errorResponse,
  successResponse,
  createdResponse,
  internalErrorResponse,
} from "../../utils/response.utils";
import { ERROR_MESSAGES } from "../../constants";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return errorResponse("Invalid content type", 400);
  }

  const formData = await request.formData();

  // Honeypot check
  if (formData.get("company")) {
    return successResponse({ ok: true });
  }

  const rawData = {
    nombre: String(formData.get("nombre") ?? ""),
    telefono: String(formData.get("telefono") ?? ""),
    servicio: String(formData.get("servicio") ?? ""),
    mensaje: String(formData.get("mensaje") ?? ""),
  };

  const parsed = contactSchema.safeParse(rawData);

  if (!parsed.success) {
    console.log("Validation errors:", parsed.error.format());
    return errorResponse(ERROR_MESSAGES.INVALID_DATA, 400);
  }

  try {
    await prisma.message.create({
      data: parsed.data,
    });
  } catch (err) {
    console.error("DB error:", err);
    return internalErrorResponse(ERROR_MESSAGES.DATABASE_ERROR);
  }

  return createdResponse({ ok: true });
};
