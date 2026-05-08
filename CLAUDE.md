# Professional Astro — Project Context

## Project Overview

**Nombre:** Professional Astro
**Tipo:** Portfolio & Service Business Website
**Propósito:** Website de servicios profesionales (limpieza, plomería, construcción) con:
- Showcase de servicios y portfolio
- Sistema de contacto/cotización con persistencia en BD
- Panel admin para gestionar mensajes
- Blog con MDX
- Sitemap y RSS feeds

**Estado:** En desarrollo activo
**Hosting:** Vercel (configurado)

---

## Tech Stack

### Core Framework
- **Astro 5.16** - SSR-ready site builder (output: "server" mode)
- **TypeScript** - Strict mode enabled
- **Node.js Adapter** - Standalone server runtime via `@astrojs/node`

### Styling & UI
- **Tailwind CSS 4.1** - Utility-first CSS with Vite plugin
- **Sharp** - Image optimization

### Database & ORM
- **Prisma 7.2** - ORM with migrations
- **PostgreSQL 15** - Primary database (via Docker or Neon/Supabase)
- **Better SQLite3 adapter** - Fallback local support
- **Connection:** `DATABASE_URL` from `.env`

### Content & APIs
- **MDX 4.3** - Markdown with JSX in blog posts
- **Zod 4.3** - Runtime validation for form data
- **RSS & Sitemap** - Auto-generated feeds

### Development
- **pnpm** - Package manager
- **tsx** - TypeScript executor
- **dotenv** - Environment variable management

---

## Folder Structure

```
profesional-astro/
├── src/
│   ├── components/           # Reusable Astro components
│   │   ├── Button/           # CTA button component
│   │   ├── PrincipalForm/    # Contact form with validation
│   │   ├── BannerPrincipal/  # Hero section
│   │   ├── ServicesCards/    # Service grid
│   │   ├── About/            # About section
│   │   ├── Header.astro      # Navigation
│   │   ├── Footer.astro      # Footer
│   │   └── ...other shared components
│   │
│   ├── layouts/              # Page templates
│   │   ├── BaseLayaout.astro # Main layout wrapper (note: typo in name)
│   │   └── BlogPost.astro    # Blog post layout
│   │
│   ├── pages/                # File-based routing
│   │   ├── index.astro       # HOME - 6 sections (banner, services, about, contact)
│   │   ├── about.astro       # ABOUT page
│   │   ├── services/
│   │   │   └── [nameServices].astro  # Dynamic service detail page
│   │   ├── blog/
│   │   │   └── [slug].astro  # Blog post pages (from /content/blog)
│   │   └── api/              # API endpoints
│   │       ├── contact.ts    # POST - Form submissions → DB
│   │       └── admin/
│   │           ├── login.ts  # POST - Auth check
│   │           └── logout.ts # POST - Clear session
│   │
│   ├── content/              # Astro Content Collections
│   │   └── blog/             # Markdown/MDX blog posts
│   │       └── [slug].md
│   │
│   ├── interfaces/           # TypeScript types
│   │   └── services.ts       # ServiceAll, service item types
│   │
│   ├── lib/                  # Utilities
│   │   └── prisma.ts         # PrismaClient singleton with PG adapter
│   │
│   ├── styles/               # Global styles
│   ├── assets/               # Static assets (images, fonts)
│   └── consts.ts             # Global constants
│       └── SERVICE_DATA - hardcoded service definitions
│
├── prisma/
│   ├── schema.prisma         # Data model (Message table)
│   └── migrations/           # Prisma migrations
│
├── public/                   # Static files (served as-is)
│   └── images/               # Service images
│
├── generated/
│   └── prisma/               # Auto-generated Prisma Client
│
├── .astro/                   # Astro build cache & settings
├── astro.config.mjs          # Astro configuration
├── tsconfig.json             # TypeScript config (strict)
├── prisma.config.ts          # Prisma configuration
├── src/content.config.ts     # Content collections schema
├── package.json
├── pnpm-lock.yaml
├── docker-compose.yml        # PostgreSQL 15 container
├── example.env               # Template env vars
└── README.md                 # Spanish setup guide
```

---

## Database Schema

### Message Table
```prisma
model Message {
  id        Int      @id @default(autoincrement())
  nombre    String   // User's name
  telefono  String   // Phone number
  servicio  String   // Service type
  mensaje   String   // Message/request
  createdAt DateTime @default(now())
}
```

**Nota:** Currently no auth/user table. Simple contact form submissions only.

---

## How the App Works

### 1. **Home Page** (`/`)
- 6 sections (via component composition):
  - **Banner** - Hero image + headline
  - **Services** - Card grid from `SERVICE_DATA` (consts.ts)
  - **About** - Company description
  - **Contact Form** - POST to `/api/contact`
  - Footer + navigation

### 2. **Service Pages** (`/services/[nameServices]`)
- Dynamic routes based on `SERVICE_DATA` keys (cleaning, plumbing, construction)
- Display service details + sub-items with CTAs

### 3. **Blog** (`/blog/[slug]`)
- Content from `src/content/blog/*.{md,mdx}`
- Frontmatter schema: title, description, pubDate, updatedDate, heroImage
- Auto-generated by Astro Content Collections

### 4. **Contact Form** (POST `/api/contact`)
- **Validation:** Zod schema
  - `nombre` - 3–80 chars
  - `telefono` - any string (no format validation)
  - `servicio` - enum: reparacion | instalacion | mantenimiento
  - `mensaje` - 10–1000 chars

- **Security:**
  - Honeypot field (`company`) to filter bots
  - Multipart form data only (blocks JSON, etc.)

- **Response:**
  - ✅ 201 - Message saved to DB
  - ❌ 400 - Validation error
  - ❌ 500 - DB error

### 5. **Admin Login** (POST `/api/admin/login`)
- **Credentials from ENV:**
  - `ADMIN_USER` - username
  - `ADMIN_PASSWORD` - password

- **Result:**
  - Sets `admin_session` cookie (httpOnly, strict, 7 days)
  - Redirects to `/admin`

### 6. **Admin Logout** (POST `/api/admin/logout`)
- Clears session cookie

---

## Development Conventions

### File & Naming
- **Astro components:** PascalCase (e.g., `PrincipalForm.astro`)
- **API routes:** snake_case paths (e.g., `/api/contact`)
- **Types/interfaces:** PascalCase (e.g., `ServiceAll`)
- **Folder structure:** Features grouped by domain (components/, pages/, etc.)

### Styling
- **Tailwind only** - no CSS files (except maybe global reset)
- **Responsive:** Mobile-first with Tailwind breakpoints
- **Colors:** Consistent use of sky-700 for primary CTA

### TypeScript
- Strict mode enabled
- Use `type` imports where possible
- Export types for API contracts

### API Endpoints
- Always check `request.headers.get("content-type")`
- Validate input with Zod
- Return JSON with consistent error shape: `{ error: "message" }` or `{ ok: true }`
- Use `prerender = false` for dynamic routes

### Prisma
- Use singleton from `src/lib/prisma.ts`
- Always wrap DB calls in try/catch
- Don't over-fetch; select specific fields if needed

### Form Handling
- HTML5 validation + Zod server validation (defense in depth)
- Honeypot for bots
- Client-side feedback (success/error messages)
- Disable submit button while loading

---

## Important Files

| File | Purpose |
|------|---------|
| `src/consts.ts` | `SERVICE_DATA` - hardcoded service definitions |
| `src/lib/prisma.ts` | PrismaClient singleton + PG adapter setup |
| `src/pages/index.astro` | Home page - orchestrates 6 sections |
| `src/pages/api/contact.ts` | Form endpoint - validates & saves to DB |
| `src/pages/api/admin/login.ts` | Auth - credential check + session cookie |
| `prisma/schema.prisma` | Single `Message` table definition |
| `astro.config.mjs` | Server mode, Tailwind Vite plugin, MDX |
| `src/interfaces/services.ts` | `ServiceAll` type for services structure |

---

## Environment Variables

Create `.env` from `example.env`:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:prisma@localhost:5432/postgres?schema=public"

# Admin credentials
ADMIN_USER=admin
ADMIN_PASSWORD=supersegura123
ADMIN_SESSION_SECRET=alguna_clave_larga_random
```

**For production (Vercel):**
- Set `DATABASE_URL` to Neon/Supabase PostgreSQL URI
- Change `ADMIN_PASSWORD` to strong value
- Update `ADMIN_SESSION_SECRET` to secure random string

---

## How to Run Locally

### 1. Install Dependencies
```bash
pnpm i
```

### 2. Setup Database
```bash
# Option A: Docker
docker compose up -d

# Option B: External (Neon, Supabase)
# Update DATABASE_URL in .env
```

### 3. Apply Prisma Schema
```bash
pnpm prisma db push
```

### 4. Start Dev Server
```bash
pnpm dev
```
- Opens at `http://localhost:3000` (usually)
- Hot reload enabled

### 5. Build for Production
```bash
pnpm build
```
- Generates standalone Node server in `.astro/`
- Ready for Vercel or any Node hosting

---

## Suggested Areas for Improvement

### 🔴 High Priority (Bugs/Security)
1. **Typo in layout name:** `BaseLayaout.astro` → `BaseLayout.astro`
2. **Phone validation:** `telefono` field accepts any string; add regex or tel input validation
3. **Missing env var safety:** No check for required env vars at startup
4. **Hardcoded service data:** `SERVICE_DATA` in `consts.ts` should come from DB (new table)
5. **Admin panel missing:** No UI at `/admin` to view/manage messages

### 🟡 Medium Priority (UX/DX)
6. **Pagination:** Message list (if admin UI added) needs pagination
7. **Timestamps:** Better `createdAt` formatting in list views
8. **Rate limiting:** No rate limit on contact form (spam risk)
9. **Email notifications:** Form submissions don't trigger email alerts
10. **Error boundaries:** No graceful error UI for API failures

### 🟢 Nice to Have (Polish)
11. **Dark mode:** No dark theme (Tailwind supports it easily)
12. **Analytics:** No tracking (GA, Plausible, etc.)
13. **Image optimization:** Sharp included but not used in components
14. **Search:** No search on blog
15. **Documentation:** No inline code comments (especially in components)

---

## Testing Strategy

- No tests currently. Consider:
  - **API routes:** Test form validation (Zod schemas)
  - **Components:** Snapshot tests for static sections
  - **E2E:** Cypress/Playwright for form submission flow

---

## Deployment

### Vercel (Primary)
```bash
# Just push to git; Vercel auto-detects Astro
git push origin main
```
- Node adapter runs as serverless functions
- Environment variables in Vercel dashboard

### Docker (Alternative)
```bash
docker build -t profesional-astro .
docker run -p 3000:3000 profesional-astro
```
- *(Dockerfile not provided; would need to create)*

---

## Key Insights for Future Work

1. **Service data is hardcoded** → Moving to DB would require:
   - New `Service` + `ServiceItem` models in Prisma
   - Admin CRUD endpoints
   - Dynamic page generation

2. **No user authentication beyond admin login** → If adding user accounts later:
   - Add `User` table + password hashing (bcrypt)
   - Session management (consider lucia-auth or others)

3. **Single database table (Message)** → Lean design, but consider adding:
   - `Service` (for dynamic services)
   - `User` (if expanding features)
   - `AdminLog` (for audit trail)

4. **TypeScript strict mode** → Good; maintain it
   - No `any` types
   - All dependencies properly typed

5. **Astro is server-rendered (SSR)** → Not a static site
   - Dynamic routes work (`[nameServices]`, `/api/*`)
   - Suitable for form handling + DB queries

---

## Quick Reference: Common Tasks

### Add a New Service
1. Update `SERVICE_DATA` in `src/consts.ts`
2. Add images to `public/images/`
3. (In future: create DB record instead)

### Add a Blog Post
1. Create `src/content/blog/my-post.md`
2. Include frontmatter: `title`, `description`, `pubDate`, `heroImage` (optional)
3. Write markdown or MDX

### Change Admin Credentials
1. Update `ADMIN_USER` & `ADMIN_PASSWORD` in `.env`

### Query Messages from DB
1. Use PrismaClient from `src/lib/prisma.ts`:
   ```typescript
   import { prisma } from "../lib/prisma";
   const messages = await prisma.message.findMany();
   ```

---

**Last Updated:** 2026-03-14
**Project Location:** `/home/marcial/Desktop/proyects/profesional-astro`
