/* Shared UI helpers — DOM builder, toasts, copy, clipboard, formatting. */
import { icon } from './icons.js';

/** Tiny hyperscript: el('div.card#id', {attrs?}, child, ...) */
export function el(tag, attrs, ...children) {
  const parts = tag.split(/(?=[.#])/);
  const node = document.createElement(parts[0] || 'div');
  for (const p of parts.slice(1)) {
    if (p.startsWith('.')) node.classList.add(p.slice(1));
    else if (p.startsWith('#')) node.id = p.slice(1);
  }
  const kids = children;
  let attrObj = attrs;
  /* If the 2nd argument is content (node/string/array), not an attrs object */
  if (attrs instanceof Node || typeof attrs === 'string' || typeof attrs === 'number' || Array.isArray(attrs)) {
    kids.unshift(attrs);
    attrObj = null;
  }
  if (attrObj && typeof attrObj === 'object') {
    for (const [k, v] of Object.entries(attrObj)) {
      if (v == null || v === false) continue;
      if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else node.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const c of kids.flat(9)) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function frag(...children) {
  const f = document.createDocumentFragment();
  for (const c of children.flat(9)) if (c) f.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return f;
}

/** Toast notifications */
export function toast(message, iconName = 'check') {
  let host = document.getElementById('toast-host');
  if (!host) {
    host = el('div#toast-host');
    document.body.append(host);
  }
  const t = el('div.toast', { html: icon(iconName, 16) + '<span></span>' });
  t.querySelector('span').textContent = message;
  host.append(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 350);
  }, 2200);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard');
    return true;
  } catch {
    const ta = el('textarea', { style: { position: 'fixed', opacity: '0' } });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    try { document.execCommand('copy'); toast('Copied to clipboard'); } catch { toast('Copy failed', 'x'); }
    ta.remove();
    return true;
  }
}

export function downloadFile(filename, content, mime = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Result card with copy/download toolbar */
export function resultCard(title, bodyNode, { copyText: ct = null, download: dl = null, raw = '' } = {}) {
  const head = el('div.result-head',
    el('span.result-title', { text: title })
  );
  const tools = el('div.row', { style: { gap: '8px' } });
  const body = el('div.result-body');
  if (bodyNode instanceof Node) body.append(bodyNode); else body.append(el('div.result-out', { text: String(bodyNode) }));
  if (ct != null || raw) {
    tools.append(el('button.copy-btn', { onclick: () => copyText(ct != null ? ct : raw), html: icon('copy', 14) + ' Copy' }));
  }
  if (dl) {
    tools.append(el('button.copy-btn', { onclick: dl, html: icon('download', 14) + ' Download' }));
  }
  head.append(tools);
  return el('div.result-card', head, body);
}

export function statGrid(stats) {
  return el('div.stat-grid', ...stats.map((s) =>
    el('div.stat', el('div.k', { text: s.label }), el('div.v', { text: String(s.value) }))
  ));
}

/** Live "copy" button that mounts into a container */
export function copyButton(getText, label = 'Copy') {
  return el('button.copy-btn', {
    html: icon('copy', 14) + `<span>${label}</span>`,
    onclick: async (e) => {
      const ok = await copyText(typeof getText === 'function' ? getText() : getText);
      if (ok) {
        const span = e.currentTarget.querySelector('span');
        if (span) { span.textContent = 'Copied!'; setTimeout(() => (span.textContent = label), 1500); }
      }
    },
  });
}

/* ---------- Formatting ---------- */
export const fmt = {
  num(n, digits = 2) {
    if (!isFinite(n)) return '—';
    const s = Number(n).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
    return s;
  },
  money(n, currency = 'USD') {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
    } catch {
      return `${currency} ${fmt.num(n)}`;
    }
  },
  bytes(n) {
    if (n === 0) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(Math.abs(n)) / Math.log(1024)), u.length - 1);
    return `${(n / 1024 ** i).toFixed(i ? 2 : 0)} ${u[i]}`;
  },
  date(d) {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  },
  dur(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  },
  clock(ms) {
    const total = Math.max(0, Math.floor(ms / 10));
    const m = String(Math.floor(total / 6000)).padStart(2, '0');
    const s = String(Math.floor((total % 6000) / 100)).padStart(2, '0');
    const cs = String(total % 100).padStart(2, '0');
    return `${m}:${s}.${cs}`;
  },
  p2(n) { return String(n).padStart(2, '0'); },
};

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Minimal safe markdown → html (bold, italics, code, links, lists, paragraphs) */
export function miniMarkdown(src) {
  const esc = escapeHtml(src);
  let out = esc
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // lists
  out = out.split(/\n{2,}/).map((block) => {
    const lines = block.split('\n');
    if (lines.every((l) => /^\s*(?:[-•*>]|\d+\.)\s+/.test(l))) {
      const items = lines.map((l) => `<li>${l.replace(/^\s*(?:[-•*>]|\d+\.)\s+/, '')}</li>`).join('');
      return `<ul>${items}</ul>`;
    }
    return `<p>${lines.join('<br>')}</p>`;
  }).join('');
  return out;
}

/** Debounce */
export function debounce(fn, ms = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** Lazy-load a CDN script once */
const scriptCache = new Map();
export function loadScript(url) {
  if (scriptCache.has(url)) return scriptCache.get(url);
  const p = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load ${url}`));
    document.head.append(s);
  });
  scriptCache.set(url, p);
  return p;
}

export function readFileAs(file, mode = 'text') {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    if (mode === 'text') r.readAsText(file);
    else if (mode === 'dataURL') r.readAsDataURL(file);
    else r.readAsArrayBuffer(file);
  });
}

export function fileInput({ accept = '', multiple = false, onFiles } = {}) {
  const input = el('input', { type: 'file', accept, multiple, style: { display: 'none' } });
  input.addEventListener('change', () => {
    const files = [...input.files];
    if (files.length) onFiles(files);
    input.value = '';
  });
  return input;
}

/** Upload drop zone */
export function dropZone({ accept = '', onFiles, hint = 'Drag & drop a file here, or click to browse', compact = false } = {}) {
  const input = fileInput({ accept, onFiles });
  const zone = el('div.canvas-stage', {
    style: { cursor: 'pointer', flexDirection: 'column', gap: '8px', padding: compact ? '18px' : '30px' },
    onclick: () => input.click(),
    html: `${icon('download', 26)}<div style="font-size:13.5px;color:var(--muted);font-weight:600;text-align:center">${hint}</div>`,
  });
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = 'var(--accent)'; zone.style.background = 'var(--accent-wash)'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; zone.style.background = ''; });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.style.borderColor = ''; zone.style.background = '';
    const files = [...e.dataTransfer.files];
    if (files.length) onFiles(files);
  });
  const wrap = el('div', zone, input);
  wrap.setHint = (h) => { zone.querySelector('div').textContent = h; };
  return wrap;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
