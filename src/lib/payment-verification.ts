import { ERROR_MESSAGES } from "../constants";
import { findVisitsByStripeSession, createVisit } from "./strapi";
import { stripe } from "./stripe";

export interface PaymentVerificationResult {
  success: true;
  visitId?: number;
  status: string;
  alreadyExisted?: boolean;
}

/**
 * Verify a paid Stripe Checkout Session and create the matching Strapi visit.
 *
 * Used by both the public API route and the server-rendered success page so the
 * Astro container never has to HTTP-fetch its own public origin from inside
 * Docker.
 */
export async function verifyPaidCheckoutSession(
  sessionId: string,
): Promise<PaymentVerificationResult> {
  if (!sessionId || !sessionId.startsWith("cs_")) {
    throw new Error("Invalid session_id");
  }

  const existingVisits = await findVisitsByStripeSession(sessionId);
  if (existingVisits.length > 0) {
    return {
      success: true,
      visitId: existingVisits[0].id,
      status: existingVisits[0].status || "confirmed",
      alreadyExisted: true,
    };
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.mode !== "payment") {
    throw new Error("Invalid session mode");
  }

  if (session.status !== "complete") {
    throw new Error("Session not complete");
  }

  if (session.payment_status !== "paid") {
    throw new Error("Payment not completed");
  }

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
    console.error(`[Verify Session] Missing metadata for session ${sessionId}:`, {
      nombre: !!nombre,
      telefono: !!telefono,
      date: !!date,
      time: !!time,
      workTypeId: !!workTypeId,
    });
    throw new Error("Missing required metadata");
  }

  const parsedWorkTypeId = parseInt(workTypeId, 10);
  if (isNaN(parsedWorkTypeId)) {
    throw new Error("Invalid workTypeId");
  }

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

  return {
    success: true,
    visitId: result.data?.id,
    status: "confirmed",
  };
}

export function paymentErrorStatus(error: unknown): number {
  if (!(error instanceof Error)) return 500;
  if (error.message === "Invalid session_id") return 400;
  if (
    error.message.includes("already taken") ||
    error.message.includes("past date") ||
    error.message.includes("work type not found") ||
    error.message.includes("already exists") ||
    error.message.includes("already been taken")
  ) {
    return 409;
  }
  if (
    error.message === "Invalid session mode" ||
    error.message === "Session not complete" ||
    error.message === "Payment not completed" ||
    error.message === "Missing required metadata" ||
    error.message === "Invalid workTypeId"
  ) {
    return 400;
  }
  return 500;
}

export function paymentErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : ERROR_MESSAGES.INTERNAL_ERROR;
}
