import type { APIRoute } from "astro";
import { stripe } from "../../lib/stripe";
import { strapiFetch, findVisitsByStripeSession, createVisit } from "../../lib/strapi";
import { successResponse, errorResponse } from "../../utils/response.utils";

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

  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;
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

  // ── 2. Return 200 IMMEDIATELY — process fulfillment in background ─────────
  processFulfillment(event).catch((err) => {
    console.error("[Stripe Webhook] Background fulfillment error:", err);
  });

  return successResponse({ received: true, eventId: event.id });
};

/**
 * Process fulfillment for checkout events.
 * Creates visits in Strapi when payment succeeds.
 */
async function processFulfillment(event: any): Promise<void> {
  const eventType = event.type;

  // Only handle payment completion events
  if (
    eventType !== "checkout.session.completed" &&
    eventType !== "checkout.session.async_payment_succeeded"
  ) {
    console.log(`[Stripe Webhook] Non-fulfillment event: ${eventType}`);
    return;
  }

  const session = event.data.object;
  const sessionId = session.id;
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
    return;
  }

  const parsedWorkTypeId = parseInt(workTypeId, 10);
  if (isNaN(parsedWorkTypeId)) {
    console.error(`[Stripe Webhook] Invalid workTypeId: ${workTypeId}`);
    return;
  }

  // ── Idempotency: Check if visit already exists for this session ───────────
  const existingVisits = await findVisitsByStripeSession(sessionId);
  if (existingVisits.length > 0) {
    console.log(`[Stripe Webhook] Visit already exists for session ${sessionId}`);
    return;
  }

  // ── Create visit in Strapi ───────────────────────────────────────────────
  try {
    const visitDate = new Date(`${date}T${time}`);

    await createVisit({
      nombre,
      telefono,
      email,
      mensaje,
      date: visitDate.toISOString(),
      workType: parsedWorkTypeId,
      status: "confirmed",
      stripeSessionId: sessionId,
      stripeEventId: event.id,
    });

    console.log(`[Stripe Webhook] Visit created: Session=${sessionId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Stripe Webhook] Failed to create visit for session ${sessionId}:`, errorMessage);
  }
}
