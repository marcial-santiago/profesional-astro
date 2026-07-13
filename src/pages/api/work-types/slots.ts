import type { APIRoute } from "astro";
import { strapiFetch } from "../../../lib/strapi";
import { successResponse, errorResponse } from "../../../utils/response.utils";

export const prerender = false;

/**
 * Proxy endpoint for fetching available time slots from Strapi.
 * Replaces direct browser -> Strapi calls (CORS issue).
 */
export const GET: APIRoute = async ({ url }) => {
  const date = url.searchParams.get("date");
  const workTypeId = url.searchParams.get("workTypeId");

  if (!date || !workTypeId) {
    return errorResponse("Date and workTypeId are required", 400);
  }

  try {
    const res = await strapiFetch(
      `/api/work-types/slots?date=${encodeURIComponent(date)}&workTypeId=${encodeURIComponent(workTypeId)}`
    );

    if (!res.ok) {
      return errorResponse("Failed to fetch available times", res.status);
    }

    const data = await res.json();
    return successResponse(data);
  } catch (error) {
    console.error("[work-types/slots] Error:", error);
    return errorResponse("Internal server error", 500);
  }
};
