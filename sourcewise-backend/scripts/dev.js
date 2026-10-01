/**
 * SourceWise backend launcher — one command boots the whole backend:
 *
 *   cd sourcewise-backend
 *   npm run dev        # Node API (:4000, connects Supabase) + Python AI (:8000)
 *   npm run dev:api    # Node API only
 *   npm run dev:ai     # Python AI only
 *   npm start          # production mode (no reload)
 *
 * Zero dependencies, Windows/macOS/Linux safe. Python binary can be
 * overridden with PYTHON_BIN (e.g. PYTHON_BIN=C:\venv\Scripts\python.exe).
 */
const { spawn, spawnSync } = require('child_process');
const net = require('net');
const path = require('path');
const fs = require('fs');

const backendDir = path.join(__dirname, '..');
const nodeDir = path.join(backendDir, 'node-api');
const aiDir = path.join(backendDir, 'python-ai');

const args = process.argv.slice(2);
const PROD = args.includes('--prod');
const onlyArg = args.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.split('=')[1] : null; // 'api' | 'ai' | null

const API_PORT = Number(process.env.PORT || 4000);
const AI_PORT = 8000;
function resolvePythonBin() {
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || '';
    const candidates = [
      path.join(aiDir, '.venv', 'Scripts', 'python.exe'),
      path.join(appData, 'uv', 'python', 'cpython-3.11-windows-x86_64-none', 'python.exe'),
      path.join(appData, 'uv', 'python', 'cpython-3.11.15-windows-x86_64-none', 'python.exe'),
      'python',
    ];
    for (const cand of candidates) {
      if (fs.existsSync(cand) && checkBin(cand)) {
        return cand;
      }
    }
    return 'python';
  }
  // macOS/Linux: prefer the project venv when present, else system python3.
  const venvBin = path.join(aiDir, '.venv', 'bin', 'python');
  if (fs.existsSync(venvBin) && checkBin(venvBin)) return venvBin;
  return 'python3';
}
const PYTHON_BIN = resolvePythonBin();
// npm.cmd on Windows so we can spawn without shell:true (avoids DEP0190 + quoting issues).
const NPM_BIN = process.env.NPM_BIN || (process.platform === 'win32' ? 'npm.cmd' : 'npm');

const C = {
  api: '\x1b[36m', // cyan
  ai: '\x1b[35m', // magenta
  ok: '\x1b[32m',
  warn: '\x1b[33m',
  err: '\x1b[31m',
  reset: '\x1b[0m',
};

const stamp = () => new Date().toISOString().slice(11, 19);
function log(tag, msg, color = C.reset) {
  // eslint-disable-next-line no-console
  console.log(`${C.reset}[${stamp()}] [${tag}]${C.reset} ${color}${msg}${C.reset}`);
}

function portInUse(port) {
  return new Promise((resolve) => {
    const s = net.connect(port, '127.0.0.1');
    s.on('connect', () => { s.end(); resolve(true); });
    s.on('error', () => resolve(false));
  });
}

function checkBin(bin, binArgs = ['--version']) {
  const r = spawnSync(bin, binArgs, { encoding: 'utf8', shell: false });
  return r.status === 0 ? String(r.stdout || r.stderr || '').trim().split('\n')[0] : null;
}

function prefixStream(child, tag, color) {
  let buf = '';
  const flush = (chunk, isErr) => {
    buf += chunk.toString();
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      // eslint-disable-next-line no-console
      (isErr ? console.error : console.log)(`${C.reset}[${tag}]${C.reset} ${color}${line}${C.reset}`);
    }
  };
  child.stdout.on('data', (c) => flush(c, false));
  child.stderr.on('data', (c) => flush(c, true));
}

async function waitForHealth(name, url, timeoutMs) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    if (Date.now() - start > timeoutMs) return false;
    await new Promise((r) => setTimeout(r, 2000));
  }
}

async function main() {
  const wantApi = !ONLY || ONLY === 'api';
  const wantAi = !ONLY || ONLY === 'ai';

  log('dev', `SourceWise backend (${PROD ? 'production' : 'development'}) — api:${wantApi ? 'yes' : 'no'} ai:${wantAi ? 'yes' : 'no'}`);

  // ── Preflight: directories ──────────────────────────────────────────
  for (const [name, dir] of [['node-api', nodeDir], ['python-ai', aiDir]]) {
    if (!fs.existsSync(dir)) {
      log('dev', `Missing directory: ${dir} — run from sourcewise-backend/`, C.err);
      process.exit(1);
    }
    void name;
  }

  // ── Preflight: runtimes ─────────────────────────────────────────────
  const nodeVer = checkBin('node');
  if (!nodeVer) { log('dev', 'node not found on PATH. Install Node 20+.', C.err); process.exit(1); }
  let pyVer = null;
  if (wantAi) {
    pyVer = checkBin(PYTHON_BIN);
    if (!pyVer) {
      log('dev', `Python not found as "${PYTHON_BIN}". Set PYTHON_BIN to your interpreter and retry.`, C.err);
      process.exit(1);
    }
    log('dev', `runtimes: ${nodeVer}, ${pyVer}`);
  } else {
    log('dev', `runtime: ${nodeVer}`);
  }

  // ── Preflight: install state ────────────────────────────────────────
  if (wantApi && !fs.existsSync(path.join(nodeDir, 'node_modules'))) {
    log('dev', 'node-api/node_modules missing — run "npm run setup" from sourcewise-backend/ first.', C.err);
    process.exit(1);
  }

  // ── Preflight: .env files (warn only — server prints its own validation) ──
  if (wantApi && !fs.existsSync(path.join(nodeDir, '.env'))) {
    log('dev', 'node-api/.env missing — copy .env.example to .env (JWT_SECRET, SUPABASE_*, PYTHON_AI_URL).', C.warn);
  }
  if (wantAi && !fs.existsSync(path.join(aiDir, '.env'))) {
    log('dev', 'python-ai/.env missing — copy .env.example to .env (GEMINI_API_KEY and/or GROK_API_KEY).', C.warn);
  }

  // ── Preflight: ports free ───────────────────────────────────────────
  if (wantApi && (await portInUse(API_PORT))) {
    log('dev', `Port ${API_PORT} is already in use — stop the other process or set PORT, then retry.`, C.err);
    process.exit(1);
  }
  if (wantAi && (await portInUse(AI_PORT))) {
    log('dev', `Port ${AI_PORT} is already in use — stop the other process, then retry.`, C.err);
    process.exit(1);
  }

  const children = [];
  const spawnOpts = (cwd, env) => ({
    cwd,
    env: { ...process.env, ...env },
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // ── Node API (auth gateway, Supabase, budgets, /health, /metrics) ───
  if (wantApi) {
    const npmArgs = PROD ? ['start', '--prefix', 'node-api'] : ['run', 'dev', '--prefix', 'node-api'];
    const apiEnv = { NODE_ENV: PROD ? 'production' : (process.env.NODE_ENV || 'development') };
    // .cmd shims need cmd.exe on Windows (direct spawn gives EINVAL).
    const api = process.platform === 'win32'
      ? spawn('cmd.exe', ['/d', '/s', '/c', `${NPM_BIN} ${npmArgs.join(' ')}`], { ...spawnOpts(backendDir, apiEnv) })
      : spawn(NPM_BIN, npmArgs, { ...spawnOpts(backendDir, apiEnv) });
    api.on('error', (e) => log('api', `failed to spawn ${NPM_BIN}: ${e.message}`, C.err));
    prefixStream(api, 'api', C.api);
    children.push(api);
  }

  // ── Python AI (agents, RAG, Gemini/Grok — the engine behind Generate) ──
  if (wantAi) {
    const venvSite = path.join(aiDir, '.venv', 'Lib', 'site-packages');
    const existingPyPath = process.env.PYTHONPATH || '';
    const pythonPath = [venvSite, aiDir, existingPyPath].filter(Boolean).join(path.delimiter);
    const ai = spawn(PYTHON_BIN, ['run.py'], {
      ...spawnOpts(aiDir, {
        ENVIRONMENT: PROD ? 'production' : 'development',
        PYTHONUNBUFFERED: '1',
        PYTHONPATH: pythonPath,
      }),
    });
    ai.on('error', (e) => log('ai', `failed to spawn ${PYTHON_BIN}: ${e.message}`, C.err));
    prefixStream(ai, 'ai', C.ai);
    children.push(ai);
  }

  const shutdown = (sig) => {
    log('dev', `received ${sig} — stopping backend…`);
    for (const c of children) {
      try { c.kill('SIGINT'); } catch { /* ignore */ }
    }
    setTimeout(() => {
      for (const c of children) {
        try { if (!c.killed) c.kill('SIGKILL'); } catch { /* ignore */ }
      }
      process.exit(0);
    }, 3000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  for (const c of children) {
    c.on('exit', (code) => {
      if (code !== 0 && code !== null) log('dev', `a service exited with code ${code} — check its logs above`, C.err);
    });
  }

  // ── Health gates (non-blocking confirmations) ───────────────────────
  if (wantApi) {
    log('dev', `waiting for Node API :${API_PORT} …`);
    if (await waitForHealth('api', `http://localhost:${API_PORT}/health`, 60000)) {
      log('dev', `Node API ready → http://localhost:${API_PORT}  (/health, /metrics)`, C.ok);
    } else {
      log('dev', `Node API did not answer /health within 60s — read [api] logs above.`, C.err);
    }
  }
  if (wantAi) {
    log('dev', `waiting for Python AI :${AI_PORT} (first boot downloads the embedding model — can take minutes) …`);
    if (await waitForHealth('ai', `http://localhost:${AI_PORT}/health`, 10 * 60 * 1000)) {
      log('dev', `Python AI ready → http://localhost:${AI_PORT}  (/health, /metrics, /metrics/ready)`, C.ok);
    } else {
      log('dev', `Python AI did not answer /health within 10 min — read [ai] logs above.`, C.err);
    }
  }
  if (wantApi && wantAi) {
    log('dev', 'Both services requested. Generate-roadmap calls flow: browser → :4000 → :8000 → Gemini/Grok.', C.ok);
    log('dev', 'Press Ctrl+C to stop everything.', C.warn);
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(`[dev] fatal: ${e.message}`);
  process.exit(1);
});
