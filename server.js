/**
 * Agency OS — Local Server
 * node server.js  →  http://localhost:3000
 */
const http     = require('http');
const https    = require('https');
const fs       = require('fs');
const path     = require('path');
const { spawn } = require('child_process');
const os       = require('os');

// ── Load .env ──────────────────────────────────────────────────────────
function loadEnv(file) {
  try {
    fs.readFileSync(file, 'utf-8').split('\n').forEach(line => {
      const eq = line.indexOf('=');
      if (eq > 0 && !line.trimStart().startsWith('#')) {
        const k = line.slice(0, eq).trim();
        const v = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
        if (k) process.env[k] = v;
      }
    });
  } catch {}
}
loadEnv(path.join(__dirname, '.env'));

const PORT          = process.env.PORT || 3000;
const API_KEY       = process.env.ANTHROPIC_API_KEY;
const AGENCY_OS     = process.env.AGENCY_OS_PATH ||
                      path.join(os.homedir(), 'Desktop', 'Personal', 'Projects', 'agency-os');

// ── Helpers ────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = '';
    req.on('data', c => (b += c));
    req.on('end', () => resolve(b));
    req.on('error', reject);
  });
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify(data));
}

function corsHeaders() {
  return {
    'access-control-allow-origin':  '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
}

// ── Anthropic proxy ────────────────────────────────────────────────────
function callAnthropic(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'x-api-key':         API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
        'content-length':    Buffer.byteLength(body),
      },
    }, res => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── MIME ───────────────────────────────────────────────────────────────
const MIME = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.ico':'image/x-icon' };

// ── Server ─────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const route = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  // ── POST /api/chat ── Claude proxy
  if (req.method === 'POST' && route === '/api/chat') {
    if (!API_KEY || API_KEY === 'your_key_here') {
      return json(res, { error: { message: 'Set ANTHROPIC_API_KEY in agency-command-center/.env then restart server.' } }, 500);
    }
    try {
      const { messages, system } = JSON.parse(await readBody(req));
      const r = await callAnthropic({ model: 'claude-sonnet-4-6', max_tokens: 4096, system, messages });
      res.writeHead(r.status, { 'content-type': 'application/json', ...corsHeaders() });
      res.end(r.body);
    } catch (e) { json(res, { error: { message: e.message } }, 500); }
    return;
  }

  // ── GET /api/scrape?q=... ── SSE stream of scraper output
  if (req.method === 'GET' && route === '/api/scrape') {
    const query = url.searchParams.get('q');
    if (!query) return json(res, { error: 'Missing ?q=' }, 400);

    res.writeHead(200, {
      'content-type':  'text/event-stream',
      'cache-control': 'no-cache',
      'connection':    'keep-alive',
      ...corsHeaders(),
    });

    const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
    send({ type: 'start', query });

    // Pass API key to child process env
    const env = { ...process.env, ANTHROPIC_API_KEY: API_KEY };

    const child = spawn('node', ['run.js', query], { cwd: AGENCY_OS, env });

    child.stdout.on('data', d => {
      d.toString().split('\n').filter(Boolean).forEach(line => send({ type: 'log', line }));
    });
    child.stderr.on('data', d => {
      d.toString().split('\n').filter(Boolean).forEach(line => send({ type: 'err', line }));
    });
    child.on('close', code => {
      send({ type: 'done', code });
      res.end();
    });
    child.on('error', e => {
      send({ type: 'err', line: `Failed to start scraper: ${e.message}. Check AGENCY_OS_PATH in .env` });
      send({ type: 'done', code: 1 });
      res.end();
    });
    return;
  }

  // ── GET /api/reports ── list report files
  if (req.method === 'GET' && route === '/api/reports') {
    try {
      const dir = path.join(AGENCY_OS, 'reports');
      if (!fs.existsSync(dir)) return json(res, []);
      const files = fs.readdirSync(dir)
        .filter(f => f.endsWith('.md'))
        .map(f => {
          const stat = fs.statSync(path.join(dir, f));
          return { name: f, modified: stat.mtimeMs };
        })
        .sort((a, b) => b.modified - a.modified);
      json(res, files);
    } catch (e) { json(res, []); }
    return;
  }

  // ── GET /api/report?file=... ── read report content
  if (req.method === 'GET' && route === '/api/report') {
    try {
      const file = url.searchParams.get('file');
      if (!file || file.includes('..')) return json(res, { error: 'Bad file' }, 400);
      const content = fs.readFileSync(path.join(AGENCY_OS, 'reports', file), 'utf-8');
      json(res, { content });
    } catch (e) { json(res, { error: e.message }, 404); }
    return;
  }

  // ── Static files ──
  let filePath = route === '/' ? '/index.html' : route;
  filePath = path.join(__dirname, filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(filePath)] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  const keyOk = API_KEY && API_KEY !== 'your_key_here' && API_KEY.length > 10;
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║   Agency OS  →  http://localhost:${PORT}  ║`);
  console.log(`  ╚══════════════════════════════════════╝\n`);
  if (!keyOk) {
    console.log(`  ⚠  ANTHROPIC_API_KEY not set.`);
    console.log(`  Open agency-command-center/.env and add your key.\n`);
  } else {
    console.log(`  ✓  API key loaded`);
    console.log(`  ✓  Scraper path: ${AGENCY_OS}\n`);
  }
});
