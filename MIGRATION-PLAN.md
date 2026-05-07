# Plan de Migración: Astro API Routes → Strapi

## Arquitectura Final

```
┌──────────────────────┐
│  Astro (Frontend)    │
│  - Pages/UI          │
│  - Components        │
│  - Forms             │
│  - Tailwind          │
└──────────┬───────────┘
           │
      ┌────┴─────┐
      │          │
      ▼          ▼
┌────────────┐  ┌──────────────────────┐
│  Strapi    │  │  Astro API Routes     │
│  (CMS)     │  │  (solo Stripe)       │
│            │  │                      │
│ Content:   │  │ - Stripe webhook     │
│ - WorkType │  │ - Create checkout    │
│ - Visit    │  │                      │
│ - Message  │  │ DB: PostgreSQL       │
│ - Blog     │  │ (misma instancia)    │
│ - Image    │  └──────────────────────┘
│ - Avail    │
│ - Blocked  │
└─────┬──────┘
      │
      ▼
┌──────────────────────┐
│  PostgreSQL          │
│  (compartida)        │
│                      │
│ Tablas Strapi:       │
│  - work_types        │
│  - visits            │
│  - messages          │
│  - blog_posts        │
│  - strapi_* (intern) │
│                      │
│ Tablas Legacy:       │
│  - StripeEventLog    │
│  - RateLimit         │
│  - RevokedToken      │
└──────────────────────┘
```

---

## Fase 1: Setup Strapi (1 día)

### 1.1 Crear proyecto Strapi
```bash
cd profesional-astro
npx create-strapi-app@latest strapi --quickstart
cd strapi
```

### 1.2 Configurar PostgreSQL compartida
Editar `strapi/.env`:
```env
DATABASE_URL=postgresql://postgres:prisma@localhost:5432/postgres?schema=public
```

### 1.3 Configurar variables de entorno
```env
APP_KEYS=tu-key-1,tu-key-2
API_TOKEN_SALT=random-salt
ADMIN_JWT_SECRET=random-secret
JWT_SECRET=random-jwt-secret
```

### 1.4 Iniciar Strapi
```bash
npm run develop
```
- Acceder a `http://localhost:1337/admin`
- Crear cuenta de admin

---

## Fase 2: Content Types en Strapi (1-2 días)

### 2.1 WorkType
**Collection Type** → `WorkType`

| Field | Type | Config |
|---|---|---|
| `name` | Text | Required, unique |
| `slug` | UID | Target: name |
| `description` | Rich Text | Optional |
| `category` | Enumeration | Values: `cleaning`, `plumbing`, `construction` |
| `duration` | Integer | Default: 60 |
| `price` | Decimal | Default: 10, min: 0 |
| `isActive` | Boolean | Default: true |
| `image` | Media | Single, optional |

### 2.2 Visit
**Collection Type** → `Visit`

| Field | Type | Config |
|---|---|---|
| `nombre` | Text | Required |
| `telefono` | Text | Required |
| `email` | Email | Optional |
| `date` | DateTime | Required |
| `workType` | Relation | One-to-one → WorkType |
| `mensaje` | Text (long) | Optional |
| `status` | Enumeration | `pending`, `confirmed`, `cancelled` |
| `stripeSessionId` | Text | Unique, optional |
| `stripeEventId` | Text | Optional |

### 2.3 Message
**Collection Type** → `Message`

| Field | Type | Config |
|---|---|---|
| `nombre` | Text | Required |
| `telefono` | Text | Required |
| `servicio` | Text | Required |
| `mensaje` | Text (long) | Required |

### 2.4 Availability
**Collection Type** → `Availability`

| Field | Type | Config |
|---|---|---|
| `dayOfWeek` | Integer | 0-6 |
| `startTime` | Time | Required |
| `endTime` | Time | Required |

### 2.5 BlockedDate
**Collection Type** → `BlockedDate`

| Field | Type | Config |
|---|---|---|
| `date` | Date | Required, unique |
| `reason` | Text | Optional |

### 2.6 BlogPost
**Collection Type** → `BlogPost`

| Field | Type | Config |
|---|---|---|
| `title` | Text | Required |
| `slug` | UID | Target: title |
| `content` | Rich Text (MDX) | Required |
| `description` | Text | Required |
| `pubDate` | DateTime | Required |
| `updatedDate` | DateTime | Optional |
| `heroImage` | Media | Single, optional |

### 2.7 Configurar Permisos de API (Settings → Roles → Public)

| Content Type | Permissions |
|---|---|
| `WorkType` | `find`, `findOne` → ✅ public |
| `Visit` | `create` → ✅ public (solo POST) |
| `Message` | `create` → ✅ public (solo POST) |
| `Availability` | `find` → ✅ public |
| `BlockedDate` | ❌ No public (solo admin) |
| `BlogPost` | `find`, `findOne` → ✅ public |

---

## Fase 3: Custom Controller — Slots (1 día)

### 3.1 Crear archivo de controller
**Path:** `strapi/src/api/work-type/controllers/work-type.js`

```javascript
'use strict';

const { parseISO, startOfDay, endOfDay, addMinutes } = require('date-fns');

module.exports = {
  async getAvailableSlots(ctx) {
    const { date, workTypeId } = ctx.query;

    if (!date || !workTypeId) {
      return ctx.badRequest('Date and workTypeId are required');
    }

    // 1. Check blocked date
    const blocked = await strapi.db.query('api::blocked-date.blocked-date').findFirst({
      where: {
        date: {
          $gte: new Date(`${date}T00:00:00`),
          $lte: new Date(`${date}T23:59:59`),
        },
      },
    });

    if (blocked) {
      return ctx.send({ data: [] });
    }

    // 2. Get work type duration
    const workType = await strapi.db.query('api::work-type.work-type').findOne({
      where: { id: parseInt(workTypeId) },
    });

    if (!workType) {
      return ctx.notFound('Work type not found');
    }

    const slotDuration = workType.duration || 60;

    // 3. Get existing visits for that day
    const dayStart = startOfDay(parseISO(date));
    const dayEnd = endOfDay(parseISO(date));

    const visits = await strapi.db.query('api::visit.visit').findMany({
      where: {
        date: { $gte: dayStart, $lte: dayEnd },
        status: { $ne: 'cancelled' },
      },
    });

    // 4. Generate slots (8:00 - 18:00)
    const slots = [];
    let current = new Date(parseISO(date));
    current.setHours(8, 0, 0, 0);

    const businessEnd = new Date(parseISO(date));
    businessEnd.setHours(18, 0, 0, 0);

    while (current < businessEnd) {
      const slotEnd = addMinutes(current, slotDuration);
      const isOccupied = visits.some((visit) => {
        const visitStart = new Date(visit.date);
        const visitEnd = addMinutes(visitStart, visit.workType?.duration || 60);
        return current < visitEnd && slotEnd > visitStart;
      });

      if (!isOccupied) {
        slots.push(current.toTimeString().substring(0, 5));
      }

      current = addMinutes(current, slotDuration);
    }

    return ctx.send({ data: slots });
  },
};
```

### 3.2 Registrar ruta custom
**Path:** `strapi/src/api/work-type/routes/work-type.js`

```javascript
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/work-types/slots',
      handler: 'work-type.getAvailableSlots',
      config: {
        auth: false,
      },
    },
    // ... rutas CRUD auto-generadas por Strapi
  ],
};
```

---

## Fase 4: Actualizar Frontend Astro (1-2 días)

### 4.1 Configurar URLs base
**Crear:** `src/config.ts`

```typescript
export const STRAPI_URL =
  import.meta.env.STRAPI_URL || 'http://localhost:1337';
export const STRIPE_API_URL =
  import.meta.env.STRIPE_API_URL || 'http://localhost:3000';
```

### 4.2 Actualizar `.env` de Astro
```env
STRAPI_URL=http://localhost:1337
STRIPE_API_URL=http://localhost:3000
```

### 4.3 Migrar llamadas API

| Archivo actual | Cambio |
|---|---|
| `src/pages/api/work-types.ts` | **Eliminar** → Frontend llama directo a `STRAPI_URL/api/work-types` |
| `src/pages/api/services.ts` | **Eliminar** → Frontend llama a `STRAPI_URL/api/work-types?filters[isActive][$eq]=true` |
| `src/pages/api/slots.ts` | **Eliminar** → Frontend llama a `STRAPI_URL/api/work-types/slots?date=...&workTypeId=...` |
| `src/pages/api/contact.ts` | **Eliminar** → Frontend llama a `STRAPI_URL/api/messages` (POST) |
| `src/pages/api/visits.ts` | **Eliminar** → Frontend llama a `STRAPI_URL/api/visits` (POST) |
| `src/pages/api/stripe/*` | **MANTENER** → Se quedan en Astro |

### 4.4 Actualizar componentes que hacen fetch

**Ejemplo — Lista de WorkTypes:**
```typescript
// Antes:
const res = await fetch('/api/work-types');

// Después:
const res = await fetch(`${STRAPI_URL}/api/work-types?populate=image`);
const data = await res.json();
const workTypes = data.data; // Strapi envuelve en { data: [...] }
```

**Ejemplo — Crear Message:**
```typescript
// Antes:
const res = await fetch('/api/contact', { method: 'POST', body: formData });

// Después:
const res = await fetch(`${STRAPI_URL}/api/messages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data: { nombre, telefono, servicio, mensaje } }),
});
```

**Ejemplo — Crear Visit:**
```typescript
// Después:
const res = await fetch(`${STRAPI_URL}/api/visits`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: {
      nombre,
      telefono,
      email,
      date: `${date}T${time}`,
      workType: workTypeId,
      mensaje,
      status: 'pending',
    },
  }),
});
```

### 4.5 Migrar Blog de MDX a Strapi

**Script de migración:** `scripts/migrate-blog.mjs`
```javascript
// Lee archivos de src/content/blog/*.md
// Crea posts en Strapi via REST API
// Requiere API Token de Strapi (generar en admin panel)
```

**Actualizar:** `src/pages/blog/[slug].astro`
```typescript
// Antes:
import { getCollection } from 'astro:content';
const post = await getCollection('blog', ({ slug }) => slug === params.slug);

// Después:
const res = await fetch(`${STRAPI_URL}/api/blog-posts?filters[slug][$eq]=${params.slug}&populate=heroImage`);
const data = await res.json();
const post = data.data[0];
```

### 4.6 Eliminar código legacy de Astro

**Eliminar:**
- `src/pages/api/work-types.ts`
- `src/pages/api/services.ts`
- `src/pages/api/slots.ts`
- `src/pages/api/contact.ts`
- `src/pages/api/visits.ts`
- `src/services/visit.service.ts`
- `src/services/slot.service.ts`
- `src/services/validation.service.ts`
- `src/lib/prisma.ts`
- `prisma/schema.prisma` (o mantenerlo solo como referencia)

**MANTENER:**
- `src/pages/api/stripe/create-checkout-session.ts`
- `src/pages/api/stripe/webhook.ts`
- `src/lib/stripe.ts`
- `src/constants.ts`
- `src/utils/response.utils.ts`
- `src/consts.ts`

### 4.7 Actualizar `package.json`

**Eliminar dependencias:**
```json
{
  "dependencies": {
    "@prisma/client": "...",
    "prisma": "..."
  }
}
```

**Eliminar scripts:**
```json
{
  "scripts": {
    "db:push": "...",
    "db:migrate": "..."
  }
}
```

---

## Fase 5: Migrar datos existentes (0.5 día)

### 5.1 Script de migración de datos
**Path:** `scripts/migrate-data.mjs`

```javascript
// Lee datos de tablas Prisma existentes
// Inserta en tablas Strapi con el formato correcto
// Tablas a migrar:
// - WorkType → work_types (si Strapi usa nombre diferente)
// - Visit → visits
// - Message → messages
// - Availability → availabilities
// - BlockedDate → blocked_dates
```

### 5.2 Ejecutar migración
```bash
node scripts/migrate-data.mjs
```

---

## Fase 6: Testing (1 día)

### 6.1 Test de flujos
- [ ] Admin panel: login, ver dashboard
- [ ] WorkTypes: listar, crear, editar, eliminar desde admin
- [ ] Visit creation: form → Strapi → aparece en admin
- [ ] Slots: lógica correcta (blocked, occupied, available)
- [ ] Contact form: submission → aparece en Messages
- [ ] Blog: posts visibles, navegación funciona
- [ ] Stripe: checkout → webhook → visit creada en Strapi
- [ ] Media Library: subir imagen, usar en WorkType

### 6.2 Test de integración
- [ ] Frontend consume Strapi correctamente
- [ ] Stripe webhook escribe en tabla de Strapi
- [ ] Admin panel muestra datos actualizados

---

## Fase 7: Deploy (0.5 día)

### 7.1 Strapi en producción
- Deploy en Railway/Render/DigitalOcean
- Configurar `DATABASE_URL` → PostgreSQL remoto
- Configurar `STRAPI_URL` → URL de producción
- Configurar CORS para permitir requests desde dominio de Astro

### 7.2 Astro en Vercel
- Actualizar `STRAPI_URL` en variables de entorno de Vercel
- Mantener `STRIPE_*` variables

### 7.3 Stripe webhook
- Actualizar URL del webhook en Stripe Dashboard → apunta a Vercel (se queda en Astro)

---

## Resumen de Esfuerzo

| Fase | Días | Dificultad |
|---|---|---|
| 1. Setup Strapi | 1 | Baja |
| 2. Content Types | 1-2 | Baja |
| 3. Custom Controller (Slots) | 1 | Media |
| 4. Actualizar Frontend | 1-2 | Media |
| 5. Migrar datos | 0.5 | Baja |
| 6. Testing | 1 | Media |
| 7. Deploy | 0.5 | Media |
| **Total** | **6-8 días** | |

---

## Checklist de Eliminación

### Archivos a eliminar en Astro
- [ ] `src/pages/api/work-types.ts`
- [ ] `src/pages/api/services.ts`
- [ ] `src/pages/api/slots.ts`
- [ ] `src/pages/api/contact.ts`
- [ ] `src/pages/api/visits.ts`
- [ ] `src/services/visit.service.ts`
- [ ] `src/services/slot.service.ts`
- [ ] `src/services/validation.service.ts`
- [ ] `src/lib/prisma.ts`
- [ ] `prisma/schema.prisma` (opcional, mantener como referencia)

### Archivos a MANTENER en Astro
- [ ] `src/pages/api/stripe/create-checkout-session.ts`
- [ ] `src/pages/api/stripe/webhook.ts`
- [ ] `src/lib/stripe.ts`
- [ ] `src/constants.ts`
- [ ] `src/utils/response.utils.ts`
- [ ] `src/consts.ts`
- [ ] `src/interfaces/services.ts`

### Dependencias a eliminar
- [ ] `@prisma/client`
- [ ] `prisma`
- [ ] `better-sqlite3` (si existe)

---

## Notas Técnicas

### Strapi API Response Format
Strapi envuelve respuestas en `{ data: [...], meta: {...} }`
```typescript
// WorkTypes:
const res = await fetch(`${STRAPI_URL}/api/work-types`);
const { data } = await res.json();
// data = [{ id: 1, attributes: { name, slug, ... } }]
```

### Strapi Create Format
```typescript
const res = await fetch(`${STRAPI_URL}/api/visits`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: {
      nombre: 'Juan',
      telefono: '123',
      // ...
    },
  }),
});
```

### Stripe Webhook → Strapi Visit
El webhook de Stripe crea visitas directamente en la tabla de Strapi via Prisma (comparten la misma DB).
No necesita cambiar — solo asegurarse de que la tabla `visits` que usa Strapi sea la misma que el webhook escribe.

### Relación WorkType en Visit
En Strapi, las relaciones se pasan por ID:
```json
{
  "data": {
    "workType": 1  // ID del WorkType
  }
}
```
