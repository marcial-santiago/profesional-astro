import type { APIRoute } from "astro";
import { stripe } from "../../lib/stripe";
import { ERROR_MESSAGES } from "../../constants";
import { VisitService } from "../../services/visit.service";
import {
  errorResponse,
  successResponse,
  internalErrorResponse,
} from "../../utils/response.utils";

export const prerender = false;

/**
 * Verify Stripe Session and Create Visit (fallback for webhook).
 *
 * This endpoint is called from the success page to verify that a payment
 * was successful and create the visit record. It's a fallback mechanism
 * in case the webhook is delayed or hasn't fired yet.
 *
 * Security: Only creates visit if Stripe session is paid.
 * Idempotency: Checks for existing visit by stripeSessionId first.
 *
 * Docs: https://docs.stripe.com/checkout/fulfillment#trigger-fulfillment-on-your-landing-page
 */
export const GET: APIRoute = async ({ url }) => {
  const sessionId = url.searchParams.get("session_id");

  // Validate session_id format
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return errorResponse("Invalid session_id", 400);
  }

  try {
    // ── 1. Check if visit already exists for this session (idempotency) ─────
    const existingVisit =
      await VisitService.findVisitByStripeSessionId(sessionId);
    if (existingVisit) {
      return successResponse({
        success: true,
        visitId: existingVisit.id,
        status: existingVisit.status,
        alreadyExisted: true,
      });
    }

    // ── 2. Retrieve and verify the session from Stripe ─────────────────────
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return errorResponse("Payment not completed", 400);
    }

    // ── 3. Extract metadata ────────────────────────────────────────────────
    const metadata = session.metadata || {};
    const {
      nombre,
      telefono,
      email: rawEmail,
      mensaje: rawMensaje,
      date,
      time,
      workTypeId,
    } = metadata;

    if (!nombre || !telefono || !date || !time || !workTypeId) {
      console.error(
        `[Verify Session] Missing metadata for session ${sessionId}:`,
        {
          nombre: !!nombre,
          telefono: !!telefono,
          date: !!date,
          time: !!time,
          workTypeId: !!workTypeId,
        },
      );
      return errorResponse("Missing required metadata", 400);
    }

    const parsedWorkTypeId = parseInt(workTypeId, 10);
    if (isNaN(parsedWorkTypeId)) {
      return errorResponse("Invalid workTypeId", 400);
    }

    // ── 4. Create visit ────────────────────────────────────────────────────
    const visit = await VisitService.createVisit({
      nombre,
      telefono,
      email: rawEmail || undefined,
      mensaje: rawMensaje || undefined,
      date,
      time,
      workTypeId: parsedWorkTypeId,
      stripeSessionId: sessionId,
    });

    return successResponse({
      success: true,
      visitId: visit.id,
      status: visit.status,
    });
  } catch (error) {
    // ── 5. Handle known errors ─────────────────────────────────────────────
    if (error instanceof Error) {
      if (
        error.message === ERROR_MESSAGES.SLOT_TAKEN ||
        error.message === ERROR_MESSAGES.PAST_DATE ||
        error.message === ERROR_MESSAGES.WORK_TYPE_NOT_FOUND
      ) {
        return errorResponse(error.message, 409);
      }

      // Check if visit already exists (race condition with webhook)
      if (
        error.message.includes("Unique constraint") ||
        error.message.includes("already exists")
      ) {
        const existingVisit =
          await VisitService.findVisitByStripeSessionId(sessionId);
        if (existingVisit) {
          return successResponse({
            success: true,
            visitId: existingVisit.id,
            status: existingVisit.status,
            alreadyExisted: true,
          });
        }
      }
    }

    return internalErrorResponse(ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
