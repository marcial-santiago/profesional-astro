# Setup — Professional Astro

Guía completa para levantar el proyecto en local y producción.

---

## Requisitos previos

- Node.js >= 18
- pnpm >= 8 (`npm i -g pnpm`)
- Docker + Docker Compose (para desarrollo local)
- Cuenta en Vercel (para producción)
- Cuenta en Neon o Supabase (PostgreSQL en producción)

---

## Desarrollo local

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd profesional-astro
pnpm install
```

### 2. Variables de entorno

```bash
cp example.env .env
```

Editá `.env` con tus valores. Los defaults del `example.env` ya funcionan para local con Docker.

> **IMPORTANTE:** El puerto de la base de datos local es `5433` (no el 5432 estándar) para evitar conflictos con otras instancias de PostgreSQL corriendo en la máquina.

### 3. Levantar PostgreSQL con Docker

```bash
docker compose up -d
```

Verifica que esté corriendo:

```bash
docker exec profesional-astro-postgres pg_isready -U postgres
# Esperado: /var/run/postgresql:5432 - accepting connections
```

> El container escucha internamente en el puerto 5432, pero desde el host se accede por **5433**.
> El `DATABASE_URL` ya apunta al 5433: `postgresql://postgres:prisma@localhost:5433/postgres`

### 4. Aplicar el schema de la base de datos

```bash
pnpm prisma db push
```

Para ver los datos en una UI:

```bash
pnpm prisma studio
```

### 5. Iniciar el servidor de desarrollo

```bash
pnpm dev
```

Abre [http://localhost:4321](http://localhost:4321).

---

## Variables de entorno — referencia completa

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Connection string de PostgreSQL | `postgresql://user:pass@host:port/db` |
| `ADMIN_USER` | Usuario del panel admin | `admin` |
| `ADMIN_PASSWORD` | Contraseña del panel admin | `supersegura123` |
| `ADMIN_SESSION_SECRET` | Secret para firmar la cookie de sesión (mínimo 32 chars random) | `abc123...` |
| `ALLOWED_ORIGINS` | Orígenes permitidos para CSRF (comma-separated) | `https://tudominio.com` |
| `APP_TIMEZONE` | Timezone IANA para validaciones de fechas | `America/Argentina/Buenos_Aires` |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe (backend) | `sk_live_...` |
| `PUBLIC_STRIPE_KEY` | Clave pública de Stripe (frontend) | `pk_live_...` |

---

## Producción — Vercel + Neon/Supabase

### 1. Base de datos

Crear un proyecto en [Neon](https://neon.tech) o [Supabase](https://supabase.com) y copiar el connection string.

Formato: `postgresql://user:password@host/dbname?sslmode=require`

### 2. Aplicar el schema en producción

```bash
# Con el DATABASE_URL de producción seteado localmente:
DATABASE_URL="postgresql://..." pnpm prisma db push
```

O usar migraciones si el proyecto las tiene:

```bash
DATABASE_URL="postgresql://..." pnpm prisma migrate deploy
```

### 3. Deploy en Vercel

```bash
# Primera vez: vincular proyecto
vercel link

# Deploy a producción
vercel --prod
```

O simplemente hacer push a `main` si está configurado el auto-deploy.

### 4. Variables de entorno en Vercel

En el dashboard de Vercel → Settings → Environment Variables, agregar:

- `DATABASE_URL` → connection string de Neon/Supabase (con `?sslmode=require`)
- `ADMIN_USER` → usuario admin
- `ADMIN_PASSWORD` → contraseña fuerte
- `ADMIN_SESSION_SECRET` → string random de 64+ caracteres
- `ALLOWED_ORIGINS` → `https://tudominio.com`
- `APP_TIMEZONE` → `America/Argentina/Buenos_Aires`
- `STRIPE_SECRET_KEY` → clave live de Stripe
- `PUBLIC_STRIPE_KEY` → clave pública live de Stripe

> Para generar el `ADMIN_SESSION_SECRET`:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## Comandos útiles

```bash
# Desarrollo
pnpm dev                    # Servidor en http://localhost:4321
pnpm build                  # Build de producción
pnpm preview                # Preview del build local

# Base de datos
docker compose up -d        # Levantar PostgreSQL local
docker compose down         # Bajar PostgreSQL
pnpm prisma db push         # Sincronizar schema sin migraciones
pnpm prisma migrate dev     # Crear y aplicar migración
pnpm prisma migrate deploy  # Aplicar migraciones en producción
pnpm prisma studio          # UI para explorar la BD

# Chequear estado del container
docker exec profesional-astro-postgres pg_isready -U postgres
docker logs profesional-astro-postgres
```

---

## Troubleshooting

### "Connection terminated unexpectedly" al arrancar

El servidor de dev arranca antes de que Docker esté listo, o el container no está corriendo.

```bash
docker compose up -d
# Esperar 3-5 segundos
pnpm dev
```

### Puerto 5433 ya ocupado

Otro proceso está usando el 5433. Verificar:

```bash
sudo lsof -i :5433
```

Si es otro container de Docker, pararlo o cambiar el puerto en `docker-compose.yml` y en `DATABASE_URL` del `.env`.

### Prisma client desactualizado

```bash
pnpm prisma generate
```

### Error de SSL en producción

Agregar `?sslmode=require` al final del `DATABASE_URL` en Vercel.
