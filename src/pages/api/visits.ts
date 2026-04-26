import type { APIRoute } from "astro";
import { visitSchema } from "../../services/validation.service";
import { VisitService } from "../../services/visit.service";
import {
  validationErrorResponse,
  createdResponse,
  conflictResponse,
  internalErrorResponse,
} from "../../utils/response.utils";
import { ERROR_MESSAGES } from "../../constants";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    // Honeypot check — reject if bot filled the hidden field
    if (body.company && body.company.trim() !== "") {
      return new Response(JSON.stringify({ error: "Bad request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parsed = visitSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.format());
    }

    const visit = await VisitService.createVisit(parsed.data);

    return createdResponse(visit);
  } catch (error) {
    console.error("Error creating visit:", error);

    // Handle known errors
    if (error instanceof Error) {
      if (error.message === ERROR_MESSAGES.SLOT_TAKEN) {
        return conflictResponse(ERROR_MESSAGES.SLOT_TAKEN);
      }
      if (error.message === ERROR_MESSAGES.PAST_DATE) {
        return validationErrorResponse({ date: error.message });
      }
      if (error.message === ERROR_MESSAGES.WORK_TYPE_NOT_FOUND) {
        return validationErrorResponse({ workTypeId: error.message });
      }
    }

    return internalErrorResponse(ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
