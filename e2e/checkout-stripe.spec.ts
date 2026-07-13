import { test, expect } from "@playwright/test";

function seedCheckoutSession(page: any) {
  return page.addInitScript(() => {
    sessionStorage.setItem(
      "checkout",
      JSON.stringify({
        workTypeId: 2,
        workTypeName: "A/C Installation",
        workTypeDuration: 90,
        price: 125,
        date: "2026-06-15",
        time: "10:30",
      })
    );
  });
}

test.describe("Checkout Stripe flow", () => {
  test("sends booking payload to Stripe checkout endpoint and redirects", async ({ page }) => {
    await seedCheckoutSession(page);

    let postedBody: any = null;

    await page.route("**/api/stripe/create-checkout-session", async (route) => {
      const request = route.request();
      postedBody = request.postDataJSON();

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          url: "http://localhost:4321/checkout/success?session_id=cs_test_123",
        }),
      });
    });

    await page.goto("/checkout");

    await page.fill("#nombre", "John Smith");
    await page.fill("#telefono", "+61400000000");
    await page.fill("#email", "john@example.com");
    await page.fill("#mensaje", "Need installation this week");

    await page.click("#stripe-btn");

    await page.waitForURL("**/checkout/success?session_id=cs_test_123");

    expect(postedBody).toMatchObject({
      workTypeId: 2,
      workTypeName: "A/C Installation",
      price: 125,
      date: "2026-06-15",
      time: "10:30",
      nombre: "John Smith",
      telefono: "+61400000000",
      email: "john@example.com",
      mensaje: "Need installation this week",
    });
  });

  test("shows backend error when checkout session creation fails", async ({ page }) => {
    await seedCheckoutSession(page);

    await page.route("**/api/stripe/create-checkout-session", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Service not available" }),
      });
    });

    await page.goto("/checkout");

    await page.fill("#nombre", "John Smith");
    await page.fill("#telefono", "+61400000000");

    await page.click("#stripe-btn");

    await expect(page.locator("#form-error")).toBeVisible();
    await expect(page.locator("#form-error")).toContainText("Service not available");

    await expect(page).toHaveURL(/\/checkout$/);
  });
});
