# Professional Astro

Business website with service booking, Stripe payments, and admin panel. Built with Astro 5, PostgreSQL, and Prisma.

**Live demo:** [profesional-astro.vercel.app](https://profesional-astro.vercel.app/)

---

## Features

- **Service showcase** — Dynamic service pages with pricing and descriptions
- **Visit scheduling** — Book time slots with availability validation and conflict prevention
- **Stripe payments** — Secure checkout with DB-side price validation (client can't manipulate prices)
- **Contact form** — Multi-field form with Zod validation and honeypot bot protection
- **Blog** — MDX-powered content collection with RSS feed and sitemap
- **Admin panel** — Manage work types, view bookings, update visit status
- **Security** — CSRF tokens, rate limiting, honeypot fields, security headers (CSP, X-Frame-Options)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Astro 5 (SSR, server mode) |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL 15 |
| ORM | Prisma 7 |
| Validation | Zod 4 |
| Payments | Stripe Checkout |
| Testing | Vitest + custom verification scripts |
| Deployment | Vercel (Node adapter, standalone) |

---

## Quick Start

### Prerequisites

- **Node.js >= 18**
- **pnpm >= 8** — `npm i -g pnpm`
- **Docker** — for local PostgreSQL (or use Neon/Supabase)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

```bash
cp example.env .env
```

Edit `.env` with your values. The defaults work for local development with Docker.

### 3. Start the database

```bash
docker compose up -d
```

> **Note:** The database maps to port **5433** on your host (not 5432) to avoid conflicts with other PostgreSQL instances.

Verify it's running:

```bash
docker exec profesional-astro-postgres pg_isready -U postgres
```

### 4. Apply the database schema

```bash
pnpm prisma db push
```

Optional — explore the database visually:

```bash
pnpm prisma studio
```

### 5. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:4321](http://localhost:4321).

---

## Environment Variables

| Variable | Description | Default (dev) |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:prisma@localhost:5433/postgres` |
| `ADMIN_USER` | Admin panel username | `admin` |
| `ADMIN_PASSWORD` | Admin panel password | `supersegura123` |
| `ADMIN_SESSION_SECRET` | Cookie signing secret (min 32 random chars) | `dev-secret-change-in-production` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_test_...` |
| `PUBLIC_STRIPE_KEY` | Stripe publishable key | `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `APP_TIMEZONE` | IANA timezone for date validation | `America/Argentina/Buenos_Aires` |

Generate a secure session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Project Structure

```
profesional-astro/
├── src/
│   ├── components/           # Reusable Astro components
│   │   ├── VisitScheduler/   # Booking widget with step-by-step flow
│   │   ├── PrincipalForm/    # Contact form with validation
│   │   ├── BannerPrincipal/  # Hero section
│   │   ├── ServicesCards/    # Service grid
│   │   └── Map/              # Google Maps integration
│   │
│   ├── pages/                # File-based routing
│   │   ├── index.astro       # Home page
│   │   ├── about.astro       # About page
│   │   ├── checkout.astro    # Payment/booking checkout
│   │   ├── admin.astro       # Admin dashboard (protected)
│   │   ├── services/
│   │   │   └── [name].astro  # Dynamic service detail pages
│   │   ├── blog/
│   │   │   └── [slug].astro  # Blog posts from MDX
│   │   └── api/
│   │       ├── visits.ts         # POST — Create booking
│   │       ├── contact.ts        # POST — Contact form
│   │       ├── csrf.ts           # GET — CSRF token
│   │       ├── verify-payment.ts # POST — Payment verification
│   │       ├── admin/
│   │       │   ├── login.ts      # POST — Admin auth
│   │       │   ├── logout.ts     # POST — Clear session
│   │       │   ├── visits.ts     # GET/PATCH — Manage bookings
│   │       │   └── work-types/
│   │       │       ├── index.ts  # POST — Create work type
│   │       │       └── [id].ts   # PUT/DELETE — Update/delete
│   │       └── stripe/
│   │           ├── create-checkout-session.ts  # POST — Stripe session
│   │           └── webhook.ts                  # POST — Stripe events
│   │
│   ├── content/blog/         # MDX blog posts
│   ├── lib/                  # Utilities
│   │   ├── prisma.ts         # PrismaClient singleton
│   │   ├── csrf.ts           # CSRF token generation/verification
│   │   ├── rate-limiter.ts   # IP-based rate limiting
│   │   ├── session.ts        # Session management
│   │   └── ip-utils.ts       # IP extraction helpers
│   ├── services/             # Business logic
│   │   ├── visit.service.ts  # Slot availability, conflict detection
│   │   └── validation.service.ts  # Zod schemas
│   ├── middleware.ts         # CSRF, rate limiting, security headers
│   └── consts.ts             # Global constants (SERVICE_DATA)
│
├── prisma/
│   └── schema.prisma         # Data models (Message, Visit, WorkType, etc.)
│
├── scripts/
│   └── verify-all.mjs        # Automated verification suite (35 tests)
│
├── tests/                    # Vitest unit/integration tests
├── docker-compose.yml        # PostgreSQL 15 container
└── astro.config.mjs          # Astro config (SSR, Node adapter)
```

---

## Database Schema

| Model | Purpose |
|-------|---------|
| `Message` | Contact form submissions |
| `WorkType` | Service types with name, price, duration |
| `Visit` | Booked appointments with status tracking |
| `Availability` | Weekly working hours (day + time range) |
| `BlockedDate` | Holidays/unavailable dates |
| `RateLimit` | IP-based rate limiting storage |
| `RevokedToken` | Invalidated session tokens |
| `StripeEventLog` | Webhook event audit trail |

---

## Key Flows

### Booking a Visit

1. User browses services → clicks "Book Now"
2. VisitScheduler shows available slots (checks `Availability`, `BlockedDate`, existing `Visit` conflicts)
3. User selects date/time → redirected to `/checkout`
4. Two options:
   - **Pay with Stripe** → creates checkout session with DB price → webhook creates `Visit` on payment
   - **Confirm without payment** → POST to `/api/visits` → creates `Visit` directly

### Security Layers

| Layer | Mechanism |
|-------|-----------|
| CSRF | Auto-generated token cookie + `x-csrf-token` header check |
| Rate limiting | 20 requests/min per IP per endpoint (stored in DB) |
| Honeypot | Hidden `company` field — bots fill it, server rejects |
| Validation | Zod schemas on all API endpoints (server-side) |
| Price integrity | Stripe endpoint fetches price from DB, ignores client input |
| Headers | CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff |

---

## Available Scripts

```bash
# Development
pnpm dev              # Start dev server (http://localhost:4321)
pnpm build            # Production build
pnpm preview          # Preview production build locally

# Database
pnpm prisma db push       # Sync schema to database
pnpm prisma migrate dev   # Create and apply migration
pnpm prisma studio        # Open Prisma Studio UI

# Testing
pnpm test             # Run Vitest tests
pnpm test:watch       # Run Vitest in watch mode
npx tsx scripts/verify-all.mjs  # Run 35 automated endpoint tests
```

---

## Testing

### Automated Verification

```bash
npx tsx scripts/verify-all.mjs
```

Tests 35 endpoints across 10 categories:
- Server health, CSRF protection, honeypot, validation, admin auth, Stripe pricing, contact form, security headers, static pages, rate limiting

### Unit Tests

```bash
pnpm test
```

Covers: CSRF tokens, rate limiter, IP utils, session management, validation schemas, Stripe webhook.

---

## Deployment

### Vercel (Recommended)

1. Connect your repo to Vercel
2. Set environment variables in Vercel dashboard
3. Push to `main` — auto-deploys

**Required env vars for production:**
- `DATABASE_URL` — Neon/Supabase connection string (add `?sslmode=require`)
- `ADMIN_PASSWORD` — Strong password
- `ADMIN_SESSION_SECRET` — 64+ random chars
- `STRIPE_SECRET_KEY` / `PUBLIC_STRIPE_KEY` — Live Stripe keys
- `STRIPE_WEBHOOK_SECRET` — From Stripe dashboard

### Stripe Webhook Setup

1. Go to **Stripe Dashboard → Developers → Webhooks**
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select event: `checkout.session.completed`
4. Copy the signing secret → set as `STRIPE_WEBHOOK_SECRET`

For local development:

```bash
stripe listen --forward-to localhost:4321/api/stripe/webhook
```

---

## Troubleshooting

### "Connection terminated unexpectedly"

Docker isn't ready yet. Wait a few seconds after `docker compose up -d` before running `pnpm dev`.

### Port 5433 already in use

Another process is using the port. Check with:

```bash
netstat -ano | findstr 5433
```

Or change the port in `docker-compose.yml` and update `DATABASE_URL` in `.env`.

### Prisma client out of sync

```bash
pnpm prisma generate
```

### TypeScript errors

```bash
npx astro check
```

Should show 0 errors. If not, run `pnpm install` to ensure all types are present.
