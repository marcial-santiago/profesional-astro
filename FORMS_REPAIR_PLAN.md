# Plan de Reparación de Formularios — profesional-astro

## Fase 1: Bugs Críticos (funcionalidad rota)

### 1.1 Arreglar PUT/DELETE de work-types en admin
**Problema:** `api/admin/work-types.ts` usa `Astro.params.id` pero el archivo no es una ruta dinámica. `params.id` siempre es `undefined`.

**Solución:**
- Renombrar `src/pages/api/admin/work-types.ts` → `src/pages/api/admin/work-types/[id].ts`
- Mover la lógica POST (crear) a un archivo separado `src/pages/api/admin/work-types/index.ts`
- En `[id].ts`, manejar PUT y DELETE usando `Astro.request.method`
- Actualizar las llamadas del cliente en `admin.astro` para que apunten a la nueva ruta

**Archivos afectados:**
- `src/pages/api/admin/work-types.ts` → renombrar/crear `[id].ts` e `index.ts`
- `src/pages/admin.astro` (líneas 490-544, llamadas PUT/DELETE)

**Estimación:** 30 min

---

### 1.2 Crear página `/checkout/success`
**Problema:** Stripe redirige a `/checkout/success?session_id=cs_xxx` tras el pago, pero la ruta no existe → 404.

**Solución:**
- Crear `src/pages/checkout/success.astro`
- Leer `session_id` de query params
- Llamar `GET /api/verify-payment?session_id=xxx` para verificar
- Mostrar estado: "Pago confirmado" o "Verificando..." o "Error"
- Incluir botón "Volver al inicio"
- Usar `prerender = false` (necesita query params dinámicos)

**Archivos afectados:**
- `src/pages/checkout/success.astro` (nuevo)
- `src/pages/api/verify-payment.ts` (verificar que existe y funciona)

**Estimación:** 45 min

---

### 1.3 Agregar CSRF a `/api/visits`
**Problema:** Los endpoints `/api/visits` y `/api/stripe/create-checkout-session` no están bajo `/api/admin/`, así que el middleware no aplica CSRF. Son state-changing y necesitan protección.

**Solución:**
- Opción A: Extender el middleware para que aplique CSRF también a `/api/visits` y `/api/stripe/*`
- Opción B: Agregar verificación manual de CSRF dentro de cada endpoint
- **Recomendado: Opción A** — más limpio, consistente con el resto de la app
- En el middleware, agregar estas rutas a la lista de rutas protegidas por CSRF
- En el cliente (`VisitScheduler.astro` y `checkout.astro`), leer el token CSRF del cookie y enviarlo como header `x-csrf-token`

**Archivos afectados:**
- `src/middleware.ts` (agregar rutas a la lista de CSRF)
- `src/components/VisitScheduler.astro` (leer cookie CSRF, agregar header)
- `src/pages/checkout.astro` (leer cookie CSRF, agregar header)

**Estimación:** 45 min

---

## Fase 2: Seguridad (bot protection)

### 2.1 Agregar honeypot a VisitScheduler
**Problema:** Formulario público sin protección anti-bots.

**Solución:**
- Agregar campo oculto `company` (mismo nombre que el contact form para consistencia)
- CSS: `position: absolute; left: -9999px; opacity: 0;`
- En el submit handler, verificar que el campo esté vacío
- En el server (`api/visits.ts`), rechazar si el honeypot tiene valor

**Archivos afectados:**
- `src/components/VisitScheduler.astro` (agregar campo oculto + validación)
- `src/pages/api/visits.ts` (verificar honeypot)

**Estimación:** 15 min

---

### 2.2 Agregar honeypot a Checkout
**Problema:** Formulario público sin protección anti-bots.

**Solución:**
- Mismo patrón que VisitScheduler
- Campo oculto `company` con CSS para ocultar
- Validación en cliente y server

**Archivos afectados:**
- `src/pages/checkout.astro` (agregar campo oculto + validación)
- `src/pages/api/visits.ts` (ya cubierto en 2.1)

**Estimación:** 15 min

---

## Fase 3: Validación consistente (client ↔ server)

### 3.1 Contact Form — teléfono
**Problema:** HTML input sin `pattern`, server usa regex `^[\d\s\+\-\(\)]+$`.

**Solución:**
- Agregar `pattern="[\d\s\+\-\(\)]+"` al input de teléfono
- Agregar `title="Solo números, espacios, +, -, ()"` para tooltip

**Archivos afectados:**
- `src/components/PrincipalForm/index.astro`

**Estimación:** 5 min

---

### 3.2 VisitScheduler — nombre con acentos
**Problema:** Regex del cliente `^[a-zA-Z\s'-]+$` rechaza acentos (é, ñ). Server los acepta.

**Solución:**
- Cambiar regex del cliente a `^[\p{L}\s'-]+$` (Unicode letters) o `^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$`
- Mantener consistente con el server

**Archivos afectados:**
- `src/components/VisitScheduler.astro` (función `validateName`)

**Estimación:** 5 min

---

### 3.3 Checkout — nombre con espacios y teléfono
**Problema:** `"   "` pasa validación del cliente. Teléfono sin validación de formato.

**Solución:**
- Agregar `.trim()` antes de validar longitud del nombre
- Agregar validación de formato de teléfono (misma regex que el server)

**Archivos afectados:**
- `src/pages/checkout.astro` (función `validateAndGetFormData`)

**Estimación:** 10 min

---

### 3.4 Admin Service Form — duración y precio
**Problema:** Cliente solo valida `!name`. No valida `duration >= 15` ni `price > 0`.

**Solución:**
- Agregar `min="15"` y `step="1"` al input de duración
- Agregar `min="0.01"` y `step="0.01"` al input de precio
- Agregar validación JS antes del submit

**Archivos afectados:**
- `src/pages/admin.astro` (form de work-types, líneas 148-224)

**Estimación:** 10 min

---

## Fase 4: UX improvements

### 4.1 Reemplazar `alert()` por UI inline
**Problema:** VisitScheduler usa `alert()` en 3 lugares (líneas 1017, 1051, 1072).

**Solución:**
- Crear elemento de error inline (como el que usa PrincipalForm)
- Reemplazar `alert()` con `showError(message)` que muestre el mensaje en el DOM
- Agregar estilo de error consistente con el resto de la app

**Archivos afectados:**
- `src/components/VisitScheduler.astro`

**Estimación:** 20 min

---

### 4.2 Loading state en Admin Login
**Problema:** Sin feedback visual durante el login.

**Solución:**
- Agregar texto "Ingresando..." o spinner al botón durante el submit
- Deshabilitar botón mientras carga

**Archivos afectados:**
- `src/pages/admin.astro` (form de login, líneas 333-359)

**Estimación:** 10 min

---

### 4.3 Precio desde server, no sessionStorage
**Problema:** El precio viene de `sessionStorage` y es manipulable.

**Solución:**
- En `checkout.astro`, al cargar, hacer `GET /api/visits/preview` o similar para obtener el precio real del workTypeId
- O validar en `create-checkout-session.ts` que el precio enviado coincida con el precio en DB del workTypeId
- **Recomendado:** Validar en el server — más simple y seguro

**Archivos afectados:**
- `src/pages/api/stripe/create-checkout-session.ts` (validar precio contra DB)
- `src/pages/api/visits.ts` (validar precio si se envía)

**Estimación:** 20 min

---

## Fase 5: Code quality

### 5.1 Reemplazar `any` por `unknown`
**Problema:** Varios `catch (err: any)`.

**Solución:**
- Cambiar a `catch (err: unknown)`
- Usar type guard o `instanceof Error` antes de acceder a `.message`

**Archivos afectados:**
- `src/components/PrincipalForm/index.astro`
- `src/pages/admin.astro`
- Otros archivos con `catch (err: any)`

**Estimación:** 10 min

---

### 5.2 Eliminar aserciones `!` inseguras
**Problema:** `document.getElementById("x")!` puede crashear si el elemento no existe.

**Solución:**
- Agregar null check con mensaje de error o fallback
- Ejemplo: `const el = document.getElementById("x"); if (!el) return;`

**Archivos afectados:**
- `src/pages/checkout.astro`
- Otros archivos con `!`

**Estimación:** 10 min

---

## Resumen de prioridades

| Fase | Items | Impacto | Tiempo total |
|------|-------|---------|-------------|
| **1. Bugs críticos** | 1.1, 1.2, 1.3 | Funcionalidad rota | ~2h |
| **2. Seguridad** | 2.1, 2.2 | Bot protection | ~30min |
| **3. Validación** | 3.1, 3.2, 3.3, 3.4 | Consistencia client/server | ~30min |
| **4. UX** | 4.1, 4.2, 4.3 | Experiencia de usuario | ~50min |
| **5. Code quality** | 5.1, 5.2 | Mantenibilidad | ~20min |

**Tiempo total estimado:** ~4 horas

---

## Orden recomendado de ejecución

1. ✅ **Fase 1** — Primero arreglar lo que está roto (admin edit/delete, checkout/success, CSRF)
2. ✅ **Fase 2** — Después seguridad (honeypots)
3. ✅ **Fase 3** — Validación consistente (evitar errores silenciosos)
4. ✅ **Fase 4** — UX (mejorar experiencia)
5. ✅ **Fase 5** — Code quality (limpieza final)
