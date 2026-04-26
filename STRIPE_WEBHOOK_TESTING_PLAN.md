# Plan de Testing - Sistema de Pagos Stripe

## 🎯 Objetivo
Verificar que el sistema de pagos funcione correctamente y cree los registros de Visit automáticamente después de un pago exitoso.

## 🔧 Pre-requisitos

1. **Variables de entorno configuradas:**
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   DATABASE_URL=postgresql://...
   ```

2. **Webhook configurado en Stripe Dashboard:**
   - Endpoint: `https://tu-dominio.com/api/stripe/webhook`
   - Evento: `checkout.session.completed`
   - Signing Secret copiado a `.env`

3. **Base de datos corriendo:**
   ```bash
   docker compose up -d
   pnpm prisma db push
   ```

## 📋 Checklist de Testing

### 1. Configuración del Servidor
- [ ] El servidor Astro está corriendo en modo server (`output: "server"`)
- [ ] La ruta `/api/stripe/webhook` es accesible públicamente
- [ ] Las variables de entorno se cargaron correctamente (revisar logs de inicio)
- [ ] No hay errores de CORS en las rutas de API

### 2. Flujo "Confirmar sin Pago"
- [ ] Usuario completa el formulario correctamente
- [ ] Validación de campos (nombre ≥ 3 chars, teléfono requerido)
- [ ] POST a `/api/visits` retorna 201
- [ ] Registro creado en base de datos con status `PENDING`
- [ ] sessionStorage se limpia correctamente
- [ ] Overlay de éxito se muestra

### 3. Flujo "Pagar con Stripe"
- [ ] Usuario completa el formulario
- [ ] Validación de campos pasa
- [ ] POST a `/api/stripe/create-checkout-session` retorna 200
- [ ] Response contiene `url` válida de Stripe
- [ ] Usuario redirigido a Stripe checkout
- [ ] Pago completado exitosamente
- [ ] Stripe redirige a `/checkout/success?session_id=...`

### 4. Webhook Processing
- [ ] Stripe envía evento `checkout.session.completed` al webhook
- [ ] Verificación de firma funciona (sin errores 400)
- [ ] Logs del servidor muestran: `[Stripe Webhook] Received event: checkout.session.completed`
- [ ] Metadata extraída correctamente (nombre, teléfono, email, mensaje, date, time, workTypeId)
- [ ] `VisitService.createVisit()` se ejecuta
- [ ] Registro creado en base de datos con status `PENDING`
- [ ] Webhook retorna 200 `{ received: true, visitId: X }`

### 5. Edge Cases & Error Handling
- [ ] **Firma inválida:** Webhook retorna 400, log: "Invalid webhook signature"
- [ ] **Sin STRIPE_WEBHOOK_SECRET:** Webhook retorna 500, log: "Server configuration error"
- [ ] **Metadata faltante:** Webhook retorna 400, log: "Missing required metadata"
- [ ] **Horario ocupado:** Webhook retorna 409, log: error de slot taken
- [ ] **Fecha pasada:** Webhook retorna 400 con error específico
- [ ] **WorkType no encontrado:** Webhook retorna 400 con error específico

### 6. Validación de Datos
- [ ] Nombre del usuario guardado correctamente en DB
- [ ] Teléfono del usuario guardado correctamente en DB
- [ ] Email (opcional) guardado correctamente en DB
- [ ] Mensaje (opcional) guardado correctamente en DB
- [ ] Fecha y hora combinadas correctamente en DB (DateTime)
- [ ] workTypeId asociado correctamente en DB
- [ ] Status inicial es `PENDING`

### 7. Seguridad
- [ ] Verificación de firma funciona en todos los webhooks
- [ ] Webhook rechaza eventos sin firma (400)
- [ ] Webhook rechaza firmas inválidas (400)
- [ ] Validación de `ALLOWED_ORIGINS` funciona en create-checkout-session
- [ ] Metadata no contiene datos sensibles innecesarios

### 8. Stripe Dashboard
- [ ] Evento `checkout.session.completed` aparece en el log de webhooks
- [ ] Estado del evento es "Succeeded" (no "Failed")
- [ ] Webhook endpoint muestra status "200 OK" en Stripe Dashboard
- [ ] Si hay retry, se ve en el log de intentos

## 🛠️ Herramientas de Testing

### Testing Local con Stripe CLI
```bash
# 1. Iniciar forward de webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook

# 2. Copiar el webhook secret que muestra Stripe CLI
# y agregarlo a .env como STRIPE_WEBHOOK_SECRET

# 3. Probar trigger de evento manual
stripe trigger checkout.session.completed
```

### Test con Payload de Webhook Manual
```bash
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: $SIGNATURE" \
  -d @test-payload.json
```

### Verificación en Base de Datos
```bash
# Ver registros creados
pnpm prisma studio

# O con SQL directo
psql -U postgres -d postgres
SELECT * FROM "Visit" ORDER BY "createdAt" DESC LIMIT 5;
```

## 📊 Métricas de Éxito

**Criterios de aprobación:**
- ✅ Todos los tests de validación de formulario pasan
- ✅ Flujo sin pago funciona 100% de las veces
- ✅ Flujo con pago crea registros en BD 100% de las veces
- ✅ Webhook procesa eventos en < 3 segundos
- ✅ Logs no muestran errores críticos
- ✅ Stripe Dashboard muestra webhooks exitosos

**Criterios de rechazo:**
- ❌ Webhook falla más del 5% de las veces
- ❌ Timeout del webhook (> 5 segundos)
- ❌ Error de verificación de firma
- ❌ Registros duplicados en BD
- ❌ Metadata corrupta o faltante

## 🐛 Troubleshooting Común

### Webhook no llega
**Causa:** Firewall, NGINX no configurado, o ruta privada
**Solución:** Verificar que `/api/stripe/webhook` es pública

### Firma inválida
**Causa:** `STRIPE_WEBHOOK_SECRET` incorrecto o no configurado
**Solución:** Re-copiar el secret de Stripe Dashboard y reiniciar servidor

### Metadata vacía
**Causa:** create-checkout-session no envía metadata o frontend no pasa datos
**Solución:** Verificar logs de `/api/stripe/create-checkout-session`

### Registros duplicados
**Causa:** Stripe reintentó el webhook y tu endpoint no es idempotente
**Solución:** Verificar que `VisitService.createVisit()` maneja conflictos (ya está implementado con transacción atómica)

## 📝 Notas de Implementación

1. **Idempotencia:** El webhook NO es idempotente por defecto. Si Stripe reintenta, se puede crear registro duplicado.
   - **Solución recomendada:** Agregar `sessionId` como campo único en `Visit` o verificar si ya existe antes de crear.

2. **Timeouts:** Los webhooks de Stripe esperan respuesta en < 30 segundos. Si `createVisit` tarda más, Stripe reintentará.

3. **Logging:** Los logs son críticos para debug. Siempre loguear:
   - Tipo de evento recibido
   - Errores de validación
   - Errores de base de datos
   - ID del registro creado

4. **Testing en producción:** Nunca pruebes con producción primero. Usa el modo test de Stripe.

---

**Status del Plan:** 🟡 Pendiente de Ejecución
**Responsable:** [Tu nombre]
**Fecha de inicio:** [Fecha]
**Fecha estimada de finalización:** [Fecha]
