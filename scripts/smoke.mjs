/**
 * Smoke test — renders every page and every tool into jsdom.
 * Catches runtime errors without a browser.
 */
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});

const { window } = dom;
/* 2D canvas stub — enough for wheel spinner / whiteboard mounts */
const ctxStub = new Proxy({}, {
  get: (t, prop) => {
    if (prop === 'canvas') return { width: 300, height: 300 };
    return typeof prop === 'string' ? () => { } : undefined;
  },
  set: () => true,
});
window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
window.HTMLCanvasElement.prototype.toBlob = (cb) => cb(new window.Blob([]));
const def = (key, value) => {
  try {
    Object.defineProperty(global, key, { value, configurable: true, writable: true });
  } catch {
    try { global[key] = value; } catch { /* leave as-is */ }
  }
};
def('window', window);
def('document', window.document);
def('navigator', window.navigator);
global.HTMLElement = window.HTMLElement;
global.Node = window.Node;
global.DocumentFragment = window.DocumentFragment;
global.Event = window.Event;
global.CustomEvent = window.CustomEvent;
global.location = window.location;
global.history = window.history;
global.getComputedStyle = window.getComputedStyle;
global.requestAnimationFrame = (fn) => setTimeout(fn, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
def('performance', { now: () => Date.now(), timeOrigin: Date.now() });
global.screen = { width: 1440, height: 900, availWidth: 1440, availHeight: 860, colorDepth: 24, orientation: { type: 'landscape' } };
global.localStorage = window.localStorage;
global.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() { }, removeListener() { } }));
window.matchMedia = global.matchMedia;
window.scrollTo = () => { };
window.HTMLElement.prototype.scrollIntoView = () => { };
window.HTMLElement.prototype.focus = () => { };
global.AudioContext = class { constructor() { this.destination = {}; } createOscillator() { return { connect() { }, start() { }, stop() { }, frequency: {} }; } createGain() { return { connect() { }, gain: {} }; } };
window.AudioContext = global.AudioContext;
try {
  if (!window.crypto.getRandomValues) {
    Object.defineProperty(window.crypto, 'randomGetValues', { value: undefined });
    window.crypto.getRandomValues = (arr) => { for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256); return arr; };
  }
} catch { /* ok */ }
try {
  if (!window.crypto.randomUUID) {
    Object.defineProperty(window.crypto, 'randomUUID', { value: () => '00000000-0000-4000-8000-000000000000', configurable: true });
  }
} catch { /* ok */ }
/* jsdom ships no SubtleCrypto. Borrow Node's real one rather than faking it:
   a stub that returns zero bytes made every digest test vacuous. */
try {
  if (!window.crypto.subtle) {
    const { webcrypto } = await import('node:crypto');
    Object.defineProperty(window.crypto, 'subtle', { value: webcrypto.subtle, configurable: true });
  }
} catch { /* ok */ }
def('crypto', window.crypto);
global.FileReader = window.FileReader;
global.MediaRecorder = class { constructor() { } start() { } stop() { } };
window.MediaRecorder = global.MediaRecorder;
global.SpeechSynthesisUtterance = class { constructor() { } };
window.speechSynthesis = { getVoices: () => [], speak() { }, cancel() { }, onvoiceschanged: null };
global.speechSynthesis = window.speechSynthesis;
global.DOMParser = window.DOMParser;
global.Blob = window.Blob;
global.URL.createObjectURL = () => 'blob:test';
global.URL.revokeObjectURL = () => { };
global.fetch = async () => ({ ok: true, status: 200, text: async () => '{}', json: async () => ({}), headers: { forEach() { }, get: () => null } });
window.fetch = global.fetch;

let failures = 0;
let successes = 0;

async function test(name, fn) {
  const host = document.createElement('div');
  document.body.append(host);
  try {
    await fn(host);
    successes++;
    console.log('  ✓', name);
  } catch (e) {
    failures++;
    console.log('  ✗', name, '→', e.message);
  }
  host.remove();
}

const { TOOLS, getTool } = await import('../src/tools/index.js');
console.log(`\n— Tool mounts (all ${TOOLS.length}) —`);
for (const meta of TOOLS) {
  await test(`${meta.cat}/${meta.id}`, async (host) => {
    const tool = getTool(meta.id);
    if (!tool) throw new Error('no implementation');
    tool.mount(host);
    await new Promise((r) => setTimeout(r, 0));
    if (!host.children.length && !host.textContent) throw new Error('empty output');
  });
}

console.log('\n— Pages —');
await test('home', async (host) => {
  const { renderHome } = await import('../src/pages/home.js');
  renderHome(host);
});
await test('tools browser', async (host) => {
  const { renderToolsPage } = await import('../src/pages/tools.js');
  renderToolsPage(host, null);
});
await test('tools category', async (host) => {
  const { renderToolsPage } = await import('../src/pages/tools.js');
  renderToolsPage(host, 'daily');
});
await test('tool detail', async (host) => {
  const { renderToolPage } = await import('../src/pages/tools.js');
  renderToolPage(host, 'bmi-calc');
});
await test('tool detail (custom mount)', async (host) => {
  const { renderToolPage } = await import('../src/pages/tools.js');
  renderToolPage(host, 'code-playground');
});
await test('tool 404', async (host) => {
  const { renderToolPage } = await import('../src/pages/tools.js');
  renderToolPage(host, 'nope');
});
await test('learn hub', async (host) => {
  const { renderLearnPage } = await import('../src/pages/learn.js');
  renderLearnPage(host);
});
await test('guide detail', async (host) => {
  const { renderGuidePage } = await import('../src/pages/learn.js');
  renderGuidePage(host, 'python');
});
await test('community', async (host) => {
  const { renderCommunityPage } = await import('../src/pages/community.js');
  renderCommunityPage(host);
});
await test('community submit', async (host) => {
  const { renderSubmitPage } = await import('../src/pages/community.js');
  renderSubmitPage(host, null);
});
await test('sign-in page', async (host) => {
  const { renderSignInPage } = await import('../src/pages/signin.js');
  renderSignInPage(host, null);
});
await test('profile page signed out', async (host) => {
  const { renderProfilePage } = await import('../src/pages/profile.js');
  renderProfilePage(host, null);
});
await test('profile page signed in', async (host) => {
  const { renderProfilePage } = await import('../src/pages/profile.js');
  renderProfilePage(host, { uid: '1', email: 'test@example.com', displayName: 'Test User', metadata: { creationTime: new Date().toISOString() } });
});
await test('admin page', async (host) => {
  const { renderAdminPage } = await import('../src/pages/admin.js');
  renderAdminPage(host);
});
await test('404 page', async (host) => {
  const { renderNotFoundPage } = await import('../src/pages/notfound.js');
  renderNotFoundPage(host);
});
await test('help', async (host) => {
  const { renderHelpPage } = await import('../src/pages/help.js');
  renderHelpPage(host);
});

console.log('\n— Preferences & i18n —');
await test('favourites logic', async () => {
  const { toggleFavourite, getFavourites, pushRecentTool, getRecentTools, pushRecentSearch, getRecentSearches, setTheme, getTheme } = await import('../src/prefs.js');
  toggleFavourite('qr-generator');
  if (!getFavourites().includes('qr-generator')) throw new Error('favourite not saved');
  pushRecentTool('qr-generator');
  if (getRecentTools()[0] !== 'qr-generator') throw new Error('recent tool not tracked');
  pushRecentSearch('pdf');
  if (getRecentSearches()[0] !== 'pdf') throw new Error('recent search not tracked');
  setTheme('dim');
  if (getTheme() !== 'dim') throw new Error('theme not saved');
});
await test('locale toggle', async () => {
  const { setLocale, getLocale } = await import('../src/data/i18n.js');
  setLocale('hi');
  if (getLocale() !== 'hi' || !document.documentElement.lang.startsWith('hi')) throw new Error('locale not applied');
  setLocale('en');
});

console.log('\n— AI brain —');
await test('local answers (20 prompts)', async () => {
  const { localAnswer } = await import('../src/ai/brain.js');
  const prompts = ['hello', 'merge pdf', 'what is an api', 'meaning of love', 'learn python', 'compress image', 'my ip', 'password', 'convert temperature', 'qr', 'json', 'record screen', 'thanks', 'who are you', 'publish tool', 'privacy', 'mobile', 'timer', 'css error', 'recommend'];
  for (const p of prompts) {
    const a = localAnswer(p);
    if (!a || a.length < 20) throw new Error(`weak answer for "${p}"`);
    if (!/#\//.test(a) && !/\*\*/.test(a)) throw new Error(`no links/format for "${p}"`);
  }
});

await test('local answers for the 2026 tool batch', async () => {
  const { localAnswer } = await import('../src/ai/brain.js');
  const prompts = [
    ['income tax new regime', 'income-tax-india'],
    ['my cgpa is 8.5 to percentage', 'cgpa-percentage'],
    ['how many classes can i bunk', 'attendance-calc'],
    ['fd maturity calculator', 'fd-rd-calc'],
    ['subnet 192.168.1.0/24', 'subnet-calc'],
    ['compare two json files', 'json-diff'],
    ['convert image to base64', 'image-base64'],
    ['generate a favicon', 'favicon-generator'],
    ['rem to px', 'rem-px-conv'],
    ['ascii art banner', 'ascii-art-text'],
    ['.env to json', 'env-parser'],
    ['colour blind simulator', 'colour-blind-sim'],
    ['common ports list', 'port-reference'],
    ['html to jsx classname', 'html-to-jsx'],
    ['keyword density checker', 'keyword-density'],
    ['roman numeral 2026', 'roman-numeral'],
    ['fraction 3/4 plus 1/6', 'fraction-calc'],
    ['passphrase generator', 'passphrase-gen'],
    ['how much rent can i afford', 'rent-affordability'],
    ['final exam grade calculator', 'final-exam-calc'],
    ['unit price which is cheaper', 'unit-price-compare'],
    ['unicode codepoint lookup', 'unicode-inspector'],
    ['photo filters sepia', 'image-filters'],
    ['aspect ratio 1920x1080', 'aspect-ratio-calc'],
    ['mac address generator', 'mac-address-gen'],
    ['pick colour from screen', 'screen-colour-picker'],
  ];
  for (const [prompt, expectedTool] of prompts) {
    const a = localAnswer(prompt);
    if (!a.includes(`#/tool/${expectedTool}`)) {
      throw new Error(`"${prompt}" did not link to ${expectedTool}`);
    }
  }
});

console.log('\n— Catalog integrity —');
await test('every catalog tool has an implementation and vice versa', async () => {
  const { TOOLS, getTool } = await import('../src/tools/index.js');
  const { ICONS } = await import('../src/icons.js');
  const ids = TOOLS.map((t) => t.id);
  if (new Set(ids).size !== ids.length) throw new Error('duplicate tool ids in the catalog');
  for (const meta of TOOLS) {
    if (!getTool(meta.id)) throw new Error(`${meta.id} is in the catalog but has no implementation`);
    if (!ICONS[meta.icon]) throw new Error(`${meta.id} uses unknown icon "${meta.icon}"`);
    if (!meta.desc || meta.desc.length < 20) throw new Error(`${meta.id} has a missing or thin description`);
    if (!meta.keys || meta.keys.length < 5) throw new Error(`${meta.id} has no search keywords`);
  }
});

await test('tool counts in copy are derived, never hardcoded', async () => {
  /* Any literal "NNN tools" in shipped copy goes stale the day a tool is added.
     Counts must come from TOOL_COUNT / TOOLS.length instead. */
  const { TOOL_COUNT } = await import('../src/data/catalog.js');
  const { readFileSync, readdirSync, statSync } = await import('node:fs');
  const { join, extname } = await import('node:path');
  const roots = ['src', 'index.html', 'public/manifest.webmanifest'];
  const files = [];
  const walk = (p) => {
    if (statSync(p).isDirectory()) { for (const f of readdirSync(p)) walk(join(p, f)); return; }
    if (['.js', '.html', '.css', '.webmanifest', '.md'].includes(extname(p))) files.push(p);
  };
  roots.forEach(walk);

  /* For JS only string literals count as shipped copy — comments may talk
     about "the 26 new tools" without misleading anyone. */
  const STRING_LITERALS = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/gs;
  const copyOf = (file, src) => (extname(file) === '.js'
    ? [...src.matchAll(STRING_LITERALS)].map((m) => m[2]).join('\n')
    : src);

  const COUNT_PHRASE = /\b(\d{2,4})\s+(?:free |browser-based |practical |useful |online )?tools?\b/gi;
  const stale = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of copyOf(f, src).matchAll(COUNT_PHRASE)) {
      if (Number(m[1]) !== TOOL_COUNT) stale.push(`${f}: "${m[0]}" (catalog has ${TOOL_COUNT})`);
    }
  }
  if (stale.length) throw new Error(`hardcoded tool count(s): ${[...new Set(stale)].join('; ')}`);

  /* README documents whole-toolkit totals in two fixed places. Subset mentions
     like "26 new tools" are fine; the totals are not allowed to drift. */
  const readme = readFileSync('README.md', 'utf8');
  const title = readme.match(/^# PSDKIT Pro — (\d+) Free Online Tools/m);
  const lede = readme.match(/\*\*(\d+) browser-based tools\*\*/);
  for (const [where, m] of [['README title', title], ['README lede', lede]]) {
    if (!m) throw new Error(`${where}: could not find the tool count to verify`);
    if (Number(m[1]) !== TOOL_COUNT) throw new Error(`${where} says ${m[1]} but the catalog has ${TOOL_COUNT}`);
  }
});

await test('i18n count placeholder resolves in both locales', async () => {
  const { t } = await import('../src/data/i18n.js');
  const { TOOL_COUNT } = await import('../src/data/catalog.js');
  for (const locale of ['en', 'hi']) {
    const hint = t('smartSearchHint', locale);
    if (hint.includes('{count}')) throw new Error(`${locale}: placeholder was not replaced`);
    if (!hint.includes(String(TOOL_COUNT))) throw new Error(`${locale}: hint does not mention ${TOOL_COUNT}`);
  }
});

console.log('\n— Text-fit regressions —');
await test('el() assigns value/checked as DOM properties', async () => {
  const { el } = await import('../src/ui.js');
  const ta = el('textarea.textarea', { value: 'seeded content' });
  if (ta.value !== 'seeded content') throw new Error('textarea value attribute was ignored');
  const input = el('input', { type: 'checkbox', checked: true });
  if (input.checked !== true) throw new Error('checkbox checked was not applied');
  const sel = el('select');
  sel.append(el('option', { value: 'b', text: 'B', selected: true }));
  if (sel.value !== 'b') throw new Error('option selected was not applied');
});

await test('el() merges the class attribute with the selector classes', async () => {
  /* Assigning `class` used to *replace* the class list, so `el('button.chip',
     { class: '' })` produced a button with no class at all. The category
     filters, the favourite stars and the rating stars all lost their styling
     that way, and `.chip` / `.fav-btn` never matched anything in the CSS. */
  const { el } = await import('../src/ui.js');
  const active = el('button.chip', { class: 'active' });
  if (!active.classList.contains('chip')) throw new Error('the selector class was dropped');
  if (!active.classList.contains('active')) throw new Error('the attribute class was dropped');
  const inactive = el('button.chip', { class: '' });
  if (!inactive.classList.contains('chip')) throw new Error('an empty class attribute wiped the selector class');
  const multi = el('span.badge', { class: 'a b' });
  if (!multi.classList.contains('badge') || !multi.classList.contains('a') || !multi.classList.contains('b')) {
    throw new Error(`multi-class merge failed: "${multi.className}"`);
  }
  /* a tag with no selector classes still gets its attribute class */
  const plain = el('div', { class: 't-icon tile-sky' });
  if (plain.className !== 't-icon tile-sky') throw new Error(`plain class assignment failed: "${plain.className}"`);
});

await test('CSV viewer renders an editable table in a scroll wrapper', async () => {
  const { getTool } = await import('../src/tools/index.js');
  const host = document.createElement('div');
  document.body.append(host);
  getTool('csv-viewer-editor').mount(host);
  await new Promise((r) => setTimeout(r, 0));
  const table = host.querySelector('table.mini-table');
  if (!table) throw new Error('no table rendered from the sample CSV');
  if (!table.closest('.table-scroll')) throw new Error('table is not inside a .table-scroll wrapper');
  const cells = [...table.querySelectorAll('td input')];
  if (cells.length < 4) throw new Error(`expected editable cells, found ${cells.length}`);
  if (/min-width:\s*1\d\dpx/.test(cells[0].getAttribute('style') || '')) {
    throw new Error('cells still force a min-width wider than a phone panel');
  }
  host.remove();
});

await test('QR batch generator starts with its sample list', async () => {
  const { getTool } = await import('../src/tools/index.js');
  const host = document.createElement('div');
  document.body.append(host);
  getTool('qr-batch-generator').mount(host);
  const ta = host.querySelector('textarea');
  if (!ta || !ta.value.trim()) throw new Error('sample list is empty — textarea default was lost');
  host.remove();
});

await test('long result values are shaped for their containers', async () => {
  /* Stat tiles are ~100px of usable width on a phone. Anything shaped like a
     full sentence or a raw Date.toString() will wrap into an unreadable block,
     so tools must keep stat values short. */
  const { TOOLS, getTool } = await import('../src/tools/index.js');
  const offenders = [];
  for (const meta of TOOLS) {
    const host = document.createElement('div');
    document.body.append(host);
    try {
      getTool(meta.id)?.mount(host);
      await new Promise((r) => setTimeout(r, 0));
      for (const inp of host.querySelectorAll('input[type=number],input[type=text],textarea')) {
        if (!inp.value) inp.value = inp.type === 'number' ? '25000' : 'Sample text value for testing';
      }
      host.dispatchEvent(new window.Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 30));
      for (const v of host.querySelectorAll('.stat .v')) {
        const text = (v.textContent || '').trim();
        if (text.length > 46) offenders.push(`${meta.id}: "${text.slice(0, 40)}…" (${text.length} chars)`);
        if (/GMT[+-]\d{4}/.test(text)) offenders.push(`${meta.id}: raw Date.toString() in a stat tile`);
      }
    } catch { /* mount errors are covered by the mount sweep */ }
    host.remove();
  }
  if (offenders.length) throw new Error(offenders.slice(0, 5).join('; '));
});

console.log('\n— Vendored libraries —');
await test('QR pipeline round-trips: encode then decode the same payload', async () => {
  const { loadQr, loadJsQr } = await import('../src/tools/libs.js');
  const qr = await loadQr();
  const jsQR = await loadJsQr();
  const payload = 'PSDKIT round trip 2026';
  /* Render the bit matrix by hand so this needs no canvas backend. */
  const created = qr.create(payload, { errorCorrectionLevel: 'M' });
  const size = created.modules.size;
  const scale = 4, quiet = 4;
  const dim = (size + quiet * 2) * scale;
  const pixels = new Uint8ClampedArray(dim * dim * 4).fill(255);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!created.modules.data[y * size + x]) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const i = (((y + quiet) * scale + dy) * dim + ((x + quiet) * scale + dx)) * 4;
          pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
        }
      }
    }
  }
  const decoded = jsQR(pixels, dim, dim);
  if (decoded?.data !== payload) throw new Error(`decoded "${decoded?.data}" instead of "${payload}"`);
  const svg = await qr.toString(payload, { type: 'svg' });
  if (!svg.includes('<svg')) throw new Error('qr.toString produced no SVG');
});

await test('vendored libraries really work, not just import', async () => {
  const libs = await import('../src/tools/libs.js');
  const { PDFDocument, StandardFonts } = await libs.loadPdfLib();
  const doc = await PDFDocument.create();
  const page = doc.addPage([220, 120]);
  page.drawText('PSDKIT', { x: 20, y: 60, size: 20, font: await doc.embedFont(StandardFonts.Helvetica) });
  const pdf = await doc.save();
  if (pdf.length < 400) throw new Error(`pdf-lib produced a ${pdf.length}-byte document`);
  if (String.fromCharCode(...pdf.slice(0, 5)) !== '%PDF-') throw new Error('output is not a PDF');

  const marked = await libs.loadMarked();
  if (!marked.parse('# Title\n\n**bold**').includes('<h1')) throw new Error('marked did not render a heading');

  const TurndownService = await libs.loadTurndown();
  if (!new TurndownService({ headingStyle: 'atx' }).turndown('<h1>Title</h1>').includes('# Title')) {
    throw new Error('turndown did not produce markdown');
  }

  if (!(await libs.loadHtmlBeautify())('<div><p>x</p></div>').includes('<p>')) throw new Error('html beautifier failed');
  if (!(await libs.loadCssBeautify())('.a{color:red}').includes('color')) throw new Error('css beautifier failed');
  if (!(await libs.loadJsBeautify())('const x=1;').includes('const')) throw new Error('js beautifier failed');

  const pdfjs = await libs.loadPdfJs();
  if (typeof pdfjs.getDocument !== 'function') throw new Error('pdf.js did not expose getDocument');
  /* workerSrc is set from a bundler `?url` asset; under plain Node there is no
     such asset and pdf.js falls back to main-thread decoding. */
});

console.log('\n— Correctness regressions —');
await test('SHA digests match node:crypto on both the native and JS paths', async () => {
  const { createHash } = await import('node:crypto');
  const { shaDigest } = await import('../src/tools/formkit.js');
  const algos = [['SHA-1', 'sha1'], ['SHA-256', 'sha256'], ['SHA-512', 'sha512']];
  const inputs = ['', 'abc', 'hello world', 'नमस्ते दुनिया', 'a'.repeat(1000)];
  /* Every block-boundary length: SHA-1/256 pad at 55/56/63/64, SHA-512 at 111/112/127/128. */
  for (const n of [0, 1, 55, 56, 63, 64, 65, 111, 112, 119, 120, 127, 128, 129, 200]) {
    const b = new Uint8Array(n);
    for (let i = 0; i < n; i++) b[i] = (i * 37 + n * 11) & 0xff;
    inputs.push(b);
  }
  const native = window.crypto.subtle;
  const setSubtle = (value) => Object.defineProperty(window.crypto, 'subtle', { value, configurable: true });
  let checked = 0;
  for (const [label, subtle] of [['native', native], ['JS fallback', undefined]]) {
    if (label === 'native' && !subtle) continue;
    setSubtle(subtle);
    for (const input of inputs) {
      for (const [name, nodeName] of algos) {
        const bytes = typeof input === 'string' ? Buffer.from(input, 'utf8') : Buffer.from(input);
        const want = createHash(nodeName).update(bytes).digest('hex');
        const got = await shaDigest(input, name);
        checked++;
        if (got !== want) {
          setSubtle(native);
          const what = typeof input === 'string' ? JSON.stringify(input.slice(0, 16)) : `${input.length} bytes`;
          throw new Error(`${name} (${label}) wrong for ${what}: got ${got.slice(0, 16)}…, want ${want.slice(0, 16)}…`);
        }
      }
    }
  }
  setSubtle(native);
  if (checked < 100) throw new Error(`only ${checked} digests verified — the fallback path was skipped`);
});

await test('file checksums digest the bytes, not a stringified buffer', async () => {
  /* readFileAs(file,'buffer') returns an ArrayBuffer. Encoding one with
     TextEncoder coerces it to "[object ArrayBuffer]", so every file on earth
     hashed to the same value. */
  const { createHash } = await import('node:crypto');
  const { shaDigest } = await import('../src/tools/formkit.js');
  const a = new Uint8Array([1, 2, 3, 4, 5]);
  const b = new Uint8Array([9, 8, 7, 6, 5]);
  const ha = await shaDigest(a.buffer, 'SHA-256');
  const hb = await shaDigest(b.buffer, 'SHA-256');
  if (ha === hb) throw new Error('two different files produced the same checksum');
  if (ha !== createHash('sha256').update(a).digest('hex')) throw new Error('ArrayBuffer path does not match the real digest');
  if (ha === '17bf4b46701313ea8fbaf838c24b8647d39bff0a9d2b45f403cb72ba420bd4bd') {
    throw new Error('hashing the literal text "[object ArrayBuffer]" again');
  }
});

await test('colour parser reads hex, rgb, hsl and names', async () => {
  const { parseColour, rgbToHex } = await import('../src/tools/formkit.js');
  const cases = [['#DE5D35', '#de5d35'], ['#abc', '#aabbcc'], ['rgb(222,93,53)', '#de5d35'],
    ['rgba(1,2,3,0.5)', '#010203'], ['hsl(14,72%,54%)', '#de5d35'], ['hsl(0,100%,50%)', '#ff0000'],
    ['tomato', '#ff6347'], ['black', '#000000'], ['222, 93, 53', '#de5d35']];
  for (const [input, want] of cases) {
    const rgb = parseColour(input);
    if (!rgb) throw new Error(`"${input}" did not parse`);
    const got = rgbToHex(rgb);
    if (got !== want) throw new Error(`"${input}" → ${got}, expected ${want}`);
  }
  for (const junk of ['', 'nonsense', '#gggggg', 'rgb(1,2)']) {
    if (parseColour(junk)) throw new Error(`"${junk}" should not parse as a colour`);
  }
});

await test('copy button confirms after awaiting the clipboard', async () => {
  /* e.currentTarget is nulled the moment dispatch finishes, so reading it after
     an await threw and the button never said "Copied!". */
  const { copyButton } = await import('../src/ui.js');
  const btn = copyButton('payload', 'Copy');
  document.body.append(btn);
  btn.click();
  await new Promise((r) => setTimeout(r, 20));
  const span = btn.querySelector('span');
  btn.remove();
  if (span.textContent !== 'Copied!') throw new Error(`label stayed "${span.textContent}" — the handler threw after its await`);
});

await test('no page or tool renders markup as visible text', async () => {
  /* icon() returns an HTML string; el() turns a string child into a text node.
     The home hero's scroll cue did exactly that, painting ~300 characters of raw
     <svg> source on screen and blowing the element out to 1761px wide. Showing
     source is the point inside pre/code/result panes, so those are exempt. */
  const looksLikeMarkup = /<\/?[a-z][a-z0-9]*[\s>]/i;
  const offenders = [];

  const scan = (root, label) => {
    for (const node of root.querySelectorAll('*')) {
      if (node.closest('pre, code, textarea, .code, .result-out, .result-body, .code-area')) continue;
      for (const child of node.childNodes) {
        if (child.nodeType === 3 && looksLikeMarkup.test(child.nodeValue || '')) {
          offenders.push(`${label}: "${child.nodeValue.trim().slice(0, 48)}"`);
          break;
        }
      }
    }
  };

  const host = document.createElement('div');
  document.body.append(host);
  const { renderHome } = await import('../src/pages/home.js');
  const { renderToolsPage } = await import('../src/pages/tools.js');
  const { renderLearnPage } = await import('../src/pages/learn.js');
  const { renderHelpPage } = await import('../src/pages/help.js');
  const { renderNotFoundPage } = await import('../src/pages/notfound.js');
  const { renderCommunityPage, renderSubmitPage } = await import('../src/pages/community.js');
  for (const [label, fn] of [['home', renderHome], ['learn', renderLearnPage], ['help', renderHelpPage], ['404', renderNotFoundPage]]) {
    host.innerHTML = '';
    fn(host, null);
    scan(host, label);
  }
  /* The publish form's tip list once told authors to use "a <style> block" —
     and because el() turns a string into a text node, the tag was painted on
     the page as literal characters. */
  host.innerHTML = '';
  renderSubmitPage(host, null);
  scan(host, 'community/add');
  host.innerHTML = '';
  renderCommunityPage(host);
  await new Promise((r) => setTimeout(r, 30));
  scan(host, 'community');
  host.innerHTML = '';
  renderToolsPage(host, null);
  scan(host, 'tools');
  for (const meta of TOOLS) {
    host.innerHTML = '';
    getTool(meta.id)?.mount(host);
    await new Promise((r) => setTimeout(r, 0));
    scan(host, meta.id);
  }
  host.remove();
  if (offenders.length) throw new Error(`${offenders.length} element(s) show escaped markup: ${offenders.slice(0, 4).join('; ')}`);
});

console.log('\n— Dependency guards —');
await test('tool libraries are vendored, never pulled from a CDN', async () => {
  /* The QR tools died with "Failed to load https://cdn.jsdelivr.net/…" whenever
     the CDN was unreachable. Every library now ships in our own bundle. */
  const { readFileSync, readdirSync } = await import('node:fs');
  const offenders = [];
  for (const f of readdirSync('src/tools')) {
    if (!f.endsWith('.js')) continue;
    const src = readFileSync(`src/tools/${f}`, 'utf8');
    for (const m of src.matchAll(/https:\/\/(?:cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com)[^\s'"`]*/g)) {
      offenders.push(`src/tools/${f}: ${m[0]}`);
    }
    if (/\bloadScript\s*\(/.test(src) && f !== 'libs.js') {
      offenders.push(`src/tools/${f}: still injects a remote <script>`);
    }
  }
  if (offenders.length) throw new Error(offenders.join('; '));
});

await test('canvas contexts go through the null-safe helper', async () => {
  /* getContext('2d') returns null rather than throwing when the browser has no
     2D backend, which used to surface as "Cannot read properties of null". */
  const { readFileSync, readdirSync } = await import('node:fs');
  const offenders = [];
  for (const dir of ['src/tools', 'src/pages']) {
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.js')) continue;
      const src = readFileSync(`${dir}/${f}`, 'utf8');
      for (const m of src.matchAll(/\.getContext\s*\(/g)) offenders.push(`${dir}/${f}:${src.slice(0, m.index).split('\n').length}`);
    }
  }
  if (offenders.length) throw new Error(`call getContext via ctx2d()/requireCtx() instead — ${offenders.join(', ')}`);
});

await test('no handler reads currentTarget after an await', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const offenders = [];
  const walk = (dir) => {
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.js')) continue;
      const path = `${dir}/${f}`;
      const lines = readFileSync(path, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (!line.includes('currentTarget')) return;
        const before = lines.slice(Math.max(0, i - 3), i + 1).join('\n');
        if (/\bawait\b/.test(before)) offenders.push(`${path}:${i + 1}`);
      });
    }
  };
  walk('src/tools'); walk('src/pages'); walk('src/ai');
  if (offenders.length) throw new Error(`currentTarget is null after an await — capture the element first (${offenders.join(', ')})`);
});

console.log(`\n${successes} passed, ${failures} failed\n`);
process.exit(failures ? 1 : 0);
