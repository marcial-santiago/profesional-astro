# profesional-astro

Business website with service booking, Stripe payments, and a Strapi-powered admin panel. Built with **Astro 5** (SSR, Node adapter), **Strapi 5** for the CMS, **PostgreSQL 15** for persistence, and **Tailwind CSS 4** for styling.

**Live demo:** [profesional-astro.vercel.app](https://profesional-astro.vercel.app/)

---

## What you get

- **Service showcase** — Dynamic per-service pages with pricing, descriptions, and a category index.
- **Visit scheduling** — `VisitScheduler` widget with slot availability, conflict detection, and DB-backed validation.
- **Stripe payments** — Checkout with server-side price validation. The client cannot manipulate prices.
- **Contact form** — Multi-field form with Zod validation and a honeypot field for bot protection.
- **Blog** — Two writers share a single source of truth:
  - **Strapi** stores the canonical `BlogPost` collection (admin panel).
  - **Astro** keeps a parallel `src/content/blog/` collection of MDX starter posts.
- **Admin panel** — Strapi at `http://localhost:1337/admin` for managing work types, visits, availability, blocked dates, blog posts, and contact-form messages.
- **Security** — CSRF tokens, IP rate limiting, honeypot fields, strict CSP, `X-Frame-Options: DENY`, server-side input validation.

---

## Tech stack

| Layer       | Technology                              |
| ----------- | --------------------------------------- |
| Frontend    | Astro 5 (SSR, `output: "server"`)       |
| Adapter     | `@astrojs/node` (`mode: "standalone"`)  |
| CMS         | Strapi 5                                |
| Database    | PostgreSQL 15 (Docker container)        |
| Styling     | Tailwind CSS 4 (via `@tailwindcss/vite`)|
| Validation  | Zod 4                                   |
| Payments    | Stripe Checkout                         |
| Testing     | Vitest + Playwright                     |
| Deployment  | Vercel (frontend) · Docker Compose (prod stack) |

---

## Prerequisites

- **Node.js >= 18**
- **pnpm >= 8** — `npm i -g pnpm`
- **Docker Desktop** with the daemon running — for the local Postgres container

Verify before continuing:

```bash
node --version   # v18+
pnpm --version   # 8+
docker info      # "Server Version" should appear
```

---

## Quick start

> The whole dev stack (Postgres + Strapi + Astro) is orchestrated by one script. You don't need to start each service by hand.

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create your local `.env`

```bash
cp .env.example .env
```

Open `.env` and (optionally) fill in real Stripe test keys. **The defaults work for local dev out of the box** — you only need to change them when you want to exercise the Stripe flow or the Strapi admin API.

### 3. Bring the whole stack up

```bash
pnpm run dev:up
```

That single command will:

1. Preflight (node, pnpm, docker).
2. Start the `profesional-astro-postgres` container (port `5433` on the host).
3. Spawn Strapi dev server (port `1337`).
4. Spawn Astro dev server (port `4321`).
5. Wait until both `:1337` and `:4321` are listening, then print URLs.

If you want the seed data (work types, availability, cleaning services) loaded before the servers start, add `--seed`:

```bash
pnpm run dev:up -- --seed
```

### 4. Open the apps

| App                | URL                                    |
| ------------------ | -------------------------------------- |
| Frontend (Astro)   | http://localhost:4321                  |
| Strapi admin       | http://localhost:1337/admin            |
| Strapi REST API    | http://localhost:1337/api              |
| Postgres (host)    | `localhost:5433` (user `postgres` / pwd `prisma`) |

The first time you hit Strapi admin you'll be prompted to create the first admin user. Do that once, then you're in.

### 5. Manage the stack

```bash
pnpm run dev:status   # what's running on each port
pnpm run dev:logs     # tail strapi.log + astro.log (Ctrl+C to stop)
pnpm run dev:down     # stop Astro + Strapi (keeps Postgres container)
pnpm run dev:nuke     # down + stop & remove the Postgres container
```

---

## Environment variables

The full reference lives in **`.env.example`** at the repo root — open that file first. Here's the high-level map:

| Group        | Vars                                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| Database     | `DATABASE_URL`, `DATABASE_CLIENT`, `DATABASE_SSL`                                                          |
| Strapi       | `STRAPI_URL`, `PUBLIC_STRAPI_URL`, `STRAPI_API_TOKEN`                                                      |
| Stripe       | `STRIPE_SECRET_KEY`, `PUBLIC_STRIPE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_API_URL`                        |
| Security     | `ALLOWED_ORIGINS`, `ADMIN_USER`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`                                 |
| App          | `APP_TIMEZONE`, `GOOGLE_MAPS_EMBED_URL`                                                                    |

For a **production** deploy, use **`.env.prod.example`** as the template — it includes the additional `DB_USER` / `DB_PASSWORD` / `APP_KEYS` / `API_TOKEN_SALT` / `ADMIN_JWT_SECRET` / `JWT_SECRET` / `TRANSFER_TOKEN_SALT` that the Strapi container expects.

Generate a strong secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Project structure

```
profesional-astro/
├── astro.config.mjs            # SSR + Node adapter + Tailwind + MDX + sitemap
├── docker-compose.yml          # Postgres 15 for local dev (port 5433)
├── docker-compose.prod.yml     # Full prod stack: postgres + strapi + astro + nginx
├── Dockerfile.astro            # Production image for the Astro app
├── Dockerfile.strapi           # Production image for the Strapi app
├── nginx.prod.conf             # Reverse proxy used in production
│
├── src/                        # Astro frontend
│   ├── pages/                  # File-based routing
│   │   ├── index.astro         # Home
│   │   ├── about.astro
│   │   ├── checkout.astro
│   │   ├── checkout/success.astro
│   │   ├── services/index.astro
│   │   ├── services/[nameServices].astro    # Dynamic service detail
│   │   ├── services/cat/[category].astro    # Dynamic category index
│   │   ├── blog/index.astro
│   │   ├── blog/[...slug].astro             # MDX blog post
│   │   ├── rss.xml.js
│   │   └── api/                             # Server endpoints
│   │       ├── contact.ts                   # POST — Contact form
│   │       ├── visits.ts                    # POST — Create booking
│   │       ├── work-types.ts                # GET  — Public work types
│   │       ├── work-types/slots.ts          # GET  — Available slots
│   │       ├── verify-payment.ts            # GET  — Stripe success fallback
│   │       └── stripe/
│   │           ├── create-checkout-session.ts
│   │           └── webhook.ts
│   │
│   ├── components/             # Astro UI components
│   │   ├── VisitScheduler/     # Step-by-step booking widget + helpers
│   │   ├── PrincipalForm/      # Contact form (Zod + honeypot)
│   │   ├── BannerPrincipal/    # Hero section
│   │   ├── ServicesCards/      # Service grid
│   │   ├── Map/                # Google Maps embed
│   │   ├── About/, Button/
│   │   ├── Header.astro, Footer.astro, BaseHead.astro, HeaderLink.astro
│   │
│   ├── content/blog/           # Local MDX posts (Astro content collection)
│   ├── lib/                    # Server-side helpers
│   │   ├── strapi.ts           # Strapi client (with optional API token)
│   │   ├── stripe.ts           # Stripe SDK init
│   │   ├── payment-verification.ts
│   │   ├── csrf.ts, rate-limiter.ts, ip-utils.ts
│   ├── utils/                  # response.utils, slugify
│   ├── content.config.ts       # Blog collection schema
│   ├── config.ts               # STRAPI_URL / STRIPE_API_URL / PUBLIC_STRAPI_URL
│   ├── constants.ts            # ALLOWED_ORIGINS, APP_TIMEZONE
│   ├── middleware.ts           # CSP, rate limiting, CSRF
│   └── consts.ts
│
├── strapi/                     # Strapi 5 CMS
│   ├── config/                 # admin.js, database.js, server.js
│   ├── src/api/                # 7 content-types: availability, blocked-date,
│   │                           #   blog-post, message, visit, work-type
│   ├── database/migrations/    # DB migration history
│   ├── seed-strapi.js          # Seeds work-types, availability, blog posts
│   ├── seed-cleaning-services.js
│   └── .env                    # Strapi-only env (gitignored)
│
├── scripts/
│   ├── dev-up.mjs              # Cross-platform dev stack orchestrator
│   └── prod-up.mjs             # Cross-platform prod stack orchestrator
│
├── tests/                      # Vitest unit tests
├── e2e/                        # Playwright E2E tests
└── .dev-logs/                  # strapi.log + astro.log (created on dev:up)
```

---

## Database content types (Strapi)

The DB schema lives in Strapi, **not** in a Prisma file. Each content-type has a full CRUD at `/api/<name>`:

| Collection        | Purpose                                                        |
| ----------------- | -------------------------------------------------------------- |
| `work-types`      | Service types — name, price, duration, image                   |
| `visits`          | Booked appointments, status tracking, Stripe session reference |
| `availability`    | Weekly working hours (day + time range)                        |
| `blocked-dates`   | Holidays / unavailable dates                                   |
| `blog-posts`      | Canonical blog content managed from the Strapi admin           |
| `messages`        | Contact-form submissions                                       |

Seeds (idempotent):

```bash
pnpm run seed:all      # from project root
# or, in detail:
pnpm --prefix strapi run seed
pnpm --prefix strapi run seed:cleaning
```

---

## Key flows

### Booking a visit

1. User browses services → clicks **Book Now**.
2. `VisitScheduler` fetches slots from `/api/work-types/slots` (which checks `availability`, `blocked-dates`, and existing `visit` conflicts).
3. User picks a date/time → redirected to `/checkout`.
4. Two paths:
   - **Pay with Stripe** — `/api/stripe/create-checkout-session` creates an idempotent session with the **DB-side** price/name. The webhook creates the `visit` on `checkout.session.completed`.
   - **Confirm without payment** — POST to `/api/visits` directly.

### Security layers

| Layer           | Mechanism                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------ |
| CSRF            | Auto-generated token cookie + `x-csrf-token` header check                                 |
| Rate limiting   | 20 requests/min per IP per endpoint (in-DB counter)                                        |
| Honeypot        | Hidden `company` field — bots fill it, server rejects                                      |
| Validation      | Zod schemas on every API endpoint, server-side                                            |
| Price integrity | Stripe endpoint fetches price from Strapi, ignores client input                            |
| Headers         | Strict CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`                     |

---

## Available scripts

| Script                | What it does                                                       |
| --------------------- | ------------------------------------------------------------------ |
| `pnpm dev`            | Astro dev server only (Strapi must be up separately)               |
| `pnpm build`          | Production build (`dist/`)                                         |
| `pnpm preview`        | Serve the production build locally                                 |
| `pnpm run doctor`     | Check the dev environment and print fixes for any missing/wrong config |
| `pnpm run dev:up`     | Full dev stack (Postgres + Strapi + Astro) detached, with logs     |
| `pnpm run dev:up -- --seed` | Same, but also runs the Strapi seeds first                   |
| `pnpm run dev:down`   | Stop Astro + Strapi (keeps Postgres)                               |
| `pnpm run dev:nuke`   | Stop everything, remove the Postgres container                     |
| `pnpm run dev:status` | Show what's running on each port                                   |
| `pnpm run dev:logs`   | Tail both server logs                                              |
| `pnpm run prod:up`    | Bring the full production stack up via `docker-compose.prod.yml`  |
| `pnpm run prod:down`  | Stop the production stack                                          |
| `pnpm run seed:all`   | Run both Strapi seed scripts                                       |
| `pnpm test`           | Vitest                                                             |
| `pnpm test:e2e`       | Playwright                                                         |

---

## Production deploy

The production stack is one command. It starts Postgres, Strapi, Astro, and Nginx as Docker containers, all on the same `app-network`.

### First deploy on a server

```bash
cp .env.prod.example .env
# Fill every CHANGE_ME value. Generate secrets with:
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
nano .env

docker compose -f docker-compose.prod.yml up -d --build
```

### URLs after startup

| What              | URL                                  |
| ----------------- | ------------------------------------ |
| Frontend          | `http://SERVER_IP/`                  |
| Strapi admin      | `http://SERVER_IP:1337/admin`        |
| Strapi via proxy  | `http://SERVER_IP/strapi/api/...`    |

Strapi admin stays exposed on port `1337` (it serves assets from root paths). Nginx proxies `/strapi/` for the API and uploads.

### Useful operations

```bash
docker compose -f docker-compose.prod.yml logs -f       # follow all logs
docker compose -f docker-compose.prod.yml up -d --build # after .env changes
docker compose -f docker-compose.prod.yml down          # stop, keep volumes
docker compose -f docker-compose.prod.yml down -v       # ⚠ destructive
```

Persistent data lives in Docker volumes `pgdata` (DB) and `strapi_uploads` (media).

### Vercel (frontend-only deploy)

If you only deploy the Astro app to Vercel (Strapi lives elsewhere), make sure these env vars are set in the Vercel dashboard:

- `DATABASE_URL` — Postgres connection string (`?sslmode=require` for Neon/Supabase)
- `STRAPI_URL` / `PUBLIC_STRAPI_URL`
- `STRIPE_SECRET_KEY` / `PUBLIC_STRIPE_KEY` / `STRIPE_WEBHOOK_SECRET`
- `ALLOWED_ORIGINS` — your Vercel domain

### Stripe webhook setup

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
2. URL: `https://your-domain.com/api/stripe/webhook`.
3. Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`.
4. Copy the signing secret → set as `STRIPE_WEBHOOK_SECRET`.

For local development:

```bash
stripe listen --forward-to localhost:4321/api/stripe/webhook
```

---

## Troubleshooting

### "Something is broken" — run the doctor first

```bash
pnpm run doctor
```

The doctor runs **8 checks** against your environment and prints loud, color-coded output. Every ❌ has a copy-pasteable fix line right under it. Every ⚠️ has a hint.

It checks:

1. **Required tools** — `node` (>=18), `pnpm` (>=8), `docker`
2. **Project files** — `.env`, `.env.example`, `node_modules/`, `strapi/.env`, `strapi/node_modules/`
3. **Astro env vars** — `DATABASE_URL`, `STRAPI_URL`, Stripe keys (with placeholder detection), `ALLOWED_ORIGINS`, `APP_TIMEZONE`, `GOOGLE_MAPS_EMBED_URL`
4. **Strapi env vars** — `APP_KEYS`, `API_TOKEN_SALT`, `JWT_SECRET` (and warns if they're still dev defaults), `DATABASE_URL`
5. **Database** — Docker daemon, container running, `pg_isready`, table count
6. **Services running** — Postgres host port, Strapi `:1337` with a smoke test on `/api/work-types`, Astro `:4321` with a smoke test on `/`
7. **Secrets safety** — `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` not still the dev defaults
8. **Stripe configuration** — warns if live (`sk_live_`) keys are present in a dev project

The doctor is also wired into `pnpm run dev:up`'s preflight — if anything is ❌, the stack will refuse to start until you fix it.

Flags:
- `pnpm run doctor -- --soft` — print issues but exit 0 (useful in CI / scripts)
- `pnpm run doctor -- --quiet` — only show ❌ and ⚠️, hide the ✅

### "ECONNREFUSED 127.0.0.1:1337" or "fetch failed" in Astro

Strapi is not running. Either start it manually (`pnpm --prefix strapi run dev`) or use the orchestrator (`pnpm run dev:up`).

### "Connection terminated unexpectedly" from Postgres

Docker isn't ready yet. Wait a few seconds after `pnpm run dev:up` before hitting the frontend, or check `pnpm run dev:logs`.

### Port 5433 already in use

Another process is squatting on the host port. Either free it or change the mapping in `docker-compose.yml` (and update `DATABASE_URL` to match).

### Port 1337 / 4321 already in use

Stop the previous dev stack first: `pnpm run dev:down` (or `dev:nuke` if you also want to kill Postgres).

### Astro dev server only listens on `::1` (IPv6)

On Windows, Astro's dev server sometimes binds only to the IPv6 loopback. Use `http://localhost:4321` in the browser (it resolves to both `127.0.0.1` and `::1`); calling `http://127.0.0.1:4321` directly from some tools may time out.

### Strapi admin is empty after first boot

The DB starts empty. Run the seeds:

```bash
pnpm run seed:all
```

### Prisma client / types out of sync

This project does not use Prisma — it uses Strapi's own database layer. If you do see Prisma-related issues from a dependency, regenerate the node-side client:

```bash
rm -rf node_modules .astro && pnpm install
```

### TypeScript errors

```bash
npx astro check
```

Should report 0 errors.

---

## License

Private project — all rights reserved by the owner.
