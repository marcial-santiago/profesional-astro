import type { APIRoute } from "astro";
import { stripe } from "../../lib/stripe";
import { findVisitsByStripeSession, createVisit } from "../../lib/strapi";
import { ERROR_MESSAGES } from "../../constants";
import {
  errorResponse,
  successResponse,
  internalErrorResponse,
} from "../../utils/response.utils";

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
    // ── 1. Check if visit already exists for this session (idempotency) ─────
    const existingVisits = await findVisitsByStripeSession(sessionId);
    if (existingVisits.length > 0) {
      return successResponse({
        success: true,
        visitId: existingVisits[0].id,
        status: existingVisits[0].status || "confirmed",
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

    // ── 4. Create visit in Strapi ──────────────────────────────────────────
    const visitDate = new Date(`${date}T${time}`);
    const result = await createVisit({
      nombre,
      telefono,
      email: rawEmail || undefined,
      mensaje: rawMensaje || undefined,
      date: visitDate.toISOString(),
      workType: parsedWorkTypeId,
      status: "confirmed",
      stripeSessionId: sessionId,
    });

    return successResponse({
      success: true,
      visitId: result.data?.id,
      status: "confirmed",
    });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes("already taken") ||
        error.message.includes("past date") ||
        error.message.includes("work type not found")
      ) {
        return errorResponse(error.message, 409);
      }

      // Check if visit already exists (race condition with webhook)
      if (
        error.message.includes("already exists") ||
        error.message.includes("already been taken")
      ) {
        const existingVisits = await findVisitsByStripeSession(sessionId);
        if (existingVisits.length > 0) {
          return successResponse({
            success: true,
            visitId: existingVisits[0].id,
            status: existingVisits[0].status || "confirmed",
            alreadyExisted: true,
          });
        }
      }
    }

    return internalErrorResponse(ERROR_MESSAGES.INTERNAL_ERROR);
  }
};
