import type { APIRoute } from "astro";
import { stripe } from "../../../lib/stripe";
import { DEFAULT_SERVICE_PRICE } from "../../../consts";
import { ALLOWED_ORIGINS } from "../../../constants";
import {
  errorResponse,
  internalErrorResponse,
  successResponse,
} from "../../../utils/response.utils";
import { z } from "zod";

export const prerender = false;

const bodySchema = z.object({
  workTypeName: z.string().min(1),
  price: z.number().positive().optional(),
});

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body) {
    return errorResponse("Invalid JSON body", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Invalid request data", 400);
  }

  const { workTypeName, price = DEFAULT_SERVICE_PRICE } = parsed.data;

  // Stripe expects amounts in the smallest currency unit (cents for USD)
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
              description: "Visita técnica profesional",
            },
          },
        },
      ],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
    });

    return successResponse({ url: session.url });
  } catch (error) {
    console.error("Stripe error:", error);
    return internalErrorResponse("No se pudo crear la sesión de pago");
  }
};
