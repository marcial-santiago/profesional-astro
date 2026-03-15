import type { APIRoute } from "astro";
import { prisma } from "../../../lib/prisma";
import { requireAdminAuth } from "../../../middleware/auth.middleware";
import {
  createdResponse,
  errorResponse,
  internalErrorResponse,
  successResponse,
} from "../../../utils/response.utils";
import { ERROR_MESSAGES } from "../../../constants";

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

// PUT - Update work type
export const PUT: APIRoute = async ({ request, cookies, params }) => {
  const authError = await requireAdminAuth(cookies);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { name, description, duration, price, isActive } = body;
    const id = parseInt(params.id || "0");

    if (isNaN(id) || id <= 0) {
      return errorResponse("Invalid ID", 400);
    }

    const existing = await prisma.workType.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Work type not found", 404);
    }

    const updated = await prisma.workType.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(duration && { duration }),
        ...(price !== undefined && { price }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return successResponse(updated);
  } catch (error) {
    console.error("Error updating work type:", error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return errorResponse("Work type name already exists", 409);
    }
    return internalErrorResponse(ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

// DELETE - Delete work type
export const DELETE: APIRoute = async ({ cookies, params }) => {
  const authError = await requireAdminAuth(cookies);
  if (authError) return authError;

  try {
    const id = parseInt(params.id || "0");

    if (isNaN(id) || id <= 0) {
      return errorResponse("Invalid ID", 400);
    }

    const existing = await prisma.workType.findUnique({
      where: { id },
      include: { visits: { select: { id: true } } },
    });

    if (!existing) {
      return errorResponse("Work type not found", 404);
    }

    if (existing.visits.length > 0) {
      await prisma.workType.update({ where: { id }, data: { isActive: false } });
      return successResponse({ message: "Work type deactivated (has visits)" });
    }

    await prisma.workType.delete({ where: { id } });
    return successResponse({ message: "Work type deleted" });
  } catch (error) {
    console.error("Error deleting work type:", error);
    return internalErrorResponse(ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
