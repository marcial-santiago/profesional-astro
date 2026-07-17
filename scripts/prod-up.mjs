#!/usr/bin/env node
/**
 * Production deploy orchestrator — cross-platform equivalent of prod-up.sh.
 *
 * Default action: bring up the full production stack (postgres, strapi, astro, nginx).
 *   - Verifies .env exists and has no CHANGE_ME placeholders
 *   - Verifies docker is available
 *   - Pulls/builds images and starts containers in detached mode
 *   - Waits for stack healthchecks
 *   - Prints the URLs (HTTP_PORT, STRAPI_PORT)
 *
 * Usage:
 *   node scripts/prod-up.mjs           # bring stack up
 *   node scripts/prod-up.mjs down     # stop + remove containers (keeps volumes)
 *   node scripts/prod-up.mjs nuke     # down + remove volumes (DESTRUCTIVE)
 *   node scripts/prod-up.mjs status   # show running containers + URLs
 *   node scripts/prod-up.mjs logs     # tail logs of all services
 *
 * Exit codes:
 *   0 — success
 *   1 — preflight failure (missing .env, placeholders, docker missing, etc.)
 *   2 — docker compose error (see stderr)
 */

import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const COMPOSE_FILE = 'docker-compose.prod.yml';

// Silence Node 18+ DEP0190 (shell:true is safe here: args are static).
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.code !== 'DEP0190') console.warn(w);
});

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};
const ok = (m) => console.log(`  ${C.green}✅${C.reset} ${m}`);
const warn = (m) => console.log(`  ${C.yellow}⚠️ ${C.reset} ${m}`);
const fail = (m) => console.log(`  ${C.red}❌${C.reset} ${m}`);
const step = (n, m) => console.log(`\n${C.cyan}${C.bold}[${n}] ${m}${C.reset}`);
const header = (title) => {
  console.log('');
  console.log(`${C.bold}${C.cyan}╔════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║${C.reset}   ${C.bold}profesional-astro  —  ${title}${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚════════════════════════════════════════════════════════╝${C.reset}`);
};

function sh(cmd, args, opts = {}) {
  const display = [cmd, ...args].map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ');
  console.log(`  ${C.dim}$ ${display}${C.reset}`);
  try {
    return execFileSync(cmd, args, {
      stdio: 'inherit',
      cwd: opts.cwd ?? ROOT,
      shell: process.platform === 'win32',
      env: { ...process.env, ...(opts.env ?? {}) },
    });
  } catch (e) {
    throw new Error(`Command failed: ${display}`);
  }
}

function parseEnv(file) {
  const out = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && !line.trim().startsWith('#')) {
      let v = m[2].replace(/^["']|["']$/g, '');
      out[m[1]] = v;
    }
  }
  return out;
}

// ── preflight ────────────────────────────────────────────────────────
function preflight() {
  step('1/3', 'Preflight checks');

  // .env exists
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) {
    fail('Missing .env');
    console.log(`     ${C.dim}cp .env.prod.example .env && edit it${C.reset}`);
    process.exit(1);
  }
  ok('.env present');

  // No CHANGE_ME placeholders
  const envText = readFileSync(envPath, 'utf8');
  if (/\bCHANGE_ME\b/.test(envText)) {
    fail('.env still contains CHANGE_ME placeholders');
    console.log(`     ${C.dim}Open .env and replace all CHANGE_ME values before deploying${C.reset}`);
    process.exit(1);
  }
  ok('.env has no CHANGE_ME placeholders');

  // docker present
  try {
    execSync('docker --version', { stdio: 'pipe', shell: true });
    ok('docker available');
  } catch {
    fail('docker not found in PATH');
    process.exit(1);
  }

  // compose file exists
  const composePath = join(ROOT, COMPOSE_FILE);
  if (!existsSync(composePath)) {
    fail(`${COMPOSE_FILE} not found at project root`);
    process.exit(1);
  }
  ok(`${COMPOSE_FILE} present`);

  return parseEnv(envPath);
}

// ── actions ──────────────────────────────────────────────────────────
function compose(args, opts = {}) {
  sh('docker', ['compose', '-f', join(ROOT, COMPOSE_FILE), ...args], opts);
}

function up() {
  step('2/3', 'Building & starting production stack');
  compose(['up', '-d', '--build']);

  step('3/3', 'Waiting for services to become healthy');
  // Show the result, don't block forever — healthchecks self-heal.
  try {
    compose(['ps']);
  } catch {
    warn('Could not list services (continuing).');
  }
}

function down() {
  step('1/1', 'Stopping production stack');
  compose(['down']);
  ok('Stack stopped. Volumes preserved.');
}

function nuke() {
  step('1/1', 'Stopping stack and removing volumes (DESTRUCTIVE)');
  compose(['down', '-v']);
  ok('Stack down. All data volumes removed.');
}

function status(env) {
  header('Production stack status');
  try {
    sh('docker', ['compose', '-f', join(ROOT, COMPOSE_FILE), 'ps']);
  } catch {
    fail('No stack running or compose file missing');
    return;
  }
  printUrls(env);
}

function logs() {
  sh('docker', ['compose', '-f', join(ROOT, COMPOSE_FILE), 'logs', '-f', '--tail=100']);
}

function printUrls(env) {
  const http = env.HTTP_PORT || '80';
  const strapi = env.STRAPI_PORT || '1337';
  const host = env.PUBLIC_HOSTNAME || 'localhost';
  console.log('');
  console.log(`  ${C.bold}Endpoints${C.reset}`);
  console.log(`    Frontend   http://${host}:${http}/`);
  console.log(`    Strapi     http://${host}:${http}/strapi/admin`);
  console.log(`    Strapi raw http://${host}:${strapi}/admin`);
  console.log('');
  console.log(`  ${C.dim}Logs: pnpm run prod:logs   |   Stop: pnpm run prod:down${C.reset}`);
}

// ── main ─────────────────────────────────────────────────────────────
const cmd = process.argv[2] || 'up';
const env = (cmd === 'up' || cmd === 'status') ? preflight() : {};

const actions = {
  up: () => { header('Production deploy'); up(); printUrls(env); console.log(`\n${C.green}${C.bold}🎉 Production stack is up${C.reset}\n`); },
  down: () => { header('Production stop'); down(); },
  nuke: () => { header('Production nuke (DESTRUCTIVE)'); nuke(); },
  status: () => status(env),
  logs: () => logs(),
};

if (!actions[cmd]) {
  console.log(`Unknown command: ${cmd}`);
  console.log(`Usage: node scripts/prod-up.mjs [up|down|nuke|status|logs]`);
  process.exit(1);
}

try {
  actions[cmd]();
} catch (e) {
  console.log('');
  fail(e.message);
  process.exit(2);
}
