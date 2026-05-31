import type { APIRoute } from "astro";
import { stripe } from "../../../lib/stripe";
import {
  findVisitsByStripeEvent,
  findVisitsByStripeSession,
  createVisit,
} from "../../../lib/strapi";
import { successResponse, errorResponse } from "../../../utils/response.utils";

export const prerender = false;

/**
 * Stripe Webhook Endpoint — Strapi-backed implementation.
 *
 * Creates visits in Strapi when Stripe payments complete.
 * Idempotency: checks for existing visit by stripeSessionId.
 */
export const POST: APIRoute = async ({ request }) => {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("[Stripe Webhook] Missing stripe-signature header");
    return errorResponse("Missing signature header", 400);
  }

  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET || import.meta.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured");
    return errorResponse("Server configuration error", 500);
  }

  // ── 1. Verify signature ──────────────────────────────────────────────────
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return errorResponse("Invalid signature", 400);
  }

  // ── 2. Process synchronously and return deterministic status ──────────────
  try {
    const result = await processFulfillment(event);
    return successResponse({ received: true, eventId: event.id, ...result });
  } catch (err) {
    console.error("[Stripe Webhook] Fulfillment error:", err);
    return errorResponse("Webhook fulfillment failed", 500);
  }
};

/**
 * Process fulfillment for checkout events.
 * Creates visits in Strapi when payment succeeds.
 */
async function processFulfillment(
  event: any
): Promise<{ processed: boolean; reason?: string; visitId?: number }> {
  const eventType = event.type;

  // Only handle payment completion events
  if (
    eventType !== "checkout.session.completed" &&
    eventType !== "checkout.session.async_payment_succeeded"
  ) {
    console.log(`[Stripe Webhook] Non-fulfillment event: ${eventType}`);
    return { processed: false, reason: "ignored_event_type" };
  }

  const session = event.data.object;
  const sessionId = session.id;
  const eventId = event.id;
  const metadata = session.metadata || {};

  const nombre = metadata.nombre;
  const telefono = metadata.telefono;
  const email = metadata.email || undefined;
  const mensaje = metadata.mensaje || undefined;
  const date = metadata.date;
  const time = metadata.time;
  const workTypeId = metadata.workTypeId;

  // ── Validate metadata ────────────────────────────────────────────────────
  if (!nombre || !telefono || !date || !time || !workTypeId) {
    const missingFields = {
      nombre: !!nombre,
      telefono: !!telefono,
      date: !!date,
      time: !!time,
      workTypeId: !!workTypeId,
    };
    console.error(
      `[Stripe Webhook] Missing metadata for session ${sessionId}:`,
      JSON.stringify(missingFields)
    );
    return { processed: false, reason: "missing_metadata" };
  }

  const parsedWorkTypeId = parseInt(workTypeId, 10);
  if (isNaN(parsedWorkTypeId)) {
    console.error(`[Stripe Webhook] Invalid workTypeId: ${workTypeId}`);
    return { processed: false, reason: "invalid_work_type_id" };
  }

  const existingByEvent = await findVisitsByStripeEvent(eventId);
  if (existingByEvent.length > 0) {
    console.log(`[Stripe Webhook] Event already processed: ${eventId}`);
    return { processed: true, reason: "event_already_processed", visitId: existingByEvent[0].id };
  }

  // ── Idempotency: Check if visit already exists for this session ───────────
  const existingVisits = await findVisitsByStripeSession(sessionId);
  if (existingVisits.length > 0) {
    console.log(`[Stripe Webhook] Visit already exists for session ${sessionId}`);
    return { processed: true, reason: "already_processed", visitId: existingVisits[0].id };
  }

  // ── Create visit in Strapi ───────────────────────────────────────────────
  try {
    const visitDate = new Date(`${date}T${time}`);

    const result = await createVisit({
      nombre,
      telefono,
      email,
      mensaje,
      date: visitDate.toISOString(),
      workType: parsedWorkTypeId,
      status: "confirmed",
      stripeSessionId: sessionId,
      stripeEventId: eventId,
    });

    console.log(`[Stripe Webhook] Visit created: Session=${sessionId}`);
    return { processed: true, reason: "created", visitId: result.data?.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Stripe Webhook] Failed to create visit for session ${sessionId}:`, errorMessage);
    throw error;
  }
}
