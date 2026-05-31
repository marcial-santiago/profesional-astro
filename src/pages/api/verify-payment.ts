import type { APIRoute } from "astro";
import { ERROR_MESSAGES } from "../../constants";
import {
  errorResponse,
  successResponse,
  internalErrorResponse,
} from "../../utils/response.utils";
import {
  paymentErrorMessage,
  paymentErrorStatus,
  verifyPaidCheckoutSession,
} from "../../lib/payment-verification";

export const prerender = false;

/**
 * Verify Stripe Session and Create Visit in Strapi (fallback for webhook).
 *
 * Called from the success page to verify payment and create the visit.
 * Idempotency: checks for existing visit by stripeSessionId.
 */
export const GET: APIRoute = async ({ url }) => {
  const sessionId = url.searchParams.get("session_id");

  // Validate session_id format
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return errorResponse("Invalid session_id", 400);
  }

  try {
    return successResponse(await verifyPaidCheckoutSession(sessionId));
  } catch (error) {
    const status = paymentErrorStatus(error);
    if (status !== 500) {
      return errorResponse(paymentErrorMessage(error), status);
    }

    return internalErrorResponse(ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
