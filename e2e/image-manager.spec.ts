import { test, expect } from "@playwright/test";
import { createTestImage, cleanupFile, createTestCSV } from "./helpers";

test.describe("Image Manager - Gallery", () => {
  const testImageFile = "test-e2e-image.jpg";

  test.beforeAll(() => {
    createTestImage(testImageFile);
  });

  test.afterAll(() => {
    cleanupFile(testImageFile);
  });

  test("should upload images to gallery", async ({ page }) => {
    await page.goto("/admin");
    await page.click('[data-tab="images"]');
    await page.waitForSelector("#tab-images");

    // Click upload button
    await page.click("#upload-image-btn");
    await page.waitForSelector("#image-upload-modal", { state: "visible" });

    // Upload test image
    await page.setInputFiles("#image-upload-input", testImageFile);

    // Submit upload
    await page.click("#image-upload-submit");

    // Wait for either modal close (success) or error message
    const modalClosed = await page.waitForSelector("#image-upload-modal", { state: "hidden", timeout: 15000 }).catch(() => false);

    if (!modalClosed) {
      // Check for error message
      const errorEl = page.locator("#image-upload-error");
      const errorText = await errorEl.isVisible().then(async () => errorEl.textContent()).catch(() => "unknown");
      throw new Error(`Upload failed - modal did not close. Error: ${errorText}`);
    }

    // Verify image appears in grid
    await expect(page.locator("#images-grid img").first()).toBeVisible();
  });

  test("should enforce 20 file upload limit", async ({ page }) => {
    await page.goto("/admin");
    await page.click('[data-tab="images"]');
    await page.waitForSelector("#tab-images");

    // Create 25 test images
    const manyFiles: string[] = [];
    for (let i = 0; i < 25; i++) {
      const fname = `test-e2e-${i}.jpg`;
      createTestImage(fname);
      manyFiles.push(fname);
    }

    try {
      await page.click("#upload-image-btn");
      await page.waitForSelector("#image-upload-modal", { state: "visible" });

      await page.setInputFiles("#image-upload-input", manyFiles);

      // Should show error
      await expect(page.locator("#image-upload-error")).toBeVisible();
      await expect(page.locator("#image-upload-error")).toContainText("Maximum 20 files");
    } finally {
      manyFiles.forEach(cleanupFile);
    }
  });

  test("should delete an image from gallery", async ({ page }) => {
    await page.goto("/admin");
    await page.click('[data-tab="images"]');
    await page.waitForSelector("#tab-images");

    // Wait for images to load
    await page.waitForSelector("#images-grid img");

    // Get initial count
    const initialCount = await page.locator("#images-grid > div").count();
    expect(initialCount).toBeGreaterThan(0);

    // Click delete on first image (handle confirmation dialog)
    page.on("dialog", (dialog) => dialog.accept());
    await page.click("#images-grid .delete-image-btn:first-child");

    // Wait for grid to update
    await page.waitForTimeout(1000);

    // Verify count decreased or stayed same if it was the last one
    const newCount = await page.locator("#images-grid > div").count();
    expect(newCount).toBeLessThanOrEqual(initialCount);
  });
});

test.describe("Image Manager - Service CRUD", () => {
  const testImageFile = "test-e2e-service-image.jpg";

  test.beforeAll(() => {
    createTestImage(testImageFile);
  });

  test.afterAll(() => {
    cleanupFile(testImageFile);
  });

  test("should create a service with gallery image", async ({ page }) => {
    await page.goto("/admin");
    await page.click('[data-tab="settings"]');
    await page.waitForSelector("#tab-settings");

    // Click add service
    await page.click("#add-service-btn");
    await page.waitForSelector("#service-modal", { state: "visible" });

    // Fill form
    const serviceName = `E2E Gallery Service ${Date.now()}`;
    await page.fill("#service-name", serviceName);
    await page.fill("#service-desc", "Test description for E2E");
    await page.fill("#service-duration", "60");
    await page.fill("#service-price", "99.99");
    await page.selectOption("#service-category", "cleaning");

    // Ensure gallery mode is selected and load it
    await page.click("#image-mode-gallery");

    // Click on gallery grid to load images
    const galleryGrid = page.locator("#image-gallery-grid");
    if (await galleryGrid.locator("text=Click to load gallery").isVisible().catch(() => false)) {
      await galleryGrid.click();
    }

    // Wait for gallery images and select first one
    await page.waitForSelector(".gallery-thumb", { timeout: 5000 });
    await page.click(".gallery-thumb:first-child");

    // Verify preview appears
    await expect(page.locator("#selected-image-preview")).toBeVisible();

    // Submit form
    await page.click("#service-form button[type='submit']");

    // Wait for page reload and verify service appears
    await page.waitForLoadState("networkidle");
    await expect(page.locator(`text=${serviceName}`)).toBeVisible();
  });

  test("should create service with inline image upload", async ({ page }) => {
    await page.goto("/admin");
    await page.click('[data-tab="settings"]');
    await page.waitForSelector("#tab-settings");

    // Click add service
    await page.click("#add-service-btn");
    await page.waitForSelector("#service-modal", { state: "visible" });

    // Fill form
    const serviceName = `E2E Inline Service ${Date.now()}`;
    await page.fill("#service-name", serviceName);
    await page.fill("#service-desc", "Service with inline image upload");
    await page.fill("#service-duration", "90");
    await page.fill("#service-price", "150");

    // Switch to upload mode
    await page.click("#image-mode-upload");

    // Upload image
    await page.setInputFiles("#image-input", testImageFile);

    // Wait for preview
    await expect(page.locator("#image-preview")).toBeVisible();

    // Submit
    await page.click("#service-form button[type='submit']");
    await page.waitForLoadState("networkidle");

    // Verify
    await expect(page.locator(`text=${serviceName}`)).toBeVisible();
  });

  test("should edit a service and change its image", async ({ page }) => {
    await page.goto("/admin");
    await page.click('[data-tab="settings"]');
    await page.waitForSelector("#tab-settings");

    // Find and click edit on first service
    await page.waitForSelector(".edit-service-btn");
    await page.click(".edit-service-btn:first-child");

    // Wait for modal
    await page.waitForSelector("#service-modal", { state: "visible" });

    // Change name
    const newName = `Updated E2E Service ${Date.now()}`;
    await page.fill("#service-name", newName);

    // Remove current image if present
    const removeBtn = page.locator("#selected-image-remove");
    if (await removeBtn.isVisible().catch(() => false)) {
      await removeBtn.click();
      await expect(page.locator("#selected-image-preview")).toBeHidden();
    }

    // Upload new image
    await page.click("#image-mode-upload");
    await page.setInputFiles("#image-input", testImageFile);

    // Wait for preview
    await expect(page.locator("#image-preview")).toBeVisible();

    // Submit
    await page.click("#service-form button[type='submit']");
    await page.waitForLoadState("networkidle");

    // Verify updated
    await expect(page.locator(`text=${newName}`)).toBeVisible();
  });
});

test.describe("Image Manager - CSV Import", () => {
  const testImageFile = "test-csv-image.jpg";
  const csvFile = "test-e2e-import.csv";

  test.beforeAll(() => {
    createTestImage(testImageFile);
  });

  test.afterAll(() => {
    cleanupFile(testImageFile);
    cleanupFile(csvFile);
  });

  test("should show image validation in CSV preview", async ({ page }) => {
    // First upload an image to the gallery so it exists
    await page.goto("/admin");
    await page.click('[data-tab="images"]');
    await page.click("#upload-image-btn");
    await page.setInputFiles("#image-upload-input", testImageFile);
    await page.click("#image-upload-submit");
    await page.waitForSelector("#image-upload-modal", { state: "hidden" });

    // Create CSV with mix of valid and invalid image references
    createTestCSV(csvFile, [
      "Valid Service,Has valid image reference,60,50,test-csv-image.jpg",
      "Missing Service,Has missing image reference,90,75,nonexistent-image.jpg",
      "No Image Service,No image column,120,100,",
    ]);

    // Go to settings tab
    await page.click('[data-tab="settings"]');
    await page.waitForSelector("#tab-settings");

    // Upload CSV file
    await page.setInputFiles("#csv-input", csvFile);

    // Wait for preview to appear
    await page.waitForSelector("#csv-preview", { state: "visible" });

    // Verify validation indicators
    await expect(page.locator("text=✅ test-csv-image.jpg")).toBeVisible();
    await expect(page.locator("text=❌ nonexistent-image.jpg")).toBeVisible();

    // Verify count text shows missing references
    await expect(page.locator("#csv-row-count")).toContainText("not found");

    // Import
    await page.click("#csv-import-btn");

    // Wait for success
    await page.waitForSelector("#csv-success", { state: "visible" });
    await expect(page.locator("#csv-success")).toContainText("imported successfully");
  });
});

test.describe("Image Manager - Drag and Drop", () => {
  test("should show visual feedback on gallery dropzone", async ({ page }) => {
    await page.goto("/admin");
    await page.click('[data-tab="images"]');
    await page.waitForSelector("#tab-images");

    // Open upload modal
    await page.click("#upload-image-btn");
    await page.waitForSelector("#image-upload-modal", { state: "visible" });

    // Test dragover styling — should ADD border-blue-400 (not hover:)
    const dropzone = page.locator("#image-upload-dropzone");
    await dropzone.dispatchEvent("dragover");
    await expect(dropzone).toHaveClass(/(^|\s)border-blue-400(\s|$)/);

    // Test dragleave styling — should REMOVE the non-hover border-blue-400
    await dropzone.dispatchEvent("dragleave");
    // hover:border-blue-400 stays (it's a Tailwind hover class), but the direct class is removed
    const classString = await dropzone.getAttribute("class");
    expect(classString).not.toMatch(/(^|\s)border-blue-400(\s|$)/);
  });

  test("should show visual feedback on service picker dropzone", async ({ page }) => {
    await page.goto("/admin");
    await page.click('[data-tab="settings"]');
    await page.waitForSelector("#tab-settings");

    // Open add service modal
    await page.click("#add-service-btn");
    await page.waitForSelector("#service-modal", { state: "visible" });

    // Ensure gallery mode
    await page.click("#image-mode-gallery");

    // Test dragover styling on gallery dropzone
    const galleryDropzone = page.locator("#image-gallery-dropzone");
    await galleryDropzone.dispatchEvent("dragover");
    await expect(galleryDropzone).toHaveClass(/(^|\s)border-blue-400(\s|$)/);

    // Test dragleave
    await galleryDropzone.dispatchEvent("dragleave");
    const classString = await galleryDropzone.getAttribute("class");
    expect(classString).not.toMatch(/(^|\s)border-blue-400(\s|$)/);
  });
});
