import "dotenv/config";
import Stripe from "stripe";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

async function main() {
  const sessionId = process.argv[2];
  if (!sessionId) {
    console.error("Usage: pnpm tsx scripts/test-webhook.ts <session_id>");
    process.exit(1);
  }

  console.log(`Fetching session: ${sessionId}`);
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    console.log("Session not paid yet. Completing payment...");
    // For test sessions, we need to simulate payment
    // In reality, stripe trigger handles this
  }

  // Create the event payload
  const eventPayload = {
    id: `evt_test_${Date.now()}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: session.id,
        object: "checkout.session",
        payment_status: session.payment_status,
        metadata: session.metadata,
        mode: session.mode,
        currency: session.currency,
        amount_total: session.amount_total,
      },
    },
    created: Math.floor(Date.now() / 1000),
  };

  const payload = JSON.stringify(eventPayload);
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  const stripeSignature = `t=${timestamp},v1=${signature}`;

  console.log("\nSending webhook to localhost:4321/api/stripe/webhook...");
  console.log("Event ID:", eventPayload.id);
  console.log("Session ID:", session.id);
  console.log("Metadata:", JSON.stringify(session.metadata, null, 2));

  const response = await fetch("http://localhost:4321/api/stripe/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": stripeSignature,
    },
    body: payload,
  });

  console.log("\nResponse status:", response.status);
  const body = await response.text();
  console.log("Response body:", body);
}

main().catch(console.error);
