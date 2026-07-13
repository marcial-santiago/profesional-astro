import type { APIRoute } from "astro";
import { stripe } from "../../lib/stripe";
import { getWorkType } from "../../lib/strapi";
import { ALLOWED_ORIGINS } from "../../constants";
import {
  errorResponse,
  internalErrorResponse,
  successResponse,
} from "../../utils/response.utils";
import { z } from "zod";

// Default price in USD for any service not explicitly priced
const DEFAULT_SERVICE_PRICE = 10;

export const prerender = false;

const bodySchema = z.object({
  workTypeName: z.string().min(1),
  price: z.number().positive().optional(),
  // User data
  nombre: z.string().min(3).max(100),
  telefono: z.string().min(1),
  email: z.string().email().or(z.literal("")).optional(),
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
    workTypeName,
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
    return errorResponse("Service not available", 400);
  }

  // Use DB price, not client price — prevents sessionStorage manipulation
  const price = workType.price ?? clientPrice ?? DEFAULT_SERVICE_PRICE;
  const amountInCents = Math.round(price * 100);

  // Use origin only if it's in the whitelist — prevents open redirect
  const requestOrigin = request.headers.get("origin") ?? "";
  if (!ALLOWED_ORIGINS.includes(requestOrigin)) {
    return errorResponse("Origin not allowed", 400);
  }
  const origin = requestOrigin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountInCents,
            product_data: {
              name: workTypeName,
              description: "Professional technical visit",
            },
          },
        },
      ],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
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
    });

    return successResponse({ url: session.url });
  } catch (error) {
    console.error("Stripe error:", error);
    return internalErrorResponse("Could not create payment session");
  }
};
