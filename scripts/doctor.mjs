#!/usr/bin/env node
/**
 * profesional-astro — Environment doctor.
 *
 * Runs a battery of checks against the local environment and prints loud,
 * actionable, color-coded output. Every ❌ has a "fix" line that the user
 * can copy-paste. Every ⚠️ has a hint. Exits with code 1 if anything is broken
 * so it can be wired into preflight scripts.
 *
 * Sections:
 *   1. Required tools       (node, pnpm, docker)
 *   2. Project files        (.env, .env.example, node_modules, strapi/.env)
 *   3. Astro env vars       (DATABASE_URL, STRAPI_URL, STRIPE_*, ALLOWED_ORIGINS, ...)
 *   4. Strapi env vars      (APP_KEYS, JWT_SECRET, DATABASE_*, ...)
 *   5. Database             (docker daemon + container + pg_isready + tables)
 *   6. Services running     (Strapi :1337, Astro :4321, with smoke tests)
 *   7. Secrets safety       (default/dev secrets still in place?)
 *   8. Stripe configuration (key format validation)
 *
 * Usage:
 *   node scripts/doctor.mjs           # full check, exits non-zero on any ❌
 *   node scripts/doctor.mjs --soft    # exit 0 even with issues (for reports)
 *   node scripts/doctor.mjs --quiet   # only print ❌
 *
 * It can also be imported as a module:
 *   import { runDoctor } from './doctor.mjs';
 *   const { ok, issues } = await runDoctor({ root, strapi });
 */

import { execFileSync, execSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, statSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { platform } from 'node:os';
import { createConnection } from 'node:net';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const STRAPI = join(ROOT, 'strapi');
const PG_CONTAINER = 'profesional-astro-postgres';

const IS_WIN = platform() === 'win32';
const ARGS = new Set(process.argv.slice(2));
const SOFT = ARGS.has('--soft');
const QUIET = ARGS.has('--quiet');

// ── styling ─────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m',
};

const SYM = { ok: '✅', warn: '⚠️ ', fail: '❌', fix: '   →' };

// Silence Node 18+ DEP0190 — shell:true is safe (args are static).
process.removeAllListeners('warning');
process.on('warning', (w) => { if (w.code !== 'DEP0190') console.warn(w); });

// ── tiny .env parser (no deps) ─────────────────────────────────────
function parseEnvFile(path) {
  if (!existsSync(path)) return null;
  const out = {};
  const text = readFileSync(path, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    // Strip surrounding quotes (single or double)
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

// ── result accumulator ──────────────────────────────────────────────
const results = []; // { section, status: 'ok'|'warn'|'fail', label, detail, fix }

function record(section, status, label, detail = '', fix = '') {
  results.push({ section, status, label, detail, fix });
}

// ── individual checks ───────────────────────────────────────────────

function checkTools() {
  const section = 'Required tools';
  const tools = [
    { name: 'node',  cmd: 'node',  min: 18 },
    { name: 'pnpm',  cmd: 'pnpm',  min: 8  },
    { name: 'docker',cmd: 'docker',min: 0  },
  ];
  for (const t of tools) {
    try {
      const out = execSync([t.cmd, '--version'].join(' '), { stdio: 'pipe', shell: true }).toString().trim();
      const m = out.match(/(\d+)\.(\d+)/);
      const ver = m ? `${m[1]}.${m[2]}` : out;
      const major = m ? parseInt(m[1], 10) : 0;
      if (t.min && major && major < t.min) {
        record(section, 'fail', t.name, `v${ver} (need >=${t.min})`, `Update ${t.name}: https://nodejs.org or \`npm i -g ${t.name}\``);
      } else {
        record(section, 'ok', t.name, `v${ver}`);
      }
    } catch {
      record(section, 'fail', t.name, 'not found', `Install ${t.name} and make sure it's on PATH`);
    }
  }
}

function checkFiles() {
  const section = 'Project files';
  // .env.example
  if (existsSync(join(ROOT, '.env.example'))) {
    const sz = statSync(join(ROOT, '.env.example')).size;
    record(section, 'ok', '.env.example', `${sz} bytes — safe template to copy from`);
  } else {
    record(section, 'fail', '.env.example', 'missing from repo', 'Restore from git: `git checkout .env.example`');
  }
  // .env
  if (existsSync(join(ROOT, '.env'))) {
    const sz = statSync(join(ROOT, '.env')).size;
    record(section, 'ok', '.env', `${sz} bytes — your local config (gitignored)`);
  } else {
    record(section, 'fail', '.env', 'missing', 'cp .env.example .env');
  }
  // node_modules
  if (existsSync(join(ROOT, 'node_modules'))) {
    let count = 0;
    try { count = readdirSync(join(ROOT, 'node_modules')).length; } catch {}
    record(section, 'ok', 'node_modules/', `${count} top-level packages installed`);
  } else {
    record(section, 'fail', 'node_modules/', 'missing', 'pnpm install');
  }
  // strapi node_modules
  if (existsSync(join(STRAPI, 'node_modules'))) {
    let count = 0;
    try { count = readdirSync(join(STRAPI, 'node_modules')).length; } catch {}
    record(section, 'ok', 'strapi/node_modules/', `${count} top-level packages installed`);
  } else {
    record(section, 'fail', 'strapi/node_modules/', 'missing', 'pnpm install (workspace install covers it)');
  }
  // strapi/.env
  if (existsSync(join(STRAPI, '.env'))) {
    record(section, 'ok', 'strapi/.env', 'present (gitignored)');
  } else if (existsSync(join(STRAPI, '.env.example'))) {
    record(section, 'fail', 'strapi/.env', 'missing',
      'cp strapi/.env.example strapi/.env   (then re-run pnpm run dev:up)');
  } else {
    record(section, 'fail', 'strapi/.env', 'missing and strapi/.env.example also missing',
      'Restore from git: git checkout strapi/.env.example  (then cp strapi/.env.example strapi/.env)');
  }
  // strapi/public/uploads — Strapi's local upload provider needs this dir
  // and will crash at boot if it doesn't exist. We create it (idempotent).
  const uploadsDir = join(STRAPI, 'public', 'uploads');
  if (existsSync(uploadsDir)) {
    record(section, 'ok', 'strapi/public/uploads/', 'present');
  } else {
    try {
      mkdirSync(uploadsDir, { recursive: true });
      record(section, 'ok', 'strapi/public/uploads/', 'missing — created it for you');
    } catch (e) {
      record(section, 'fail', 'strapi/public/uploads/', `missing and could not be created: ${e.message}`,
        `mkdir -p strapi/public/uploads   (then re-run: pnpm run dev:up)`);
    }
  }
  // .dev-logs directory
  if (!existsSync(join(ROOT, '.dev-logs'))) {
    record(section, 'warn', '.dev-logs/', 'not yet created — will be made on first dev:up', 'No action needed; created automatically');
  }
}

const PLACEHOLDERS = new Set([
  '', 'sk_test_replace_me', 'sk_live_replace_me', 'sk_test_...', 'sk_live_...',
  'pk_test_replace_me', 'pk_live_replace_me', 'pk_test_...', 'pk_live_...',
  'whsec_replace_me', 'whsec_...', 'whsec_xxx',
  'change_me_to_a_long_random_string_at_least_32_chars',
]);

function looksLikePlaceholder(v) {
  if (!v) return true;
  if (PLACEHOLDERS.has(v)) return true;
  if (/^change[_-]?me/i.test(v)) return true;
  if (/^replace[_-]?me/i.test(v)) return true;
  if (/^xxx/i.test(v)) return true;
  if (/^https:\/\/www\.google\.com\/maps\/embed\?pb=$/.test(v)) return true;
  return false;
}

function checkAstroEnv() {
  const section = 'Astro env vars (.env)';
  const env = parseEnvFile(join(ROOT, '.env'));
  if (!env) {
    record(section, 'fail', '.env', 'file is missing or unreadable', 'cp .env.example .env');
    return;
  }

  const required = [
    { key: 'DATABASE_URL',      kind: 'url' },
    { key: 'DATABASE_CLIENT',   kind: 'enum', allowed: ['postgres', 'sqlite'] },
    { key: 'STRAPI_URL',        kind: 'url' },
    { key: 'PUBLIC_STRAPI_URL', kind: 'url' },
  ];
  for (const { key, kind, allowed } of required) {
    const v = env[key];
    if (!v) {
      record(section, 'fail', key, 'missing', `Add to .env: ${key}=...`);
    } else if (kind === 'url' && !/^(https?|postgres(ql)?|sqlite|file):\/\//.test(v)) {
      record(section, 'fail', key, `not a URL: "${v}"`, `${key} should start with http(s)://, postgres://, sqlite:, or file:`);
    } else if (kind === 'enum' && !allowed.includes(v)) {
      record(section, 'fail', key, `must be one of: ${allowed.join(', ')}`, `Set ${key}=${allowed[0]} in .env`);
    } else {
      const masked = key.includes('PASSWORD') || key.includes('SECRET') || key.includes('KEY') || key.includes('TOKEN')
        ? v.replace(/(.{6}).+(.{4})/, '$1***$2')
        : v;
      record(section, 'ok', key, masked);
    }
  }

  // Stripe
  for (const key of ['STRIPE_SECRET_KEY', 'PUBLIC_STRIPE_KEY']) {
    const v = env[key] || '';
    if (!v) {
      record(section, 'fail', key, 'missing', 'Get one at https://dashboard.stripe.com/test/apikeys');
    } else if (looksLikePlaceholder(v)) {
      record(section, 'warn', key, `looks like a placeholder ("${v}")`,
        'Real Stripe test key from https://dashboard.stripe.com/test/apikeys');
    } else if (!/^sk_(test|live)_|^pk_(test|live)_/.test(v)) {
      record(section, 'fail', key, 'does not look like a Stripe key', 'Should start with sk_test_, sk_live_, pk_test_, or pk_live_');
    } else {
      record(section, 'ok', key, `${v.slice(0, 8)}***`);
    }
  }
  const whsec = env.STRIPE_WEBHOOK_SECRET || '';
  if (!whsec) {
    record(section, 'warn', 'STRIPE_WEBHOOK_SECRET', 'missing — checkout webhook will fail signature check',
      'Run: stripe listen --forward-to localhost:4321/api/stripe/webhook  (copy the whsec_ it prints)');
  } else if (looksLikePlaceholder(whsec)) {
    record(section, 'warn', 'STRIPE_WEBHOOK_SECRET', `placeholder ("${whsec}")`,
      'Run: stripe listen --forward-to localhost:4321/api/stripe/webhook');
  } else {
    record(section, 'ok', 'STRIPE_WEBHOOK_SECRET', `${whsec.slice(0, 8)}***`);
  }

  // ALLOWED_ORIGINS
  const origins = env.ALLOWED_ORIGINS || '';
  if (!origins) {
    record(section, 'warn', 'ALLOWED_ORIGINS', 'empty — CSRF / CORS will block legitimate localhost requests',
      'Set ALLOWED_ORIGINS=http://localhost:4321,http://localhost:1337');
  } else {
    const list = origins.split(',').map((s) => s.trim()).filter(Boolean);
    const hasLocal = list.some((u) => /localhost|127\.0\.0\.1|\[::1\]/.test(u));
    if (!hasLocal) {
      record(section, 'warn', 'ALLOWED_ORIGINS', `no localhost entry in: ${list.join(', ')}`,
        'Add http://localhost:4321 (and/or your dev port) to ALLOWED_ORIGINS');
    } else {
      record(section, 'ok', 'ALLOWED_ORIGINS', `${list.length} origin(s): ${list.join(', ')}`);
    }
  }

  // APP_TIMEZONE
  const tz = env.APP_TIMEZONE || '';
  if (!tz) {
    record(section, 'warn', 'APP_TIMEZONE', 'empty — falling back to America/Argentina/Buenos_Aires');
  } else if (!/^[A-Za-z_]+\/[A-Za-z_\/]+$/.test(tz)) {
    record(section, 'warn', 'APP_TIMEZONE', `"${tz}" doesn't look like an IANA timezone (Continent/City)`,
      'Example: America/Argentina/Buenos_Aires, Europe/Madrid, America/New_York');
  } else {
    record(section, 'ok', 'APP_TIMEZONE', tz);
  }

  // GOOGLE_MAPS_EMBED_URL
  const map = env.GOOGLE_MAPS_EMBED_URL || '';
  if (!map) {
    record(section, 'warn', 'GOOGLE_MAPS_EMBED_URL', 'empty — map will not render',
      'Google Maps → Share → Embed a map → copy the iframe src');
  } else if (looksLikePlaceholder(map)) {
    record(section, 'warn', 'GOOGLE_MAPS_EMBED_URL', 'placeholder value — map iframe will be broken',
      'Google Maps → Share → Embed a map → copy the iframe src');
  } else {
    record(section, 'ok', 'GOOGLE_MAPS_EMBED_URL', `${map.slice(0, 60)}...`);
  }

  // Optional STRAPI_API_TOKEN
  const apiTok = env.STRAPI_API_TOKEN || '';
  if (apiTok && looksLikePlaceholder(apiTok)) {
    record(section, 'warn', 'STRAPI_API_TOKEN', 'placeholder — public Strapi routes will still work, protected ones will 403',
      'Strapi admin → Settings → API Tokens → Create new API token');
  } else if (apiTok) {
    record(section, 'ok', 'STRAPI_API_TOKEN', `${apiTok.slice(0, 6)}***`);
  }
}

function checkStrapiEnv() {
  const section = 'Strapi env vars (strapi/.env)';
  const env = parseEnvFile(join(STRAPI, '.env'));
  if (!env) {
    record(section, 'warn', 'strapi/.env', 'file missing — Strapi will boot with dev defaults from config/*.js',
      'Run: pnpm run dev:up   (it will create strapi/.env on first boot)');
    return;
  }

  const required = ['APP_KEYS', 'API_TOKEN_SALT', 'ADMIN_JWT_SECRET', 'JWT_SECRET', 'TRANSFER_TOKEN_SALT', 'DATABASE_CLIENT'];
  for (const key of required) {
    const v = env[key];
    if (!v) {
      record(section, 'fail', key, 'missing', `Add to strapi/.env. Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`);
    } else if (/^dev-/.test(v) || v.includes('tobemodified') || v.includes('toBeModified')) {
      record(section, 'warn', key, `still using dev/default value ("${v.slice(0, 30)}...")`,
        'For dev it works, but replace with random values before any deploy');
    } else {
      record(section, 'ok', key, `${v.slice(0, 6)}*** (${v.length} chars)`);
    }
  }

  // DB
  if (env.DATABASE_URL) {
    record(section, 'ok', 'DATABASE_URL', `${env.DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);
  } else if (env.DATABASE_HOST) {
    record(section, 'ok', 'DATABASE_HOST', `${env.DATABASE_HOST}:${env.DATABASE_PORT || 5432}/${env.DATABASE_NAME || '?'}`);
  } else {
    record(section, 'fail', 'DATABASE_URL / DATABASE_HOST', 'neither set', 'Set DATABASE_URL in strapi/.env (matches root .env)');
  }

  // DATABASE_PASSWORD is only required when DATABASE_URL doesn't embed it.
  if (!env.DATABASE_PASSWORD && !(env.DATABASE_URL && /:\/\/[^:]+:[^@]+@/.test(env.DATABASE_URL))) {
    record(section, 'fail', 'DATABASE_PASSWORD', 'missing', 'Set in strapi/.env (default docker-compose password is `prisma`)');
  }
}

function checkDatabase() {
  const section = 'Database (Postgres)';
  // docker daemon
  try {
    execFileSync('docker', ['info'], { stdio: 'pipe' });
    record(section, 'ok', 'docker daemon', 'reachable');
  } catch {
    record(section, 'fail', 'docker daemon', 'not reachable',
      'Start Docker Desktop and wait for the whale icon to stop animating');
    return;
  }

  // container
  let containerUp = false;
  try {
    const out = execFileSync('docker', ['ps', '--filter', `name=${PG_CONTAINER}`, '--format', '{{.Names}}'], { encoding: 'utf8' }).trim();
    containerUp = out.includes(PG_CONTAINER);
  } catch {}
  if (containerUp) {
    record(section, 'ok', `container ${PG_CONTAINER}`, 'running');
  } else {
    record(section, 'fail', `container ${PG_CONTAINER}`, 'not running',
      'pnpm run dev:up   (it will start the container)');
    return;
  }

  // pg_isready
  try {
    execFileSync('docker', ['exec', PG_CONTAINER, 'pg_isready', '-U', 'postgres'], { stdio: 'pipe' });
    record(section, 'ok', 'pg_isready', 'accepting connections');
  } catch {
    record(section, 'fail', 'pg_isready', 'not ready',
      'Wait a few seconds, or: docker logs ' + PG_CONTAINER);
    return;
  }

  // tables
  try {
    const out = execFileSync(
      'docker',
      ['exec', PG_CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-tAc',
       "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"],
      { encoding: 'utf8' }
    ).trim();
    const n = parseInt(out, 10);
    if (!n || n === 0) {
      record(section, 'warn', 'tables', 'no public tables found — DB is empty',
        'pnpm run dev:up -- --seed   (or: pnpm run seed:all)');
    } else {
      record(section, 'ok', 'tables', `${n} public tables`);
    }
  } catch {
    record(section, 'warn', 'tables', 'could not count tables (psql not in container?)', 'Run pnpm run seed:all to bootstrap');
  }
}

async function portReady(host, port, timeoutMs = 2000) {
  return new Promise((resolveP) => {
    const sock = createConnection({ host, port, family: host.includes(':') ? 6 : 4 }, () => { sock.end(); resolveP(true); });
    sock.on('error', () => resolveP(false));
    sock.setTimeout(timeoutMs, () => { sock.destroy(); resolveP(false); });
  });
}

async function checkServices() {
  const section = 'Services running';
  // Postgres host port
  const env = parseEnvFile(join(ROOT, '.env')) || {};
  const dbUrl = env.DATABASE_URL || '';
  const m = dbUrl.match(/:(\d+)\//);
  const dbPort = m ? parseInt(m[1], 10) : 5433;
  if (await portReady('127.0.0.1', dbPort)) {
    record(section, 'ok', `Postgres host port :${dbPort}`, 'reachable');
  } else {
    record(section, 'warn', `Postgres host port :${dbPort}`, 'not reachable from host',
      'docker compose up -d   (or check the port mapping in docker-compose.yml)');
  }

  // Strapi
  const strapiPort = 1337;
  if (await portReady('127.0.0.1', strapiPort)) {
    record(section, 'ok', `Strapi :${strapiPort}`, 'listening');
    try {
      const res = await fetch(`http://127.0.0.1:${strapiPort}/api/work-types`);
      if (res.ok) {
        const json = await res.json();
        const n = Array.isArray(json?.data) ? json.data.length : 0;
        record(section, 'ok', `Strapi /api/work-types`, `${res.status} (${n} work-type${n === 1 ? '' : 's'})`);
      } else {
        record(section, 'warn', `Strapi /api/work-types`, `${res.status} — endpoint not responding as expected`,
          'Check .dev-logs/strapi.log');
      }
    } catch (e) {
      record(section, 'warn', `Strapi /api/work-types`, `fetch failed: ${e.message}`);
    }
  } else {
    record(section, 'warn', `Strapi :${strapiPort}`, 'not listening',
      'pnpm run dev:up   (or: pnpm --prefix strapi dev)');
  }

  // Astro
  const astroPort = 4321;
  // Astro binds to [::1] on Windows; localhost resolves to both, 127.0.0.1 may time out
  const candidates = ['localhost', '127.0.0.1', '::1'];
  let astroHost = null;
  for (const h of candidates) {
    if (await portReady(h, astroPort, 1500)) { astroHost = h; break; }
  }
  if (astroHost) {
    record(section, 'ok', `Astro :${astroPort}`, `listening (bound to ${astroHost})`);
    // fetch() needs IPv6 in brackets
    const fetchHost = astroHost.includes(':') ? `[${astroHost}]` : astroHost;
    try {
      const res = await fetch(`http://${fetchHost}:${astroPort}/`);
      if (res.ok) {
        const html = await res.text();
        const t = html.match(/<title>([^<]+)<\/title>/);
        record(section, 'ok', `Astro /`, `${res.status} — title: "${t ? t[1] : '(none)'}"`);
      } else {
        record(section, 'warn', `Astro /`, `${res.status} — homepage not 200`, 'Check .dev-logs/astro.log');
      }
    } catch (e) {
      record(section, 'warn', `Astro /`, `fetch failed: ${e.message}`);
    }
  } else {
    record(section, 'warn', `Astro :${astroPort}`, 'not listening',
      'pnpm run dev:up   (or: pnpm dev)');
  }
}

function checkSecretsSafety() {
  const section = 'Secrets safety (dev warnings)';
  const env = parseEnvFile(join(ROOT, '.env')) || {};
  const sessionSecret = env.ADMIN_SESSION_SECRET || '';
  if (sessionSecret && (sessionSecret.length < 32 || /dev_only|change_me|placeholder/i.test(sessionSecret))) {
    record(section, 'warn', 'ADMIN_SESSION_SECRET', `weak/placeholder (${sessionSecret.length} chars)`,
      'Generate a 32+ char random secret: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"');
  } else if (sessionSecret) {
    record(section, 'ok', 'ADMIN_SESSION_SECRET', `${sessionSecret.length} chars`);
  }

  const adminPass = env.ADMIN_PASSWORD || '';
  if (adminPass && adminPass === 'supersegura123') {
    record(section, 'warn', 'ADMIN_PASSWORD', 'still the dev default — change before any deploy',
      'Set ADMIN_PASSWORD to a strong password in .env');
  } else if (adminPass) {
    record(section, 'ok', 'ADMIN_PASSWORD', 'set (not the default)');
  }
}

function checkStripeFormat() {
  const section = 'Stripe configuration';
  const env = parseEnvFile(join(ROOT, '.env')) || {};
  const live = (env.STRIPE_SECRET_KEY || '').startsWith('sk_live_') || (env.PUBLIC_STRIPE_KEY || '').startsWith('pk_live_');
  if (live) {
    record(section, 'warn', 'live Stripe keys detected', 'using sk_live_/pk_live_',
      'This is the dev project — make sure you really want to hit live Stripe from a local machine');
  } else {
    record(section, 'ok', 'live Stripe keys', 'not detected (using test keys or placeholders)');
  }
}

// ── rendering ───────────────────────────────────────────────────────
function render() {
  const order = [
    'Required tools',
    'Project files',
    'Astro env vars (.env)',
    'Strapi env vars (strapi/.env)',
    'Database (Postgres)',
    'Services running',
    'Secrets safety (dev warnings)',
    'Stripe configuration',
  ];
  console.log('');
  console.log(`${C.bold}${C.cyan}╔════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║${C.reset}   ${C.bold}profesional-astro  —  Environment Doctor${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚════════════════════════════════════════════════════════╝${C.reset}`);

  let counts = { ok: 0, warn: 0, fail: 0 };
  for (const sec of order) {
    const items = results.filter((r) => r.section === sec);
    if (!items.length) continue;
    console.log('');
    console.log(`${C.bold}${C.magenta}[ ${sec} ]${C.reset}`);
    for (const r of items) {
      counts[r.status]++;
      if (QUIET && r.status === 'ok') continue;
      const sym = r.status === 'ok' ? `${C.green}${SYM.ok}${C.reset}` :
                  r.status === 'warn' ? `${C.yellow}${SYM.warn}${C.reset}` :
                  `${C.red}${SYM.fail}${C.reset}`;
      const label = r.status === 'ok' ? r.label : `${C.bold}${r.label}${C.reset}`;
      const detail = r.detail ? `${C.dim}${r.detail}${C.reset}` : '';
      console.log(`  ${sym} ${label}${detail ? '  ' + detail : ''}`);
      if (r.fix) console.log(`     ${C.cyan}${SYM.fix}${C.reset} ${C.cyan}${r.fix}${C.reset}`);
    }
  }

  // Summary
  const issues = results.filter((r) => r.status === 'fail');
  const warnings = results.filter((r) => r.status === 'warn');
  const passed = results.filter((r) => r.status === 'ok').length;
  console.log('');
  console.log(`${C.bold}Summary${C.reset}`);
  console.log(`  ${C.green}${SYM.ok} ${passed} passed${C.reset}    ${C.yellow}${SYM.warn} ${warnings.length} warnings${C.reset}    ${C.red}${SYM.fail} ${issues.length} failures${C.reset}`);
  console.log('');

  if (issues.length === 0 && warnings.length === 0) {
    console.log(`${C.green}${C.bold}✨ Everything looks great. You're ready to: pnpm run dev:up${C.reset}`);
  } else if (issues.length === 0) {
    console.log(`${C.yellow}${C.bold}⚠️  ${warnings.length} warning(s). Stack will likely work, but check the hints above.${C.reset}`);
  } else {
    console.log(`${C.red}${C.bold}💥 ${issues.length} issue(s) will break the stack. Fix the ❌ items above, then re-run:${C.reset}`);
    console.log(`${C.cyan}     pnpm run doctor${C.reset}`);
  }
  console.log('');

  return { ok: counts.ok, warn: counts.warn, fail: counts.fail, issues };
}

// ── public API ──────────────────────────────────────────────────────
export async function runDoctor(opts = {}) {
  results.length = 0; // reset for re-use
  const root = opts.root || ROOT;
  const strapi = opts.strapi || STRAPI;
  checkTools();
  checkFiles();
  checkAstroEnv();
  checkStrapiEnv();
  checkDatabase();
  await checkServices();
  checkSecretsSafety();
  checkStripeFormat();
  const summary = {
    ok: results.filter((r) => r.status === 'ok').length,
    warn: results.filter((r) => r.status === 'warn').length,
    fail: results.filter((r) => r.status === 'fail').length,
    issues: results.filter((r) => r.status === 'fail'),
  };
  if (!opts.silent) render(summary);
  return summary;
}

// ── CLI entry ───────────────────────────────────────────────────────
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runDoctor().then(({ fail }) => {
    // Set exit code and let Node close naturally to avoid a libuv
    // assertion crash on Windows when sockets/timers are still open.
    process.exitCode = (SOFT || fail === 0) ? 0 : 1;
  });
}
