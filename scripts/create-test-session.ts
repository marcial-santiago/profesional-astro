import "dotenv/config";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

async function main() {
  console.log("Creating test checkout session with metadata...");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 1500,
          product_data: {
            name: "Test Service",
            description: "Test visit",
          },
        },
      },
    ],
    success_url: "http://localhost:4321/checkout/success?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: "http://localhost:4321/checkout",
    metadata: {
      nombre: "Test User",
      telefono: "+54 11 1234-5678",
      email: "test@example.com",
      mensaje: "Test visit from webhook",
      date: "2026-12-31",
      time: "10:00",
      workTypeId: "1",
    },
  });

  console.log(`Session created: ${session.id}`);
  console.log(`Metadata:`, session.metadata);
  console.log("\nNow triggering checkout.session.completed event...");
  console.log("Run: stripe trigger checkout.session.completed --only-event");
  console.log("Or manually complete the payment at:", session.url);
}

main().catch(console.error);
