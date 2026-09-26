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

export async function shaDigest(text, algo) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest(algo, data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
