/**
 * Text-fit auditor — renders every tool in jsdom, then runs a small layout
 * model over the components that can clip or spill text.
 *
 * jsdom has no layout engine, so text advance widths are estimated with a
 * per-character table for the site's fonts and compared against the widths the
 * real CSS gives each container at a range of viewport sizes.
 *
 * Two outcomes:
 *   HARD  — text that genuinely cannot fit its box (fails the run)
 *   SOFT  — text that fits but wraps to an ugly number of lines (warning only)
 *
 * The model encodes src/styles/*.css. If you change wrapping behaviour there,
 * update the tables below.
 *
 * Usage: node scripts/audit-overflow.mjs [--verbose]
 */
import { JSDOM } from 'jsdom';

const VERBOSE = process.argv.includes('--verbose');
const MAX_SOFT_LINES = 3;

/* ------------------------------------------------------------------ *
 * jsdom environment (mirrors scripts/smoke.mjs)
 * ------------------------------------------------------------------ */
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>', {
  url: 'http://localhost/', pretendToBeVisual: true,
});
const { window } = dom;
const ctxStub = new Proxy({}, {
  get: (t, prop) => (prop === 'canvas' ? { width: 300, height: 300 } : typeof prop === 'string' ? () => {} : undefined),
  set: () => true,
});
window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
window.HTMLCanvasElement.prototype.toBlob = (cb) => cb(new window.Blob([]));
const def = (k, v) => { try { Object.defineProperty(global, k, { value: v, configurable: true, writable: true }); } catch { try { global[k] = v; } catch {} } };
def('window', window); def('document', window.document); def('navigator', window.navigator);
def('Node', window.Node); def('HTMLElement', window.HTMLElement); def('DocumentFragment', window.DocumentFragment);
def('Event', window.Event); def('CustomEvent', window.CustomEvent); def('MouseEvent', window.MouseEvent);
global.location = window.location; global.history = window.history;
global.getComputedStyle = window.getComputedStyle;
global.requestAnimationFrame = (fn) => setTimeout(fn, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
def('performance', { now: () => Date.now(), timeOrigin: Date.now() });
global.screen = { width: 1440, height: 900, availWidth: 1440, availHeight: 860, colorDepth: 24, orientation: { type: 'landscape' } };
def('localStorage', window.localStorage);
const mm = () => ({ matches: false, addListener() {}, removeListener() {} });
global.matchMedia = window.matchMedia || mm;
window.matchMedia = global.matchMedia;
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.HTMLElement.prototype.focus = () => {};
global.AudioContext = class { constructor() { this.destination = {}; } createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: {} }; } createGain() { return { connect() {}, gain: {} }; } };
window.AudioContext = global.AudioContext;
try {
  if (!window.crypto.getRandomValues) window.crypto.getRandomValues = (a) => { for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256); return a; };
  if (!window.crypto.randomUUID) Object.defineProperty(window.crypto, 'randomUUID', { value: () => '00000000-0000-4000-8000-000000000000', configurable: true });
  if (!window.crypto.subtle) {
    Object.defineProperty(window.crypto, 'subtle', {
      value: { digest: async (algo) => new Uint8Array(algo.includes('512') ? 64 : algo.includes('256') ? 32 : 20).buffer },
      configurable: true,
    });
  }
} catch {}
def('crypto', window.crypto);
global.FileReader = window.FileReader;
global.MediaRecorder = class { constructor() {} start() {} stop() {} };
window.MediaRecorder = global.MediaRecorder;
global.SpeechSynthesisUtterance = class { constructor() {} };
window.speechSynthesis = { getVoices: () => [], speak() {}, cancel() {}, onvoiceschanged: null };
global.speechSynthesis = window.speechSynthesis;
global.DOMParser = window.DOMParser;
global.Blob = window.Blob;
global.URL.createObjectURL = () => 'blob:test';
global.URL.revokeObjectURL = () => {};
global.fetch = async () => ({ ok: true, status: 200, text: async () => '{}', json: async () => ({}), headers: { forEach() {}, get: () => null } });
window.fetch = global.fetch;

/* ------------------------------------------------------------------ *
 * Text measurement
 * ------------------------------------------------------------------ */
const SANS = { lower: 0.545, upper: 0.665, digit: 0.575, space: 0.265, punct: 0.33, wide: 0.86 };

function charClass(ch) {
  if (/[a-z]/.test(ch)) return 'lower';
  if (/[A-Z]/.test(ch)) return 'upper';
  if (/[0-9]/.test(ch)) return 'digit';
  if (ch === ' ') return 'space';
  if (/[mwMW@]/.test(ch)) return 'wide';
  return 'punct';
}

function textWidth(text, fontSize, { weight = 400, letterSpacing = 0, uppercase = false } = {}) {
  let s = String(text ?? '');
  if (uppercase) s = s.toUpperCase();
  const bold = weight >= 800 ? 1.055 : weight >= 700 ? 1.03 : 1;
  let w = 0;
  for (const ch of s) w += SANS[charClass(ch)] * fontSize * bold + letterSpacing;
  return w;
}

const longestToken = (t) => String(t ?? '').split(/\s+/).filter(Boolean)
  .reduce((a, b) => (b.length > a.length ? b : a), '');

function tokenWidth(text, fontSize, opts = {}) {
  const t = longestToken(text);
  return t ? textWidth(t, fontSize, opts) : 0;
}

/** Greedy line-wrap simulation. `anywhere` allows breaking inside a token. */
function wrapLines(text, availPx, fontSize, { weight = 400, letterSpacing = 0, uppercase = false, anywhere = false } = {}) {
  const s = String(text ?? '');
  if (!s.trim()) return 1;
  const o = { weight, letterSpacing, uppercase };
  const words = s.split(/\s+/).filter(Boolean);
  let lines = 1;
  let line = 0;
  for (const word of words) {
    let w = textWidth(word, fontSize, o);
    const space = line > 0 ? textWidth(' ', fontSize, o) : 0;
    if (line + space + w <= availPx) { line += space + w; continue; }
    if (anywhere && w > availPx) {
      /* the word itself is wider than the box: it breaks across lines */
      const perLine = Math.max(1, Math.floor(availPx / (w / word.length)));
      lines += Math.ceil(word.length / perLine) - 1;
      line = w % availPx;
      continue;
    }
    if (!anywhere && w > availPx) return Infinity; /* cannot fit at all */
    lines += 1;
    line = w;
  }
  return lines;
}

/* ------------------------------------------------------------------ *
 * Layout model — mirrors src/styles/*.css
 * ------------------------------------------------------------------ */
const VIEWPORTS = [360, 390, 430, 768, 1024, 1280, 1440];
const clamp = (lo, v, hi) => Math.min(hi, Math.max(lo, v));

function geom(vw) {
  const wrapPad = vw <= 560 ? 18 : 24;
  const wrapW = Math.min(vw, 1180) - wrapPad * 2;
  const panelPad = clamp(20, vw * 0.035, 32);
  let main; let side;
  if (vw <= 920) { main = wrapW; side = wrapW; } else {
    const avail = wrapW - 22;
    main = (avail * 1.7) / 2.7;
    side = Math.max(260, avail - main);
  }
  const panelContent = main - panelPad * 2;
  const headContent = panelContent - 40; /* .result-head padding 20px */
  const bodyContent = panelContent - 40;  /* .result-body  padding 20px */
  const sideContent = side - panelPad * 2;
  const statMin = vw <= 560 ? 120 : 130;
  const statCols = Math.max(1, Math.floor((bodyContent + 12) / (statMin + 12)));
  const statTrack = (bodyContent - (statCols - 1) * 12) / statCols;
  return {
    vw, wrapW, main, side, panelContent, headContent, bodyContent, sideContent,
    statTrack, statContent: statTrack - 32, compact: vw <= 560,
  };
}

/* ------------------------------------------------------------------ *
 * Findings
 * ------------------------------------------------------------------ */
const hard = [];
const soft = [];
const push = (bucket, kind, id, vw, detail) => bucket.push({ kind, id, vw, ...detail });

function cssPath(node) {
  const bits = [];
  let n = node;
  while (n && n.nodeType === 1 && bits.length < 3) {
    bits.unshift(n.tagName.toLowerCase() + (typeof n.className === 'string' && n.className.trim() ? `.${n.className.trim().split(/\s+/)[0]}` : ''));
    n = n.parentElement;
  }
  return bits.join('>');
}

/** .result-head now wraps, so it only breaks if one item alone is too wide. */
function checkResultHead(root, id, g) {
  for (const head of root.querySelectorAll('.result-head')) {
    const title = head.querySelector('.result-title')?.textContent || '';
    const titleW = textWidth(title, 12, { weight: 800, letterSpacing: 12 * 0.14, uppercase: true });
    /* .result-title has overflow-wrap:anywhere → it can always break, but a
       3-line uppercase label is a design smell worth reporting. */
    const titleLines = wrapLines(title, g.headContent, 12, { weight: 800, letterSpacing: 12 * 0.14, uppercase: true, anywhere: true });
    if (titleLines > 2) push(soft, 'result title wraps >2 lines', id, g.vw, { text: title, lines: titleLines, width: Math.round(titleW) });

    let btnRow = 0;
    for (const b of head.querySelectorAll('button')) {
      const label = (b.textContent || '').trim();
      const w = textWidth(label, 12.5, { weight: 700 }) + (b.querySelector('svg') ? 21 : 0) + 30;
      /* .copy-btn is nowrap and must fit on a line by itself */
      if (w > g.headContent) push(hard, 'result-head button too wide', id, g.vw, { text: label, need: Math.round(w), have: Math.round(g.headContent) });
      btnRow += w + 8;
    }
    if (titleLines > 2 || btnRow > g.headContent) {
      /* fine — it wraps to a second row; only note if the head gets tall */
      if (btnRow > g.headContent * 2) push(soft, 'result head needs 3+ rows', id, g.vw, { text: title });
    }
  }
}

/** .stat has min-width:0 + overflow-wrap:anywhere, so values now break.
 *  Hard-fail only when a tile would need an absurd number of lines. */
function checkStats(root, id, g) {
  for (const grid of root.querySelectorAll('.stat-grid')) {
    const style = grid.getAttribute('style') || '';
    if (/grid-template-columns/.test(style)) continue;
    for (const stat of grid.querySelectorAll('.stat')) {
      const k = stat.querySelector('.k')?.textContent || '';
      const vEl = stat.querySelector('.v');
      const v = vEl?.textContent || '';
      const vSize = Number(/font-size:\s*(\d+(?:\.\d+)?)px/.exec(vEl?.getAttribute('style') || '')?.[1] ?? (g.compact ? 15 : 21));
      const kLines = wrapLines(k, g.statContent, 11, { weight: 800, letterSpacing: 11 * 0.12, uppercase: true, anywhere: true });
      const vLines = wrapLines(v, g.statContent, vSize, { weight: 800, anywhere: true });
      if (kLines > MAX_SOFT_LINES) push(soft, 'stat label wraps a lot', id, g.vw, { text: k, lines: kLines });
      if (vLines === Infinity) push(hard, 'stat value cannot fit', id, g.vw, { text: v });
      else if (vLines > MAX_SOFT_LINES) push(soft, 'stat value wraps a lot', id, g.vw, { text: v.slice(0, 44), lines: vLines });
    }
  }
}

/** A table must live in a scroll wrapper, or fit the panel outright. */
function checkTables(root, id, g) {
  for (const tbl of root.querySelectorAll('table.mini-table')) {
    const scrollable = !!tbl.closest('.table-scroll,[data-table-scroll]');
    const cols = Math.max(0, ...[...tbl.querySelectorAll('tr')].map((tr) => tr.children.length));
    if (!cols) continue;
    let minW = 0;
    for (const c of tbl.querySelectorAll('th,td')) {
      const input = c.querySelector('input,select,textarea');
      const forced = Number(/min-width:\s*(\d+)px/.exec(input?.getAttribute('style') || '')?.[1] || 0);
      const txtMin = tokenWidth(c.textContent, 13.5, { weight: 600 });
      minW += Math.max(forced, txtMin, 24) + 22;
    }
    minW = (minW / Math.max(1, tbl.querySelectorAll('tr').length)) * cols;
    if (!scrollable && minW > g.panelContent) {
      push(hard, 'table overflows panel (no scroll wrapper)', id, g.vw, { text: `${cols} cols`, need: Math.round(minW), have: Math.round(g.panelContent) });
    }
  }
}

/** .btn is nowrap above 560px and wraps below — either way it must fit. */
function checkButtons(root, id, g) {
  for (const b of root.querySelectorAll('.tool-actions .btn, .share-row .btn')) {
    const label = (b.textContent || '').trim();
    const small = b.classList.contains('btn-sm');
    const size = small ? 13.5 : 15;
    const pad = small ? 36 : 52;
    const iconW = b.querySelector('svg') ? (small ? 21 : 27) : 0;
    const avail = g.compact && b.closest('.share-row') ? g.panelContent / 2 - 4 : g.panelContent;
    if (g.compact) {
      /* white-space: normal — every word must fit */
      if (tokenWidth(label, size, { weight: 700 }) + pad + iconW > avail) {
        push(hard, 'button word too wide', id, g.vw, { text: label, need: Math.round(tokenWidth(label, size, { weight: 700 }) + pad), have: Math.round(avail) });
      }
    } else {
      const need = textWidth(label, size, { weight: 700 }) + pad + iconW;
      if (need > avail) push(hard, 'button too wide (nowrap)', id, g.vw, { text: label, need: Math.round(need), have: Math.round(avail) });
    }
  }
}

/** Bespoke inline grids: fixed N tracks sharing the panel width. */
function checkInlineGrids(root, id, g) {
  for (const node of root.querySelectorAll('[style*="grid-template-columns"]')) {
    if (node.classList.contains('stat-grid')) continue;
    const style = node.getAttribute('style') || '';
    const m = /grid-template-columns:\s*repeat\((\d+)/.exec(style);
    if (!m) continue;
    const cols = Number(m[1]);
    const gap = Number(/gap:\s*(\d+)/.exec(style)?.[1] ?? 0);
    const host = node.closest('.result-body') ? g.bodyContent : g.panelContent;
    const track = (host - (cols - 1) * gap) / cols;
    if (track < 16) {
      push(hard, 'inline grid tracks too narrow', id, g.vw, { text: `${cols} cols`, need: Math.round(cols * 16), have: Math.round(host) });
      continue;
    }
    for (const cell of node.children) {
      const txt = (cell.textContent || '').trim();
      if (!txt) continue;
      const cStyle = cell.getAttribute('style') || '';
      const size = Number(/font-size:\s*(\d+(?:\.\d+)?)px/.exec(cStyle)?.[1] ?? 13.5);
      const padX = 2 * Number(/padding:\s*(?:\d+px\s+)?(\d+)/.exec(cStyle)?.[1] ?? 0);
      const em = Number(/letter-spacing:\s*(-?[\d.]+)em/.exec(cStyle)?.[1] ?? 0);
      const need = tokenWidth(txt, size, { weight: 700, letterSpacing: size * em });
      if (need > track - padX) {
        push(hard, 'inline grid cell overflow', id, g.vw, { text: txt.slice(0, 30), need: Math.round(need), have: Math.round(track - padX) });
      }
    }
  }
}

/** Containers that do NOT get a break rule from the stylesheet. */
const PROTECTED = '.result-out,.note,.note span,.stat .v,.stat .k,.tool-desc,.t-desc,.t-name,'
  + '.term-mean,.help-steps li,.ai-bubble,.ai-bubble code,.ai-bubble a,.result-title,.breadcrumb,'
  + '.dict-word,.dict-phonetic,.def-item,.mini-table td,.mini-table th,.code-area,.lede,.display,'
  + '.empty-state,.account-item,.benefits-list li,.field-hint,.field-label,.guide-content';
const ELLIPSISED = '.account-name,.select,.toolbox-tool-info strong,.toolbox-tool-info small,'
  + '.window-label,.hero-float strong,.hero-float small';

function checkLooseText(root, id, g) {
  for (const node of root.querySelectorAll('div,span,p,strong,small,td,th,li,label')) {
    if (node.children.length) continue; /* leaf text nodes only */
    const txt = (node.textContent || '').trim();
    if (txt.length < 20) continue;
    if (node.closest(PROTECTED) || node.matches(PROTECTED)) continue;
    if (node.closest(ELLIPSISED) || node.matches(ELLIPSISED)) continue;
    if (node.closest('pre,.result-out,textarea,select,option,svg,style,script')) continue;
    const size = Number(/font-size:\s*(\d+(?:\.\d+)?)px/.exec(node.getAttribute('style') || '')?.[1] ?? 14);
    const need = tokenWidth(txt, size, { weight: 700 });
    const have = node.closest('.result-body') ? g.bodyContent : g.panelContent;
    if (need > have) {
      push(hard, 'unbreakable text in unprotected box', id, g.vw, {
        text: `${cssPath(node)} → "${longestToken(txt).slice(0, 40)}"`, need: Math.round(need), have: Math.round(have),
      });
    }
  }
}

/** Fixed inline widths that ignore the panel. Images are exempt: the global
 *  `img { max-width: 100% }` clamps them. */
function checkFixedWidths(root, id, g) {
  for (const node of root.querySelectorAll('[style*="width:"]')) {
    if (['IMG', 'svg', 'CANVAS', 'VIDEO', 'IFRAME'].includes(node.tagName) || node.closest('svg')) continue;
    const style = node.getAttribute('style') || '';
    if (/max-width/.test(style)) continue;
    const m = /(?:^|;)\s*(?:min-)?width:\s*(\d{3,})px/.exec(style);
    if (!m) continue;
    const need = Number(m[1]);
    /* a min-width inside a horizontal scroller is intentional */
    if (node.closest('.table-scroll') && /min-width/.test(style)) continue;
    if (need > g.panelContent) {
      push(hard, 'fixed inline width', id, g.vw, { text: `${cssPath(node)} width:${need}px`, need, have: Math.round(g.panelContent) });
    }
  }
}

/* ------------------------------------------------------------------ *
 * Run
 * ------------------------------------------------------------------ */
const { TOOLS, getTool } = await import('../src/tools/index.js');

for (const meta of TOOLS) {
  const tool = getTool(meta.id);
  if (!tool) continue;
  const host = document.createElement('div');
  document.body.append(host);
  try {
    tool.mount(host);
    await new Promise((r) => setTimeout(r, 0));
  } catch (e) {
    if (VERBOSE) console.log('  ! mount failed', meta.id, e.message);
    host.remove();
    continue;
  }
  for (const inp of host.querySelectorAll('input[type=number], input[type=text], textarea')) {
    if (!inp.value) inp.value = inp.type === 'number' ? '25000' : 'Hello PSDKIT world, this is a sample value';
  }
  host.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 40));
  /* some tools only build output after an explicit action */
  for (const btn of host.querySelectorAll('button')) {
    const label = (btn.textContent || '').trim().toLowerCase();
    if (/^(render table|generate|preview|analyse|analyze|check|audit|run|convert)$/.test(label)) {
      try { btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); } catch {}
      await new Promise((r) => setTimeout(r, 30));
    }
  }
  for (const vw of VIEWPORTS) {
    const g = geom(vw);
    checkResultHead(host, meta.id, g);
    checkStats(host, meta.id, g);
    checkTables(host, meta.id, g);
    checkButtons(host, meta.id, g);
    checkInlineGrids(host, meta.id, g);
    checkLooseText(host, meta.id, g);
    checkFixedWidths(host, meta.id, g);
  }
  host.remove();
}

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */
function summarise(bucket, label) {
  const perKind = new Map();
  for (const i of bucket) {
    if (!perKind.has(i.kind)) perKind.set(i.kind, new Map());
    const m = perKind.get(i.kind);
    if (!m.has(i.id)) m.set(i.id, i);
  }
  console.log(`\n${label}: ${bucket.length} finding(s) across ${new Set(bucket.map((i) => i.id)).size} tool(s)`);
  for (const [kind, perTool] of perKind) {
    console.log(`  ${label === 'HARD' ? '✗' : '•'} ${kind} — ${perTool.size} tool(s)`);
    let shown = 0;
    for (const [, i] of perTool) {
      if (shown++ >= (VERBOSE ? 999 : 6)) { console.log(`      … +${perTool.size - shown + 1} more`); break; }
      const dims = i.need ? `  need ${i.need}px / have ${i.have}px` : i.lines ? `  ${i.lines} lines` : '';
      console.log(`      ${i.id} @${i.vw}px${dims}  ${i.text}`);
    }
  }
}

console.log(`\nText-fit audit — ${TOOLS.length} tools × ${VIEWPORTS.length} viewports`);
summarise(hard, 'HARD');
summarise(soft, 'SOFT');
console.log('');
process.exit(hard.length ? 1 : 0);
