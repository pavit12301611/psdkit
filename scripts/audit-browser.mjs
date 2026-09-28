/**
 * Real-browser audit — measures actual rendered layout instead of modelling it.
 *
 * scripts/audit-overflow.mjs estimates text advance widths against the CSS rules
 * it knows about. This measures what Chromium really painted: whether the page
 * scrolls sideways, and whether any element's text escapes its own box while
 * overflow is still `visible` (i.e. nothing clips or scrolls it, so the user sees
 * it spill over the border).
 *
 * It also records console errors, page exceptions and failed requests per tool,
 * which is how the "Failed to load <cdn url>" class of bug shows up in practice.
 *
 * Usage:  node scripts/audit-browser.mjs
 *         node scripts/audit-browser.mjs --only=qr --verbose
 *         node scripts/audit-browser.mjs --url=http://localhost:4173
 */
import puppeteer from 'puppeteer-core';
import { launchOptions } from './browser.mjs';
import { TOOLS } from '../src/data/catalog.js';

const argv = process.argv.slice(2);
const flag = (n, d) => argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? d;
const ONLY = flag('only', '');
const URL = flag('url', 'http://localhost:5173');
const VERBOSE = argv.includes('--verbose');
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 900 },
  { name: 'desktop', width: 1280, height: 900 },
];

const tools = ONLY ? TOOLS.filter((t) => t.id.includes(ONLY) || t.cat === ONLY) : TOOLS;

/* Blocked third-party hosts in this sandbox are not site defects. */
const IGNORABLE = /fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com/;

/* Network-level failure of a *cross-origin* request is the sandbox having no
   route to that host — not a bug in the tool. The tool's job is to degrade
   gracefully, which scripts/audit-tools.mjs already proves in hostile mode.
   A failed request to our own origin, or any JS exception, is still reported. */
const NET_LEVEL = /ERR_CONNECTION_CLOSED|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_CONNECTION_TIMED_OUT|ERR_CERT_AUTHORITY_INVALID|ERR_BLOCKED_BY_CLIENT|ERR_ADDRESS_UNREACHABLE|ERR_CONNECTION_REFUSED/;

/* Pages get the same treatment as tools. */
const PAGES = [
  { id: 'home', hash: '#/' },
  { id: 'tools (all)', hash: '#/tools' },
  ...['daily', 'internet', 'essentials', 'coding'].map((c) => ({ id: `tools/${c}`, hash: `#/tools/${c}` })),
  { id: 'learn', hash: '#/learn' },
  { id: 'community', hash: '#/community' },
  { id: 'community (publish)', hash: '#/community/add' },
  { id: 'help', hash: '#/help' },
  { id: 'signin', hash: '#/signin' },
  { id: 'profile', hash: '#/profile' },
  { id: 'admin', hash: '#/admin' },
  { id: '404', hash: '#/this-route-does-not-exist' },
];

/* Opt-in rather than part of `npm test`: it needs a real browser and a running
   dev server. If either is missing, say so loudly and skip instead of failing. */
let browser;
try {
  browser = await puppeteer.launch(await launchOptions());
} catch (err) {
  console.log(`\nSKIP — no browser available: ${err.message}`);
  console.log('Install the dev dependencies (`npm install`) and re-run. Chromium itself');
  console.log('comes from the @sparticuz/chromium tarball, so only the npm registry is needed.\n');
  process.exit(0);
}
const page = await browser.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(`uncaught: ${e.message}`));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const text = m.text();
  if (!IGNORABLE.test(text) && !/Failed to load resource/.test(text)) errors.push(`console: ${text.slice(0, 150)}`);
});
page.on('requestfailed', (r) => {
  const url = r.url();
  const reason = r.failure()?.errorText || '';
  if (IGNORABLE.test(url)) return;
  const crossOrigin = !url.startsWith(URL.replace(/\/$/, ''));
  if (crossOrigin && NET_LEVEL.test(reason)) return;
  errors.push(`request failed: ${url.slice(0, 110)} (${reason})`);
});

const measure = () => page.evaluate(() => {
  const de = document.documentElement;
  const vw = de.clientWidth;
  const out = [];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'HEAD', 'NOSCRIPT', 'BR', 'svg', 'path', 'g', 'defs']);
  const describe = (el) => {
    const cls = typeof el.className === 'string' && el.className.trim()
      ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '';
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls}`;
  };

  if (de.scrollWidth > vw + 1) {
    out.push({ kind: 'page-scrolls-sideways', sel: 'html', detail: `${de.scrollWidth}px of content in a ${vw}px viewport`, text: '' });
  }

  const scope = document.querySelector('.tool-body') || document.querySelector('#app') || document.body;
  const all = [...scope.querySelectorAll('*')];

  /* The nearest ancestor that clips or scrolls this element decides whether
     spilling past the viewport is a defect. `.ai-chips` is `overflow-x:auto` —
     a swipeable chip row whose children are *meant* to run off-screen. Content
     that reaches past an `overflow:hidden` ancestor, though, is being cut off. */
  const clipperOf = (el) => {
    let p = el.parentElement;
    while (p && p !== document.documentElement) {
      if (getComputedStyle(p).overflowX !== 'visible') return p;
      p = p.parentElement;
    }
    return null;
  };
  const scrollable = (el) => {
    const cs = getComputedStyle(el);
    return cs.overflowX === 'auto' || cs.overflowX === 'scroll';
  };

  /* How far right content can go before the user actually sees it spill: the
     viewport edge, or the nearest ancestor that clips, whichever comes first.
     A decorative badge 5px past its own container but still inside the page is
     not a defect; text past the clip edge is. */
  const boundOf = (el) => {
    let bound = vw;
    let p = el.parentElement;
    while (p && p !== document.documentElement) {
      const pcs = getComputedStyle(p);
      if (pcs.overflowX !== 'visible') {
        bound = Math.min(bound, p.getBoundingClientRect().right);
        break;
      }
      p = p.parentElement;
    }
    return bound;
  };
  const pastEdge = new Set();
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > boundOf(el) + 1) pastEdge.add(el);
  }
  const spillsPastBound = (el) => pastEdge.has(el) || [...el.querySelectorAll('*')].some((d) => pastEdge.has(d));

  for (const el of all) {
    if (SKIP.has(el.tagName)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
    const text = (el.textContent || '').trim();
    if (!text) continue;

    /* Markup that reached the screen as escaped text — icon() returns an HTML
       string, and el() turns a string child into a text node. Showing source is
       the whole point inside <pre>/code/result panes, so those are exempt. */
    const showsSource = el.closest('pre, code, textarea, .code, .result-out, .result-body, .code-area');
    if (!showsSource) {
      for (const child of el.childNodes) {
        if (child.nodeType === 3 && /<\/?[a-z][a-z0-9]*[\s>]/i.test(child.nodeValue || '')) {
          out.push({
            kind: 'markup-shown-as-text', sel: describe(el),
            detail: 'raw HTML is being rendered as visible text',
            text: child.nodeValue.trim().slice(0, 70),
          });
          break;
        }
      }
    }

    /* overflow-x that is not `visible` means the box clips or scrolls its
       content on purpose — .table-scroll and .code panels do exactly that. */
    if (cs.overflowX === 'visible' && el.scrollWidth > el.clientWidth + 1 && spillsPastBound(el)) {
      const clipper = clipperOf(el);
      if (!clipper || !scrollable(clipper)) {
        out.push({
          kind: 'text-escapes-box', sel: describe(el),
          detail: `${el.scrollWidth}px of content in a ${el.clientWidth}px box`,
          text: text.slice(0, 60),
        });
      }
    }

    /* Report only the deepest element crossing the edge — ancestors cross too,
       and blaming them hides the real culprit. */
    const rect = el.getBoundingClientRect();
    if (pastEdge.has(el) && ![...el.children].some((c) => pastEdge.has(c))) {
      const clipper = clipperOf(el);
      if (clipper && scrollable(clipper)) continue; // swipeable row, by design
      if (clipper) {
        const cRect = clipper.getBoundingClientRect();
        if (rect.right <= cRect.right + 1) continue;
        if (!scrollable(clipper) && rect.right <= vw + 1) continue; // clipped but inside the viewport
        out.push({
          kind: 'text-cut-off', sel: describe(el),
          detail: `right edge at ${Math.round(rect.right)}px but its ${describe(clipper)} clips at ${Math.round(cRect.right)}px (overflow-x: ${getComputedStyle(clipper).overflowX})`,
          text: text.slice(0, 60),
        });
        continue;
      }
      out.push({
        kind: 'past-viewport-edge', sel: describe(el),
        detail: `right edge at ${Math.round(rect.right)}px, viewport is ${vw}px`,
        text: text.slice(0, 60),
      });
    }
  }
  return out;
});

const results = [];
console.log(`\nBrowser audit — Chromium ${await browser.version()} — ${tools.length} tools + ${PAGES.length} pages × ${VIEWPORTS.length} viewports\n`);

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
} catch (err) {
  await browser.close();
  console.log(`\nSKIP — ${URL} is not serving: ${err.message}`);
  console.log('Start the site first (`npm run dev`) and pass --url=http://localhost:<port>.\n');
  process.exit(0);
}

/* ── pages ─────────────────────────────────────────────────────────────── */
for (const p of PAGES) {
  const perPage = [];
  errors.length = 0;
  await page.evaluate((h) => { location.hash = h; }, p.hash);
  await new Promise((r) => setTimeout(r, 900));
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await new Promise((r) => setTimeout(r, 280));
    for (const f of await measure()) perPage.push({ ...f, viewport: vp.name });
  }
  for (const e of [...errors]) perPage.push({ kind: 'runtime-error', sel: '', detail: e, text: '', viewport: 'all' });
  if (perPage.length) results.push({ id: `page:${p.id}`, findings: perPage });
}
await page.setViewport({ width: 1280, height: 900 });

for (const [i, meta] of tools.entries()) {
  const perTool = [];
  errors.length = 0;
  await page.evaluate((id) => { location.hash = `#/tool/${id}`; }, meta.id);
  await new Promise((r) => setTimeout(r, 700));

  /* Fill the fields so live-computing tools actually render their results —
     an empty form proves nothing about how the output fits. */
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('input, textarea, select')) {
      const tag = el.tagName.toLowerCase();
      const type = (el.type || '').toLowerCase();
      if (tag === 'select') { if (el.selectedIndex < 0 && el.options.length) el.selectedIndex = 0; continue; }
      if (['checkbox', 'radio', 'file', 'color', 'range', 'date', 'time'].includes(type)) continue;
      if (el.value && el.value.trim()) continue;
      const hint = `${el.id} ${el.name} ${el.placeholder || ''} ${el.closest('.field')?.querySelector('.field-label')?.textContent || ''}`.toLowerCase();
      el.value = /json/.test(hint) ? '{"a":1,"b":[2,3]}'
        : /(url|link|website|domain)/.test(hint) ? 'https://example.com/a/b?c=d&e=f'
          : /(html|jsx|xml)/.test(hint) ? '<div class="x"><h2>Heading</h2><p>Body</p></div>'
            : /(css|scss)/.test(hint) ? '.a{color:red;margin:0 auto}'
              : /(code|javascript|\bjs\b|regex)/.test(hint) ? 'function f(x){return x*2}'
                : type === 'number' ? '2500'
                  : 'Sample text value that is long enough to reveal wrapping problems in narrow containers';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    for (const b of document.querySelectorAll('button')) {
      const t = (b.textContent || '').toLowerCase();
      if (/^(convert|calculate|generate|format|create|check|analyse|analyze|parse|diff|run|beautify|minify)/.test(t.trim())) { b.click(); return; }
    }
  });
  await new Promise((r) => setTimeout(r, 900));

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await new Promise((r) => setTimeout(r, 260));
    const found = await measure();
    for (const f of found) perTool.push({ ...f, viewport: vp.name });
  }
  for (const e of [...errors]) perTool.push({ kind: 'runtime-error', sel: '', detail: e, text: '', viewport: 'all' });

  if (perTool.length) results.push({ id: `${meta.cat}/${meta.id}`, findings: perTool });
  if ((i + 1) % 25 === 0) process.stdout.write(`  …${i + 1}/${tools.length}\n`);
}

await browser.close();

/* ── report ─────────────────────────────────────────────────────────────── */
const errorsOnly = results.filter((r) => r.findings.some((f) => f.kind === 'runtime-error'));
const layoutOnly = results.filter((r) => r.findings.some((f) => f.kind !== 'runtime-error'));
const byKind = {};
for (const r of results) for (const f of r.findings) byKind[f.kind] = (byKind[f.kind] || 0) + 1;

if (results.length) {
  console.log(`\n${results.length} tool(s) with findings:\n`);
  for (const r of results) {
    console.log(`  ✗ ${r.id}`);
    for (const f of (VERBOSE ? r.findings : r.findings.slice(0, 4))) {
      console.log(`      [${f.viewport}] ${f.kind} — ${f.sel || '(page)'}: ${f.detail}${f.text ? ` · "${f.text}"` : ''}`);
    }
    if (!VERBOSE && r.findings.length > 4) console.log(`      … and ${r.findings.length - 4} more (--verbose)`);
  }
} else {
  console.log('\nPASS — every tool rendered inside its box at every viewport, with no runtime errors.');
}
console.log(`\nby kind: ${JSON.stringify(byKind)}`);
console.log(`runtime errors: ${errorsOnly.length} tool(s) · layout findings: ${layoutOnly.length} tool(s)\n`);
process.exit(results.length ? 1 : 0);
