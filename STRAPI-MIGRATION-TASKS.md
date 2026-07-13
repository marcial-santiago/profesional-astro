# Migración Astro → Strapi — Task List

**Última actualización:** 2026-05-07  
**Estado:** En progreso — Fase 4 (Eliminación código legacy)

---

## Fase 1: Setup Strapi + PostgreSQL

- [x] 1.1 Crear proyecto Strapi (`npx create-strapi-app@latest strapi`)
- [x] 1.2 Crear los 6 Content Types (WorkType, Visit, Message, Availability, BlockedDate, BlogPost)
- [x] 1.3 Crear controllers y routes para cada Content Type
- [x] 1.4 Implementar custom controller `getAvailableSlots` en WorkType
- [x] 1.5 Configurar PostgreSQL compartida (Strapi usa SQLite por defecto → cambiar a pg)
- [x] 1.6 Verificar que Strapi se conecta a la DB y crea las tablas
- [x] 1.7 Configurar permisos de API (Settings → Roles → Public)
- [x] 1.8 Crear cuenta de admin en Strapi

## Fase 2: Custom Controller — Slots

- [x] 2.1 Controller `getAvailableSlots` implementado
- [x] 2.2 Route `/work-types/slots` registrada con `auth: false`
- [x] 2.3 Testear endpoint de slots con datos reales

## Fase 3: Actualizar Frontend Astro

- [x] 3.1 Crear `src/config.ts` con `STRAPI_URL` y `STRIPE_API_URL`
- [x] 3.2 Actualizar `.env` de Astro con `STRAPI_URL`
- [x] 3.3 Migrar fetch de WorkTypes → Strapi API
- [x] 3.4 Migrar fetch de Services → Strapi API
- [x] 3.5 Migrar fetch de Slots → Strapi API
- [x] 3.6 Migrar Contact Form POST → Strapi `/api/messages`
- [x] 3.7 Migrar Visit Creation POST → Strapi `/api/visits`
- [x] 3.8 Migrar Blog de MDX → Strapi `/api/blog-posts`
- [x] 3.9 Actualizar `src/pages/blog/[...slug].astro` para fetch de Strapi
- [x] 3.10 Actualizar componentes que consumen datos (ServicesCards, VisitScheduler, etc.)

## Fase 4: Eliminar Código Legacy de Astro

- [x] 4.1 Eliminar `src/pages/api/work-types.ts`
- [x] 4.2 Eliminar `src/pages/api/services.ts`
- [x] 4.3 Eliminar `src/pages/api/slots.ts`
- [x] 4.4 Eliminar `src/pages/api/contact.ts`
- [x] 4.5 Eliminar `src/pages/api/visits.ts`
- [x] 4.6 Eliminar `src/services/visit.service.ts`
- [x] 4.7 Eliminar `src/services/slot.service.ts`
- [ ] 4.8 Eliminar `src/services/validation.service.ts` (usado por admin panel — mantener)
- [ ] 4.9 Eliminar `src/lib/prisma.ts` (usado por Stripe y admin — mantener)
- [ ] 4.10 Eliminar dependencias `@prisma/client` y `prisma` de package.json (usado por Stripe y admin — mantener)
- [ ] 4.11 Eliminar scripts de DB de package.json (usado por Stripe y admin — mantener)
- [x] 4.12 Actualizar `src/pages/api/stripe/webhook.ts` (usar Prisma directo en lugar de VisitService)
- [x] 4.13 Actualizar `src/pages/api/verify-payment.ts` (usar Prisma directo en lugar de VisitService)
- [x] 4.14 Actualizar `src/pages/api/admin/visits.ts` (usar Prisma directo en lugar de VisitService)

## Fase 5: Migrar Datos Existentes

- [x] 5.1 Crear script `scripts/seed-strapi.ts` (seed con datos realistas)
- [x] 5.2 Seed WorkTypes (17 servicios en 3 categorías)
- [x] 5.3 Seed Visits (8 visits con estados mixed)
- [x] 5.4 Seed Messages (5 mensajes de ejemplo)
- [x] 5.5 Seed Availability (6 días de business hours)
- [x] 5.6 Seed Blocked Dates (5 public holidays)
- [x] 5.7 Seed Blog Posts (3 posts con contenido realista)

## Fase 6: Testing

- [ ] 6.1 Admin panel: login, ver dashboard
- [ ] 6.2 WorkTypes: listar, crear, editar, eliminar desde admin
- [ ] 6.3 Visit creation: form → Strapi → aparece en admin
- [ ] 6.4 Slots: lógica correcta (blocked, occupied, available)
- [ ] 6.5 Contact form: submission → aparece en Messages
- [ ] 6.6 Blog: posts visibles, navegación funciona
- [ ] 6.7 Stripe: checkout → webhook → visit creada en Strapi
- [ ] 6.8 Media Library: subir imagen, usar en WorkType
- [ ] 6.9 Frontend consume Strapi correctamente
- [ ] 6.10 Stripe webhook escribe en tabla de Strapi

## Fase 7: Deploy

- [ ] 7.1 Deploy Strapi en Railway/Render/DigitalOcean
- [ ] 7.2 Configurar `DATABASE_URL` → PostgreSQL remoto
- [ ] 7.3 Configurar CORS para permitir requests desde dominio de Astro
- [ ] 7.4 Actualizar `STRAPI_URL` en variables de entorno de Vercel
- [ ] 7.5 Mantener `STRIPE_*` variables en Vercel
- [ ] 7.6 Actualizar URL del webhook en Stripe Dashboard → apunta a Vercel

---

## Notas

- **Strapi API Response Format:** `{ data: [...], meta: {...} }`
- **Strapi Create Format:** `{ data: { field: value } }`
- **Relaciones:** Se pasan por ID (`"workType": 1`)
- **Stripe Webhook:** Se mantiene en Astro, escribe directo a la tabla `visits` de Strapi (misma DB)
