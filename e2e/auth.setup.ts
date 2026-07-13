import { test as setup, expect } from "@playwright/test";

const authFile = "e2e/.auth/admin.json";

setup("authenticate as admin", async ({ page }) => {
  // Navigate to admin page
  await page.goto("/admin");

  // Check if already authenticated (from previous run)
  const isLoggedIn = await page.locator("#logout-btn").isVisible().catch(() => false);

  if (!isLoggedIn) {
    // Wait for login form
    await expect(page.locator("#login-form")).toBeVisible({ timeout: 5000 });

    // Fill credentials
    await page.fill('input[name="user"]', process.env.ADMIN_USER || "admin");
    await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD || "supersegura123");

    // Submit form and wait for the response
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/admin/login") && res.status() === 200
    );
    await page.click('button[type="submit"]');
    await responsePromise;

    // Wait for reload to complete and dashboard to appear
    await page.waitForTimeout(1000); // Give reload time to trigger
    await expect(page.locator("h1:has-text('Admin Dashboard')")).toBeVisible({ timeout: 15000 });
  }

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
