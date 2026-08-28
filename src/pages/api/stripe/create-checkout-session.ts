import type { APIRoute } from "astro";
import { stripe } from "../../../lib/stripe";
import { getWorkType } from "../../../lib/strapi";
import { ALLOWED_ORIGINS, getAllowedOrigins } from "../../../constants";
import {
  errorResponse,
  internalErrorResponse,
  successResponse,
} from "../../../utils/response.utils";
import { z } from "zod";
import { createHash, randomUUID } from "node:crypto";

// Default price in USD for any service not explicitly priced
const DEFAULT_SERVICE_PRICE = 10;

export const prerender = false;

const bodySchema = z.object({
  workTypeName: z.string().min(1).optional(), // legacy client field, ignored for Stripe name
  price: z.number().positive().optional(), // legacy client field, ignored for Stripe price
  // User data
  nombre: z.string().min(3).max(100),
  telefono: z.string().min(1),
  email: z.email().or(z.literal("")).optional(),
  mensaje: z.string().max(500).optional(),
  // Visit data
  date: z.string(),
  time: z.string(),
  workTypeId: z.number().int().positive(),
});

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body) {
    return errorResponse("Invalid JSON body", 400);
  }

  // Honeypot check — reject if bot filled the hidden field
  if (body.company && body.company.trim() !== "") {
    return errorResponse("Bad request", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Invalid request data", 400);
  }

  const {
    price: clientPrice,
    nombre,
    telefono,
    email,
    mensaje,
    date,
    time,
    workTypeId,
  } = parsed.data;

  // Validate work type exists and get server-side price (prevents price manipulation)
  const workType = await getWorkType(workTypeId);
  if (!workType || !workType.isActive) {
    console.error(`[Stripe Checkout] Service not available for workTypeId: ${workTypeId}`, workType);
    return errorResponse("Service not available", 400);
  }

  // Use DB price, not client price — prevents sessionStorage manipulation
  const price = workType.price ?? clientPrice ?? DEFAULT_SERVICE_PRICE;
  const amountInCents = Math.round(price * 100);

  // Extract request origin from Origin header, Referer, or Host header
  let rawOrigin = request.headers.get("origin")?.replace(/\/+$/, "") ?? "";
  if (!rawOrigin) {
    const referer = request.headers.get("referer");
    if (referer) {
      try {
        rawOrigin = new URL(referer).origin;
      } catch {
        // ignore
      }
    }
  }
  if (!rawOrigin) {
    const host = request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") || "https";
    if (host) {
      rawOrigin = `${proto}://${host}`.replace(/\/+$/, "");
    }
  }

  const allowedOrigins = typeof getAllowedOrigins === "function" ? getAllowedOrigins() : (ALLOWED_ORIGINS ?? []);
  const isAllowed = allowedOrigins.some((allowed) => {
    if (allowed === rawOrigin) return true;
    try {
      const rawUrl = new URL(rawOrigin);
      const allowedUrl = new URL(allowed);
      return rawUrl.hostname === allowedUrl.hostname;
    } catch {
      return false;
    }
  });

  if (!isAllowed) {
    console.error(`[Stripe Checkout] Origin not allowed: "${rawOrigin}". Allowed origins:`, allowedOrigins);
    return errorResponse("Origin not allowed", 400);
  }
  const origin = rawOrigin;

  const idempotencySeed = `${workTypeId}|${date}|${time}|${telefono}|${nombre}`;
  const idempotencyKey = createHash("sha256").update(idempotencySeed).digest("hex");
  const clientReferenceId = randomUUID();

  try {
    const currency = (process.env.PUBLIC_CURRENCY || import.meta.env.PUBLIC_CURRENCY || "aud").toLowerCase();
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: amountInCents,
              product_data: {
                name: workType.name,
                description: "Professional technical visit",
              },
            },
          },
        ],
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout`,
        client_reference_id: clientReferenceId,
        // Store visit data in metadata for webhook processing
        metadata: {
          nombre,
          telefono,
          email: email || "",
          mensaje: mensaje || "",
          date,
          time,
          workTypeId: workTypeId.toString(),
        },
      },
      { idempotencyKey }
    );

    return successResponse({ url: session.url });
  } catch (error) {
    console.error("Stripe error:", error);
    return internalErrorResponse("Could not create payment session");
  }
};
