import type { APIRoute } from "astro";
import { stripe } from "../../../lib/stripe";
import { VisitService } from "../../../services/visit.service";
import { prisma } from "../../../lib/prisma";
import { successResponse, errorResponse } from "../../../utils/response.utils";
import { ERROR_MESSAGES } from "../../../constants";

export const prerender = false;

/**
 * Stripe Webhook Endpoint — Production-ready implementation.
 *
 * Follows Stripe best practices:
 * 1. Verifies signature on raw body
 * 2. Returns 200 IMMEDIATELY after verification (before complex logic)
 * 3. Uses event.id for idempotency (prevents duplicate processing)
 * 4. Logs all events to StripeEventLog for audit trail
 * 5. Handles both checkout.session.completed AND async_payment_succeeded
 * 6. Never returns 400 for missing metadata (prevents retry loops)
 *
 * Docs: https://docs.stripe.com/webhooks#best-practices
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

  // ── 2. Check idempotency — has this event already been processed? ─────────
  const existingLog = await prisma.stripeEventLog.findUnique({
    where: { eventId: event.id },
  });

  if (existingLog) {
    console.log(`[Stripe Webhook] Event ${event.id} already processed (status: ${existingLog.status})`);
    return successResponse({ received: true, alreadyProcessed: true, eventId: event.id });
  }

  // ── 3. Log event as "processing" ─────────────────────────────────────────
  await prisma.stripeEventLog.create({
    data: {
      eventId: event.id,
      eventType: event.type,
      status: "processing",
      sessionId: event.type.startsWith("checkout.session")
        ? (event.data.object as any).id
        : null,
    },
  });

  // ── 4. Return 200 IMMEDIATELY — Stripe docs say: ─────────────────────────
  // "Return 200 prior to any complex logic that could cause a timeout"
  // Process fulfillment in the background (fire-and-forget)
  processFulfillment(event).catch((err) => {
    console.error("[Stripe Webhook] Background fulfillment error:", err);
  });

  return successResponse({ received: true, eventId: event.id });
};

/**
 * Process fulfillment for checkout events.
 * Called asynchronously — errors are logged, not thrown.
 */
async function processFulfillment(event: any): Promise<void> {
  const eventType = event.type;

  // Only handle payment completion events
  if (
    eventType !== "checkout.session.completed" &&
    eventType !== "checkout.session.async_payment_succeeded"
  ) {
    // Log as completed for non-fulfillment events
    await prisma.stripeEventLog.update({
      where: { eventId: event.id },
      data: { status: "completed" },
    });
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
    // Log as completed with warning — DON'T return 400 (prevents retry loops)
    await prisma.stripeEventLog.update({
      where: { eventId: event.id },
      data: {
        status: "completed",
        sessionId,
        error: `Missing metadata: ${JSON.stringify(missingFields)}`,
      },
    });
    return;
  }

  const parsedWorkTypeId = parseInt(workTypeId, 10);
  if (isNaN(parsedWorkTypeId)) {
    console.error(`[Stripe Webhook] Invalid workTypeId: ${workTypeId}`);
    await prisma.stripeEventLog.update({
      where: { eventId: event.id },
      data: { status: "completed", sessionId, error: `Invalid workTypeId: ${workTypeId}` },
    });
    return;
  }

  // ── Idempotency: Check if visit already exists for this session ───────────
  const existingVisit = await VisitService.findVisitByStripeSessionId(sessionId);
  if (existingVisit) {
    console.log(`[Stripe Webhook] Visit already exists for session ${sessionId}: ID=${existingVisit.id}`);
    await prisma.stripeEventLog.update({
      where: { eventId: event.id },
      data: { status: "completed", sessionId, visitId: existingVisit.id },
    });
    return;
  }

  // ── Create visit ─────────────────────────────────────────────────────────
  try {
    const visit = await VisitService.createVisit({
      nombre,
      telefono,
      email,
      mensaje,
      date,
      time,
      workTypeId: parsedWorkTypeId,
      stripeSessionId: sessionId,
      stripeEventId: event.id,
    });

    console.log(`[Stripe Webhook] Visit created: ID=${visit.id}, Session=${sessionId}`);

    await prisma.stripeEventLog.update({
      where: { eventId: event.id },
      data: { status: "completed", sessionId, visitId: visit.id },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Stripe Webhook] Failed to create visit for session ${sessionId}:`, errorMessage);

    await prisma.stripeEventLog.update({
      where: { eventId: event.id },
      data: { status: "failed", sessionId, error: errorMessage },
    });
  }
}
