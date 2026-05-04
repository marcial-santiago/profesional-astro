import type { APIRoute } from "astro";
import { prisma } from "../../lib/prisma";
import { successResponse, internalErrorResponse } from "../../utils/response.utils";

export const prerender = false;

// GET - List active work types (public, for frontend rendering)
export const GET: APIRoute = async ({ url }) => {
  try {
    const category = url.searchParams.get("category");
    const slug = url.searchParams.get("slug");

    if (slug) {
      const workType = await prisma.workType.findUnique({
        where: { slug, isActive: true },
      });
      if (!workType) {
        return new Response(JSON.stringify({ error: "Service not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return successResponse(workType);
    }

    const where: Record<string, unknown> = { isActive: true };
    if (category) {
      where.category = category;
    }

    const workTypes = await prisma.workType.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return successResponse(workTypes);
  } catch {
    return internalErrorResponse("Internal server error");
  }
};
