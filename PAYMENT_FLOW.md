# Payment Flow Verification

## Architecture Overview

The payment and visit booking flow has TWO mechanisms to ensure visits are created:

### 1. Primary: Verify Payment on Success Page (New)
- **Endpoint:** `/api/verify-payment?session_id={session_id}`
- **Called by:** `/checkout/success` page when user is redirected from Stripe
- **Process:**
  1. Retrieves Stripe session using `session_id`
  2. Verifies `payment_status === "paid"`
  3. Extracts visit data from session metadata
  4. Checks if visit already exists (to avoid duplicates)
  5. Creates visit record in database
  6. Returns visit ID and status

### 2. Fallback: Stripe Webhook (Existing)
- **Endpoint:** `/api/stripe/webhook`
- **Called by:** Stripe automatically when payment is completed
- **Process:**
  1. Verifies webhook signature
  2. Listens for `checkout.session.completed` event
  3. Extracts metadata from session
  4. Checks if visit already exists
  5. Creates visit if not exists
  6. Returns success

## Why Two Mechanisms?

1. **Reliability:** If webhook fails or is not configured, visits are still created via success page
2. **Idempotency:** Both mechanisms check for existing visits before creating
3. **Backup:** Webhook serves as backup if success page verification fails

## Flow Diagram

```
User fills checkout form
         ↓
Click "Pay with Stripe"
         ↓
POST /api/stripe/create-checkout-session
   - Validates form data
   - Creates Stripe session with metadata
   - Returns Stripe checkout URL
         ↓
Redirect to Stripe Checkout
         ↓
User completes payment
         ↓
Stripe redirects to /checkout/success?session_id=cs_...
         ↓
GET /api/verify-payment?session_id=cs_...
   - Retrieves session from Stripe
   - Verifies payment_status === "paid"
   - Extracts metadata (nombre, telefono, email, mensaje, date, time, workTypeId)
   - Checks if visit already exists (findVisitBySlot)
   - Creates visit in database if not exists
   - Returns visit ID
         ↓
Show success page with booking details
         ↓
(Optional) Stripe webhook fires → /api/stripe/webhook
   - Checks if visit already exists
   - Skips if exists (no-op)
```

## Testing the Payment Flow

### Prerequisites

1. **Stripe Account:** Test mode enabled
2. **Environment Variables:**
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_... (optional, for webhook)
   ```
3. **Database:** PostgreSQL running
4. **Services:** Some work types created in database

### Test Steps

#### 1. Create a Test Service
```sql
INSERT INTO "WorkType" (name, description, duration, price, "isActive")
VALUES ('Test Service', 'A service for testing', 60, 10.00, true);
```

#### 2. Go to Scheduler
1. Navigate to `http://localhost:3000/#agenda`
2. Select "Test Service"
3. Select a date and time
4. Click "Continue"
5. Fill in your details
6. Click "Book Appointment" (without payment) OR "Pay with Stripe"

#### 3. If Paying with Stripe (Test Mode)
1. Click "Pay with Stripe"
2. Wait for form validation
3. Redirect to Stripe Checkout
4. Fill in test card details:
   - Card number: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - Name: Any name
5. Click "Pay"
6. Wait for redirect to `/checkout/success?session_id=cs_...`

#### 4. Verify Visit was Created
Check the database:
```sql
SELECT * FROM "Visit" ORDER BY "createdAt" DESC LIMIT 5;
```

You should see:
- `nombre`, `telefono`, `email`, `mensaje` filled
- `date` with the selected datetime
- `workTypeId` pointing to Test Service
- `status` = 'PENDING'

#### 5. Check Admin Dashboard
1. Navigate to `/admin`
2. Login with admin credentials
3. Go to "Visits" tab
4. Verify your visit appears with status PENDING

## Error Scenarios and Expected Behavior

### Scenario 1: Payment Not Completed
- **What:** User clicks "Pay" but doesn't complete payment
- **Expected:** No visit created
- **Database:** No new rows in Visit table

### Scenario 2: Invalid session_id
- **What:** User manually visits `/checkout/success?session_id=invalid`
- **Expected:** Error message shown on page
- **Database:** No new rows in Visit table

### Scenario 3: Duplicate Payment Attempt
- **What:** User refreshes `/checkout/success` page after payment
- **Expected:** Visit already exists, returns existing visit ID
- **Database:** Only one row in Visit table (no duplicates)

### Scenario 4: Webhook and Verify-Payment Both Execute
- **What:** Both verify-payment endpoint and webhook try to create visit
- **Expected:** First one creates visit, second one finds it exists and skips
- **Database:** Only one row in Visit table (no duplicates)

### Scenario 5: Slot Already Taken
- **What:** Someone books the same date/time while user is paying
- **Expected:** Verify-payment returns 409 conflict, error shown on page
- **Database:** No new row (prevents double booking)

## Session Metadata

All visit data is stored in Stripe session metadata:
```json
{
  "nombre": "John Smith",
  "telefono": "+61 400 000 000",
  "email": "john@example.com",
  "mensaje": "Need help with plumbing",
  "date": "2026-04-30",
  "time": "10:00",
  "workTypeId": "1"
}
```

This metadata is:
- Sent from checkout form
- Stored by Stripe in the session
- Retrieved by verify-payment and webhook
- Used to create visit record

## Security Considerations

1. **Origin Whitelist:** verify-payment checks request origin before creating Stripe session
2. **Session Validation:** Only creates visit if Stripe confirms `payment_status === "paid"`
3. **Metadata Required:** All required fields must be present in session metadata
4. **Duplicate Prevention:** Both mechanisms check for existing visits before creating
5. **Webhook Signature:** Webhook verifies Stripe signature (if configured)

## Debugging

### Enable Detailed Logging

All endpoints log important events:
- `[Verify Session]` - Logs from verify-payment endpoint
- `[Stripe Webhook]` - Logs from webhook endpoint

### Check Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/payments
2. Find your payment
3. Click to view details
4. Scroll down to "Metadata" section
5. Verify all fields are present

### Check Database

```sql
-- Find recent visits
SELECT
  v.id,
  v.nombre,
  v.telefono,
  v.date,
  v.status,
  wt.name as "serviceName"
FROM "Visit" v
JOIN "WorkType" wt ON v."workTypeId" = wt.id
ORDER BY v."createdAt" DESC
LIMIT 10;
```

### Common Issues

#### Issue 1: Visit Not Created After Payment
**Possible causes:**
- verify-payment endpoint failed
- Session metadata missing or invalid
- Database connection error

**Debug steps:**
1. Check browser console for errors
2. Check server logs for `[Verify Session]` messages
3. Verify Stripe session has correct metadata
4. Check database for any new rows

#### Issue 2: Duplicate Visits
**Possible causes:**
- findVisitBySlot not working correctly
- Race condition in database

**Debug steps:**
1. Check logs for duplicate creation attempts
2. Verify findVisitBySlot is working
3. Check database for exact duplicates

#### Issue 3: Webhook Not Firing
**Possible causes:**
- Webhook endpoint not configured in Stripe
- STRIPE_WEBHOOK_SECRET not set

**Debug steps:**
1. Check Stripe Dashboard → Webhooks
2. Verify endpoint URL is correct
3. Test webhook from Stripe Dashboard

## Summary

✅ **Primary Mechanism:** `/checkout/success` page → `/api/verify-payment`
✅ **Fallback Mechanism:** Stripe webhook → `/api/stripe/webhook`
✅ **Duplicate Prevention:** Both check for existing visits
✅ **Idempotent:** Safe to call multiple times
✅ **Works Without Webhook:** Visits created even if webhook fails

The system is designed to be reliable and fail-safe. Even if webhooks are not configured, visits will be created successfully when users complete payment.
