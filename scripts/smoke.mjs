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
try {
  if (!window.crypto.subtle) {
    Object.defineProperty(window.crypto, 'subtle', {
      value: {
        digest: async (algo, data) => {
          const len = algo.includes('512') ? 64 : algo.includes('256') ? 32 : 20;
          return new Uint8Array(len).buffer;
        },
      },
      configurable: true,
    });
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

console.log(`\n${successes} passed, ${failures} failed\n`);
process.exit(failures ? 1 : 0);
