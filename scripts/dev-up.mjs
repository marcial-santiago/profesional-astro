#!/usr/bin/env node
/**
 * Dev stack orchestrator — cross-platform equivalent of "run everything in dev mode".
 *
 * Brings up the full development stack in the background so the terminal stays free:
 *   1. Preflight — node, pnpm, docker
 *   2. Postgres   — start container if not running, wait for pg_isready
 *   3. Seeds      — optional, run idempotent seeds (--seed flag)
 *   4. Strapi     — spawn `pnpm dev` in strapi/ detached, logs to .dev-logs/strapi.log
 *   5. Astro      — spawn `pnpm dev` at root       detached, logs to .dev-logs/astro.log
 *   6. Wait until both :1337 and :4321 are listening, then print URLs
 *
 * Usage:
 *   node scripts/dev-up.mjs             # bring dev stack up
 *   node scripts/dev-up.mjs up --seed   # also run the seeds before starting
 *   node scripts/dev-up.mjs down        # kill strapi + astro (keeps postgres)
 *   node scripts/dev-up.mjs nuke        # down + stop postgres container
 *   node scripts/dev-up.mjs status      # show what's running
 *   node scripts/dev-up.mjs logs        # tail both logs (Ctrl+C to exit)
 *   node scripts/dev-up.mjs logs strapi # tail only one
 *
 * Process bookkeeping:
 *   .dev-pids       — JSON with PIDs of spawned dev servers
 *   .dev-logs/      — stdout/stderr of each server
 *
 * Exit codes: 0 success, 1 preflight failure, 2 child process error.
 */

import { execFileSync, execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, appendFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConnection } from 'node:net';
import { platform } from 'node:os';
import { runDoctor } from './doctor.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const STRAPI = join(ROOT, 'strapi');
const PID_FILE = join(ROOT, '.dev-pids');
const LOG_DIR = join(ROOT, '.dev-logs');
const PG_CONTAINER = 'profesional-astro-postgres';

const IS_WIN = platform() === 'win32';

// Silence Node 18+ DEP0190 — shell:true is safe (args are static).
process.removeAllListeners('warning');
process.on('warning', (w) => { if (w.code !== 'DEP0190') console.warn(w); });

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

// ── utilities ────────────────────────────────────────────────────────
function sh(cmd, args, opts = {}) {
  const display = [cmd, ...args].map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ');
  console.log(`  ${C.dim}$ ${display}${C.reset}`);
  try {
    return execFileSync(cmd, args, { stdio: 'inherit', cwd: opts.cwd ?? ROOT, shell: IS_WIN });
  } catch (e) {
    throw new Error(`Command failed: ${display}`);
  }
}

function checkCmd(label, cmd, args = ['--version']) {
  try {
    execSync([cmd, ...args].join(' '), { stdio: 'pipe', shell: true });
    ok(label);
    return true;
  } catch {
    fail(`${label} not found`);
    return false;
  }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function portReady(host, port, timeoutMs = 60000) {
  // Try IPv4 then IPv6 — Astro binds to [::1]:4321 on Windows by default.
  const hosts = host === '127.0.0.1' ? ['127.0.0.1', '::1'] : [host];
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const h of hosts) {
      const ok = await new Promise((resolveP) => {
        const sock = createConnection({ host: h, port, family: h.includes(':') ? 6 : 4 }, () => { sock.end(); resolveP(true); });
        sock.on('error', () => resolveP(false));
        sock.setTimeout(1000, () => { sock.destroy(); resolveP(false); });
      });
      if (ok) return true;
    }
    await sleep(500);
  }
  return false;
}

function readPids() {
  if (!existsSync(PID_FILE)) return { strapi: null, astro: null };
  try { return JSON.parse(readFileSync(PID_FILE, 'utf8')); } catch { return { strapi: null, astro: null }; }
}

function writePids(pids) { writeFileSync(PID_FILE, JSON.stringify(pids, null, 2)); }
function clearPids() { if (existsSync(PID_FILE)) unlinkSync(PID_FILE); }

function pidAlive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function killPid(pid, label) {
  if (!pidAlive(pid)) return;
  try {
    if (IS_WIN) {
      // Kill the whole process tree on Windows (pnpm dev spawns children)
      try { execSync(`taskkill /T /F /PID ${pid}`, { stdio: 'pipe', shell: true }); }
      catch { process.kill(pid, 'SIGKILL'); }
    } else {
      process.kill(pid, 'SIGTERM');
    }
    ok(`Killed ${label} (PID ${pid})`);
  } catch (e) {
    warn(`Could not kill ${label} (PID ${pid}): ${e.message}`);
  }
}

// ── 1. Preflight (delegated to doctor.mjs) ─────────────────────────
async function preflight() {
  step('1/5', 'Preflight');
  const { fail } = await runDoctor();
  if (fail > 0) {
    throw new Error(`Doctor found ${fail} blocking issue(s). Re-run: pnpm run doctor`);
  }
}

// ── 2. Postgres ─────────────────────────────────────────────────────
async function ensurePostgres() {
  step('2/5', 'Postgres');
  try {
    const names = execFileSync('docker', ['ps', '--filter', `name=${PG_CONTAINER}`, '--format', '{{.Names}}'], { encoding: 'utf8' }).trim();
    if (names.includes(PG_CONTAINER)) { ok(`Container \`${PG_CONTAINER}\` already up`); return; }
  } catch { throw new Error('docker daemon not reachable'); }

  console.log(`  ${C.dim}$ docker compose up -d postgres${C.reset}`);
  execSync('docker compose up -d postgres', { stdio: 'inherit', cwd: ROOT, shell: true });

  for (let i = 1; i <= 30; i++) {
    try { execFileSync('docker', ['exec', PG_CONTAINER, 'pg_isready', '-U', 'postgres'], { stdio: 'pipe' }); ok(`Postgres ready (~${i}s)`); return; } catch {}
    if (i === 30) throw new Error('Postgres did not become ready in 30s');
    await sleep(1000);
  }
}

// ── 3. Seeds (optional) ─────────────────────────────────────────────
async function runSeeds() {
  sh('node', ['seed-strapi.js'], { cwd: STRAPI });
  ok('Base seed complete');
  sh('node', ['seed-cleaning-services.js'], { cwd: STRAPI });
  ok('Cleaning services seed complete');
}

async function maybeSeed() {
  // Kept for backwards-compat callers; the orchestrator itself calls
  // runSeeds() directly after Strapi is up.
  await runSeeds();
}

// ── 4. Spawn detached ───────────────────────────────────────────────
async function spawnDev(label, cwd, port) {
  const logFile = join(LOG_DIR, `${label}.log`);
  appendFileSync(logFile, `\n\n─── restart ${new Date().toISOString()} ───\n`);

  let cmd, args;

  if (IS_WIN) {
    // Write a .cmd launcher that handles output redirection natively.
    // We must explicitly call pnpm.cmd (NOT pnpm.ps1) — the PowerShell
    // wrapper doesn't inherit the parent's `>>` redirection, so the log
    // file ends up empty. pnpm.cmd is a plain batch file that does.
    const pnpmCmd = join(process.env.APPDATA || '', 'npm', 'pnpm.cmd');
    const launcher = join(LOG_DIR, `${label}.cmd`);
    writeFileSync(
      launcher,
      `@echo off\r\ncd /d "${cwd}"\r\ncall "${pnpmCmd}" dev >> "${logFile}" 2>&1\r\n`
    );
    cmd = 'cmd.exe';
    args = ['/c', launcher];
  } else {
    // Unix: use nohup + & to fully detach
    cmd = 'nohup';
    args = ['bash', '-c', `cd "${cwd}" && exec pnpm dev >> "${logFile}" 2>&1`];
  }

  const child = spawn(cmd, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env },
  });
  child.unref();

  ok(`${label} spawned (PID ${child.pid}) — logs: ${logFile}`);

  // Wait for the port to be ready
  const ready = await portReady('127.0.0.1', port);
  if (!ready) throw new Error(`${label} did not start listening on :${port} within 60s. Check ${logFile}`);
  ok(`${label} listening on :${port}`);
  return child.pid;
}

// ── 5. Wait + print ─────────────────────────────────────────────────
async function up() {
  mkdirSync(LOG_DIR, { recursive: true });

  await preflight();
  await ensurePostgres();

  // Strapi must be up and listening BEFORE the seeds can run, because
  // the seed scripts hit tables that Strapi creates on first boot.
  // So we start Strapi first, seed, then start Astro.
  const wantSeed = process.argv.includes('--seed') || process.argv.includes('-s');

  step('3/5', 'Starting Strapi (creates the DB schema)');

  // Reap any stragglers from a previous run
  const old = readPids();
  killPid(old.strapi, 'old strapi');
  killPid(old.astro, 'old astro');
  clearPids();

  const strapiPid = await spawnDev('strapi', STRAPI, 1337);

  if (wantSeed) {
    step('4/5', 'Running seeds (idempotent)');
    await runSeeds();
  }

  step(wantSeed ? '5/5' : '4/5', 'Starting Astro');

  const astroPid  = await spawnDev('astro', ROOT, 4321);

  writePids({ strapi: strapiPid, astro: astroPid });

  console.log('');
  console.log(`  ${C.bold}Endpoints${C.reset}`);
  console.log(`    Frontend   ${C.cyan}http://localhost:4321/${C.reset}`);
  console.log(`    Strapi     ${C.cyan}http://localhost:1337/admin${C.reset}`);
  console.log('');
  console.log(`  ${C.bold}Useful commands${C.reset}`);
  console.log(`    pnpm run dev:status  — show what's running`);
  console.log(`    pnpm run dev:logs    — tail both logs`);
  console.log(`    pnpm run dev:down    — stop dev servers`);
  console.log('');
  console.log(`${C.green}${C.bold}🎉 Dev stack is up — terminal is yours${C.reset}`);
  console.log('');
}

// ── down / nuke ─────────────────────────────────────────────────────
function down(alsoStopPostgres) {
  const pids = readPids();
  header('Stopping dev stack');
  killPid(pids.strapi, 'strapi');
  killPid(pids.astro, 'astro');
  clearPids();
  if (alsoStopPostgres) {
    // Stop + remove the container so the next `docker compose up -d`
    // can recreate it from scratch. Without `docker rm`, the container
    // name stays reserved and the next up fails with "name already in use".
    try { execSync('docker stop profesional-astro-postgres', { stdio: 'inherit', shell: true }); ok('Postgres stopped'); }
    catch { warn('Postgres not running'); }
    try { execSync('docker rm profesional-astro-postgres', { stdio: 'inherit', shell: true }); ok('Postgres container removed'); }
    catch { warn('Postgres container already gone'); }
  }
  ok('Dev stack down.');
}

// ── status ──────────────────────────────────────────────────────────
function status() {
  header('Dev stack status');
  const pids = readPids();
  const items = [
    { name: 'strapi',  port: 1337, pid: pids.strapi },
    { name: 'astro',   port: 4321, pid: pids.astro },
    { name: 'postgres', port: 5432 /* inside container */, pid: null, container: PG_CONTAINER },
  ];
  for (const it of items) {
    if (it.container) {
      try {
        const out = execFileSync('docker', ['ps', '--filter', `name=${it.container}`, '--format', '{{.Status}}'], { encoding: 'utf8' }).trim();
        if (out) ok(`${it.name.padEnd(8)} ${out}`); else warn(`${it.name} not running`);
      } catch { warn(`${it.name}: docker unavailable`); }
      continue;
    }
    if (!it.pid) { warn(`${it.name.padEnd(8)} not tracked (run dev:up first)`); continue; }
    if (pidAlive(it.pid)) ok(`${it.name.padEnd(8)} running (PID ${it.pid}, port ${it.port})`);
    else warn(`${it.name.padEnd(8)} dead (PID ${it.pid}) — try dev:up again`);
  }
  console.log('');
  console.log(`  ${C.dim}PIDs: ${PID_FILE}${C.reset}`);
  console.log(`  ${C.dim}Logs: ${LOG_DIR}/{strapi,astro}.log${C.reset}`);
}

// ── logs ────────────────────────────────────────────────────────────
function logs() {
  const which = process.argv[3]; // optional: strapi | astro
  const candidates = which === 'strapi' || which === 'astro'
    ? [which]
    : ['strapi', 'astro'];

  for (const c of candidates) {
    const f = join(LOG_DIR, `${c}.log`);
    if (existsSync(f) && readFileSync(f, 'utf8').length > 200) {
      // log has real content — tail it
      console.log(`  ${C.dim}Tailing ${f} (Ctrl+C to exit)${C.reset}`);
    } else {
      // log is empty (a known Windows quirk: pnpm.cmd output isn't always
      // captured by the .cmd launcher). Tell the user how to get live output.
      console.log(`  ${C.yellow}⚠ ${f} is empty — Windows doesn't always capture pnpm output via .cmd launcher${C.reset}`);
      console.log(`     ${C.dim}For live output run in a separate terminal:${C.reset}`);
      console.log(`     ${C.cyan}  pnpm --prefix strapi dev   # for ${which === 'astro' ? 'strapi' : 'strapi'}${C.reset}`);
      console.log(`     ${C.cyan}  pnpm dev                  # for ${which === 'strapi' ? 'astro' : 'astro'}${C.reset}`);
    }
  }

  // Tail whatever does have content
  const tails = candidates
    .map((c) => join(LOG_DIR, `${c}.log`))
    .filter((f) => existsSync(f) && readFileSync(f, 'utf8').length > 200);

  if (tails.length === 0) {
    console.log(`\n  ${C.dim}No tailable logs. Processes are running — use dev:status to confirm.${C.reset}`);
    return;
  }
  sh('tail', ['-f', ...tails]);
}

// ── main ────────────────────────────────────────────────────────────
const cmd = process.argv[2] || 'up';
const map = {
  up: () => up(),
  down: () => down(false),
  nuke: () => down(true),
  status: () => status(),
  logs: () => logs(),
};
if (!map[cmd]) {
  console.log(`Usage: node scripts/dev-up.mjs [up [--seed]|down|nuke|status|logs [strapi|astro]]`);
  process.exit(1);
}
map[cmd]().catch((e) => { fail(e.message); process.exit(2); });
