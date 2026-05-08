# Plan: Finalizar Migración Prisma → Strapi

**Creado:** 2026-05-07  
**Estado:** Pendiente de aprobación

---

## Contexto

El frontend ya consume Strapi para servicios, slots, mensajes y visitas. Pero quedan **3 bloques críticos** que siguen usando Prisma directamente:

1. **Stripe webhook** → usa `prisma.visit.create()` y `prisma.stripeEventLog`
2. **Stripe checkout session** → usa `prisma.workType.findUnique()`
3. **Admin panel** → usa Prisma para todo (visits, messages, workTypes, images, settings)

---

## Fase 1: Migrar Stripe a Strapi API

### 1.1 Webhook (`src/pages/api/stripe/webhook.ts`)

**Problema:** Usa Prisma para:
- Idempotencia (`StripeEventLog`)
- Crear visitas (`prisma.visit.create`)

**Solución:** Reemplazar con llamadas a Strapi API usando `STRAPI_API_TOKEN`.

| Cambio | Detalle |
|--------|---------|
| Idempotencia | Usar `GET /api/visits?filters[stripeSessionId][$eq]=${sessionId}` |
| Crear visita | `POST /api/visits` con token de admin |
| Log de eventos | Eliminar `StripeEventLog` (Strapi no lo necesita — usar `console.log` + Strapi admin para auditoría) |

### 1.2 Checkout Session (`src/pages/api/stripe/create-checkout-session.ts`)

**Problema:** Usa `prisma.workType.findUnique()` para validar precio del servidor.

**Solución:** Reemplazar con `GET /api/work-types/${workTypeId}` de Strapi.

| Cambio | Detalle |
|--------|---------|
| Validar workType | `GET ${STRAPI_URL}/api/work-types/${id}` → verificar `isActive` y obtener `price` |
| Auth | Usar `STRAPI_API_TOKEN` para requests internos |

### 1.3 Configurar variables

- Agregar `STRAPI_API_TOKEN` al `.env` (ya existe)
- Crear helper `src/lib/strapi.ts` para requests reutilizables

---

## Fase 2: Eliminar Admin Panel de Astro

### 2.1 Páginas a eliminar

| Archivo | Razón |
|---------|-------|
| `src/pages/admin.astro` | Strapi reemplaza todo el dashboard |
| `src/pages/api/admin/login.ts` | Autenticación legacy |
| `src/pages/api/admin/logout.ts` | Autenticación legacy |
| `src/pages/api/admin/work-types/index.ts` | CRUD work types → Strapi |
| `src/pages/api/admin/work-types/[id].ts` | CRUD work types → Strapi |
| `src/pages/api/admin/images/index.ts` | Image gallery → Strapi Media Library |
| `src/pages/api/admin/images/[id].ts` | Image CRUD → Strapi Media Library |
| `src/pages/api/admin/images/cleanup.ts` | Cleanup → Strapi Media Library |
| `src/pages/api/admin/images/migrate.ts` | Migration script → no needed |
| `src/pages/api/admin/import-services.ts` | CSV import → Strapi seed/manual |
| `src/pages/api/admin/settings.ts` | Settings → Strapi Availability content type |
| `src/pages/api/admin/visits.ts` | Visit management → Strapi |

### 2.2 Middleware a eliminar

| Archivo | Razón |
|---------|-------|
| `src/middleware/auth.middleware.ts` | Solo usado por admin |

### 2.3 Services a eliminar

| Archivo | Razón |
|---------|-------|
| `src/services/validation.service.ts` | Legacy — la validación ahora es Zod + Strapi |

### 2.4 Código muerto

| Archivo | Razón |
|---------|-------|
| `src/components/VisitScheduler/scheduler.api.ts` | No se importa en ningún lado (apunta a rutas locales eliminadas) |

---

## Fase 3: Limpiar Prisma

### 3.1 Eliminar dependencias

```json
// package.json — eliminar:
"@prisma/adapter-better-sqlite3",
"@prisma/adapter-pg",
"@prisma/client",
"prisma"
```

### 3.2 Eliminar archivos/folders

| Path | Acción |
|------|--------|
| `prisma/schema.prisma` | Eliminar |
| `prisma/migrations/` | Eliminar |
| `src/lib/prisma.ts` | Eliminar |
| `generated/prisma/` | Eliminar |

### 3.3 Eliminar scripts de package.json

```json
// Eliminar:
"db:push", "db:migrate", "db:studio", etc.
```

### 3.4 Modelos que ya no existen en Prisma

Los siguientes modelos quedan gestionados por Strapi:
- `Message` → Content Type en Strapi
- `WorkType` → Content Type en Strapi
- `Visit` → Content Type en Strapi
- `Image` → Strapi Media Library
- `Availability` → Content Type en Strapi
- `BlockedDate` → Content Type en Strapi
- `RateLimit` → Eliminar (no se usa)
- `RevokedToken` → Eliminar (no se usa)
- `StripeEventLog` → Eliminar (reemplazado por logs + Strapi)

---

## Fase 4: Actualizar imports y referencias

### 4.1 Archivos que importan Prisma

| Archivo | Cambio |
|---------|--------|
| `src/pages/api/verify-payment.ts` | Usar Strapi API en vez de Prisma |
| `scripts/migrate-to-strapi.ts` | Eliminar (ya se ejecutó o no aplica) |
| `scripts/count-records.ts` | Eliminar |
| `scripts/check-db.ts` | Eliminar |
| `tests/integration.test.ts` | Actualizar o eliminar |
| `tests/stripe-webhook.test.ts` | Actualizar mocks |

### 4.2 Archivos que importan auth middleware

| Archivo | Cambio |
|---------|--------|
| `src/middleware.ts` | Eliminar import de `auth.middleware.ts` |

---

## Fase 5: Verificación

### 5.1 TypeScript check
```bash
npx tsc --noEmit
```

### 5.2 Verificar que no queden referencias a Prisma
```bash
grep -r "prisma" src/
grep -r "from.*prisma" src/
```

### 5.3 Verificar que no queden referencias a admin
```bash
grep -r "/admin" src/pages/
```

### 5.4 Verificar Stripe endpoints
- `POST /api/stripe/create-checkout-session` → funciona con Strapi
- `POST /api/stripe/webhook` → funciona con Strapi

---

## Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| Strapi no disponible → Stripe falla | Agregar fallback con retry + error handling |
| API token expuesto | Usar solo en server-side (API routes), nunca en client |
| Rate limits de Strapi | Strapi local no tiene limits; en producción configurar |
| Webhook timeout | Strapi API es rápida, pero si falla → log + retry manual |

---

## Orden de ejecución

1. ✅ Crear helper `src/lib/strapi.ts`
2. ✅ Fix webhook.ts → Strapi API
3. ✅ Fix create-checkout-session.ts → Strapi API
4. ✅ Eliminar admin pages + API routes
5. ✅ Eliminar middleware auth
6. ✅ Eliminar código muerto
7. ✅ Eliminar Prisma dependencies + files
8. ✅ TypeScript check + verify

---

## Estimación

| Fase | Tiempo |
|------|--------|
| 1. Stripe → Strapi | 30 min |
| 2. Eliminar admin | 15 min |
| 3. Limpiar Prisma | 10 min |
| 4. Actualizar imports | 15 min |
| 5. Verificación | 10 min |
| **Total** | **~80 min** |
