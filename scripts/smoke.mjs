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

console.log(`\n${successes} passed, ${failures} failed\n`);
process.exit(failures ? 1 : 0);
