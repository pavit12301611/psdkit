/**
 * Shared jsdom environment for the smoke suite and the tool auditor.
 *
 * jsdom has no layout, no canvas backend and no network, so everything the
 * browser would provide is stubbed here. The stubs are deliberately switchable:
 * `mode: 'hostile'` makes canvas, fetch and media APIs fail so tests can prove
 * tools degrade gracefully instead of throwing at the user.
 */
import { JSDOM } from 'jsdom';

/** Plausible canned responses, keyed by a substring of the request URL. */
const CANNED = [
  ['ipwho.is', { ip: '203.0.113.7', city: 'Dehradun', region: 'Uttarakhand', country: 'India', country_code: 'IN', timezone: { id: 'Asia/Kolkata', utc: '+05:30' }, latitude: 30.31, longitude: 78.03, connection: { isp: 'Example Net', org: 'Example Net Ltd', asn: 131072 } }],
  ['open.er-api.com', { result: 'success', base_code: 'USD', rates: { USD: 1, INR: 83.2, EUR: 0.92, GBP: 0.79, JPY: 151.4, AED: 3.67, CAD: 1.36, AUD: 1.52 } }],
  ['dns.google', { Status: 0, Question: [{ name: 'example.com.', type: 1 }], Answer: [{ name: 'example.com.', type: 1, TTL: 300, data: '93.184.216.34' }] }],
  ['rdap.org', { objectClassName: 'domain', handle: '2336790_DOMAIN_COM-VRSN', ldhName: 'example.com', status: ['active'], events: [{ eventAction: 'expiration', eventDate: '2027-08-13T04:00:00Z' }], entities: [{ roles: ['registrar'], vcardArray: ['vcard', [['fn', {}, 'text', 'Example Registrar']]] }] }],
  ['api.github.com', { full_name: 'vitejs/vite', description: 'Next generation frontend tooling', stargazers_count: 68000, forks_count: 6200, open_issues_count: 400, language: 'TypeScript', license: { spdx_id: 'MIT' }, created_at: '2020-04-21T09:00:00Z', pushed_at: '2026-09-01T09:00:00Z', homepage: 'https://vite.dev', topics: ['build-tool', 'vite'], default_branch: 'main' }],
  ['dictionaryapi.dev', [{ word: 'serendipity', phonetic: '/ˌsɛ.ɹənˈdɪp.ɪ.ti/', meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'The occurrence of happy events by chance.', example: 'a fortunate stroke of serendipity' }], synonyms: ['chance', 'luck'], antonyms: [] }] }]],
  ['mymemory.translated.net', { responseData: { translatedText: 'नमस्ते' }, responseStatus: 200 }],
  ['allorigins.win', '<!DOCTYPE html><html><head><title>Example Page</title><meta name="description" content="An example page for testing."><meta property="og:title" content="Example OG"></head><body><h1>Heading</h1><p>Some paragraph text.</p><img src="/a.png" alt="a"><a href="/link">Link</a></body></html>'],
  ['speed.cloudflare.com', 'x'.repeat(1000)],
];

function responseFor(url, window) {
  const body = CANNED.find(([needle]) => String(url).includes(needle))?.[1] ?? '{}';
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: true,
    status: 200,
    url: String(url),
    text: async () => text,
    json: async () => (typeof body === 'string' ? JSON.parse(body || '{}') : body),
    arrayBuffer: async () => new TextEncoder().encode(text).buffer,
    blob: async () => new window.Blob([text]),
    headers: { forEach() { }, get: () => 'application/json', has: () => false },
  };
}

/** A 2D context that behaves like a real one for measurement and pixel reads. */
function makeCanvasContext(window, { width = 300, height = 150 } = {}) {
  const state = { fillStyle: '#000', strokeStyle: '#000', font: '10px sans-serif', globalAlpha: 1, lineWidth: 1, textAlign: 'start', textBaseline: 'alphabetic' };
  const noop = () => { };
  return new Proxy(state, {
    get(target, prop) {
      if (prop === 'canvas') return { width, height };
      if (prop === 'measureText') return (t) => ({ width: String(t).length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
      if (prop === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(4, (w | 0) * (h | 0) * 4)), width: w | 0, height: h | 0 });
      if (prop === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(Math.max(4, (w | 0) * (h | 0) * 4)), width: w | 0, height: h | 0 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => ({ addColorStop: noop });
      if (prop === 'createPattern') return () => null;
      if (prop in target) return target[prop];
      return noop;
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
}

/**
 * @param {object} opts
 * @param {'healthy'|'hostile'} [opts.mode] healthy = APIs answer; hostile = everything fails
 * @param {Record<string,string>} [opts.env] extra values for import.meta.env
 */
export function setupEnv({ mode = 'healthy', env = {} } = {}) {
  const hostile = mode === 'hostile';
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const def = (key, value) => {
    try {
      Object.defineProperty(global, key, { value, configurable: true, writable: true });
    } catch {
      try { global[key] = value; } catch { /* leave as-is */ }
    }
  };

  /* ── canvas ───────────────────────────────────────────── */
  if (hostile) {
    /* A missing 2D backend is what a locked-down or very old browser gives us. */
    window.HTMLCanvasElement.prototype.getContext = () => null;
    window.HTMLCanvasElement.prototype.toDataURL = () => { throw new window.Error('canvas is blank'); };
    window.HTMLCanvasElement.prototype.toBlob = (cb) => cb(null);
  } else {
    window.HTMLCanvasElement.prototype.getContext = () => makeCanvasContext(window);
    window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,iVBORw0KGgo=';
    window.HTMLCanvasElement.prototype.toBlob = (cb) => cb(new window.Blob(['x'], { type: 'image/png' }));
  }

  /* ── core globals ─────────────────────────────────────── */
  def('window', window);
  def('document', window.document);
  def('navigator', window.navigator);
  global.HTMLElement = window.HTMLElement;
  global.HTMLInputElement = window.HTMLInputElement;
  global.Node = window.Node;
  global.DocumentFragment = window.DocumentFragment;
  global.Event = window.Event;
  global.CustomEvent = window.CustomEvent;
  global.MouseEvent = window.MouseEvent;
  global.location = window.location;
  global.history = window.history;
  global.getComputedStyle = window.getComputedStyle;
  global.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 0);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
  def('performance', { now: () => Date.now(), timeOrigin: Date.now() });
  global.screen = { width: 1440, height: 900, availWidth: 1440, availHeight: 860, colorDepth: 24, orientation: { type: 'landscape' } };
  global.localStorage = window.localStorage;
  global.sessionStorage = window.sessionStorage;
  const mq = () => ({ matches: false, media: '', addListener() { }, removeListener() { }, addEventListener() { }, removeEventListener() { } });
  global.matchMedia = window.matchMedia || mq;
  window.matchMedia = global.matchMedia;
  window.scrollTo = () => { };
  window.HTMLElement.prototype.scrollIntoView = () => { };
  window.HTMLElement.prototype.focus = () => { };
  window.print = () => { };
  window.alert = () => { };

  /* ── audio, speech, media ─────────────────────────────── */
  global.AudioContext = class {
    constructor() { this.destination = {}; this.currentTime = 0; this.state = 'running'; }
    createOscillator() { return { connect() { }, start() { }, stop() { }, frequency: { value: 440, setValueAtTime() { } }, type: 'sine' }; }
    createGain() { return { connect() { }, gain: { value: 1, setValueAtTime() { }, exponentialRampToValueAtTime() { } } }; }
    createAnalyser() { return { connect() { }, fftSize: 0, frequencyBinCount: 0, getByteFrequencyData() { } }; }
    createMediaStreamSource() { return { connect() { } }; }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
  };
  window.AudioContext = global.AudioContext;
  global.MediaRecorder = hostile
    ? class { constructor() { throw new Error('recording is not supported'); } }
    : class { constructor() { this.state = 'inactive'; } start() { this.state = 'recording'; } stop() { this.state = 'inactive'; } };
  window.MediaRecorder = global.MediaRecorder;
  global.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  window.speechSynthesis = { getVoices: () => [], speak() { }, cancel() { }, pause() { }, resume() { }, onvoiceschanged: null, speaking: false };
  global.speechSynthesis = window.speechSynthesis;
  window.navigator.mediaDevices = hostile
    ? { getUserMedia: () => Promise.reject(new Error('camera permission denied')), getDisplayMedia: () => Promise.reject(new Error('screen capture denied')) }
    : { getUserMedia: () => Promise.resolve({ getTracks: () => [{ stop() { }, kind: 'video' }] }), getDisplayMedia: () => Promise.resolve({ getTracks: () => [{ stop() { }, kind: 'video' }] }) };

  /* ── crypto ───────────────────────────────────────────── */
  try {
    if (!window.crypto.getRandomValues) {
      window.crypto.getRandomValues = (arr) => { for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256); return arr; };
    }
  } catch { /* ok */ }
  try {
    if (!window.crypto.randomUUID) {
      Object.defineProperty(window.crypto, 'randomUUID', { value: () => '00000000-0000-4000-8000-000000000000', configurable: true });
    }
  } catch { /* ok */ }
  if (!hostile) {
    try {
      if (!window.crypto.subtle) {
        Object.defineProperty(window.crypto, 'subtle', {
          value: {
            digest: async (algo) => {
              const len = String(algo).includes('512') ? 64 : String(algo).includes('384') ? 48 : String(algo).includes('256') ? 32 : 20;
              return new Uint8Array(len).buffer;
            },
          },
          configurable: true,
        });
      }
    } catch { /* ok */ }
  }
  def('crypto', window.crypto);

  /* ── files, blobs, network ────────────────────────────── */
  global.Image = window.Image;
  global.FileReader = window.FileReader;
  global.File = window.File;
  global.DOMParser = window.DOMParser;
  global.Blob = window.Blob;
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
  global.URL.createObjectURL = () => (hostile ? (() => { throw new Error('object URLs unavailable'); })() : 'blob:test');
  global.URL.revokeObjectURL = () => { };
  window.URL.createObjectURL = global.URL.createObjectURL;
  window.URL.revokeObjectURL = global.URL.revokeObjectURL;

  const fetchImpl = hostile
    ? async (url) => { throw new TypeError(`Failed to fetch ${url}`); }
    : async (url) => responseFor(url, window);
  global.fetch = fetchImpl;
  window.fetch = fetchImpl;

  /* import.meta.env is read by firebase.js and the AI client */
  def('import_meta_env', env);

  return { window, dom, mode, def };
}

/** Small helper so tests can let queued microtasks + timers settle. */
export const settle = (ms = 30) => new Promise((r) => setTimeout(r, ms));
