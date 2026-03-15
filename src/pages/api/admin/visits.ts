import type { APIRoute } from "astro";
import { VisitService } from "../../../services/visit.service";
import { updateVisitStatusSchema } from "../../../services/validation.service";
import { requireAdminAuth } from "../../../middleware/auth.middleware";
import {
  successResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "../../../utils/response.utils";
import { ERROR_MESSAGES } from "../../../constants";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const authError = await requireAdminAuth(cookies);
  if (authError) return authError;

  try {
    const visits = await VisitService.getVisits();

    return successResponse(visits);
  } catch (error) {
    console.error("Error fetching visits:", error);
    return internalErrorResponse(ERROR_MESSAGES.INTERNAL_ERROR);
  }
};

export const PATCH: APIRoute = async ({ request, cookies }) => {
  const authError = await requireAdminAuth(cookies);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = updateVisitStatusSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.format());
    }

    const { id, status } = parsed.data;

    const updatedVisit = await VisitService.updateVisitStatus(id, status);

    return successResponse(updatedVisit);
  } catch (error) {
    console.error("Error updating visit:", error);

    if (
      error instanceof Error &&
      error.message === ERROR_MESSAGES.VISIT_NOT_FOUND
    ) {
      return validationErrorResponse({ id: error.message });
    }

    return internalErrorResponse(ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
