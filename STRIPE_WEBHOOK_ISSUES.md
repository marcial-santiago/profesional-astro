# Known Issues & Future Improvements - Stripe Webhook

## 🔴 Known Issues

### 1. **Webhook No es Idempotente**
**Severity:** High
**Impact:** Si Stripe reintenta el webhook (debido a timeout, error temporal, etc.), se pueden crear registros duplicados de Visit.

**Root Cause:**
- El webhook no verifica si ya existe un registro con el mismo `stripeSessionId`
- La tabla `Visit` no tiene un campo para guardar el `sessionId` de Stripe
- `VisitService.createVisit()` valida solapamiento de horarios pero NO verifica si el payment ya fue procesado

**Current Behavior:**
```
Evento 1: stripe.session.completed → Crea Visit (ID: 1)
Evento 2: stripe.session.completed (retry) → Crea Visit (ID: 2) ❌ DUPLICADO
```

**Solution Required:**
1. Agregar campo `stripeSessionId` a la tabla `Visit` en `prisma/schema.prisma`:
   ```prisma
   model Visit {
     // ... campos existentes
     stripeSessionId String? @unique  // ← AGREGAR ESTO
   }
   ```
2. Actualizar el webhook para:
   - Verificar si ya existe un Visit con ese `stripeSessionId`
   - Si existe, retornar 200 sin crear nuevo registro
   - Si no existe, crear el registro y guardar el `stripeSessionId`

3. Ejecutar migración:
   ```bash
   pnpm prisma migrate dev --name add_stripe_session_id
   ```

**Workaround (Temporal):**
Monitorear la base de datos y eliminar manualmente duplicados si ocurren.

---

## 🟡 Potential Issues

### 2. **Timeout de Webhook**
**Severity:** Medium
**Impact:** Stripe reintentará el webhook (hasta 3 veces con backoff exponencial).

**Scenario:**
- Si `VisitService.createVisit()` tarda > 30 segundos, Stripe marcará el webhook como fallido
- Esto aumenta la probabilidad de duplicados (ver Issue #1)

**Mitigation:**
- Validar que las queries de BD estén optimizadas
- Usar transacciones atómicas (ya implementado)
- Evitar llamadas externas dentro del webhook

### 3. **Metadata Size Limits**
**Severity:** Low
**Impact:** Si el mensaje del usuario es muy largo (>500 chars), se truncará.

**Current Limit:**
- Stripe metadata fields accept strings up to 500 characters
- Validación en `create-checkout-session.ts`: `mensaje: z.string().max(500).optional()`
- Validación en `checkout.astro`: `<textarea maxlength="500">`

**Status:** ✅ Mitigated (validations in place)

### 4. **Firma de Webhook Expirada**
**Severity:** Low
**Impact:** Si cambias `STRIPE_WEBHOOK_SECRET` sin reiniciar el servidor, los webhooks fallarán.

**Solution:**
- Documentar que el servidor debe reiniciarse después de cambiar env vars
- Esto ya está en el README

---

## 🟢 Future Improvements

### 1. **Email Notifications**
**Current:** User payment succeeds, visit created, but no email is sent.
**Proposed:**
- Add `emailService` to send confirmation email to user
- Email includes: visit details, date/time, contact info

### 2. **Admin Notification**
**Current:** Only database record is created.
**Proposed:**
- Send Slack/Email notification to admin when new visit is created
- Include link to admin panel for quick management

### 3. **Webhook Retry Queue**
**Current:** Stripe retries automatically (up to 3 times).
**Proposed:**
- Implement dead-letter queue for permanently failed webhooks
- Manual retry mechanism for failed events

### 4. **Webhook Event History**
**Current:** Logs in console only.
**Proposed:**
- Save webhook events to database table `WebhookEvent`
- Track: eventId, type, status, processedAt, error
- Useful for debugging and reconciliation

### 5. **Visit Status Lifecycle**
**Current:** Status always `PENDING` after payment.
**Proposed:**
- Automatically mark as `CONFIRMED` after successful payment
- Add `paymentStatus` field: `UNPAID`, `PAID`, `REFUNDED`
- Link to Stripe payment intent

### 6. **Refund Handling**
**Current:** If payment is refunded, visit remains in DB.
**Proposed:**
- Listen for `charge.refunded` event
- Automatically cancel visit or mark as `REFUNDED`

### 7. **Webhook Security Audit**
**Current:** Basic signature verification.
**Proposed:**
- Log all webhook events for audit trail
- Alert on suspicious events (multiple failures, unknown IP)
- Rate limiting on webhook endpoint

### 8. **Testing Infrastructure**
**Current:** Manual testing with Stripe CLI.
**Proposed:**
- Automated E2E tests with Playwright/Cypress
- Mock webhook server for unit tests
- CI/CD pipeline for testing

---

## 📊 Risk Assessment

| Issue | Probability | Impact | Mitigation |
|-------|------------|--------|------------|
| Webhook not idempotent | Medium | High | Implement idempotency (Issue #1) |
| Timeout | Low | Medium | Optimize DB queries |
| Metadata overflow | Very Low | Low | Validation in place |
| Signature expired | Very Low | Low | Documentation |
| Email not sent | High | Medium | Implement email service |

---

## 🎯 Recommendations Priority

### Immediate (Before Production)
1. ✅ Implement webhook idempotency (Issue #1)
2. ✅ Test with Stripe CLI thoroughly
3. ✅ Monitor logs for duplicate records

### Short-term (Next Sprint)
4. ✅ Add email notifications
5. ✅ Add admin notifications
6. ✅ Implement webhook event logging

### Long-term (Roadmap)
7. ✅ Full refund handling
8. ✅ Automated testing infrastructure
9. ✅ Advanced security features

---

**Last Updated:** 2026-04-25
**Next Review:** After production deployment
**Owner:** Development Team
