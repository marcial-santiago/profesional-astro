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
    checkout: {
      sessions: {
        create: mockCheckoutCreate,
        retrieve: mockRetrieveSession,
      },
    },
    webhooks: {
      constructEvent: mockConstructEvent,
    },
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

describe("Stripe checkout session endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses DB work type name/price and sets idempotency key", async () => {
    mockGetWorkType.mockResolvedValue({
      id: 1,
      name: "DB Service Name",
      slug: "db-service-name",
      description: "desc",
      category: "cleaning",
      duration: 60,
      price: 85,
      isActive: true,
    });
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.test/session" });

    const { POST } = await import("../src/pages/api/stripe/create-checkout-session");

    const request = new Request("http://localhost/api/stripe/create-checkout-session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:8080",
      },
      body: JSON.stringify({
        workTypeName: "CLIENT NAME SHOULD BE IGNORED",
        price: 10,
        nombre: "John Smith",
        telefono: "+61400000000",
        email: "john@example.com",
        mensaje: "Need support",
        date: "2026-06-10",
        time: "10:00",
        workTypeId: 1,
      }),
    });

    const res = await POST({ request } as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBe("https://checkout.stripe.test/session");
    expect(mockCheckoutCreate).toHaveBeenCalledTimes(1);

    const [payload, options] = mockCheckoutCreate.mock.calls[0];
    expect(payload.line_items[0].price_data.product_data.name).toBe("DB Service Name");
    expect(payload.line_items[0].price_data.unit_amount).toBe(8500);
    expect(options.idempotencyKey).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("Stripe webhook fulfillment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  it("processes a valid checkout event synchronously", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_123",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_123",
          metadata: {
            nombre: "John",
            telefono: "+61400",
            email: "john@example.com",
            mensaje: "msg",
            date: "2026-06-10",
            time: "10:00",
            workTypeId: "2",
          },
        },
      },
    });
    mockFindVisitsByStripeEvent.mockResolvedValue([]);
    mockFindVisitsByStripeSession.mockResolvedValue([]);
    mockCreateVisit.mockResolvedValue({ data: { id: 99 } });

    const { POST } = await import("../src/pages/api/stripe/webhook");
    const request = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: {
        "stripe-signature": "t=1,v1=abc",
      },
      body: JSON.stringify({ any: "payload" }),
    });

    const res = await POST({ request } as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.processed).toBe(true);
    expect(body.reason).toBe("created");
    expect(mockCreateVisit).toHaveBeenCalledWith(
      expect.objectContaining({
        workType: 2,
        stripeSessionId: "cs_123",
        stripeEventId: "evt_123",
      })
    );
  });

  it("returns already_processed when session already exists", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_abc",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_existing",
          metadata: {
            nombre: "John",
            telefono: "+61400",
            date: "2026-06-10",
            time: "10:00",
            workTypeId: "1",
          },
        },
      },
    });
    mockFindVisitsByStripeEvent.mockResolvedValue([]);
    mockFindVisitsByStripeSession.mockResolvedValue([{ id: 77 }]);

    const { POST } = await import("../src/pages/api/stripe/webhook");
    const request = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=abc" },
      body: "{}",
    });

    const res = await POST({ request } as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reason).toBe("already_processed");
    expect(mockCreateVisit).not.toHaveBeenCalled();
  });
});

describe("Payment verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns alreadyExisted when visit exists", async () => {
    const { verifyPaidCheckoutSession } = await import("../src/lib/payment-verification");
    mockFindVisitsByStripeSession.mockResolvedValue([{ id: 5, status: "confirmed" }]);

    const result = await verifyPaidCheckoutSession("cs_test_123");
    expect(result.alreadyExisted).toBe(true);
    expect(result.visitId).toBe(5);
  });

  it("rejects non-payment modes and incomplete sessions", async () => {
    const { verifyPaidCheckoutSession } = await import("../src/lib/payment-verification");
    mockFindVisitsByStripeSession.mockResolvedValue([]);
    mockRetrieveSession.mockResolvedValue({
      mode: "setup",
      status: "complete",
      payment_status: "paid",
      metadata: {},
    });

    await expect(verifyPaidCheckoutSession("cs_test_999")).rejects.toThrow("Invalid session mode");
  });
});

