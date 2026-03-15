import type { APIRoute } from "astro";
import { prisma } from "../../../lib/prisma";
import { requireAdminAuth } from "../../../middleware/auth.middleware";
import { errorResponse, internalErrorResponse, successResponse } from "../../../utils/response.utils";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const authError = await requireAdminAuth(cookies);
  if (authError) return authError;

  try {
    const availability = await prisma.availability.findMany({
      orderBy: { dayOfWeek: "asc" },
    });
    const workTypes = await prisma.workType.findMany();

    return successResponse({ availability, workTypes });
  } catch {
    return internalErrorResponse("Failed to fetch settings");
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const authError = await requireAdminAuth(cookies);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => null);
    if (!body) return errorResponse("Invalid JSON body", 400);

    const { type, data } = body;

    if (type === "availability") {
      if (!Array.isArray(data)) return errorResponse("data must be an array", 400);
      await prisma.availability.deleteMany({});
      await prisma.availability.createMany({ data });
    } else if (type === "workType") {
      if (!data || typeof data !== "object") return errorResponse("Invalid data", 400);
      const id = parseInt(data.id);
      if (isNaN(id) || id <= 0) return errorResponse("Invalid work type ID", 400);
      await prisma.workType.upsert({
        where: { id },
        update: { name: data.name, duration: data.duration, price: data.price },
        create: { name: data.name, duration: data.duration, price: data.price ?? 10 },
      });
    } else {
      return errorResponse("Invalid type", 400);
    }

    return successResponse({ ok: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    return internalErrorResponse("Failed to update settings");
  }
};
