/* ============================================================
   FormKit — declarative engine for calculators/converters/tools.
   A tool can either define `fields + compute` (auto form) or
   provide `mount(container, api)` for fully custom UIs.
   ============================================================ */
import { el, resultCard, statGrid, fmt, copyButton, toast, debounce } from '../ui.js';
import { icon } from '../icons.js';

export function buildField(f) {
  const wrap = el('div.field', f.half ? { class: 'half' } : {});
  if (f.label) wrap.append(el('label.field-label', { text: f.label }));
  let input;
  switch (f.type) {
    case 'textarea':
      input = el('textarea.textarea', {
        placeholder: f.placeholder || '', rows: f.rows || 5, spellcheck: 'false',
      });
      input.value = f.default ?? '';
      break;
    case 'select':
      input = el('select.select');
      for (const o of f.options || []) {
        const [val, lab] = Array.isArray(o) ? o : [o, o];
        input.append(el('option', { value: val, text: lab }));
      }
      if (f.default != null) input.value = f.default;
      break;
    case 'range':
      input = el('input.range', { type: 'range', min: f.min ?? 0, max: f.max ?? 100, step: f.step ?? 1 });
      input.value = f.default ?? f.min ?? 0;
      if (f.showValue !== false) {
        const out = el('div.field-hint', { text: input.value + (f.unit ? ' ' + f.unit : '') });
        input.addEventListener('input', () => (out.textContent = input.value + (f.unit ? ' ' + f.unit : '')));
        wrap.append(out);
        wrap.dataset.rangeFor = f.id;
        wrap._valueHint = out;
      }
      break;
    case 'checkbox':
      input = el('input', { type: 'checkbox' });
      input.checked = !!f.default;
      const line = el('label.checkline', input, f.checkLabel || f.label || '');
      wrap.innerHTML = '';
      wrap.append(line);
      wrap._input = input;
      input.dataset.fieldId = f.id;
      return wrap;
    case 'color':
      input = el('input.input', { type: 'color', value: f.default || '#DE5D35', style: { padding: '6px', height: '50px', cursor: 'pointer' } });
      break;
    case 'date':
      input = el('input.input', { type: 'date' });
      input.value = f.default || '';
      break;
    case 'time':
      input = el('input.input', { type: 'time' });
      input.value = f.default || '';
      break;
    case 'number':
      input = el('input.input', {
        type: 'number', inputmode: 'decimal',
        min: f.min, max: f.max, step: f.step ?? 'any', placeholder: f.placeholder ?? '',
      });
      input.value = f.default ?? '';
      break;
    default:
      input = el('input.input', { type: 'text', placeholder: f.placeholder || '', spellcheck: 'false' });
      input.value = f.default ?? '';
  }
  input.dataset.fieldId = f.id;
  wrap._input = input;
  wrap.append(input);
  if (f.hint) wrap.append(el('div.field-hint', { text: f.hint }));
  return wrap;
}

export function collectFields(fieldEls) {
  const values = {};
  for (const fWrap of fieldEls) {
    const input = fWrap._input || fWrap.querySelector('[data-field-id]');
    if (!input) continue;
    const id = input.dataset.fieldId;
    if (input.type === 'checkbox') values[id] = input.checked;
    else if (input.type === 'number' || input.type === 'range') values[id] = input.value === '' ? '' : Number(input.value);
    else values[id] = input.value;
  }
  return values;
}

export function renderResult(result, outHost) {
  outHost.innerHTML = '';
  if (result == null) {
    outHost.append(el('div.text-muted', { text: 'Fill in the fields to see the result.', style: { padding: '8px 2px', fontSize: '14px' } }));
    return;
  }
  if (result instanceof Node) { outHost.append(result); return; }
  const r = typeof result === 'string' ? { text: result } : result;
  const parts = [];
  if (r.html) {
    const div = el('div', { html: r.html });
    parts.push(div);
  }
  if (r.stats) parts.push(statGrid(r.stats));
  if (r.text != null && r.text !== '') {
    parts.push(el('div.result-out', { text: r.text }));
  }
  if (r.note) parts.push(el('div.note.mt-2', { html: icon('info', 17) + `<span>${r.note}</span>` }));
  const card = resultCard(r.title || 'Result', el('div.col', { style: { gap: '14px' } }, ...parts), {
    copyText: r.copy != null ? r.copy : (r.text != null ? r.text : null),
    download: r.download
      ? () => r.download()
      : r.downloadText
        ? () => {
          const blob = new Blob([r.downloadText], { type: 'text/plain' });
          const a = el('a', { href: URL.createObjectURL(blob), download: r.downloadName || 'psdkit-result.txt' });
          document.body.append(a); a.click(); a.remove();
        }
        : null,
    raw: r.copy != null ? r.copy : r.text,
  });
  outHost.append(card);
}

/**
 * Mount a declarative tool.
 * def: { fields, compute(values), live?, buttonLabel?, layout? }
 */
export function mountFormTool(def) {
  const form = el('div.tool-form');
  const fieldEls = [];
  let currentRow = null;
  (def.fields || []).forEach((f, i) => {
    const wrap = buildField(f);
    fieldEls.push(wrap);
    if (f.half) {
      if (!currentRow || currentRow.dataset.open !== 'yes') {
        currentRow = el('div.f-row', { dataset: { open: 'yes' } });
        form.append(currentRow);
      }
      currentRow.append(wrap);
      if (currentRow.children.length >= 2) currentRow.dataset.open = 'full';
    } else {
      currentRow = null;
      form.append(wrap);
    }
  });

  const outHost = el('div', { style: { marginTop: '4px' } });
  const run = () => {
    try {
      const values = collectFields(fieldEls);
      const result = def.compute(values);
      if (result && typeof result.then === 'function') {
        outHost.innerHTML = '<div class="skeleton" style="height:90px"></div>';
        result
          .then((r) => renderResult(r, outHost))
          .catch((err) => {
            outHost.innerHTML = '';
            outHost.append(el('div.note', { html: icon('info', 17) + `<span>${err?.message || 'Something went wrong — try again.'}</span>` }));
          });
      } else {
        renderResult(result, outHost);
      }
    } catch (err) {
      outHost.innerHTML = '';
      outHost.append(el('div.note', { html: icon('info', 17) + `<span>${err.message || 'Could not compute — check your inputs.'}</span>` }));
    }
  };

  const liveRun = def.live !== false ? debounce(run, 260) : null;
  form.addEventListener('input', () => { if (liveRun) liveRun(); });
  form.addEventListener('change', () => { if (liveRun) liveRun(); });

  const actions = el('div.tool-actions');
  if (def.live === false || def.buttonLabel) {
    actions.append(el('button.btn.btn-accent', {
      html: `${icon('zap', 17)} ${def.buttonLabel || 'Calculate'}`,
      onclick: run,
    }));
  }
  actions.append(el('button.btn.btn-soft', {
    html: `${icon('refresh', 16)} Reset`,
    onclick: () => {
      fieldEls.forEach((w, i) => {
        const input = w._input;
        const f = def.fields[i];
        if (!input) return;
        if (input.type === 'checkbox') input.checked = !!f.default;
        else input.value = f.default ?? '';
        if (f.type === 'range' && w._valueHint) w._valueHint.textContent = input.value + (f.unit ? ' ' + f.unit : '');
      });
      run();
    },
  }));

  const container = el('div', form, actions, outHost);
  run();
  return container;
}

/* ---------- Shared converters & helpers for tool modules ---------- */

export const UNITS = {
  length: {
    base: 'm',
    units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344, nmi: 1852 },
    labels: { mm: 'Millimetres (mm)', cm: 'Centimetres (cm)', m: 'Metres (m)', km: 'Kilometres (km)', in: 'Inches (in)', ft: 'Feet (ft)', yd: 'Yards (yd)', mi: 'Miles (mi)', nmi: 'Nautical miles' },
  },
  weight: {
    base: 'kg',
    units: { mg: 1e-6, g: 0.001, kg: 1, t: 1000, oz: 0.028349523125, lb: 0.45359237, st: 6.35029318 },
    labels: { mg: 'Milligrams', g: 'Grams (g)', kg: 'Kilograms (kg)', t: 'Tonnes (t)', oz: 'Ounces (oz)', lb: 'Pounds (lb)', st: 'Stones (st)' },
  },
  area: {
    base: 'm2',
    units: { mm2: 1e-6, cm2: 1e-4, m2: 1, km2: 1e6, ha: 1e4, in2: 0.00064516, ft2: 0.09290304, ac: 4046.8564224, mi2: 2589988.110336 },
    labels: { mm2: 'mm²', cm2: 'cm²', m2: 'm² (sq metre)', km2: 'km²', ha: 'Hectares (ha)', in2: 'in²', ft2: 'ft² (sq ft)', ac: 'Acres (ac)', mi2: 'mi²' },
  },
  volume: {
    base: 'l',
    units: { ml: 0.001, l: 1, m3: 1000, tsp: 0.00492892159375, tbsp: 0.01478676478125, floz: 0.0295735295625, cup: 0.2365882365, pt: 0.473176473, qt: 0.946352946, gal: 3.785411784, in3: 0.016387064, ft3: 28.316846592 },
    labels: { ml: 'Millilitres (ml)', l: 'Litres (L)', m3: 'Cubic metres (m³)', tsp: 'Teaspoons', tbsp: 'Tablespoons', floz: 'Fluid ounces (fl oz)', cup: 'Cups', pt: 'Pints (pt)', qt: 'Quarts (qt)', gal: 'Gallons (US gal)', in3: 'Cubic inches', ft3: 'Cubic feet (ft³)' },
  },
  speed: {
    base: 'ms',
    units: { ms: 1, kmh: 0.27777777777778, mph: 0.44704, kn: 0.51444444444444, fts: 0.3048 },
    labels: { ms: 'm/s (metres per second)', kmh: 'km/h', mph: 'mph', kn: 'Knots (kn)', fts: 'ft/s' },
  },
  time: {
    base: 's',
    units: { ms: 0.001, s: 1, min: 60, h: 3600, d: 86400, wk: 604800, mo: 2629800, y: 31557600 },
    labels: { ms: 'Milliseconds', s: 'Seconds (s)', min: 'Minutes (min)', h: 'Hours (h)', d: 'Days (d)', wk: 'Weeks', mo: 'Months (~avg)', y: 'Years (~avg)' },
  },
  data: {
    base: 'B',
    units: { bit: 0.125, B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4, PB: 1024 ** 5, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3 },
    labels: { bit: 'Bits', B: 'Bytes (B)', KB: 'Kilobytes (KB)', MB: 'Megabytes (MB)', GB: 'Gigabytes (GB)', TB: 'Terabytes (TB)', PB: 'Petabytes (PB)', KiB: 'Kibibytes (KiB)', MiB: 'Mebibytes (MiB)', GiB: 'Gibibytes (GiB)' },
  },
  pressure: {
    base: 'pa',
    units: { pa: 1, kpa: 1000, mpa: 1e6, bar: 1e5, mbar: 100, psi: 6894.757293168, atm: 101325, torr: 133.3223684211 },
    labels: { pa: 'Pascal (Pa)', kpa: 'Kilopascal (kPa)', mpa: 'Megapascal (MPa)', bar: 'Bar', mbar: 'Millibar (mbar)', psi: 'PSI (lb/in²)', atm: 'Atmospheres (atm)', torr: 'Torr (mmHg)' },
  },
  energy: {
    base: 'j',
    units: { j: 1, kj: 1000, cal: 4.184, kcal: 4184, wh: 3600, kwh: 3.6e6, btu: 1055.05585262, ev: 1.602176634e-19 },
    labels: { j: 'Joules (J)', kj: 'Kilojoules (kJ)', cal: 'Calories (cal)', kcal: 'Kilocalories (kcal)', wh: 'Watt-hours (Wh)', kwh: 'Kilowatt-hours (kWh)', btu: 'BTU', ev: 'Electronvolts (eV)' },
  },
};

export function converterFields(spec, defaults = {}) {
  const keys = Object.keys(spec.units);
  return [
    {
      id: 'value', label: 'Value', type: 'number', half: true,
      default: defaults.value ?? 1,
    },
    {
      id: 'from', label: 'From', type: 'select', half: true,
      options: keys.map((k) => [k, spec.labels[k] || k]),
      default: defaults.from || keys[0],
    },
    {
      id: 'to', label: 'To', type: 'select',
      options: keys.map((k) => [k, spec.labels[k] || k]),
      default: defaults.to || keys[Math.min(1, keys.length - 1)],
      hint: `1 ${spec.base} is the base unit`,
    },
  ];
}

export function convertUnit(spec, value, from, to) {
  const v = Number(value);
  if (!isFinite(v)) return null;
  const inBase = v * spec.units[from];
  return inBase / spec.units[to];
}

/** Build a full unit-converter tool def from a spec */
export function converterTool(spec, defaults = {}) {
  return {
    fields: converterFields(spec, defaults),
    live: true,
    compute(v) {
      const out = convertUnit(spec, v.value, v.from, v.to);
      if (out == null) return 'Enter a number to convert.';
      const pretty = (n) => fmt.num(n, Math.abs(n) >= 1 ? 6 : 8).replace(/\.?0+$/, (m) => (m.startsWith('.') ? '' : m));
      return {
        title: 'Conversion',
        stats: [
          { label: 'Input', value: `${pretty(Number(v.value))} ${v.from}` },
          { label: 'Result', value: `${pretty(out)} ${v.to}` },
        ],
        text: `${pretty(Number(v.value))} ${spec.labels[v.from] || v.from} = ${pretty(out)} ${spec.labels[v.to] || v.to}`,
        copy: `${pretty(Number(v.value))} ${v.from} = ${pretty(out)} ${v.to}`,
      };
    },
  };
}

/* ---------- Small utils reused by tool modules ---------- */
export function divmod(n, d) { return [Math.floor(n / d), n % d]; }

export function num(v) {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  return isFinite(n) ? n : null;
}

export function wordsCapitalise(s) {
  return s.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
}

export function md5(str) {
  // Compact MD5 implementation (RFC 1321)
  function cmn(q, a, b, x, s, t) {
    a = (a + q + x + t) | 0;
    return (((a << s) | (a >>> (32 - s))) + b) | 0;
  }
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }
  function md5cycle(x, k) {
    let [a, b, c, d] = [x[0], x[1], x[2], x[3]];
    a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586); c = ff(c, d, a, b, k[2], 17, 606105819); b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12, 1200080426); c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417); c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682); d = ff(d, a, b, c, k[13], 12, -40341101); c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632); c = gg(c, d, a, b, k[11], 14, 643717713); b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9, 38016083); c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438); d = gg(d, a, b, c, k[14], 9, -1019803690); c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784); c = gg(c, d, a, b, k[7], 14, 1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463); c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11, 1272893353); c = hh(c, d, a, b, k[7], 16, -155497632); b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174); d = hh(d, a, b, c, k[0], 11, -358537222); c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487); d = hh(d, a, b, c, k[12], 11, -421815835); c = hh(c, d, a, b, k[15], 16, 530742520); b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10, 1126891415); c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571); d = ii(d, a, b, c, k[3], 10, -1894986606); c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359); d = ii(d, a, b, c, k[15], 10, -30611744); c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070); d = ii(d, a, b, c, k[11], 10, -1120210379); c = ii(c, d, a, b, k[2], 15, 718787259); b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = (x[0] + a) | 0; x[1] = (x[1] + b) | 0; x[2] = (x[2] + c) | 0; x[3] = (x[3] + d) | 0;
  }
  function md5blk(s) {
    const md5blks = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }
  function md51(s) {
    const n = s.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i;
    for (i = 64; i <= n; i += 64) md5cycle(state, md5blk(s.substring(i - 64, i)));
    s = s.substring(i - 64);
    const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) {
      md5cycle(state, tail);
      for (let j = 0; j < 16; j++) tail[j] = 0;
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }
  const hex_chr = '0123456789abcdef'.split('');
  function rhex(n) {
    let s = '';
    for (let j = 0; j < 4; j++) s += hex_chr[(n >> (j * 8 + 4)) & 0x0f] + hex_chr[(n >> (j * 8)) & 0x0f];
    return s;
  }
  const out = md51(str);
  return rhex(out[0]) + rhex(out[1]) + rhex(out[2]) + rhex(out[3]);
}

/* ── SHA-1 / SHA-256 / SHA-512 ──────────────────────────────────────────
   Web Crypto first, with a pure-JS fallback.

   crypto.subtle only exists in a secure context. Open the site over plain HTTP
   (a LAN IP, a dev box on a phone) and it is undefined, so hashing used to die
   with an unhandled rejection. MD5 already ships a JS implementation for the
   same reason, so these do too. */

/* SHA-512 round constants — the first 64 bits of the fractional parts of the
   cube roots of the first 80 primes. SHA-256's constants are the same values
   truncated to 32 bits, so they are derived rather than duplicated. */
const K512_HEX = [
  '428a2f98d728ae22', '7137449123ef65cd', 'b5c0fbcfec4d3b2f', 'e9b5dba58189dbbc',
  '3956c25bf348b538', '59f111f1b605d019', '923f82a4af194f9b', 'ab1c5ed5da6d8118',
  'd807aa98a3030242', '12835b0145706fbe', '243185be4ee4b28c', '550c7dc3d5ffb4e2',
  '72be5d74f27b896f', '80deb1fe3b1696b1', '9bdc06a725c71235', 'c19bf174cf692694',
  'e49b69c19ef14ad2', 'efbe4786384f25e3', '0fc19dc68b8cd5b5', '240ca1cc77ac9c65',
  '2de92c6f592b0275', '4a7484aa6ea6e483', '5cb0a9dcbd41fbd4', '76f988da831153b5',
  '983e5152ee66dfab', 'a831c66d2db43210', 'b00327c898fb213f', 'bf597fc7beef0ee4',
  'c6e00bf33da88fc2', 'd5a79147930aa725', '06ca6351e003826f', '142929670a0e6e70',
  '27b70a8546d22ffc', '2e1b21385c26c926', '4d2c6dfc5ac42aed', '53380d139d95b3df',
  '650a73548baf63de', '766a0abb3c77b2a8', '81c2c92e47edaee6', '92722c851482353b',
  'a2bfe8a14cf10364', 'a81a664bbc423001', 'c24b8b70d0f89791', 'c76c51a30654be30',
  'd192e819d6ef5218', 'd69906245565a910', 'f40e35855771202a', '106aa07032bbd1b8',
  '19a4c116b8d2d0c8', '1e376c085141ab53', '2748774cdf8eeb99', '34b0bcb5e19b48a8',
  '391c0cb3c5c95a63', '4ed8aa4ae3418acb', '5b9cca4f7763e373', '682e6ff3d6b2b8a3',
  '748f82ee5defb2fc', '78a5636f43172f60', '84c87814a1f0ab72', '8cc702081a6439ec',
  '90befffa23631e28', 'a4506cebde82bde9', 'bef9a3f7b2c67915', 'c67178f2e372532b',
  'ca273eceea26619c', 'd186b8c721c0c207', 'eada7dd6cde0eb1e', 'f57d4f7fee6ed178',
  '06f067aa72176fba', '0a637dc5a2c898a6', '113f9804bef90dae', '1b710b35131c471b',
  '28db77f523047d84', '32caab7b40c72493', '3c9ebe0a15c9bebc', '431d67c49c100d4c',
  '4cc5d4becb3e42b6', '597f299cfc657e2a', '5fcb6fab3ad6faec', '6c44198c4a475817',
];
const K256 = K512_HEX.slice(0, 64).map((h) => h.slice(0, 8));

const rotr = (x, n) => (x >>> n) | (x << (32 - n));

/** Append the 0x80 marker, zero-pad, then the big-endian bit length. */
function padMessage(bytes, block) {
  /* The length field is 64 bits for SHA-1/256 and 128 bits for SHA-512, so the
     reserved tail differs per block size — get this wrong and an input that
     happens to land exactly on a block boundary gains a spurious zero block. */
  const lenField = block / 8;
  const len = Math.ceil((bytes.length + 1 + lenField) / block) * block;
  const out = new Uint8Array(len);
  out.set(bytes);
  out[bytes.length] = 0x80;
  const bits = bytes.length * 8;
  const dv = new DataView(out.buffer);
  /* Only the low 64 bits are ever non-zero for browser-sized input; the upper
     half of a SHA-512 length field stays zero from the allocation above. */
  dv.setUint32(len - 8, Math.floor(bits / 4294967296) >>> 0, false);
  dv.setUint32(len - 4, bits >>> 0, false);
  return out;
}

function sha1(bytes) {
  const msg = padMessage(bytes, 64);
  const dv = new DataView(msg.buffer);
  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);
  for (let off = 0; off < msg.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4, false);
    for (let i = 16; i < 80; i++) w[i] = ((w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]) << 1) | ((w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]) >>> 31);
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let i = 0; i < 80; i++) {
      let f, k;
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const t = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) >>> 0;
      e = d; d = c; c = ((b << 30) | (b >>> 2)) >>> 0; b = a; a = t;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }
  return [h0, h1, h2, h3, h4].map((x) => x.toString(16).padStart(8, '0')).join('');
}

function sha256(bytes) {
  const msg = padMessage(bytes, 64);
  const dv = new DataView(msg.buffer);
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Uint32Array(64);
  for (let off = 0; off < msg.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + parseInt(K256[i], 16) + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return H.map((x) => x.toString(16).padStart(8, '0')).join('');
}

function sha512(bytes) {
  /* 64-bit words as [hi, lo] 32-bit pairs — JS has no native 64-bit int. */
  const msg = padMessage(bytes, 128);
  const dv = new DataView(msg.buffer);
  const H = [
    [0x6a09e667, 0xf3bcc908], [0xbb67ae85, 0x84caa73b], [0x3c6ef372, 0xfe94f82b], [0xa54ff53a, 0x5f1d36f1],
    [0x510e527f, 0xade682d1], [0x9b05688c, 0x2b3e6c1f], [0x1f83d9ab, 0xfb41bd6b], [0x5be0cd19, 0x137e2179],
  ];
  const K = K512_HEX.map((h) => [parseInt(h.slice(0, 8), 16), parseInt(h.slice(8), 16)]);
  const w = Array.from({ length: 80 }, () => [0, 0]);
  const add = (ah, al, bh, bl) => {
    const lo = (al + bl) >>> 0;
    return [(ah + bh + (lo < al >>> 0 ? 1 : 0)) >>> 0, lo];
  };
  const rotr64 = (h, l, n) => (n < 32
    ? [((h >>> n) | (l << (32 - n))) >>> 0, ((l >>> n) | (h << (32 - n))) >>> 0]
    : [((l >>> (n - 32)) | (h << (64 - n))) >>> 0, ((h >>> (n - 32)) | (l << (64 - n))) >>> 0]);
  const shr64 = (h, l, n) => (n < 32 ? [(h >>> n) >>> 0, ((l >>> n) | (h << (32 - n))) >>> 0] : [0, (h >>> (n - 32)) >>> 0]);

  for (let off = 0; off < msg.length; off += 128) {
    for (let i = 0; i < 16; i++) { w[i][0] = dv.getUint32(off + i * 8, false); w[i][1] = dv.getUint32(off + i * 8 + 4, false); }
    for (let i = 16; i < 80; i++) {
      const [a15h, a15l] = w[i - 15], [a2h, a2l] = w[i - 2];
      const s0 = [rotr64(a15h, a15l, 1)[0] ^ rotr64(a15h, a15l, 8)[0] ^ shr64(a15h, a15l, 7)[0],
        rotr64(a15h, a15l, 1)[1] ^ rotr64(a15h, a15l, 8)[1] ^ shr64(a15h, a15l, 7)[1]];
      const s1 = [rotr64(a2h, a2l, 19)[0] ^ rotr64(a2h, a2l, 61)[0] ^ shr64(a2h, a2l, 6)[0],
        rotr64(a2h, a2l, 19)[1] ^ rotr64(a2h, a2l, 61)[1] ^ shr64(a2h, a2l, 6)[1]];
      w[i] = add(...add(w[i - 16][0], w[i - 16][1], s0[0], s0[1]), w[i - 7][0], w[i - 7][1]);
      w[i] = add(w[i][0], w[i][1], s1[0], s1[1]);
    }
    let [ah, al] = H[0], [bh, bl] = H[1], [ch, cl] = H[2], [dh, dl] = H[3];
    let [eh, el] = H[4], [fh, fl] = H[5], [gh, gl] = H[6], [hh, hl] = H[7];
    for (let i = 0; i < 80; i++) {
      const S1 = [rotr64(eh, el, 14)[0] ^ rotr64(eh, el, 18)[0] ^ rotr64(eh, el, 41)[0],
        rotr64(eh, el, 14)[1] ^ rotr64(eh, el, 18)[1] ^ rotr64(eh, el, 41)[1]];
      const choose = [(eh & fh) ^ (~eh & gh), (el & fl) ^ (~el & gl)];
      const t1 = add(...add(hh, hl, S1[0], S1[1]), choose[0], choose[1]);
      const t1b = add(...add(t1[0], t1[1], K[i][0], K[i][1]), w[i][0], w[i][1]);
      const S0 = [rotr64(ah, al, 28)[0] ^ rotr64(ah, al, 34)[0] ^ rotr64(ah, al, 39)[0],
        rotr64(ah, al, 28)[1] ^ rotr64(ah, al, 34)[1] ^ rotr64(ah, al, 39)[1]];
      const maj = [(ah & bh) ^ (ah & ch) ^ (bh & ch), (al & bl) ^ (al & cl) ^ (bl & cl)];
      const t2 = add(S0[0], S0[1], maj[0], maj[1]);
      hh = gh; hl = gl; gh = fh; gl = fl; fh = eh; fl = el;
      [eh, el] = add(dh, dl, t1b[0], t1b[1]);
      dh = ch; dl = cl; ch = bh; cl = bl; bh = ah; bl = al;
      [ah, al] = add(t1b[0], t1b[1], t2[0], t2[1]);
    }
    H[0] = add(H[0][0], H[0][1], ah, al); H[1] = add(H[1][0], H[1][1], bh, bl);
    H[2] = add(H[2][0], H[2][1], ch, cl); H[3] = add(H[3][0], H[3][1], dh, dl);
    H[4] = add(H[4][0], H[4][1], eh, el); H[5] = add(H[5][0], H[5][1], fh, fl);
    H[6] = add(H[6][0], H[6][1], gh, gl); H[7] = add(H[7][0], H[7][1], hh, hl);
  }
  return H.map(([h, l]) => (h >>> 0).toString(16).padStart(8, '0') + (l >>> 0).toString(16).padStart(8, '0')).join('');
}

/* ── Colour parsing ─────────────────────────────────────────────────────
   Normalising a colour used to rely on assigning it to canvas.fillStyle and
   reading it back. That silently reports black for anything the browser
   rejects, and does nothing at all when there is no 2D context. Parsing it
   directly is deterministic and needs no canvas. */

const NAMED_COLOURS = {
  black: '000000', white: 'ffffff', red: 'ff0000', green: '008000', lime: '00ff00', blue: '0000ff',
  yellow: 'ffff00', cyan: '00ffff', aqua: '00ffff', magenta: 'ff00ff', fuchsia: 'ff00ff',
  silver: 'c0c0c0', gray: '808080', grey: '808080', maroon: '800000', olive: '808000',
  purple: '800080', teal: '008080', navy: '000080', orange: 'ffa500', orangered: 'ff4500',
  pink: 'ffc0cb', hotpink: 'ff69b4', brown: 'a52a2a', gold: 'ffd700', coral: 'ff7f50',
  salmon: 'fa8072', tomato: 'ff6347', crimson: 'dc143c', indigo: '4b0082', violet: 'ee82ee',
  plum: 'dda0dd', orchid: 'da70d6', khaki: 'f0e68c', ivory: 'fffff0', beige: 'f5f5dc',
  turquoise: '40e0d0', skyblue: '87ceeb', steelblue: '4682b4', slategray: '708090',
  seagreen: '2e8b57', forestgreen: '228b22', darkgreen: '006400', darkblue: '00008b',
  darkred: '8b0000', darkgray: 'a9a9a9', lightgray: 'd3d3d3', lightblue: 'add8e6',
  mintcream: 'f5fffa', lavender: 'e6e6fa', wheat: 'f5deb3', tan: 'd2b48c', chocolate: 'd2691e',
};

const byte = (n) => Math.max(0, Math.min(255, Math.round(n)));

function hslToRgb(h, s, l) {
  const hh = ((Number(h) % 360) + 360) % 360 / 360;
  const ss = Math.max(0, Math.min(100, Number(s))) / 100;
  const ll = Math.max(0, Math.min(100, Number(l))) / 100;
  if (!ss) { const v = byte(ll * 255); return { r: v, g: v, b: v }; }
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const conv = (t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return { r: byte(conv(hh + 1 / 3) * 255), g: byte(conv(hh) * 255), b: byte(conv(hh - 1 / 3) * 255) };
}

/** Parse `#rgb`, `#rrggbb(aa)`, `rgb()`, `hsl()` or a common CSS name → `{r,g,b}` or null. */
export function parseColour(input) {
  const s = String(input ?? '').trim().toLowerCase();
  if (!s) return null;
  const fromHex = (h) => ({ r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) });
  if (s[0] === '#') {
    const h = s.slice(1);
    if (/^[0-9a-f]{3}$/.test(h)) return fromHex(h.split('').map((c) => c + c).join(''));
    if (/^[0-9a-f]{6}$/.test(h) || /^[0-9a-f]{8}$/.test(h)) return fromHex(h);
    return null;
  }
  if (NAMED_COLOURS[s]) return fromHex(NAMED_COLOURS[s]);
  const nums = (s.match(/-?\d*\.?\d+/g) || []).map(Number);
  if (/^rgba?\(/.test(s) && nums.length >= 3) return { r: byte(nums[0]), g: byte(nums[1]), b: byte(nums[2]) };
  if (/^hsla?\(/.test(s) && nums.length >= 3) return hslToRgb(nums[0], nums[1], nums[2]);
  if (nums.length === 3 && /^[\d\s,.]+$/.test(s)) return { r: byte(nums[0]), g: byte(nums[1]), b: byte(nums[2]) };
  return null;
}

/** `#rrggbb` for any `{r,g,b}`. */
export const rgbToHex = ({ r, g, b }) => '#' + [r, g, b].map((n) => byte(n).toString(16).padStart(2, '0')).join('');

const JS_HASH = { 'SHA-1': sha1, 'SHA-256': sha256, 'SHA-512': sha512 };

/** Normalise a string / ArrayBuffer / typed array into bytes. */
function toBytes(input) {
  if (typeof input === 'string') return new TextEncoder().encode(input);
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  /* Anything else would previously be stringified to "[object ArrayBuffer]" and
     hashed as that literal text — every file came out with the same checksum. */
  throw new TypeError(`cannot hash a ${typeof input}`);
}

export async function shaDigest(input, algo) {
  const data = toBytes(input);
  const subtle = globalThis.crypto?.subtle;
  if (subtle?.digest) {
    const buf = await subtle.digest(algo, data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  const js = JS_HASH[String(algo).toUpperCase()];
  if (!js) throw new Error(`${algo} is not available without Web Crypto`);
  return js(data);
}

