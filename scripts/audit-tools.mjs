/**
 * Deep tool auditor — actually *uses* every tool instead of only mounting it.
 *
 * The smoke suite proves each tool renders. This proves each tool survives being
 * operated: every field is filled with a realistic value, every button is
 * clicked, and anything that escapes as an exception, an unhandled rejection or
 * a console.error is attributed to the tool that caused it.
 *
 * It runs twice:
 *   healthy  — network answers with plausible canned data, canvas works
 *   hostile  — fetch rejects, canvas returns null, camera is denied
 *
 * The hostile pass is the one that matters. A tool is allowed to fail to do its
 * job when the network is down; it is not allowed to throw at the user. That is
 * the exact bug class behind "Failed to load https://cdn.jsdelivr.net/…".
 *
 * Usage:  node scripts/audit-tools.mjs            (runs both passes)
 *         node scripts/audit-tools.mjs --mode=hostile --verbose
 */
import { spawn } from 'node:child_process';

const argv = process.argv.slice(2);
const getFlag = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const hasFlag = (name) => argv.includes(`--${name}`);
const MODE = getFlag('mode');
const PER_TOOL_TIMEOUT = Number(getFlag('timeout') || 4000);

/* ── parent: run each mode in a clean process so module state never leaks ── */
if (!MODE) {
  const modes = ['healthy', 'hostile'];
  let failed = false;
  for (const mode of modes) {
    const args = ['scripts/audit-tools.mjs', `--mode=${mode}`, ...argv.filter((a) => a.startsWith('--verbose') || a.startsWith('--timeout'))];
    const res = spawn(process.execPath, args, { stdio: 'inherit' });
    const code = await new Promise((r) => res.on('close', r));
    if (code !== 0) failed = true;
  }
  process.exit(failed ? 1 : 0);
}

/* ── child: one mode ───────────────────────────────────────────────────── */
const { setupEnv, settle } = await import('./jsdom-env.mjs');
const { window } = setupEnv({ mode: MODE });
const { document } = window;

const findings = new Map();
let currentTool = null;

function record(kind, detail) {
  const key = currentTool || '(outside a tool)';
  if (!findings.has(key)) findings.set(key, []);
  const list = findings.get(key);
  const text = `${kind}: ${String(detail).split('\n')[0].slice(0, 190)}`;
  if (!list.includes(text)) list.push(text);
}

process.on('unhandledRejection', (reason) => {
  const stack = (reason?.stack || '').split('\n').slice(1, 4).map((l) => l.trim()).join(' | ');
  record('unhandled rejection', `${reason?.message || reason}${stack ? `  @ ${stack}` : ''}`);
});
window.addEventListener('error', (e) => record('window error', e.message || e.error?.message));
const realError = console.error;
console.error = (...args) => record('console.error', args.map((a) => (a?.message ?? a)).join(' '));

const { TOOLS: ALL_TOOLS, getTool } = await import('../src/tools/index.js');
const ONLY = getFlag('only');
const TOOLS = ONLY ? ALL_TOOLS.filter((t) => t.id.includes(ONLY) || t.cat === ONLY) : ALL_TOOLS;

/* ── realistic field filling ──────────────────────────────────────────── */
const SAMPLE_TEXT = 'The quick brown fox jumps over the lazy dog. Hello world, this is sample text.';
const SAMPLE_JSON = '{\n  "name": "PSDKIT",\n  "version": 2,\n  "tags": ["tools", "free"],\n  "ok": true\n}';
const SAMPLE_CODE = 'function greet(name){return "Hello "+name;}\nconst x=1;';
const SAMPLE_CSV = 'name,city,age\nAsha,Dehradun,30\nRavi,Pune,25';
const SAMPLE_HTML = '<div class="card"><h2>Title</h2><p>Body text with a <a href="/x">link</a>.</p></div>';

function guessText(id, name, label, placeholder) {
  const hint = `${id} ${name} ${label} ${placeholder}`.toLowerCase();
  if (/(json)/.test(hint)) return SAMPLE_JSON;
  if (/(csv|tsv)/.test(hint)) return SAMPLE_CSV;
  if (/(html|jsx|xml|svg)/.test(hint)) return SAMPLE_HTML;
  if (/(css|scss)/.test(hint)) return '.card{color:red;margin:0 auto}';
  if (/(javascript|\bjs\b|code|script|regex)/.test(hint)) return SAMPLE_CODE;
  if (/(url|link|website|domain|host|feed)/.test(hint)) return 'https://example.com/page?q=1';
  if (/(email|mail)/.test(hint)) return 'asha@example.com';
  if (/(phone|mobile|tel)/.test(hint)) return '+91 98765 43210';
  if (/(ip\b|ipv4|ipv6|cidr|subnet)/.test(hint)) return '192.168.1.10';
  if (/(hex|color|colour)/.test(hint)) return '#4f46e5';
  if (/(text|content|message|body|paragraph|markdown|\bmd\b|note|story|input)/.test(hint)) return SAMPLE_TEXT;
  if (/(name|title|word|term|label)/.test(hint)) return 'Sample Name';
  if (/(password|passphrase|secret|key|token)/.test(hint)) return 'Sup3rSecret!';
  if (/(date|time|dob|birth)/.test(hint)) return '2000-01-15';
  if (/(number|amount|value|count|qty|price|salary)/.test(hint)) return '2500';
  return 'Sample value';
}

function makeFile() {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Uint8Array(64).fill(7)]);
  return new window.File([bytes], 'sample.png', { type: 'image/png' });
}

function fill(input) {
  const meta = [input.id, input.name, input.getAttribute('aria-label') || '', input.placeholder || '',
    input.closest('.field')?.querySelector('.field-label')?.textContent || ''].join(' ');
  const type = (input.type || input.tagName).toLowerCase();
  try {
    if (input.tagName === 'TEXTAREA') { if (!input.value.trim()) input.value = guessText(meta, '', '', ''); return; }
    if (input.tagName === 'SELECT') { if (input.selectedIndex < 0 && input.options.length) input.selectedIndex = 0; return; }
    if (type === 'file') {
      /* Give file pickers a real File so their read paths actually run. */
      Object.defineProperty(input, 'files', { value: [makeFile()], configurable: true });
      return;
    }
    if (['checkbox', 'radio', 'range', 'color', 'date', 'datetime-local', 'time', 'month', 'week'].includes(type)) {
      if (type === 'date' && !input.value) input.value = '2000-01-15';
      if (type === 'color' && !input.value) input.value = '#4f46e5';
      return;
    }
    if (input.value.trim()) return; // respect the tool's own sample defaults
    input.value = type === 'number' ? '2500' : guessText(meta, '', '', '');
  } catch { /* a field we cannot fill is not a tool defect */ }
}

/* ── exercise one tool ────────────────────────────────────────────────── */
async function exercise(meta) {
  const tool = getTool(meta.id);
  if (!tool) throw new Error('no implementation registered');
  const host = document.createElement('div');
  document.body.append(host);
  try {
    await tool.mount(host);
    await settle(10);

    const fields = [...host.querySelectorAll('input, textarea, select')];
    for (const f of fields) fill(f);
    /* Announce the changes the way a typing user would. */
    for (const f of fields) {
      f.dispatchEvent(new window.Event('input', { bubbles: true }));
      f.dispatchEvent(new window.Event('change', { bubbles: true }));
    }
    await settle(80);

    /* Click every control once — the compute/convert/generate paths live here. */
    const buttons = [...host.querySelectorAll('button')];
    for (const btn of buttons) {
      if (btn.disabled) continue;
      btn.click();
      await settle(50);
    }
    await settle(120);

    if (!host.textContent.trim() && !host.querySelector('canvas,img,svg')) {
      record('empty result', 'tool rendered no text or media after being operated');
    }
  } finally {
    host.remove();
  }
}

const withTimeout = (p, ms, id) => Promise.race([
  p,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)),
]).catch((e) => record('timeout', `${id}: ${e.message}`));

console.log(`\nTool auditor — mode: ${MODE} — ${TOOLS.length} tools\n`);
const started = Date.now();
for (const meta of TOOLS) {
  currentTool = `${meta.cat}/${meta.id}`;
  await withTimeout(exercise(meta).catch((e) => record('threw', e?.message || e)), PER_TOOL_TIMEOUT, meta.id);
}
currentTool = null;
await settle(150);
console.error = realError;

/* ── report ───────────────────────────────────────────────────────────── */
/* Noise that is a jsdom limitation rather than a tool defect. */
const ENV_LIMITATION = [
  /not implemented/i,
  /jsdom/i,
  /canvas is blank/i,
  /object URLs unavailable/i,
  /Could not parse CSS/i,
  /Error: Not implemented: navigation/i,
];
const isEnvNoise = (text) => ENV_LIMITATION.some((re) => re.test(text));

const rows = [...findings.entries()].map(([tool, list]) => ({
  tool,
  real: list.filter((t) => !isEnvNoise(t)),
  noise: list.filter(isEnvNoise),
})).filter((r) => r.real.length);

rows.sort((a, b) => b.real.length - a.real.length || a.tool.localeCompare(b.tool));
const noisy = [...findings.entries()].filter(([, l]) => l.every(isEnvNoise)).map(([t]) => t);

if (rows.length) {
  console.log(`FAIL — ${rows.length} tool(s) leaked errors in "${MODE}" mode:\n`);
  for (const r of rows) {
    console.log(`  ✗ ${r.tool}`);
    for (const line of r.real) console.log(`      ${line}`);
  }
  console.log('');
} else {
  console.log(`PASS — no tool leaked an error in "${MODE}" mode.`);
}
if (hasFlag('verbose') && noisy.length) {
  console.log(`\n(${noisy.length} tool(s) hit jsdom limitations only — not counted as failures)`);
}
console.log(`\n${TOOLS.length - rows.length}/${TOOLS.length} clean · ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
process.exit(rows.length ? 1 : 0);
