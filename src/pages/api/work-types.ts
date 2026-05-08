import type { APIRoute } from "astro";
import { strapiFetch } from "../../lib/strapi";
import { successResponse, errorResponse } from "../../utils/response.utils";

export const prerender = false;

/**
 * Proxy endpoint for fetching active work types from Strapi.
 * Replaces direct browser -> Strapi calls (CORS issue).
 */
export const GET: APIRoute = async () => {
  try {
    const res = await strapiFetch("/api/work-types?filters[isActive][$eq]=true");

    if (!res.ok) {
      return errorResponse("Failed to fetch services", res.status);
    }

    const data = await res.json();
    return successResponse(data);
  } catch (error) {
    console.error("[work-types] Error:", error);
    return errorResponse("Internal server error", 500);
  }
};
