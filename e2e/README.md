# E2E Testing - Image Manager

## Prerequisites

1. Install Playwright browsers (already done if you ran `pnpm exec playwright install chromium`)
2. Ensure your `.env` file has valid admin credentials:
   ```
   ADMIN_USER=admin
   ADMIN_PASSWORD=supersegura123
   ```

## Running Tests

### Run all E2E tests
```bash
pnpm test:e2e
```

### Run with UI mode (interactive)
```bash
pnpm test:e2e:ui
```

### Run in debug mode
```bash
pnpm test:e2e:debug
```

### Run a specific test file
```bash
pnpm exec playwright test e2e/image-manager.spec.ts
```

### Run tests matching a pattern
```bash
pnpm exec playwright test --grep "upload images"
```

## Test Coverage

### Image Manager (`image-manager.spec.ts`)

1. **Upload images to gallery** - Uploads a test image and verifies it appears in the grid
2. **20 file upload limit** - Attempts to upload 25 files and verifies the error message
3. **Delete image** - Deletes an image and verifies it's removed from the grid
4. **Copy image URL** - Clicks copy URL and verifies the toast notification

### Service CRUD (`image-manager.spec.ts`)

5. **Create service with gallery image** - Creates a service selecting an image from the gallery
6. **Edit service changing image** - Edits a service, removes image, uploads new one
7. **Create service with inline upload** - Creates a service uploading image directly in the modal

### CSV Import (`image-manager.spec.ts`)

8. **CSV image validation** - Uploads a CSV with valid/invalid image references, verifies ✅/❌ indicators

### Drag & Drop (`image-manager.spec.ts`)

9. **Gallery dropzone styling** - Verifies dragover/dragleave visual feedback
10. **Service picker dropzone** - Verifies dragover styling in service image picker

## Test Artifacts

- Screenshots on failure: Generated automatically in `test-results/`
- HTML report: Run `pnpm exec playwright show-report` after tests
- Trace files: Available for failed tests (viewable in the HTML report)

## Architecture

```
e2e/
├── .auth/
│   └── admin.json          # Authentication state (generated)
├── auth.setup.ts           # Login once, reuse state
├── helpers.ts              # Test utilities (create images, CSVs, cleanup)
├── image-manager.spec.ts   # Main test suite
└── README.md               # This file
```

## Troubleshooting

### Tests fail with timeout
- Ensure the dev server is not already running (Playwright starts its own)
- Increase timeout in `playwright.config.ts` if needed

### Authentication fails
- Check that `ADMIN_USER` and `ADMIN_PASSWORD` env vars are set
- Delete `e2e/.auth/admin.json` to force re-authentication

### Browser not found
```bash
pnpm exec playwright install chromium
```
