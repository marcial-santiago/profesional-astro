import type { APIRoute } from "astro";
import { prisma } from "../../../../lib/prisma";
import { requireAdminAuth } from "../../../../middleware/auth.middleware";
import {
  createdResponse,
  errorResponse,
  internalErrorResponse,
} from "../../../../utils/response.utils";
import { ERROR_MESSAGES } from "../../../../constants";

export const prerender = false;

// POST - Create work type
export const POST: APIRoute = async ({ request, cookies }) => {
  const authError = await requireAdminAuth(cookies);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { name, description, duration, price } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return errorResponse("Name is required", 400);
    }

    if (duration && (typeof duration !== "number" || duration < 15)) {
      return errorResponse("Duration must be at least 15 minutes", 400);
    }

    if (price !== undefined && (typeof price !== "number" || price <= 0)) {
      return errorResponse("Price must be a positive number", 400);
    }

    const workType = await prisma.workType.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        duration: duration || 60,
        price: price ?? 10,
        isActive: true,
      },
    });

    return createdResponse(workType);
  } catch (error) {
    console.error("Error creating work type:", error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return errorResponse("Work type name already exists", 409);
    }
    return internalErrorResponse(ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
