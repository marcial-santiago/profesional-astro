import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCheckoutCreate = vi.fn();
const mockConstructEvent = vi.fn();
const mockRetrieveSession = vi.fn();

const mockGetWorkType = vi.fn();
const mockFindVisitsByStripeSession = vi.fn();
const mockFindVisitsByStripeEvent = vi.fn();
const mockCreateVisit = vi.fn();

vi.mock("../src/lib/stripe", () => ({
  stripe: {
    checkout: { sessions: { create: mockCheckoutCreate, retrieve: mockRetrieveSession } },
    webhooks: { constructEvent: mockConstructEvent },
  },
}));

vi.mock("../src/lib/strapi", () => ({
  getWorkType: mockGetWorkType,
  findVisitsByStripeSession: mockFindVisitsByStripeSession,
  findVisitsByStripeEvent: mockFindVisitsByStripeEvent,
  createVisit: mockCreateVisit,
}));

vi.mock("../src/constants", () => ({
  ALLOWED_ORIGINS: ["http://localhost:8080"],
  ERROR_MESSAGES: { INTERNAL_ERROR: "Internal error" },
}));

describe("Checkout endpoint validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects non-allowed origin", async () => {
    mockGetWorkType.mockResolvedValue({ id: 1, name: "Service", price: 20, isActive: true });
    const { POST } = await import("../src/pages/api/stripe/create-checkout-session");

    const req = new Request("http://localhost/api/stripe/create-checkout-session", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://evil.com" },
      body: JSON.stringify({
        nombre: "John Smith",
        telefono: "+123",
        date: "2026-06-10",
        time: "10:00",
        workTypeId: 1,
      }),
    });

    const res = await POST({ request: req } as any);
    expect(res.status).toBe(400);
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
  });

  it("rejects unavailable service", async () => {
    mockGetWorkType.mockResolvedValue(null);
    const { POST } = await import("../src/pages/api/stripe/create-checkout-session");

    const req = new Request("http://localhost/api/stripe/create-checkout-session", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:8080" },
      body: JSON.stringify({
        nombre: "John Smith",
        telefono: "+123",
        date: "2026-06-10",
        time: "10:00",
        workTypeId: 1,
      }),
    });

    const res = await POST({ request: req } as any);
    expect(res.status).toBe(400);
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
  });
});

describe("Webhook guardrails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  it("rejects missing signature", async () => {
    const { POST } = await import("../src/pages/api/stripe/webhook");
    const req = new Request("http://localhost/api/stripe/webhook", { method: "POST", body: "{}" });
    const res = await POST({ request: req } as any);
    expect(res.status).toBe(400);
  });

  it("ignores unrelated event types", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_1",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_1", metadata: {} } },
    });

    const { POST } = await import("../src/pages/api/stripe/webhook");
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "sig" },
      body: "{}",
    });

    const res = await POST({ request: req } as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.processed).toBe(false);
    expect(body.reason).toBe("ignored_event_type");
    expect(mockCreateVisit).not.toHaveBeenCalled();
  });
});

describe("Payment verification error mapping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps known errors to http status", async () => {
    const { paymentErrorStatus } = await import("../src/lib/payment-verification");

    expect(paymentErrorStatus(new Error("Invalid session_id"))).toBe(400);
    expect(paymentErrorStatus(new Error("already exists"))).toBe(409);
    expect(paymentErrorStatus(new Error("Payment not completed"))).toBe(400);
    expect(paymentErrorStatus(new Error("some unknown"))).toBe(500);
  });

  it("returns fallback message for non-error", async () => {
    const { paymentErrorMessage } = await import("../src/lib/payment-verification");
    expect(paymentErrorMessage("boom")).toBe("Internal error");
  });
});
