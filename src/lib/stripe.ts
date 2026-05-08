import Stripe from "stripe";

if (!import.meta.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

export const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-02-25.clover",
});
