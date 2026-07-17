#!/usr/bin/env node
/**
 * Build pipeline — end-to-end orchestrator for profesional-astro.
 *
 * Runs (in order, stops on first failure):
 *   1. Prerequisites   — node, pnpm, docker
 *   2. Postgres        — starts container if not running, waits until ready
 *   3. Install deps    — root + strapi (frozen lockfile)
 *   4. Seeds           — base data + cleaning services (idempotent)
 *   5. Build Strapi    — `pnpm build` inside strapi/
 *   6. Build Astro     — `pnpm build` at the root
 *
 * Usage:
 *   node scripts/build-all.mjs                # full pipeline
 *   node scripts/build-all.mjs --skip-seeds   # skip seed step
 *   node scripts/build-all.mjs --skip-install # reuse current node_modules
 *   node scripts/build-all.mjs --skip-build   # only install + seed
 *
 * Exit codes:
 *   0 — all steps succeeded
 *   1 — any step failed (with clear log of which one)
 */

import { execFileSync, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { platform } from 'node:os';

// Silence Node 18+ deprecation DEP0190 (shell:true with concatenated args).
// Safe here: all commands are static, no user input is passed to a shell.
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.code !== 'DEP0190') console.warn(w);
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const STRAPI = join(ROOT, 'strapi');
const PG_CONTAINER = 'profesional-astro-postgres';

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};
const ok = (m) => console.log(`  ${C.green}✅${C.reset} ${m}`);
const warn = (m) => console.log(`  ${C.yellow}⚠️ ${C.reset} ${m}`);
const fail = (m) => console.log(`  ${C.red}❌${C.reset} ${m}`);
const step = (n, name) => console.log(`\n${C.cyan}${C.bold}[${n}] ${name}${C.reset}`);

function run(cmd, args, opts = {}) {
  const display = [cmd, ...args].map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ');
  console.log(`  ${C.dim}$ ${display}${C.reset}`);
  execFileSync(cmd, args, {
    stdio: 'inherit',
    cwd: opts.cwd ?? ROOT,
    env: { ...process.env, ...(opts.env ?? {}) },
    shell: process.platform === 'win32', // for .cmd / .ps1 wrappers
  });
}

function checkCmd(label, cmd, args = ['--version']) {
  // shell:true so Windows resolves .ps1 / .cmd wrappers (pnpm.ps1, pnpm.cmd, etc.)
  try {
    execSync([cmd, ...args].join(' '), { stdio: 'pipe', shell: true });
    ok(label);
    return true;
  } catch {
    fail(`${label} not found (looked for \`${cmd}\`)`);
    return false;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── 1. Prerequisites ────────────────────────────────────────────────
function checkPrereqs() {
  step('1/6', 'Checking prerequisites');
  const nodeOk = checkCmd('node ≥ 18', 'node');
  const pnpmOk = checkCmd('pnpm available', 'pnpm');
  const dockerOk = checkCmd('docker available', 'docker');
  if (!(nodeOk && pnpmOk && dockerOk)) {
    throw new Error('Missing required tool — see failures above.');
  }
}

// ── 2. Postgres ─────────────────────────────────────────────────────
async function ensurePostgres() {
  step('2/6', 'Ensuring Postgres is running');

  // Already up?
  try {
    const names = execFileSync('docker', ['ps', '--filter', `name=${PG_CONTAINER}`, '--format', '{{.Names}}'], {
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim();
    if (names.includes(PG_CONTAINER)) {
      ok(`Container \`${PG_CONTAINER}\` already running`);
      return;
    }
  } catch {
    throw new Error('Could not query docker. Is the docker daemon running?');
  }

  // Stopped or missing — try to start (idempotent: no-op if already up)
  console.log(`  ${C.dim}$ docker compose up -d postgres${C.reset}`);
  try {
    execSync('docker compose up -d postgres', { stdio: 'inherit', cwd: ROOT, shell: true });
  } catch (e) {
    throw new Error('`docker compose up -d postgres` failed. See output above.');
  }

  // Wait until pg_isready inside the container
  for (let i = 1; i <= 30; i++) {
    try {
      execFileSync('docker', ['exec', PG_CONTAINER, 'pg_isready', '-U', 'postgres'], { stdio: 'pipe' });
      ok(`Postgres ready (took ~${i}s)`);
      return;
    } catch {
      if (i === 30) throw new Error('Postgres did not become ready within 30s.');
      await sleep(1000);
    }
  }
}

// ── 3. Install deps ─────────────────────────────────────────────────
function installDeps() {
  step('3/6', 'Installing dependencies');
  run('pnpm', ['install', '--frozen-lockfile']);
  ok('Root deps installed');
  run('pnpm', ['install', '--frozen-lockfile'], { cwd: STRAPI });
  ok('Strapi deps installed');
}

// ── 4. Seeds ────────────────────────────────────────────────────────
function runSeeds() {
  step('4/6', 'Running seeds');
  if (!existsSync(join(STRAPI, '.env'))) {
    warn('strapi/.env not found — seeds will fall back to dotenv defaults.');
  }
  run('node', ['seed-strapi.js'], { cwd: STRAPI });
  ok('Base seed complete');
  run('node', ['seed-cleaning-services.js'], { cwd: STRAPI });
  ok('Cleaning services seed complete');
}

// ── 5. Build Strapi ─────────────────────────────────────────────────
function buildStrapi() {
  step('5/6', 'Building Strapi');
  run('pnpm', ['build'], { cwd: STRAPI });
  ok('Strapi build complete → strapi/build/');
}

// ── 6. Build Astro ──────────────────────────────────────────────────
function buildAstro() {
  step('6/6', 'Building Astro');
  run('pnpm', ['build']);
  ok('Astro build complete → dist/');
}

// ── Main ────────────────────────────────────────────────────────────
(async () => {
  const args = new Set(process.argv.slice(2));
  const skipInstall = args.has('--skip-install');
  const skipSeeds = args.has('--skip-seeds');
  const skipBuild = args.has('--skip-build');

  console.log('');
  console.log(`${C.bold}${C.cyan}╔════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║${C.reset}   ${C.bold}profesional-astro  —  Build Pipeline${C.reset}                  ${C.bold}${C.cyan}║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚════════════════════════════════════════════════════════╝${C.reset}`);
  console.log(`${C.dim}Flags: install=${!skipInstall}  seeds=${!skipSeeds}  build=${!skipBuild}${C.reset}`);

  const t0 = Date.now();
  try {
    checkPrereqs();
    await ensurePostgres();
    if (!skipInstall) installDeps();
    if (!skipSeeds) runSeeds();
    if (!skipBuild) {
      buildStrapi();
      buildAstro();
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log('');
    console.log(`${C.bold}${C.green}🎉 Build pipeline complete in ${elapsed}s${C.reset}`);
    console.log('');
    console.log(`  ${C.bold}Next steps${C.reset} (pick one):`);
    console.log(`    • ${C.cyan}pnpm dev${C.reset}                       — Astro + Strapi in dev mode`);
    console.log(`    • ${C.cyan}pnpm --filter strapi develop${C.reset}   — Strapi admin only`);
    console.log(`    • ${C.cyan}npm --prefix strapi run start${C.reset}  — Run prod Strapi (after build)`);
    console.log(`    • ${C.cyan}node dist/server/entry.mjs${C.reset}     — Run prod Astro (after build)`);
    console.log('');
  } catch (e) {
    console.log('');
    fail(`Pipeline aborted: ${e.message}`);
    console.log(`${C.dim}Re-run with --skip-install / --skip-seeds / --skip-build to bypass stages.${C.reset}`);
    process.exit(1);
  }
})();
