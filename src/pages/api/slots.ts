import type { APIRoute } from "astro";
import { SlotService } from "../../services/slot.service";
import {
  errorResponse,
  successResponse,
  internalErrorResponse,
} from "../../utils/response.utils";
import { ERROR_MESSAGES } from "../../constants";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const dateStr = url.searchParams.get("date");
  const workTypeIdStr = url.searchParams.get("workTypeId");

  if (!dateStr || !workTypeIdStr) {
    return errorResponse("Date and workTypeId are required", 400);
  }

  const workTypeId = parseInt(workTypeIdStr, 10);
  if (isNaN(workTypeId)) {
    return errorResponse("Invalid workTypeId", 400);
  }

  try {
    const slots = await SlotService.getAvailableSlots({
      date: dateStr,
      workTypeId,
    });

    return successResponse(slots);
  } catch (error) {
    console.error("Error fetching slots:", error);
    return internalErrorResponse(ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
