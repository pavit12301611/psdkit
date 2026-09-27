/* ============================================================
   EXTRA TOOLS — the 2026 batch.
   10 daily · 3 internet · 6 essentials · 7 coding = 26 tools.
   Every tool here is self-contained: no new dependencies, no
   network calls unless a tool clearly says so.
   ============================================================ */
import { el, fmt, copyText, toast, downloadFile, readFileAs, dropZone, debounce, copyButton } from '../ui.js';
import { icon } from '../icons.js';
import { num } from './formkit.js';

/* ── shared helpers ── */
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const round = (n, d = 2) => Number(Number(n).toFixed(d));
const inr = (n) => `₹${fmt.num(n, 0)}`;

/** Wrap a table in a horizontal scroller so it can never push out of a panel. */
function scrollTable(headers, rows, { minWidth = 150 } = {}) {
  const tbl = el('table.mini-table', { style: { minWidth: `${headers.length * minWidth}px` } });
  tbl.append(el('thead', el('tr', ...headers.map((h) => el('th', { text: h })))));
  tbl.append(el('tbody', ...rows.map((r) => el('tr', ...r.map((c) => el('td', c instanceof Node ? c : { text: String(c) }))))));
  return el('div.table-scroll', tbl);
}

/* Roman numerals ───────────────────────────────────────────── */
const ROMAN_PAIRS = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];
function toRoman(n) {
  let out = '';
  for (const [value, sym] of ROMAN_PAIRS) while (n >= value) { out += sym; n -= value; }
  return out;
}
function fromRoman(s) {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const up = String(s).trim().toUpperCase();
  if (!up || /[^IVXLCDM]/.test(up)) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = map[up[i]];
    const next = map[up[i + 1]];
    if (next && next > cur) { total += next - cur; i++; } else total += cur;
  }
  /* reject malformed forms like IIII or VX by round-tripping */
  return toRoman(total) === up ? total : null;
}

/* Indian income tax, FY 2025-26 ────────────────────────────── */
const NEW_SLABS = [[400000, 0], [800000, 0.05], [1200000, 0.10], [1600000, 0.15], [2000000, 0.20], [2400000, 0.25], [Infinity, 0.30]];
const OLD_SLABS = [[250000, 0], [500000, 0.05], [1000000, 0.20], [Infinity, 0.30]];

function slabTax(taxable, slabs) {
  let tax = 0;
  let prev = 0;
  for (const [limit, rate] of slabs) {
    if (taxable <= prev) break;
    tax += (Math.min(taxable, limit) - prev) * rate;
    prev = limit;
  }
  return tax;
}

function incomeTaxIndia({ income, salaried, deductions, ageBand }) {
  const seniorExtra = ageBand === 'senior' ? 250000 : ageBand === 'super' ? 500000 : 0;
  /* New regime: 75k standard deduction, 87A rebate up to 12L taxable income. */
  const newTaxable = Math.max(0, income - (salaried ? 75000 : 0));
  let newTax = slabTax(newTaxable, NEW_SLABS);
  if (newTaxable <= 1200000) newTax = 0;
  /* Old regime: 50k standard deduction + chapter VI-A, basic exemption rises
     with age, 87A rebate up to 5L taxable income. */
  const oldSlabs = OLD_SLABS.map(([limit, rate], i) => (i === 0 ? [limit + seniorExtra, rate] : [limit + seniorExtra, rate]));
  const oldTaxable = Math.max(0, income - (salaried ? 50000 : 0) - deductions);
  let oldTax = slabTax(oldTaxable, oldSlabs);
  if (oldTaxable <= 500000) oldTax = 0;
  const withCess = (t) => round(t * 1.04, 0);
  return {
    newRegime: { taxable: round(newTaxable, 0), tax: withCess(newTax) },
    oldRegime: { taxable: round(oldTaxable, 0), tax: withCess(oldTax) },
  };
}

/* Unit normalisation for the price comparator ──────────────── */
const UNIT_TO_BASE = {
  g: ['weight', 1], kg: ['weight', 1000], mg: ['weight', 0.001], lb: ['weight', 453.592], oz: ['weight', 28.3495],
  ml: ['volume', 1], l: ['volume', 1000], floz: ['volume', 29.5735], cup: ['volume', 236.588], tsp: ['volume', 4.929], tbsp: ['volume', 14.787],
  cm: ['length', 1], m: ['length', 100], in: ['length', 2.54], ft: ['length', 30.48], yd: ['length', 91.44],
  piece: ['count', 1], pack: ['count', 1], dozen: ['count', 12], sqft: ['area', 1], sqm: ['area', 10.7639], acre: ['area', 43560],
};
const UNIT_KIND = (u) => UNIT_TO_BASE[u]?.[0] || 'count';
const toBase = (qty, u) => qty * (UNIT_TO_BASE[u]?.[1] ?? 1);
const BASE_LABEL = { weight: 'g', volume: 'ml', length: 'cm', count: 'piece', area: 'sq ft' };

/* Passphrase word list — 128 common words = exactly 7 bits each */
const PASSPHRASE_WORDS = (
  'apple river cloud stone light dream brave quiet swift ocean mountain forest silver golden hidden '
  + 'amber cedar coral delta ember falcon glacier harbor ivory jasmine kite lotus marble nectar olive '
  + 'pearl quartz radar summit tulip umber velvet willow xenon yarn zephyr anchor blossom candle dune '
  + 'echo fern grove horizon island juniper karma lunar meadow nimbus orbit pebble quill rustic sage '
  + 'timber urban vivid wander yeti zenith arch beacon cliff dome exile fable glide haven index jewel '
  + 'knack ledger melody notch opal plaza quest relic spark trail unity valve whisker yard zeal bloom'
).split(/\s+/);

export const EXTRA_IMPLS = {
  /* ══════════════ DAILY (10) ══════════════ */

  'roman-numeral': {
    fields: [
      { id: 'input', label: 'Number or Roman numeral', type: 'text', default: '2026', placeholder: 'e.g. 2026 or MMXXVI' },
    ],
    live: true,
    compute(v) {
      const raw = String(v.input || '').trim();
      if (!raw) return 'Type a number (1–3999) or a Roman numeral.';
      const asNumber = num(raw.replace(/,/g, ''));
      if (asNumber != null && Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= 3999) {
        const roman = toRoman(asNumber);
        return {
          title: 'Roman numeral',
          stats: [{ label: 'Number', value: fmt.num(asNumber, 0) }, { label: 'Roman', value: roman }, { label: 'Digits', value: roman.length }],
          text: `${fmt.num(asNumber, 0)} = ${roman}`,
          copy: roman,
        };
      }
      const parsed = fromRoman(raw);
      if (parsed == null) {
        return {
          title: 'Roman numeral',
          text: 'Could not read that. Use a number from 1 to 3999, or a valid Roman numeral built from I, V, X, L, C, D and M.',
          note: 'Repeated forms like IIII or VX are not valid — the standard form of 4 is IV.',
        };
      }
      return {
        title: 'Roman numeral',
        stats: [{ label: 'Roman', value: raw.toUpperCase() }, { label: 'Number', value: fmt.num(parsed, 0) }],
        text: `${raw.toUpperCase()} = ${fmt.num(parsed, 0)}`,
        copy: String(parsed),
      };
    },
  },

  'fraction-calc': {
    fields: [
      { id: 'an', label: 'A numerator', type: 'number', half: true, default: 3 },
      { id: 'ad', label: 'A denominator', type: 'number', half: true, default: 4 },
      { id: 'op', label: 'Operation', type: 'select', options: [['+', 'Add (+)'], ['-', 'Subtract (−)'], ['*', 'Multiply (×)'], ['/', 'Divide (÷)']], default: '+' },
      { id: 'bn', label: 'B numerator', type: 'number', half: true, default: 1 },
      { id: 'bd', label: 'B denominator', type: 'number', half: true, default: 6 },
    ],
    live: true,
    compute(v) {
      const an = num(v.an); const ad = num(v.ad); const bn = num(v.bn); const bd = num(v.bd);
      if ([an, ad, bn, bd].some((x) => x == null)) return 'Fill in all four numbers.';
      if (ad === 0 || bd === 0) return 'A denominator cannot be zero.';
      let rn; let rd;
      switch (v.op) {
        case '-': rn = an * bd - bn * ad; rd = ad * bd; break;
        case '*': rn = an * bn; rd = ad * bd; break;
        case '/':
          if (bn === 0) return 'Cannot divide by a zero fraction.';
          rn = an * bd; rd = ad * bn; break;
        default: rn = an * bd + bn * ad; rd = ad * bd;
      }
      const sign = rn * rd < 0 ? '-' : '';
      const g = gcd(rn, rd) || 1;
      const sn = Math.abs(Math.round(rn / g)); const sd = Math.abs(Math.round(rd / g));
      const whole = Math.floor(sn / sd);
      const rem = sn % sd;
      const mixed = sd === 1 ? `${sign}${sn}` : whole && rem ? `${sign}${whole} ${rem}/${sd}` : `${sign}${sn}/${sd}`;
      const opSym = { '+': '+', '-': '−', '*': '×', '/': '÷' }[v.op];
      return {
        title: 'Fraction result',
        stats: [
          { label: 'Result', value: sd === 1 ? `${sign}${sn}` : `${sign}${sn}/${sd}` },
          { label: 'Mixed number', value: mixed },
          { label: 'Decimal', value: round(rn / rd, 6) },
          { label: 'Percentage', value: `${round((rn / rd) * 100, 4)}%` },
        ],
        text: `${an}/${ad} ${opSym} ${bn}/${bd} = ${sign}${sn}/${sd} = ${mixed} ≈ ${round(rn / rd, 6)}`,
        copy: `${sign}${sn}/${sd}`,
        note: sd === 1 ? 'The result is a whole number.' : 'The fraction is already in its simplest form.',
      };
    },
  },

  'cgpa-percentage': {
    fields: [
      { id: 'value', label: 'Value', type: 'number', half: true, default: 8.5, step: '0.01' },
      { id: 'direction', label: 'Convert', type: 'select', half: true, options: [
        ['to-pct', 'CGPA → Percentage'], ['to-cgpa', 'Percentage → CGPA'],
      ], default: 'to-pct' },
      { id: 'method', label: 'Formula used by your board / university', type: 'select', options: [
        ['cbse', 'CGPA × 9.5 (CBSE / most schools)'],
        ['minus075', '(CGPA − 0.75) × 10 (many universities)'],
        ['times10', 'CGPA × 10 (straight 10-point scale)'],
        ['four', 'CGPA × 25 (4.0 scale, e.g. US grading)'],
      ], default: 'cbse' },
    ],
    live: true,
    compute(v) {
      const x = num(v.value);
      if (x == null) return 'Enter your CGPA or percentage.';
      const F = {
        cbse: { toPct: (c) => c * 9.5, fromPct: (p) => p / 9.5, max: 10, label: 'CGPA × 9.5' },
        minus075: { toPct: (c) => (c - 0.75) * 10, fromPct: (p) => p / 10 + 0.75, max: 10, label: '(CGPA − 0.75) × 10' },
        times10: { toPct: (c) => c * 10, fromPct: (p) => p / 10, max: 10, label: 'CGPA × 10' },
        four: { toPct: (c) => c * 25, fromPct: (p) => p / 25, max: 4, label: 'CGPA × 25' },
      }[v.method];
      if (v.direction === 'to-cgpa') {
        if (x < 0 || x > 100) return 'Enter a percentage between 0 and 100.';
        const cgpa = round(F.fromPct(x), 2);
        return {
          title: 'Percentage → CGPA',
          stats: [
            { label: 'Percentage', value: `${round(x, 2)}%` },
            { label: 'CGPA', value: cgpa },
            { label: 'Scale', value: `out of ${F.max}` },
            { label: 'Formula', value: F.label },
          ],
          text: `${x}% ≈ ${cgpa} CGPA (out of ${F.max}) using ${F.label}`,
          copy: String(cgpa),
          note: 'Always use the formula printed on your own marksheet — universities differ.',
        };
      }
      if (x < 0 || x > F.max) return `Enter a CGPA between 0 and ${F.max} for this formula.`;
      const pct = round(F.toPct(x), 2);
      const grade = pct >= 90 ? 'Outstanding (A+)' : pct >= 80 ? 'Excellent (A)' : pct >= 70 ? 'Very good (B+)'
        : pct >= 60 ? 'Good (B)' : pct >= 50 ? 'Average (C)' : pct >= 40 ? 'Below average (D)' : 'Fail (F)';
      return {
        title: 'CGPA → Percentage',
        stats: [
          { label: 'CGPA', value: x },
          { label: 'Percentage', value: `${pct}%` },
          { label: 'Grade band', value: grade },
          { label: 'Formula', value: F.label },
        ],
        text: `${x} CGPA ≈ ${pct}% using ${F.label}`,
        copy: `${pct}%`,
      };
    },
  },

  'attendance-calc': {
    fields: [
      { id: 'held', label: 'Classes / days held so far', type: 'number', half: true, default: 120 },
      { id: 'attended', label: 'Classes / days you attended', type: 'number', half: true, default: 84 },
      { id: 'required', label: 'Minimum attendance required (%)', type: 'number', half: true, default: 75, min: 1, max: 100 },
      { id: 'future', label: 'Classes still to come (optional)', type: 'number', half: true, default: 30 },
    ],
    live: true,
    compute(v) {
      const held = num(v.held); const attended = num(v.attended); const req = num(v.required);
      if (held == null || attended == null || req == null) return 'Fill in held, attended and the required percentage.';
      if (attended > held) return 'Attended cannot be more than held.';
      if (held <= 0) return 'Classes held must be more than zero.';
      if (req <= 0 || req >= 100) return 'Required percentage must be between 1 and 99.';
      const r = req / 100;
      const pct = (attended / held) * 100;
      /* How many future classes can be skipped while staying at/above req? */
      const canSkip = Math.floor(attended / r - held);
      /* How many consecutive future classes must be attended to reach req? */
      const mustAttend = Math.ceil((r * held - attended) / (1 - r));
      const future = num(v.future);
      const stats = [
        { label: 'Current attendance', value: `${round(pct, 2)}%` },
        { label: 'Short by', value: pct >= req ? 'Nothing 🎉' : `${round(req - pct, 2)}%` },
        { label: 'You can skip', value: canSkip > 0 ? `${canSkip} class${canSkip === 1 ? '' : 'es'}` : '0' },
        { label: 'Must attend next', value: mustAttend > 0 ? `${mustAttend} in a row` : 'None' },
      ];
      let projected = '';
      if (future != null && future > 0) {
        const best = ((attended + future) / (held + future)) * 100;
        const worst = (attended / (held + future)) * 100;
        stats.push({ label: 'If you attend all', value: `${round(best, 2)}%` });
        stats.push({ label: 'If you skip all', value: `${round(worst, 2)}%` });
        const needed = Math.ceil((r * (held + future) - attended));
        projected = `\nWith ${future} more class${future === 1 ? '' : 'es'}: attend at least ${Math.max(0, Math.min(future, needed))} of them to finish at ${req}% or above.`;
      }
      return {
        title: 'Attendance report',
        stats,
        text: `Attended ${attended} of ${held} = ${round(pct, 2)}% (target ${req}%)${projected}`,
        copy: `${round(pct, 2)}%`,
        note: pct >= req
          ? 'You are safely above the requirement — the "can skip" number keeps you exactly at the limit.'
          : 'You are below the requirement. Attend every class until the gap closes.',
      };
    },
  },

  'income-tax-india': {
    fields: [
      { id: 'income', label: 'Annual income (₹)', type: 'number', default: 1200000 },
      { id: 'salaried', type: 'checkbox', default: true, checkLabel: 'Salaried — apply standard deduction' },
      { id: 'deductions', label: 'Old-regime deductions: 80C, HRA, interest etc. (₹)', type: 'number', default: 150000, hint: 'Only used for the old regime. The new regime allows almost no deductions.' },
      { id: 'age', label: 'Age band', type: 'select', options: [
        ['below60', 'Below 60 years'], ['senior', 'Senior citizen (60–80)'], ['super', 'Super senior (80+)'],
      ], default: 'below60' },
    ],
    live: true,
    compute(v) {
      const income = num(v.income);
      if (income == null || income < 0) return 'Enter your annual income in rupees.';
      const deductions = num(v.deductions) || 0;
      const { newRegime, oldRegime } = incomeTaxIndia({
        income, salaried: !!v.salaried, deductions, ageBand: v.age,
      });
      const better = newRegime.tax <= oldRegime.tax ? 'New regime' : 'Old regime';
      const saving = Math.abs(newRegime.tax - oldRegime.tax);
      return {
        title: `FY 2025-26 (AY 2026-27) — ${better} is cheaper`,
        stats: [
          { label: 'New regime tax', value: inr(newRegime.tax) },
          { label: 'Old regime tax', value: inr(oldRegime.tax) },
          { label: 'You save with', value: better },
          { label: 'Saving', value: inr(saving) },
          { label: 'Take home / month', value: inr(round((income - (better === 'New regime' ? newRegime.tax : oldRegime.tax)) / 12, 0)) },
          { label: 'Effective rate', value: `${round(((better === 'New regime' ? newRegime.tax : oldRegime.tax) / (income || 1)) * 100, 2)}%` },
        ],
        text: [
          `Annual income: ${inr(income)}`,
          '',
          'New regime',
          `  Taxable after deduction: ${inr(newRegime.taxable)}`,
          `  Tax + 4% cess:           ${inr(newRegime.tax)}`,
          newRegime.taxable <= 1200000 ? '  Rebate u/s 87A applies — tax is nil.' : '',
          '',
          'Old regime',
          `  Taxable after deductions: ${inr(oldRegime.taxable)}`,
          `  Tax + 4% cess:            ${inr(oldRegime.tax)}`,
          oldRegime.taxable <= 500000 ? '  Rebate u/s 87A applies — tax is nil.' : '',
          '',
          `Cheaper option: ${better} (you save ${inr(saving)})`,
        ].filter((l) => l !== '').join('\n'),
        note: 'Indicative only — slab rates for FY 2025-26 with the 4% health and education cess. It ignores surcharge, perquisites and TDS. Confirm with a chartered accountant or the income-tax portal.',
      };
    },
  },

  'fd-rd-calc': {
    fields: [
      { id: 'type', label: 'Scheme', type: 'select', half: true, options: [
        ['fd', 'Fixed Deposit (lump sum)'], ['rd', 'Recurring Deposit (monthly)'],
      ], default: 'fd' },
      { id: 'freq', label: 'Compounding', type: 'select', half: true, options: [
        ['12', 'Monthly'], ['4', 'Quarterly'], ['2', 'Half-yearly'], ['1', 'Yearly'],
      ], default: '4' },
      { id: 'amount', label: 'Amount (₹)', type: 'number', half: true, default: 100000, hint: 'For an RD this is the monthly instalment.' },
      { id: 'rate', label: 'Interest rate (% per year)', type: 'number', half: true, default: 7.2, step: '0.01' },
      { id: 'years', label: 'Tenure (years)', type: 'number', default: 5, step: '0.5', min: 0.5 },
    ],
    live: true,
    compute(v) {
      const amount = num(v.amount); const rate = num(v.rate); const years = num(v.years);
      const n = Number(v.freq) || 4;
      if (amount == null || rate == null || years == null) return 'Fill in the amount, rate and tenure.';
      if (amount <= 0) return 'Amount must be more than zero.';
      if (rate < 0 || rate > 30) return 'Rate must be between 0 and 30%.';
      if (years <= 0 || years > 50) return 'Tenure must be between 0.5 and 50 years.';
      const r = rate / 100;
      let invested; let maturity;
      if (v.type === 'fd') {
        invested = amount;
        maturity = amount * (1 + r / n) ** (n * years);
      } else {
        /* Each monthly instalment earns interest from the month it is paid. */
        const months = Math.round(years * 12);
        invested = amount * months;
        maturity = 0;
        for (let m = 0; m < months; m++) {
          const remainingYears = (months - m) / 12;
          maturity += amount * (1 + r / n) ** (n * remainingYears);
        }
      }
      const interest = maturity - invested;
      return {
        title: v.type === 'fd' ? 'Fixed deposit maturity' : 'Recurring deposit maturity',
        stats: [
          { label: 'You invest', value: inr(round(invested, 0)) },
          { label: 'Maturity value', value: inr(round(maturity, 0)) },
          { label: 'Interest earned', value: inr(round(interest, 0)) },
          { label: 'Growth', value: `${round((interest / invested) * 100, 2)}%` },
          { label: 'Compounded', value: `${n === 12 ? 'Monthly' : n === 4 ? 'Quarterly' : n === 2 ? 'Half-yearly' : 'Yearly'}` },
          { label: 'Tenure', value: `${years} yr` },
        ],
        text: `${v.type === 'fd' ? 'Lump sum' : 'Monthly'} ${inr(amount)} at ${rate}% for ${years} year(s), compounded ${n}× a year:\n\nInvested:  ${inr(round(invested, 0))}\nMaturity:  ${inr(round(maturity, 0))}\nInterest:  ${inr(round(interest, 0))}`,
        note: 'Interest is shown before tax. Banks may compound quarterly while post-office schemes differ slightly — treat this as a close estimate.',
      };
    },
  },

  'unit-price-compare': {
    fields: [
      { id: 'aName', label: 'Option A — name', type: 'text', half: true, default: 'Brand A' },
      { id: 'bName', label: 'Option B — name', type: 'text', half: true, default: 'Brand B' },
      { id: 'aPrice', label: 'A price (₹)', type: 'number', half: true, default: 180 },
      { id: 'bPrice', label: 'B price (₹)', type: 'number', half: true, default: 240 },
      { id: 'aQty', label: 'A quantity', type: 'number', half: true, default: 500 },
      { id: 'bQty', label: 'B quantity', type: 'number', half: true, default: 750 },
      { id: 'aUnit', label: 'A unit', type: 'select', half: true, options: Object.keys(UNIT_TO_BASE).map((k) => [k, k]), default: 'g' },
      { id: 'bUnit', label: 'B unit', type: 'select', half: true, options: Object.keys(UNIT_TO_BASE).map((k) => [k, k]), default: 'g' },
    ],
    live: true,
    compute(v) {
      const ap = num(v.aPrice); const bp = num(v.bPrice);
      const aq = num(v.aQty); const bq = num(v.bQty);
      if ([ap, bp, aq, bq].some((x) => x == null)) return 'Fill in both prices and quantities.';
      if (aq <= 0 || bq <= 0) return 'Quantities must be more than zero.';
      if (ap < 0 || bp < 0) return 'Prices cannot be negative.';
      const kindA = UNIT_KIND(v.aUnit); const kindB = UNIT_KIND(v.bUnit);
      const comparable = kindA === kindB;
      const baseA = toBase(aq, v.aUnit); const baseB = toBase(bq, v.bUnit);
      const unitA = ap / baseA; const unitB = bp / baseB;
      const label = BASE_LABEL[kindA] || 'unit';
      const aWins = unitA <= unitB;
      const winner = aWins ? (v.aName || 'Option A') : (v.bName || 'Option B');
      const loserUnit = aWins ? unitB : unitA;
      const winnerUnit = aWins ? unitA : unitB;
      const savePct = loserUnit > 0 ? ((loserUnit - winnerUnit) / loserUnit) * 100 : 0;
      const stats = [
        { label: `${v.aName || 'A'} per ${label}`, value: `₹${round(unitA, 4)}` },
        { label: `${v.bName || 'B'} per ${label}`, value: `₹${round(unitB, 4)}` },
        { label: 'Better value', value: winner },
        { label: 'You save', value: `${round(savePct, 1)}%` },
      ];
      return {
        title: 'Unit price comparison',
        stats,
        text: [
          `${v.aName || 'A'}: ${inr(ap)} for ${aq} ${v.aUnit} → ₹${round(unitA, 4)} per ${label}`,
          `${v.bName || 'B'}: ${inr(bp)} for ${bq} ${v.bUnit} → ₹${round(unitB, 4)} per ${label}`,
          '',
          `${winner} is the better deal — ${round(savePct, 1)}% cheaper per ${label}.`,
        ].join('\n'),
        copy: `${winner} is cheaper per ${label} by ${round(savePct, 1)}%`,
        note: comparable
          ? 'Both options were converted to the same base unit before comparing.'
          : `Heads up: ${v.aUnit} measures ${kindA} while ${v.bUnit} measures ${kindB}. Pick units of the same kind for a fair comparison.`,
      };
    },
  },

  'passphrase-gen': {
    fields: [
      { id: 'words', label: 'Number of words', type: 'range', min: 3, max: 12, step: 1, default: 5, unit: 'words' },
      { id: 'sep', label: 'Separator', type: 'select', half: true, options: [
        ['-', 'Hyphen  -'], ['.', 'Dot  .'], ['_', 'Underscore  _'], [' ', 'Space'], ['+', 'Plus  +'],
      ], default: '-' },
      { id: 'case', label: 'Capitalise words', type: 'checkbox', half: true, default: true },
      { id: 'number', label: 'Add a random number', type: 'checkbox', half: true, default: true },
      { id: 'count', label: 'How many to generate', type: 'select', half: true, options: [['1', '1'], ['3', '3'], ['5', '5'], ['10', '10']], default: '5' },
    ],
    live: false,
    buttonLabel: 'Generate passphrases',
    compute(v) {
      const words = Math.max(3, Math.min(12, Number(v.words) || 5));
      const sep = v.sep || '-';
      const secureRandom = (max) => {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        return buf[0] % max;
      };
      const make = () => {
        const picked = Array.from({ length: words }, () => {
          const w = PASSPHRASE_WORDS[secureRandom(PASSPHRASE_WORDS.length)];
          return v.case ? w[0].toUpperCase() + w.slice(1) : w;
        });
        if (v.number) picked.push(String(secureRandom(90) + 10));
        return picked.join(sep);
      };
      const list = Array.from({ length: Math.max(1, Math.min(10, Number(v.count) || 1)) }, make);
      const longest = list.reduce((a, b) => (b.length > a.length ? b : a), '');
      const bits = Math.round(words * Math.log2(PASSPHRASE_WORDS.length) + (sep ? 3 : 0) + (v.number ? 6.5 : 0));
      const strength = bits >= 90 ? 'Excellent — resists offline attacks' : bits >= 70 ? 'Strong — good for most accounts'
        : bits >= 50 ? 'Fair — acceptable for low-risk accounts' : 'Weak — add more words';
      return {
        title: 'Passphrases',
        stats: [
          { label: 'Entropy', value: `~${bits} bits` },
          { label: 'Length', value: `${longest.length} chars` },
          { label: 'Word list', value: `${PASSPHRASE_WORDS.length} words` },
          { label: 'Rating', value: strength.split(' — ')[0] },
        ],
        text: list.join('\n'),
        copy: list.join('\n'),
        note: `${strength}. Generated with crypto.getRandomValues in your browser — nothing is sent anywhere. For a bank or email account aim for 6+ words.`,
      };
    },
  },

  'rent-affordability': {
    fields: [
      { id: 'income', label: 'Monthly take-home income (₹)', type: 'number', half: true, default: 60000 },
      { id: 'rule', label: 'Rule to apply', type: 'select', half: true, options: [
        ['30', '30% rule (standard)'], ['25', '25% rule (conservative)'], ['35', '35% rule (stretch, high-rent cities)'], ['40', '40% rule (aggressive)'],
      ], default: '30' },
      { id: 'deposit', label: 'Security deposit available (₹)', type: 'number', half: true, default: 100000 },
      { id: 'actualRent', label: 'Rent you are considering (₹, optional)', type: 'number', half: true, default: '' },
    ],
    live: true,
    compute(v) {
      const income = num(v.income);
      if (income == null || income <= 0) return 'Enter your monthly take-home income.';
      const pct = Number(v.rule) || 30;
      const maxRent = (income * pct) / 100;
      const deposit = num(v.deposit);
      const actual = num(v.actualRent);
      const stats = [
        { label: 'Max comfortable rent', value: inr(round(maxRent, 0)) },
        { label: 'Left after rent', value: inr(round(income - maxRent, 0)) },
        { label: 'Rule applied', value: `${pct}% of income` },
        { label: 'Yearly rent at cap', value: inr(round(maxRent * 12, 0)) },
      ];
      let text = `At ${inr(income)} a month, the ${pct}% rule caps your rent at ${inr(maxRent)}.`;
      let note = 'The 30% rule leaves room for savings, food and travel. In metros many people stretch to 35–40%, but only with a solid emergency fund.';
      if (deposit != null && deposit > 0) {
        const monthsCovered = maxRent > 0 ? deposit / maxRent : 0;
        stats.push({ label: 'Deposit covers', value: `${round(monthsCovered, 1)} months` });
      }
      if (actual != null && actual > 0) {
        const ratio = (actual / income) * 100;
        stats.push({ label: 'Your rent is', value: `${round(ratio, 1)}% of income` });
        stats.push({ label: 'Verdict', value: actual <= maxRent ? 'Affordable ✅' : 'Stretched ⚠️' });
        text += `\nThe rent you are considering (${inr(actual)}) is ${round(ratio, 1)}% of your income — ${actual <= maxRent ? `${inr(maxRent - actual)} below your cap.` : `${inr(actual - maxRent)} above your cap.`}`;
        note = actual <= maxRent
          ? 'This rent fits the rule. Still keep 3–6 months of expenses saved before signing a long lease.'
          : 'Above the rule. It can still work if you have no other debt and a strong emergency fund — but negotiate or look for a roommate.';
      }
      return { title: 'Rent affordability', stats, text, copy: `Max rent: ${inr(maxRent)}`, note };
    },
  },

  'final-exam-calc': {
    fields: [
      { id: 'target', label: 'Target final grade (%)', type: 'number', half: true, default: 80, min: 0, max: 100 },
      { id: 'current', label: 'Your current score (%)', type: 'number', half: true, default: 72 },
      { id: 'weightDone', label: 'Weight already graded (%)', type: 'number', half: true, default: 70 },
      { id: 'weightFinal', label: 'Weight of the final exam (%)', type: 'number', half: true, default: 30 },
    ],
    live: true,
    compute(v) {
      const target = num(v.target); const current = num(v.current);
      const wd = num(v.weightDone); const wf = num(v.weightFinal);
      if ([target, current, wd, wf].some((x) => x == null)) return 'Fill in all four values.';
      const total = wd + wf;
      if (total <= 0) return 'The weights must add up to more than zero.';
      /* needed = (target*total/100 - current*wd/100) / (wf/100) */
      const needed = wf > 0 ? ((target * total - current * wd) / wf) : Infinity;
      const maxPossible = wf > 0 ? ((100 * total - current * wd) / wf) : 0;
      let verdict; let note;
      if (wf <= 0) {
        verdict = 'No final exam';
        note = 'Set the weight of the final exam above zero to calculate a target score.';
      } else if (needed <= 0) {
        verdict = 'Already secured 🎉';
        note = `Even a zero on the final keeps you at or above ${target}%. Your current score already carries the grade.`;
      } else if (needed > 100) {
        verdict = 'Not reachable';
        note = `You would need ${round(needed, 1)}% on the final — above 100. The highest you can finish is ${round(maxPossible, 1)}%.`;
      } else if (needed >= 90) {
        verdict = 'Very tough';
        note = 'You need close to a perfect paper. Focus on the highest-mark questions first.';
      } else if (needed >= 70) {
        verdict = 'Achievable';
        note = 'A solid, well-prepared attempt gets you there.';
      } else {
        verdict = 'Comfortable';
        note = 'You have room to spare — do not relax too much.';
      }
      const stats = [
        { label: 'Score needed on final', value: needed > 100 ? `${round(needed, 1)}%` : needed <= 0 ? '0%' : `${round(needed, 1)}%` },
        { label: 'Verdict', value: verdict },
        { label: 'Best you can finish', value: `${round(maxPossible, 1)}%` },
        { label: 'Weight of final', value: `${round((wf / total) * 100, 1)}%` },
      ];
      return {
        title: 'Final exam target',
        stats,
        text: `Current ${current}% over ${wd}% of the grade.\nFinal exam counts for ${wf}%.\nTo finish at ${target}% you need ${needed <= 0 ? 0 : round(needed, 1)}% on the final.\nMaximum achievable: ${round(maxPossible, 1)}%.`,
        copy: `You need ${needed <= 0 ? 0 : round(needed, 1)}% on the final to reach ${target}%.`,
        note,
      };
    },
  },

  /* ══════════════ INTERNET (3) ══════════════ */

  'subnet-calc': {
    fields: [
      { id: 'ip', label: 'IPv4 address', type: 'text', half: true, default: '192.168.1.100' },
      { id: 'cidr', label: 'Prefix length / CIDR', type: 'select', half: true, options: Array.from({ length: 25 }, (_, i) => [String(8 + i), `/${8 + i}`]).reverse(), default: '24' },
    ],
    live: true,
    compute(v) {
      const parts = String(v.ip || '').trim().split('.');
      if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p) || Number(p) > 255)) {
        return 'Enter a valid IPv4 address like 192.168.1.100';
      }
      const prefix = Math.max(0, Math.min(32, Number(v.cidr) || 24));
      const octets = parts.map(Number);
      const ipInt = ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
      const maskInt = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
      const netInt = (ipInt & maskInt) >>> 0;
      const bcastInt = (netInt | (~maskInt >>> 0)) >>> 0;
      const toIp = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
      const total = 2 ** (32 - prefix);
      const usable = prefix >= 31 ? total : Math.max(0, total - 2);
      const firstHost = prefix >= 31 ? netInt : netInt + 1;
      const lastHost = prefix >= 31 ? bcastInt : bcastInt - 1;
      const isPrivate = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(toIp(ipInt));
      return {
        title: `Subnet /${prefix}`,
        stats: [
          { label: 'Network address', value: toIp(netInt) },
          { label: 'Subnet mask', value: toIp(maskInt) },
          { label: 'Wildcard', value: toIp((~maskInt) >>> 0) },
          { label: 'Broadcast', value: toIp(bcastInt) },
          { label: 'First host', value: toIp(firstHost) },
          { label: 'Last host', value: toIp(lastHost) },
          { label: 'Total addresses', value: fmt.num(total, 0) },
          { label: 'Usable hosts', value: fmt.num(usable, 0) },
          { label: 'CIDR', value: `${toIp(netInt)}/${prefix}` },
          { label: 'Scope', value: isPrivate ? 'Private (RFC 1918)' : 'Public' },
        ],
        text: `${toIp(netInt)}/${prefix}\nmask ${toIp(maskInt)}  wildcard ${toIp((~maskInt) >>> 0)}\nhosts ${toIp(firstHost)} – ${toIp(lastHost)} (${fmt.num(usable, 0)} usable)\nbroadcast ${toIp(bcastInt)}`,
        copy: `${toIp(netInt)}/${prefix}`,
        note: prefix >= 31
          ? 'A /31 has no network or broadcast address — both addresses are usable (RFC 3021, common for point-to-point links). A /32 is a single host.'
          : 'The first and last address of the range are reserved for the network and broadcast, so they are not assignable to hosts.',
      };
    },
  },

  'mac-address-gen': {
    fields: [
      { id: 'count', label: 'How many', type: 'select', half: true, options: [['1', '1'], ['5', '5'], ['10', '10'], ['25', '25']], default: '5' },
      { id: 'sep', label: 'Format', type: 'select', half: true, options: [
        ['colon', 'AA:BB:CC:DD:EE:FF'], ['hyphen', 'AA-BB-CC-DD-EE-FF'], ['dot', 'AABB.CCDD.EEFF'], ['plain', 'AABBCCDDEEFF'],
      ], default: 'colon' },
      { id: 'local', label: 'Locally administered (safe for VMs / testing)', type: 'checkbox', default: true },
      { id: 'multicast', label: 'Multicast address', type: 'checkbox', default: false },
      { id: 'upper', label: 'Upper case', type: 'checkbox', default: true },
    ],
    live: false,
    buttonLabel: 'Generate MAC addresses',
    compute(v) {
      const n = Math.max(1, Math.min(25, Number(v.count) || 1));
      const make = () => {
        const bytes = new Uint8Array(6);
        crypto.getRandomValues(bytes);
        if (v.local) bytes[0] |= 0x02; else bytes[0] &= ~0x02;
        if (v.multicast) bytes[0] |= 0x01; else bytes[0] &= ~0x01;
        return [...bytes];
      };
      const format = (bytes) => {
        const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
        const s = v.upper ? hex.toUpperCase() : hex;
        if (v.sep === 'hyphen') return s.match(/.{2}/g).join('-');
        if (v.sep === 'dot') return s.match(/.{4}/g).join('.');
        if (v.sep === 'plain') return s;
        return s.match(/.{2}/g).join(':');
      };
      const list = Array.from({ length: n }, () => format(make()));
      return {
        title: 'MAC addresses',
        stats: [
          { label: 'Generated', value: list.length },
          { label: 'Type', value: v.multicast ? 'Multicast' : 'Unicast' },
          { label: 'Scope', value: v.local ? 'Locally administered' : 'Universally unique' },
          { label: 'Format', value: format([0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF]).replace(/AA|BB|CC|DD|EE|FF/g, 'X').slice(0, 17) },
        ],
        text: list.join('\n'),
        copy: list.join('\n'),
        note: 'Locally administered addresses have the second-least-significant bit of the first octet set, which avoids colliding with a real vendor prefix — the right choice for VMs, containers and tests.',
      };
    },
  },

  'port-reference': {
    mount(container) {
      const PORTS = [
        ['20', 'TCP', 'FTP data', 'File transfer payload channel'],
        ['21', 'TCP', 'FTP control', 'File transfer commands and login'],
        ['22', 'TCP', 'SSH', 'Encrypted remote shell, SFTP and SCP'],
        ['23', 'TCP', 'Telnet', 'Unencrypted remote shell — avoid'],
        ['25', 'TCP', 'SMTP', 'Mail transfer between servers'],
        ['53', 'TCP/UDP', 'DNS', 'Domain name resolution'],
        ['67', 'UDP', 'DHCP server', 'Hands out IP addresses'],
        ['68', 'UDP', 'DHCP client', 'Requests an IP address'],
        ['69', 'UDP', 'TFTP', 'Trivial file transfer, PXE booting'],
        ['80', 'TCP', 'HTTP', 'Unencrypted web traffic'],
        ['110', 'TCP', 'POP3', 'Fetches mail from a server'],
        ['119', 'TCP', 'NNTP', 'Usenet newsgroups'],
        ['123', 'UDP', 'NTP', 'Clock synchronisation'],
        ['137', 'UDP', 'NetBIOS name', 'Legacy Windows name service'],
        ['143', 'TCP', 'IMAP', 'Reads mail kept on the server'],
        ['161', 'UDP', 'SNMP', 'Device monitoring and metrics'],
        ['389', 'TCP', 'LDAP', 'Directory lookups'],
        ['443', 'TCP', 'HTTPS', 'Encrypted web traffic (TLS)'],
        ['445', 'TCP', 'SMB', 'Windows file and printer sharing'],
        ['465', 'TCP', 'SMTPS', 'Mail submission over TLS'],
        ['514', 'UDP', 'Syslog', 'Centralised log collection'],
        ['587', 'TCP', 'SMTP submission', 'Outgoing mail from clients'],
        ['631', 'TCP', 'IPP / CUPS', 'Printing'],
        ['636', 'TCP', 'LDAPS', 'Directory lookups over TLS'],
        ['993', 'TCP', 'IMAPS', 'IMAP over TLS'],
        ['995', 'TCP', 'POP3S', 'POP3 over TLS'],
        ['1433', 'TCP', 'MSSQL', 'Microsoft SQL Server'],
        ['1521', 'TCP', 'Oracle DB', 'Oracle database listener'],
        ['3306', 'TCP', 'MySQL', 'MySQL and MariaDB'],
        ['3389', 'TCP', 'RDP', 'Windows Remote Desktop'],
        ['5432', 'TCP', 'PostgreSQL', 'Postgres database'],
        ['5672', 'TCP', 'AMQP', 'RabbitMQ messaging'],
        ['5900', 'TCP', 'VNC', 'Remote desktop (screen sharing)'],
        ['6379', 'TCP', 'Redis', 'In-memory key/value store'],
        ['8080', 'TCP', 'HTTP alt', 'Dev servers and proxies'],
        ['8443', 'TCP', 'HTTPS alt', 'Alternative TLS web port'],
        ['9200', 'TCP', 'Elasticsearch', 'Search REST API'],
        ['11211', 'TCP/UDP', 'Memcached', 'Distributed cache'],
        ['27017', 'TCP', 'MongoDB', 'Document database'],
      ];
      const search = el('input.input', { placeholder: 'Search by port, protocol or service…', style: { marginBottom: '16px' } });
      const host = el('div');
      const count = el('div.field-hint', { style: { marginBottom: '10px' } });
      const render = () => {
        const q = search.value.trim().toLowerCase();
        const rows = PORTS.filter(([port, proto, name, use]) => !q || `${port} ${proto} ${name} ${use}`.toLowerCase().includes(q));
        host.innerHTML = '';
        count.textContent = `${rows.length} of ${PORTS.length} entries`;
        if (!rows.length) {
          host.append(el('div.note', { html: icon('info', 17) + '<span>No port matches that search.</span>' }));
          return;
        }
        host.append(scrollTable(['Port', 'Protocol', 'Service', 'Used for'], rows, { minWidth: 110 }));
      };
      search.addEventListener('input', debounce(render, 140));
      render();
      container.append(
        search, count, host,
        el('div.note.mt-3', { html: icon('shield', 17) + '<span>Ports below 1024 are privileged — only root or an administrator service can bind them. Never expose a database port (3306, 5432, 6379, 27017) to the public internet.</span>' }),
      );
    },
    help: [
      'Type a port number, protocol or service name in the search box.',
      'The table filters as you type — for example "redis", "5432" or "UDP".',
      'Use the notes at the bottom to stay safe about exposing ports.',
    ],
  },

  /* ══════════════ ESSENTIALS (6) ══════════════ */

  'image-base64': {
    mount(container) {
      const out = el('div.col', { style: { gap: '14px', marginTop: '16px' } });
      const zone = dropZone({
        accept: 'image/*',
        hint: 'Drop an image to convert it to a Base64 data URI',
        onFiles: async ([file]) => {
          if (!file.type.startsWith('image/')) { toast('That is not an image file', 'x'); return; }
          out.innerHTML = '<div class="skeleton" style="height:120px"></div>';
          try {
            const dataUrl = await readFileAs(file, 'dataURL');
            const img = new Image();
            await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
            const base64 = dataUrl.split(',')[1] || '';
            const ratio = base64.length / Math.max(1, file.size);
            out.innerHTML = '';
            out.append(
              el('div.result-card',
                el('div.result-head', el('span.result-title', { text: 'Data URI' }), copyButton(() => dataUrl, 'Copy data URI')),
                el('div.result-body', el('div.col', { style: { gap: '12px' } },
                  el('div.stat-grid',
                    el('div.stat', el('div.k', { text: 'Original size' }), el('div.v', { text: fmt.bytes(file.size) })),
                    el('div.stat', el('div.k', { text: 'Base64 size' }), el('div.v', { text: fmt.bytes(base64.length) })),
                    el('div.stat', el('div.k', { text: 'Overhead' }), el('div.v', { text: `+${round((ratio - 1) * 100, 1)}%` })),
                    el('div.stat', el('div.k', { text: 'Dimensions' }), el('div.v', { text: `${img.naturalWidth}×${img.naturalHeight}` })),
                    el('div.stat', el('div.k', { text: 'MIME type' }), el('div.v', { text: file.type })),
                  ),
                  el('div', el('img', { src: dataUrl, alt: 'Preview of the converted image', style: { maxHeight: '160px', width: 'auto', borderRadius: '12px', border: '1px solid var(--cream-line)' } })),
                  el('pre.code', { text: dataUrl.length > 4000 ? `${dataUrl.slice(0, 4000)}…` : dataUrl, style: { maxHeight: '180px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }),
                  el('div.tool-actions',
                    el('button.btn.btn-soft.btn-sm', { html: `${icon('copy', 14)} Copy Base64 only`, onclick: () => copyText(base64) }),
                    el('button.btn.btn-soft.btn-sm', { html: `${icon('copy', 14)} Copy CSS background`, onclick: () => copyText(`background-image: url("${dataUrl}");`) }),
                    el('button.btn.btn-soft.btn-sm', { html: `${icon('download', 14)} Download .txt`, onclick: () => downloadFile(`${file.name.replace(/\.[^.]+$/, '') || 'image'}.base64.txt`, dataUrl) }),
                  ),
                )),
              ),
              el('div.note', { html: icon('info', 17) + `<span>Base64 adds about ${round((ratio - 1) * 100, 0)}% to the file size. Inline it for tiny icons and favicons; link a real file for anything bigger so the browser can cache it.</span>` }),
            );
          } catch {
            out.innerHTML = '';
            out.append(el('div.note', { html: icon('info', 17) + '<span>That image could not be read. Try a PNG, JPG, WebP, GIF or SVG.</span>' }));
          }
        },
      });
      container.append(zone, out);
    },
    help: [
      'Drop or pick an image — PNG, JPG, WebP, GIF or SVG.',
      'The data URI appears with size, dimensions and MIME type.',
      'Copy the full data URI, just the Base64, or a ready CSS rule.',
    ],
  },

  'image-filters': {
    mount(container) {
      let source = null;
      const canvas = el('canvas.stage-canvas', { style: { maxWidth: '100%', display: 'none', borderRadius: '14px' } });
      const previewHost = el('div.canvas-stage', { style: { minHeight: '220px', flexDirection: 'column', gap: '10px' }, html: icon('image', 26) + '<div style="font-size:13.5px;color:var(--muted);font-weight:600">Drop a photo to edit</div>' });
      const controls = el('div.tool-form', { style: { marginTop: '16px', display: 'none' } });
      const actions = el('div.tool-actions', { style: { marginTop: '14px', display: 'none' } });

      const FILTERS = [
        ['brightness', 'Brightness', 0.2, 3, 0.05, 1],
        ['contrast', 'Contrast', 0.2, 3, 0.05, 1],
        ['saturate', 'Saturation', 0, 3, 0.05, 1],
        ['hue', 'Hue rotate', 0, 360, 1, 0],
        ['grayscale', 'Grayscale', 0, 1, 0.05, 0],
        ['sepia', 'Sepia', 0, 1, 0.05, 0],
        ['invert', 'Invert', 0, 1, 0.05, 0],
      ];
      const state = Object.fromEntries(FILTERS.map(([k, , , , , d]) => [k, d]));
      const sliders = {};

      /* Per-pixel colour maths — works everywhere, unlike canvas ctx.filter. */
      const rgbToHsl = (r, g, b) => {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b); const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        if (max === min) return [0, 0, l];
        const d = max - min;
        const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        let h;
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        return [h / 6, s, l];
      };
      const hslToRgb = (h, s, l) => {
        if (s === 0) { const v = l * 255; return [v, v, v]; }
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const conv = (t) => {
          if (t < 0) t += 1; if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };
        return [conv(h + 1 / 3) * 255, conv(h) * 255, conv(h - 1 / 3) * 255];
      };

      function render() {
        if (!source) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = image.data;
        const cf = (259 * (state.contrast * 255 + 255)) / (255 * (259 - state.contrast * 255));
        for (let i = 0; i < d.length; i += 4) {
          let r = d[i] * state.brightness;
          let g = d[i + 1] * state.brightness;
          let b = d[i + 2] * state.brightness;
          r = cf * (r - 128) + 128; g = cf * (g - 128) + 128; b = cf * (b - 128) + 128;
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          r = lum + state.saturate * (r - lum);
          g = lum + state.saturate * (g - lum);
          b = lum + state.saturate * (b - lum);
          if (state.sepia > 0) {
            const sr = r * 0.393 + g * 0.769 + b * 0.189;
            const sg = r * 0.349 + g * 0.686 + b * 0.168;
            const sb = r * 0.272 + g * 0.534 + b * 0.131;
            r += (sr - r) * state.sepia; g += (sg - g) * state.sepia; b += (sb - b) * state.sepia;
          }
          if (state.grayscale > 0) {
            const gr = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            r += (gr - r) * state.grayscale; g += (gr - g) * state.grayscale; b += (gr - b) * state.grayscale;
          }
          if (state.invert > 0) {
            r += (255 - r) * state.invert; g += (255 - g) * state.invert; b += (255 - b) * state.invert;
          }
          if (state.hue !== 0) {
            let [h, s, l] = rgbToHsl(Math.min(255, Math.max(0, r)), Math.min(255, Math.max(0, g)), Math.min(255, Math.max(0, b)));
            h = (h + state.hue / 360) % 1;
            [r, g, b] = hslToRgb(h, s, l);
          }
          d[i] = Math.min(255, Math.max(0, r));
          d[i + 1] = Math.min(255, Math.max(0, g));
          d[i + 2] = Math.min(255, Math.max(0, b));
        }
        ctx.putImageData(image, 0, 0);
      }

      const scheduleRender = debounce(render, 60);

      FILTERS.forEach(([key, label, min, max, step, dflt]) => {
        const wrap = el('div.field');
        const hint = el('div.field-hint', { text: String(dflt) });
        const range = el('input.range', { type: 'range', min, max, step, value: dflt });
        sliders[key] = { range, hint };
        range.addEventListener('input', () => {
          state[key] = Number(range.value);
          hint.textContent = key === 'hue' ? `${range.value}°` : range.value;
          scheduleRender();
        });
        wrap.append(el('label.field-label', { text: label }), range, hint);
        controls.append(wrap);
      });

      actions.append(
        el('button.btn.btn-accent', { html: `${icon('download', 16)} Download PNG`, onclick: () => { try { downloadFile('psdkit-filtered.png', canvas.toDataURL('image/png').split(',')[1], 'image/png'); } catch { toast('Could not export that image', 'x'); } } }),
        el('button.btn.btn-soft', { html: `${icon('copy', 16)} Copy CSS filter`, onclick: () => copyText(`filter: brightness(${state.brightness}) contrast(${state.contrast}) saturate(${state.saturate}) hue-rotate(${state.hue}deg) grayscale(${state.grayscale}) sepia(${state.sepia}) invert(${state.invert});`) }),
        el('button.btn.btn-soft', { html: `${icon('refresh', 16)} Reset`, onclick: () => { FILTERS.forEach(([key, , , , , dflt]) => { state[key] = dflt; sliders[key].range.value = dflt; sliders[key].hint.textContent = key === 'hue' ? `${dflt}°` : String(dflt); }); render(); } }),
      );

      const zone = dropZone({
        accept: 'image/*',
        onFiles: async ([file]) => {
          if (!file.type.startsWith('image/')) { toast('That is not an image file', 'x'); return; }
          const url = await readFileAs(file, 'dataURL');
          const img = new Image();
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
          source = img;
          const scale = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight));
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
          canvas.style.display = 'block';
          previewHost.innerHTML = '';
          previewHost.append(canvas);
          controls.style.display = '';
          actions.style.display = '';
          render();
        },
      });
      container.append(zone, previewHost, controls, actions);
    },
    help: [
      'Drop a photo — it is resized to at most 900px for fast editing.',
      'Drag the sliders; the canvas updates live, entirely on your device.',
      'Download the PNG, or copy the equivalent CSS filter rule for your site.',
    ],
  },

  'favicon-generator': {
    mount(container) {
      let source = null;
      const sizes = [16, 32, 48, 180, 192, 512];
      const previews = el('div.wrap-gap-sm', { style: { marginTop: '16px', alignItems: 'flex-end' } });
      const snippetHost = el('div', { style: { marginTop: '16px' } });
      const bgIn = el('input.input', { type: 'color', value: '#F7F7F3', style: { padding: '6px', height: '46px', cursor: 'pointer', maxWidth: '120px' } });
      const padIn = el('input.range', { type: 'range', min: 0, max: 30, step: 1, value: 8 });
      const roundIn = el('input.range', { type: 'range', min: 0, max: 50, step: 1, value: 0 });
      const padHint = el('div.field-hint', { text: '8%' });
      const roundHint = el('div.field-hint', { text: '0%' });

      const draw = (size) => {
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const ctx = c.getContext('2d');
        const pad = Math.round(size * (Number(padIn.value) / 100));
        const radius = Math.round(size * (Number(roundIn.value) / 100));
        ctx.fillStyle = bgIn.value;
        if (radius > 0 && ctx.roundRect) { ctx.beginPath(); ctx.roundRect(0, 0, size, size, radius); ctx.fill(); } else ctx.fillRect(0, 0, size, size);
        if (source) {
          const inner = size - pad * 2;
          const scale = Math.min(inner / source.naturalWidth, inner / source.naturalHeight);
          const w = source.naturalWidth * scale; const h = source.naturalHeight * scale;
          ctx.drawImage(source, (size - w) / 2, (size - h) / 2, w, h);
        }
        return c;
      };

      const refresh = () => {
        padHint.textContent = `${padIn.value}%`;
        roundHint.textContent = `${roundIn.value}%`;
        previews.innerHTML = '';
        if (!source) return;
        sizes.forEach((size) => {
          const c = draw(size);
          c.style.cssText = 'border:1px solid var(--cream-line);border-radius:8px;background:#fff;image-rendering:pixelated';
          previews.append(el('div.col', { style: { gap: '6px', alignItems: 'center' } },
            c,
            el('div.field-hint', { text: `${size}×${size}` }),
            el('button.copy-btn', { html: icon('download', 12) + ` PNG`, onclick: () => downloadFile(`favicon-${size}.png`, c.toDataURL('image/png').split(',')[1], 'image/png') }),
          ));
        });
        const html = [
          '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">',
          '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">',
          '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
          '<link rel="manifest" href="/site.webmanifest">',
        ].join('\n');
        snippetHost.innerHTML = '';
        snippetHost.append(el('div.result-card',
          el('div.result-head', el('span.result-title', { text: 'HTML snippet' }), copyButton(() => html, 'Copy')),
          el('div.result-body', el('pre.code', { text: html })),
        ));
      };

      [bgIn, padIn, roundIn].forEach((input) => input.addEventListener('input', debounce(refresh, 60)));

      const zone = dropZone({
        accept: 'image/*',
        hint: 'Drop a square logo — ideally 512×512 PNG or SVG',
        onFiles: async ([file]) => {
          if (!file.type.startsWith('image/')) { toast('That is not an image file', 'x'); return; }
          const url = await readFileAs(file, 'dataURL');
          const img = new Image();
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
          source = img;
          refresh();
          toast('Icons generated — download each size');
        },
      });

      container.append(
        zone,
        el('div.tool-form', { style: { marginTop: '16px' } },
          el('div.f-row',
            el('div.field', el('label.field-label', { text: 'Background colour' }), bgIn),
            el('div.field', el('label.field-label', { text: 'Padding' }), padIn, padHint),
          ),
          el('div.field', el('label.field-label', { text: 'Corner rounding' }), roundIn, roundHint),
        ),
        previews,
        snippetHost,
        el('div.note.mt-3', { html: icon('info', 17) + '<span>Browsers ask for 16px and 32px favicons, iOS wants a 180px apple-touch-icon, and Android/PWA want 192px and 512px. Everything is drawn on a canvas in your browser.</span>' }),
      );
    },
    help: [
      'Drop a square logo — 512×512 PNG works best.',
      'Adjust the background, padding and corner rounding.',
      'Download each size and copy the HTML snippet into your head tag.',
    ],
  },

  'aspect-ratio-calc': {
    fields: [
      { id: 'w', label: 'Width', type: 'number', half: true, default: 1920 },
      { id: 'h', label: 'Height', type: 'number', half: true, default: 1080 },
      { id: 'mode', label: 'Scale to', type: 'select', options: [
        ['width', 'Match a new width'], ['height', 'Match a new height'], ['ratio', 'Force a common ratio'], ['none', 'Just simplify my numbers'],
      ], default: 'width' },
      { id: 'target', label: 'New width or height', type: 'number', default: 1280 },
      { id: 'ratio', label: 'Common ratio', type: 'select', options: [
        ['16:9', '16:9 widescreen'], ['21:9', '21:9 ultrawide'], ['4:3', '4:3 classic'], ['1:1', '1:1 square'],
        ['3:2', '3:2 photo'], ['9:16', '9:16 vertical video'], ['2:3', '2:3 poster'], ['5:4', '5:4 print'],
      ], default: '16:9' },
    ],
    live: true,
    compute(v) {
      const w = num(v.w); const h = num(v.h);
      if (w == null || h == null || w <= 0 || h <= 0) return 'Enter a width and height above zero.';
      const g = gcd(Math.round(w), Math.round(h)) || 1;
      const rw = Math.round(w / g); const rh = Math.round(h / g);
      const decimal = round(w / h, 4);
      const stats = [
        { label: 'Simplified ratio', value: `${rw}:${rh}` },
        { label: 'Decimal', value: decimal },
        { label: 'Orientation', value: w > h ? 'Landscape' : w < h ? 'Portrait' : 'Square' },
        { label: 'Megapixels', value: round((w * h) / 1e6, 2) },
      ];
      const lines = [`${w} × ${h}  →  ${rw}:${rh}  (${decimal}:1)`];
      const [crw, crh] = String(v.ratio).split(':').map(Number);
      if (v.mode === 'width' || v.mode === 'height') {
        const target = num(v.target);
        if (target == null || target <= 0) return 'Enter the new width or height to scale to.';
        if (v.mode === 'width') {
          const nh = round((target * h) / w, 2);
          stats.push({ label: 'Scaled size', value: `${target} × ${nh}` });
          lines.push(`Same ratio at width ${target} → height ${nh}`);
          lines.push(`Same ratio at common widths: ${[320, 640, 768, 1024, 1280, 1920, 2560].map((x) => `${x}×${round((x * h) / w, 0)}`).join(', ')}`);
        } else {
          const nw = round((target * w) / h, 2);
          stats.push({ label: 'Scaled size', value: `${nw} × ${target}` });
          lines.push(`Same ratio at height ${target} → width ${nw}`);
        }
      } else if (v.mode === 'ratio') {
        const nw = round((w / crw) * crw, 2);
        const nh = round((w / crw) * crh, 2);
        stats.push({ label: `Forced ${v.ratio}`, value: `${round(nw, 0)} × ${nh}` });
        stats.push({ label: 'Crop needed', value: h > nh ? `${round(h - nh, 0)}px off height` : `${round(nw - w, 0)}px off width` });
        lines.push(`Forcing ${v.ratio} at width ${round(nw, 0)} gives height ${nh} (your height is ${h}).`);
      }
      const common = [['16:9', 16, 9], ['21:9', 21, 9], ['4:3', 4, 3], ['1:1', 1, 1], ['3:2', 3, 2], ['9:16', 9, 16], ['5:4', 5, 4], ['2.39:1', 2.39, 1]];
      const closest = common.reduce((best, [label, a, b]) => {
        const d = Math.abs(a / b - w / h);
        return d < best.d ? { label, d } : best;
      }, { label: '—', d: Infinity });
      stats.push({ label: 'Closest standard', value: closest.label });
      lines.push(`Closest standard ratio: ${closest.label}`);
      return { title: 'Aspect ratio', stats, text: lines.join('\n'), copy: `${rw}:${rh}` };
    },
  },

  'colour-blind-sim': {
    mount(container) {
      const MATRICES = {
        protanopia: [[0.567, 0.433, 0], [0.558, 0.442, 0], [0, 0.242, 0.758]],
        deuteranopia: [[0.625, 0.375, 0], [0.7, 0.3, 0], [0, 0.3, 0.7]],
        tritanopia: [[0.95, 0.05, 0], [0, 0.433, 0.567], [0, 0.475, 0.525]],
        achromatopsia: [[0.299, 0.587, 0.114], [0.299, 0.587, 0.114], [0.299, 0.587, 0.114]],
      };
      const LABELS = {
        protanopia: 'Protanopia — no red cones (~1% of men)',
        deuteranopia: 'Deuteranopia — no green cones (~1% of men)',
        tritanopia: 'Tritanopia — no blue cones (very rare)',
        achromatopsia: 'Achromatopsia — total colour blindness',
      };
      const out = el('div.col', { style: { gap: '16px', marginTop: '16px' } });
      const hexIn = el('input.input', { type: 'text', value: '#DE5D35', placeholder: '#RRGGBB' });

      const applyMatrix = (data, m) => {
        const d = data.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i]; const g = d[i + 1]; const b = d[i + 2];
          d[i] = r * m[0][0] + g * m[0][1] + b * m[0][2];
          d[i + 1] = r * m[1][0] + g * m[1][1] + b * m[1][2];
          d[i + 2] = r * m[2][0] + g * m[2][1] + b * m[2][2];
        }
        return data;
      };

      const renderSwatches = () => {
        const hex = hexIn.value.trim();
        if (!/^#?[0-9a-f]{6}$/i.test(hex)) return;
        const clean = hex.replace('#', '');
        const rgb = [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16));
        const toHex = (arr) => `#${arr.map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0')).join('')}`;
        const rows = Object.entries(MATRICES).map(([key, m]) => {
          const [r, g, b] = rgb;
          const sim = [
            r * m[0][0] + g * m[0][1] + b * m[0][2],
            r * m[1][0] + g * m[1][1] + b * m[1][2],
            r * m[2][0] + g * m[2][1] + b * m[2][2],
          ];
          return [LABELS[key], toHex(sim), toHex(rgb)];
        });
        out.innerHTML = '';
        out.append(
          el('div.result-card',
            el('div.result-head', el('span.result-title', { text: `How ${toHex(rgb)} appears` })),
            el('div.result-body', el('div.col', { style: { gap: '12px' } },
              el('div.stat-grid',
                el('div.stat', el('div.k', { text: 'Original' }), el('div.v', { text: toHex(rgb), style: { fontSize: '16px' } })),
                ...rows.map(([label, sim]) => el('div.stat',
                  el('div.k', { text: label.split(' — ')[0] }),
                  el('div.v', { text: sim, style: { fontSize: '16px' } }),
                  el('div', { style: { height: '26px', borderRadius: '7px', marginTop: '8px', background: sim, border: '1px solid var(--cream-line)' } }),
                )),
              ),
              scrollTable(['Vision type', 'Seen as'], rows.map(([label, sim]) => [label, sim]), { minWidth: 170 }),
            )),
          ),
          el('div.note', { html: icon('eye', 17) + '<span>Drop a screenshot or UI mock below to preview a whole design. Red and green next to each other are the most common failure — check that meaning never relies on colour alone.</span>' }),
        );
      };

      hexIn.addEventListener('input', debounce(renderSwatches, 180));
      renderSwatches();

      const zone = dropZone({
        accept: 'image/*',
        hint: 'Drop a screenshot or design to simulate colour blindness',
        onFiles: async ([file]) => {
          if (!file.type.startsWith('image/')) { toast('That is not an image file', 'x'); return; }
          const url = await readFileAs(file, 'dataURL');
          const img = new Image();
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
          const scale = Math.min(1, 700 / Math.max(img.naturalWidth, img.naturalHeight));
          const w = Math.max(1, Math.round(img.naturalWidth * scale));
          const h = Math.max(1, Math.round(img.naturalHeight * scale));
          const grid = el('div.grid.grid-2', { style: { marginTop: '16px' } });
          const make = (label, matrix) => {
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            if (matrix) ctx.putImageData(applyMatrix(ctx.getImageData(0, 0, w, h), matrix), 0, 0);
            c.style.cssText = 'width:100%;border-radius:12px;border:1px solid var(--cream-line)';
            return el('div.card', { style: { padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' } },
              el('div.field-label', { text: label }), c);
          };
          grid.append(make('Original', null), ...Object.entries(MATRICES).map(([k, m]) => make(LABELS[k].split(' — ')[0], m)));
          out.append(grid);
        },
      });

      container.append(
        el('div.field', el('label.field-label', { text: 'Or test a single colour' }), hexIn, el('div.field-hint', { text: 'Type any 6-digit hex value.' })),
        out,
        zone,
      );
    },
    help: [
      'Type a hex colour to see it under four kinds of colour blindness.',
      'Or drop a screenshot to preview a whole interface.',
      'Use the results to check that colour is never the only signal.',
    ],
  },

  'screen-colour-picker': {
    mount(container) {
      const out = el('div', { style: { marginTop: '16px' } });
      const native = el('input.input', { type: 'color', value: '#DE5D35', style: { padding: '6px', height: '52px', cursor: 'pointer', maxWidth: '140px' } });
      const supported = typeof window.EyeDropper === 'function';

      const toRgb = (hex) => {
        const c = hex.replace('#', '');
        return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
      };
      const toHsl = (r, g, b) => {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b); const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        if (max === min) return [0, 0, round(l * 100, 1)];
        const d = max - min;
        const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        let h;
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        return [round(h * 60, 1), round(s * 100, 1), round(l * 100, 1)];
      };
      const luminance = (r, g, b) => {
        const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const contrast = (l1, l2) => round((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05), 2);

      const render = (hex) => {
        const clean = `#${hex.replace('#', '').slice(0, 6).padEnd(6, '0')}`.toLowerCase();
        const [r, g, b] = toRgb(clean);
        const [h, s, l] = toHsl(r, g, b);
        const lum = luminance(r, g, b);
        const cWhite = contrast(lum, 1);
        const cBlack = contrast(lum, 0);
        const values = [
          ['HEX', clean],
          ['RGB', `rgb(${r}, ${g}, ${b})`],
          ['HSL', `hsl(${h}, ${s}%, ${l}%)`],
          ['CMYK', (() => {
            const k = 1 - Math.max(r, g, b) / 255;
            if (k === 1) return 'cmyk(0%, 0%, 0%, 100%)';
            const c = (1 - r / 255 - k) / (1 - k);
            const m = (1 - g / 255 - k) / (1 - k);
            const y = (1 - b / 255 - k) / (1 - k);
            return `cmyk(${round(c * 100, 0)}%, ${round(m * 100, 0)}%, ${round(y * 100, 0)}%, ${round(k * 100, 0)}%)`;
          })()],
          ['CSS variable', `--brand: ${clean};`],
        ];
        out.innerHTML = '';
        out.append(el('div.result-card',
          el('div.result-head', el('span.result-title', { text: 'Picked colour' }), copyButton(() => clean, 'Copy HEX')),
          el('div.result-body', el('div.col', { style: { gap: '14px' } },
            el('div', { style: { height: '92px', borderRadius: '14px', background: clean, border: '1px solid var(--cream-line)' } }),
            el('div.stat-grid',
              el('div.stat', el('div.k', { text: 'Contrast on white' }), el('div.v', { text: `${cWhite}:1` })),
              el('div.stat', el('div.k', { text: 'Contrast on black' }), el('div.v', { text: `${cBlack}:1` })),
              el('div.stat', el('div.k', { text: 'WCAG AA text' }), el('div.v', { text: cWhite >= 4.5 ? 'On white ✅' : cBlack >= 4.5 ? 'On black ✅' : 'Neither ❌' })),
              el('div.stat', el('div.k', { text: 'Best text colour' }), el('div.v', { text: cWhite >= cBlack ? 'White' : 'Black' })),
            ),
            scrollTable(['Format', 'Value'], values, { minWidth: 150 }),
            el('div.tool-actions', ...values.map(([label, value]) => el('button.btn.btn-soft.btn-sm', { text: `Copy ${label}`, onclick: () => copyText(value) }))),
          )),
        ));
      };

      native.addEventListener('input', () => render(native.value));
      render(native.value);

      const row = el('div.tool-actions');
      if (supported) {
        row.append(el('button.btn.btn-accent', {
          html: `${icon('eye', 16)} Pick from screen`,
          onclick: async () => {
            try {
              const dropper = new window.EyeDropper();
              const res = await dropper.open();
              native.value = res.sRGBHex;
              render(res.sRGBHex);
            } catch { /* user cancelled */ }
          },
        }));
      }
      row.append(el('button.btn.btn-soft', { html: `${icon('copy', 16)} Copy HEX`, onclick: () => copyText(native.value) }));

      container.append(
        el('div.field', el('label.field-label', { text: 'Colour' }), native, el('div.field-hint', { text: supported ? 'Use the eye-dropper to sample any pixel on your screen.' : 'Your browser does not expose the EyeDropper API yet (Chrome and Edge do) — the swatch picker below still works everywhere.' })),
        row,
        out,
      );
    },
    help: [
      'Click "Pick from screen" to sample any pixel (Chrome and Edge).',
      'Everywhere else, use the colour swatch to choose a value.',
      'Copy HEX, RGB, HSL, CMYK or a CSS variable, with WCAG contrast checks.',
    ],
  },

  /* ══════════════ CODING (7) ══════════════ */

  'json-diff': {
    mount(container) {
      const a = el('textarea.textarea.code-area', { rows: 9, placeholder: 'Original JSON…', value: '{\n  "name": "PSDKIT",\n  "tools": 175,\n  "tags": ["free", "web"],\n  "active": true\n}' });
      const b = el('textarea.textarea.code-area', { rows: 9, placeholder: 'Changed JSON…', value: '{\n  "name": "PSDKIT Pro",\n  "tools": 201,\n  "tags": ["free", "web", "ai"],\n  "beta": false\n}' });
      const out = el('div', { style: { marginTop: '16px' } });

      const TYPE_LABEL = { added: 'Added', removed: 'Removed', changed: 'Changed' };
      const diff = (x, y, path, acc) => {
        const typeOf = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);
        const tx = typeOf(x); const ty = typeOf(y);
        if (tx !== ty) { acc.push({ path: path || '$', type: 'changed', from: x, to: y }); return acc; }
        if (tx === 'object') {
          for (const key of new Set([...Object.keys(x), ...Object.keys(y)])) {
            const p = path ? `${path}.${key}` : key;
            if (!(key in x)) acc.push({ path: p, type: 'added', to: y[key] });
            else if (!(key in y)) acc.push({ path: p, type: 'removed', from: x[key] });
            else diff(x[key], y[key], p, acc);
          }
          return acc;
        }
        if (tx === 'array') {
          const len = Math.max(x.length, y.length);
          for (let i = 0; i < len; i++) {
            const p = `${path || ''}[${i}]`;
            if (i >= x.length) acc.push({ path: p, type: 'added', to: y[i] });
            else if (i >= y.length) acc.push({ path: p, type: 'removed', from: x[i] });
            else diff(x[i], y[i], p, acc);
          }
          return acc;
        }
        if (x !== y) acc.push({ path: path || '$', type: 'changed', from: x, to: y });
        return acc;
      };

      const show = (v) => {
        if (v === undefined) return '—';
        const s = typeof v === 'string' ? v : JSON.stringify(v);
        return s && s.length > 90 ? `${s.slice(0, 90)}…` : s;
      };

      const run = () => {
        let pa; let pb;
        try { pa = JSON.parse(a.value || 'null'); } catch (e) { out.innerHTML = ''; out.append(el('div.note', { html: icon('bug', 17) + `<span>Left side is not valid JSON: ${e.message}</span>` })); return; }
        try { pb = JSON.parse(b.value || 'null'); } catch (e) { out.innerHTML = ''; out.append(el('div.note', { html: icon('bug', 17) + `<span>Right side is not valid JSON: ${e.message}</span>` })); return; }
        const changes = diff(pa, pb, '', []);
        const counts = { added: 0, removed: 0, changed: 0 };
        changes.forEach((c) => { counts[c.type]++; });
        out.innerHTML = '';
        out.append(el('div.result-card',
          el('div.result-head',
            el('span.result-title', { text: changes.length ? `${changes.length} difference(s)` : 'Identical' }),
            el('div.row', { style: { gap: '8px' } }, copyButton(() => changes.map((c) => `${TYPE_LABEL[c.type]} ${c.path}: ${show(c.from)} → ${show(c.to)}`).join('\n'), 'Copy report')),
          ),
          el('div.result-body', el('div.col', { style: { gap: '14px' } },
            el('div.stat-grid',
              el('div.stat', el('div.k', { text: 'Added' }), el('div.v', { text: counts.added })),
              el('div.stat', el('div.k', { text: 'Removed' }), el('div.v', { text: counts.removed })),
              el('div.stat', el('div.k', { text: 'Changed' }), el('div.v', { text: counts.changed })),
            ),
            changes.length
              ? scrollTable(['Path', 'Type', 'Before', 'After'], changes.map((c) => [c.path, TYPE_LABEL[c.type], show(c.from), show(c.to)]), { minWidth: 130 })
              : el('div.note', { html: icon('check', 17) + '<span>Both documents are structurally identical.</span>' }),
          )),
        ));
      };

      container.append(
        el('div.tool-form',
          el('div.field', el('label.field-label', { text: 'Original JSON' }), a),
          el('div.field', el('label.field-label', { text: 'Changed JSON' }), b),
        ),
        el('div.tool-actions', { style: { marginTop: '14px' } },
          el('button.btn.btn-accent', { html: `${icon('filter', 16)} Compare`, onclick: run }),
          el('button.btn.btn-soft', { html: `${icon('refresh', 16)} Swap sides`, onclick: () => { const t = a.value; a.value = b.value; b.value = t; run(); } }),
          el('button.btn.btn-soft', { html: `${icon('edit', 16)} Format both`, onclick: () => { try { a.value = JSON.stringify(JSON.parse(a.value), null, 2); b.value = JSON.stringify(JSON.parse(b.value), null, 2); toast('Both sides formatted'); run(); } catch { toast('Fix the JSON first', 'x'); } } }),
        ),
        out,
      );
      run();
    },
    help: [
      'Paste two JSON documents — objects, arrays or scalars.',
      'Click Compare to get a path-by-path table of every difference.',
      'Use Swap sides to reverse the comparison, or Format both to tidy up.',
    ],
  },

  'html-to-jsx': {
    fields: [
      { id: 'html', label: 'HTML', type: 'textarea', rows: 10, default: '<div class="card" id="main" tabindex="0">\n  <label for="email">Email</label>\n  <input type="email" name="email" maxlength="60" readonly required>\n  <!-- server rendered -->\n  <img src="/logo.png" alt="Logo" style="width: 40px; border-radius: 8px">\n  <br>\n  <p>Hello&nbsp;world &amp; friends</p>\n</div>' },
    ],
    live: true,
    compute(v) {
      const src = v.html || '';
      if (!src.trim()) return 'Paste some HTML to convert.';
      const ATTR_MAP = {
        class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength',
        minlength: 'minLength', cellpadding: 'cellPadding', cellspacing: 'cellSpacing', colspan: 'colSpan',
        rowspan: 'rowSpan', enctype: 'encType', autocomplete: 'autoComplete', autofocus: 'autoFocus',
        autocapitalize: 'autoCapitalize', crossorigin: 'crossOrigin', datetime: 'dateTime', srcdoc: 'srcDoc',
        usemap: 'useMap', novalidate: 'noValidate', formnovalidate: 'formNoValidate', hreflang: 'hrefLang',
        itemprop: 'itemProp', contenteditable: 'contentEditable', spellcheck: 'spellCheck', srcset: 'srcSet',
        frameborder: 'frameBorder', allowfullscreen: 'allowFullScreen', playsinline: 'playsInline',
      };
      const BOOLEAN_ATTRS = new Set(['disabled', 'checked', 'selected', 'readOnly', 'required', 'multiple', 'hidden', 'autoFocus', 'autoPlay', 'controls', 'loop', 'muted', 'defer', 'async', 'noValidate', 'allowFullScreen', 'default', 'open']);
      const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
      const ENTITIES = { nbsp: '\u00a0', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", copy: '©', reg: '®', mdash: '—', ndash: '–', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', middot: '·', times: '×', deg: '°' };

      const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

      const styleToObject = (css) => {
        const decls = css.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
          const idx = d.indexOf(':');
          if (idx < 0) return null;
          const prop = camel(d.slice(0, idx).trim());
          const val = d.slice(idx + 1).trim();
          if (!prop) return null;
          const numeric = /^-?\d*\.?\d+$/.test(val) && !/^(zIndex|fontWeight|lineHeight|opacity|order|flex|flexGrow|flexShrink|widows|orphans|columnCount|animationIterationCount)$/i.test(prop);
          return `  ${prop}: ${numeric ? val : JSON.stringify(val)},`;
        }).filter(Boolean);
        return decls.length ? `{{\n${decls.join('\n')}\n}}` : '{{}}';
      };

      let out = src;
      /* comments */
      out = out.replace(/<!--([\s\S]*?)-->/g, (_, inner) => `{/*${inner.trim()}*/}`);
      /* attributes */
      out = out.replace(/<([a-zA-Z][\w-]*)((?:\s+[^<>]*?)?)(\/?)>/g, (match, tag, attrs, selfClose) => {
        const lower = tag.toLowerCase();
        let converted = attrs.replace(/([@:a-zA-Z_-]+)(\s*=\s*)("([^"]*)"|'([^']*)'|([^\s"'>]+))?/g, (m, name, eq, _val, dq, sq, bare) => {
          const value = dq ?? sq ?? bare ?? null;
          let attrName = name;
          if (name === 'style' && value) return `style=${styleToObject(value)}`;
          if (/^(data-|aria-)/.test(name)) return value == null ? name : `${name}="${value}"`;
          if (name.startsWith('on') && value) return `${name.toLowerCase()}={${/^\s*[\w$.]+\s*$/.test(value) ? value : `() => ${value}`}}`;
          const mapped = ATTR_MAP[name.toLowerCase()];
          if (mapped) attrName = mapped;
          if (value == null) {
            return BOOLEAN_ATTRS.has(attrName) ? `${attrName}={true}` : attrName;
          }
          if (/^(class|id|href|src|alt|title|type|name|value|placeholder|target|rel|width|height|colSpan|rowSpan|htmlFor|key|ref)$/.test(attrName) && !/[{}]/.test(value)) {
            return `${attrName}="${value}"`;
          }
          return /^\s*-?[\d.]+\s*$/.test(value) ? `${attrName}={${value}}` : `${attrName}="${value}"`;
        });
        converted = converted.replace(/\s{2,}/g, ' ').trim();
        const closing = VOID_TAGS.has(lower) || selfClose ? ' /' : '';
        return `<${tag}${converted ? ` ${converted}` : ''}${closing}>`;
      });
      /* entities in text nodes */
      out = out.replace(/&([a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);/g, (m, body) => {
        if (ENTITIES[body]) return body === 'nbsp' ? "{' '}" : `{${JSON.stringify(ENTITIES[body])}}`;
        if (body.startsWith('#')) {
          const code = body[1] === 'x' ? parseInt(body.slice(2), 16) : Number(body.slice(1));
          if (Number.isFinite(code)) return `{${JSON.stringify(String.fromCodePoint(code))}}`;
        }
        return m;
      });
      const issues = [];
      if (/\bclass=/.test(out)) issues.push('Some class attributes may need manual review.');
      if (/<script/i.test(src)) issues.push('Inline scripts must move to useEffect — JSX does not run them.');
      if (/\bstyle="/.test(out)) issues.push('A style attribute was left as a string; convert it to an object.');
      return {
        title: 'JSX output',
        stats: [
          { label: 'Lines', value: out.split('\n').length },
          { label: 'Attributes renamed', value: (src.match(/\b(class|for|tabindex|readonly|maxlength|colspan|rowspan|cellpadding|autocomplete|autofocus|crossorigin|datetime|srcdoc|usemap|novalidate|hreflang|spellcheck|srcset|frameborder|allowfullscreen|playsinline|enctype|minlength|cellspacing|contenteditable|itemprop|autocapitalize|formnovalidate)=/gi) || []).length },
          { label: 'Void tags closed', value: (src.match(/<(br|img|input|hr|meta|link|source|area|base|col|embed|param|track|wbr)\b(?![^>]*\/>)/gi) || []).length },
          { label: 'Ready to paste', value: issues.length ? 'Check notes' : 'Yes' },
        ],
        html: `<pre class="code">${out.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</pre>`,
        copy: out,
        downloadText: out,
        downloadName: 'component.jsx',
        note: issues.length ? issues.join(' ') : 'class became className, inline styles became objects, void tags are self-closed and comments use the JSX form.',
      };
    },
  },

  'rem-px-conv': {
    fields: [
      { id: 'value', label: 'Value', type: 'number', half: true, default: 16, step: 'any' },
      { id: 'unit', label: 'Unit of that value', type: 'select', half: true, options: [
        ['px', 'px'], ['rem', 'rem'], ['em', 'em'], ['pt', 'pt'], ['%', '% (of root)'], ['cm', 'cm'], ['in', 'in'], ['mm', 'mm'],
      ], default: 'px' },
      { id: 'root', label: 'Root font size (html)', type: 'number', half: true, default: 16, step: 'any', hint: 'Browsers default to 16px.' },
      { id: 'parent', label: 'Parent font size (for em)', type: 'number', half: true, default: 16, step: 'any' },
    ],
    live: true,
    compute(v) {
      const value = num(v.value); const root = num(v.root) || 16; const parent = num(v.parent) || root;
      if (value == null) return 'Enter a value to convert.';
      if (root <= 0 || parent <= 0) return 'Font sizes must be greater than zero.';
      /* everything normalises to px first */
      const toPx = {
        px: (x) => x, rem: (x) => x * root, em: (x) => x * parent, pt: (x) => x * (96 / 72),
        '%': (x) => (x / 100) * root, cm: (x) => x * (96 / 2.54), in: (x) => x * 96, mm: (x) => x * (96 / 25.4),
      };
      const px = toPx[v.unit](value);
      const rows = [
        ['px', `${round(px, 4)}px`],
        ['rem', `${round(px / root, 4)}rem`],
        ['em', `${round(px / parent, 4)}em`],
        ['pt', `${round(px * (72 / 96), 4)}pt`],
        ['% of root', `${round((px / root) * 100, 4)}%`],
        ['cm', `${round(px * (2.54 / 96), 4)}cm`],
        ['in', `${round(px / 96, 4)}in`],
        ['mm', `${round(px * (25.4 / 96), 4)}mm`],
      ];
      return {
        title: 'CSS length conversion',
        stats: [
          { label: 'In pixels', value: `${round(px, 3)}px` },
          { label: 'In rem', value: `${round(px / root, 3)}rem` },
          { label: 'In em', value: `${round(px / parent, 3)}em` },
          { label: 'Root size', value: `${root}px` },
        ],
        html: scrollTable(['Unit', 'Value'], rows, { minWidth: 130 }).outerHTML,
        text: rows.map(([u, val]) => `${u}: ${val}`).join('\n'),
        copy: rows.map(([u, val]) => `${u}: ${val}`).join('\n'),
        note: v.unit === 'em'
          ? 'em is relative to the parent element font size, rem is always relative to the root — that is why rem is safer for spacing.'
          : 'rem scales with the user browser font size, so it respects accessibility settings better than px.',
      };
    },
  },

  'env-parser': {
    fields: [
      { id: 'dir', label: 'Direction', type: 'select', options: [
        ['to-json', '.env → JSON'], ['to-env', 'JSON → .env'], ['to-export', '.env → shell exports'], ['to-md', '.env → Markdown table'],
      ], default: 'to-json' },
      { id: 'src', label: 'Source', type: 'textarea', rows: 10, default: '# Database\nDATABASE_URL="postgres://user:pass@localhost:5432/app"\nDB_POOL_SIZE=10\n\nexport API_KEY=\'sk_live_abc123\'\nFEATURE_BETA=true\nEMPTY=\n# commented out\n# OLD_KEY=old' },
      { id: 'mask', type: 'checkbox', default: true, checkLabel: 'Mask values that look like secrets' },
    ],
    live: true,
    compute(v) {
      const src = v.src || '';
      const SECRET = /(key|token|secret|password|passwd|pwd|auth|credential|private|dsn|database_url|api)/i;
      const mask = (k, val) => (v.mask && SECRET.test(k) && val ? `${val.slice(0, 3)}${'•'.repeat(Math.max(3, Math.min(12, val.length - 3)))}${val.slice(-2)}` : val);

      const parseEnv = (text) => {
        const out = {};
        const comments = [];
        text.split(/\r?\n/).forEach((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          if (trimmed.startsWith('#')) { comments.push({ line: i + 1, text: trimmed }); return; }
          const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_.]*)\s*=\s*(.*)$/.exec(trimmed);
          if (!m) { comments.push({ line: i + 1, text: `⚠ skipped (not KEY=value): ${trimmed.slice(0, 40)}` }); return; }
          let value = m[2].trim();
          if (/^"[\s\S]*"$/.test(value)) value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n');
          else if (/^'[\s\S]*'$/.test(value)) value = value.slice(1, -1);
          else value = value.replace(/\s+#.*$/, '').replace(/\\#/g, '#').trim();
          out[m[1]] = value;
        });
        return { out, comments };
      };

      if (v.dir === 'to-env') {
        let obj;
        try { obj = JSON.parse(src); } catch (e) { return `Right side is not valid JSON: ${e.message}`; }
        if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return 'Paste a flat JSON object like {"API_KEY": "abc"}.';
        const flat = {};
        const walk = (o, prefix) => Object.entries(o).forEach(([k, val]) => {
          const key = prefix ? `${prefix}_${k}` : k;
          if (val && typeof val === 'object' && !Array.isArray(val)) walk(val, key.toUpperCase());
          else flat[key.toUpperCase().replace(/[^A-Z0-9_]/g, '_')] = Array.isArray(val) ? val.join(',') : String(val ?? '');
        });
        walk(obj, '');
        const lines = Object.entries(flat).map(([k, val]) => (/[#\s'"]/.test(val) ? `${k}="${val.replace(/"/g, '\\"')}"` : `${k}=${val}`));
        return {
          title: '.env file',
          stats: [{ label: 'Variables', value: lines.length }, { label: 'Quoted', value: lines.filter((l) => l.includes('"')).length }],
          text: lines.join('\n'),
          copy: lines.join('\n'),
          downloadText: lines.join('\n'),
          downloadName: '.env',
          note: 'Nested objects were flattened with underscores. Keep this file out of git and add it to .gitignore.',
        };
      }

      const { out, comments } = parseEnv(src);
      const keys = Object.keys(out);
      if (!keys.length) return 'No KEY=value lines found in that input.';
      if (v.dir === 'to-export') {
        const lines = keys.map((k) => `export ${k}=${/[^\w@%+=:,./-]/.test(out[k]) ? `'${out[k].replace(/'/g, `'\\''`)}'` : out[k]}`);
        return {
          title: 'Shell exports',
          stats: [{ label: 'Variables', value: keys.length }, { label: 'Ignored lines', value: comments.length }],
          text: lines.join('\n'),
          copy: lines.join('\n'),
          downloadText: lines.join('\n'),
          downloadName: 'env.sh',
          note: 'Source this file with `source env.sh`, or paste the lines into a CI step.',
        };
      }
      if (v.dir === 'to-md') {
        const rows = keys.map((k) => [k, mask(k, out[k]) || '(empty)']);
        return {
          title: 'Environment variables',
          stats: [{ label: 'Variables', value: keys.length }, { label: 'Empty values', value: keys.filter((k) => !out[k]).length }, { label: 'Secrets masked', value: keys.filter((k) => v.mask && SECRET.test(k) && out[k]).length }],
          html: scrollTable(['Variable', 'Value'], rows, { minWidth: 200 }).outerHTML,
          text: rows.map(([k, val]) => `${k}=${val}`).join('\n'),
          copy: `| Variable | Value |\n| --- | --- |\n${rows.map(([k, val]) => `| \`${k}\` | \`${val}\` |`).join('\n')}`,
          note: 'A Markdown table is safe to paste into a README only when secrets are masked.',
        };
      }
      const json = Object.fromEntries(keys.map((k) => [k, mask(k, out[k])]));
      return {
        title: 'Parsed .env',
        stats: [
          { label: 'Variables', value: keys.length },
          { label: 'Empty values', value: keys.filter((k) => !out[k]).length },
          { label: 'Secrets masked', value: keys.filter((k) => v.mask && SECRET.test(k) && out[k]).length },
          { label: 'Comment lines', value: comments.length },
        ],
        html: `<pre class="code">${JSON.stringify(json, null, 2).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</pre>`,
        text: comments.length ? `Skipped / comment lines:\n${comments.map((c) => `  line ${c.line}: ${c.text}`).join('\n')}` : '',
        copy: JSON.stringify(Object.fromEntries(keys.map((k) => [k, out[k]])), null, 2),
        downloadText: JSON.stringify(Object.fromEntries(keys.map((k) => [k, out[k]])), null, 2),
        downloadName: 'env.json',
        note: v.mask ? 'Secret-looking values are masked on screen, but the Copy and Download buttons give you the real values.' : 'Masking is off — do not paste this output anywhere public.',
      };
    },
  },

  'ascii-art-text': {
    fields: [
      { id: 'text', label: 'Text', type: 'text', default: 'PSDKIT', placeholder: 'A-Z, 0-9 and basic punctuation' },
      { id: 'fill', label: 'Fill character', type: 'select', half: true, options: [
        ['#', '# block'], ['*', '* star'], ['=', '= bars'], ['█', '█ solid'], ['@', '@ at'], ['0', '0 zero'], ['.', '. dots'],
      ], default: '#' },
      { id: 'bg', label: 'Background character', type: 'select', half: true, options: [[' ', 'space'], ['.', 'dot'], ['-', 'dash'], ['0', 'zero']], default: ' ' },
      { id: 'tracking', label: 'Letter spacing', type: 'select', half: true, options: [['1', 'Normal'], ['2', 'Wide'], ['0', 'Touching']], default: '1' },
    ],
    live: true,
    compute(v) {
      /* 5×5 block font, one string per glyph with rows separated by | */
      const FONT = {
        A: '.###.|#...#|#####|#...#|#...#', B: '####.|#...#|####.|#...#|####.', C: '.####|#....|#....|#....|.####',
        D: '####.|#...#|#...#|#...#|####.', E: '#####|#....|####.|#....|#####', F: '#####|#....|####.|#....|#....',
        G: '.####|#....|#..##|#...#|.###.', H: '#...#|#...#|#####|#...#|#...#', I: '#####|..#..|..#..|..#..|#####',
        J: '..###|...#.|...#.|#..#.|.##..', K: '#...#|#..#.|###..|#..#.|#...#', L: '#....|#....|#....|#....|#####',
        M: '#...#|##.##|#.#.#|#...#|#...#', N: '#...#|##..#|#.#.#|#..##|#...#', O: '.###.|#...#|#...#|#...#|.###.',
        P: '####.|#...#|####.|#....|#....', Q: '.###.|#...#|#.#.#|#.##.|.####', R: '####.|#...#|####.|#..#.|#...#',
        S: '.####|#....|.###.|....#|####.', T: '#####|..#..|..#..|..#..|..#..', U: '#...#|#...#|#...#|#...#|.###.',
        V: '#...#|#...#|#...#|.#.#.|..#..', W: '#...#|#...#|#.#.#|##.##|#...#', X: '#...#|.#.#.|..#..|.#.#.|#...#',
        Y: '#...#|.#.#.|..#..|..#..|..#..', Z: '#####|...#.|..#..|.#...|#####',
        0: '.###.|#..##|#.#.#|##..#|.###.', 1: '..#..|.##..|..#..|..#..|.###.', 2: '.###.|#...#|..##.|.#...|#####',
        3: '#####|..##.|....#|#...#|.###.', 4: '#..#.|#..#.|#####|...#.|...#.', 5: '#####|#....|####.|....#|####.',
        6: '.###.|#....|####.|#...#|.###.', 7: '#####|...#.|..#..|.#...|.#...', 8: '.###.|#...#|.###.|#...#|.###.',
        9: '.###.|#...#|.####|....#|.###.',
        ' ': '.....|.....|.....|.....|.....', '.': '.....|.....|.....|.....|..#..', ',': '.....|.....|.....|..#..|.#...',
        '-': '.....|.....|.###.|.....|.....', '_': '.....|.....|.....|.....|#####', '!': '..#..|..#..|..#..|.....|..#..',
        '?': '.###.|#...#|..##.|.....|..#..', ':': '.....|..#..|.....|..#..|.....', '+': '.....|..#..|.###.|..#..|.....',
        '=': '.....|.###.|.....|.###.|.....', '/': '....#|...#.|..#..|.#...|#....', '(': '...#.|..#..|..#..|..#..|...#.',
        ')': '.#...|..#..|..#..|..#..|.#...', '<': '....#|...#.|..#..|...#.|....#', '>': '#....|.#...|..#..|.#...|#....',
        '#': '.#.#.|#####|.#.#.|#####|.#.#.', '@': '.###.|#..##|#.#.#|#....|.###.', '*': '#.#.#|.#.#.|#####|.#.#.|#.#.#',
        $: '.###.|#.#..|#####|..#.#|.###.', '%': '#...#|...#.|..#..|.#...|#...#', '&': '.##..|#..#.|.##..|#..#.|.##.#',
        "'": '..#..|..#..|.....|.....|.....', '"': '.#.#.|.#.#.|.....|.....|.....',
      };
      const text = String(v.text || '').toUpperCase();
      if (!text.trim()) return 'Type something to render.';
      const unknown = [...new Set([...text].filter((c) => c !== '\n' && !FONT[c]))];
      const fill = v.fill || '#';
      const bg = v.bg === ' ' ? ' ' : v.bg || ' ';
      const gap = Math.max(0, Math.min(2, Number(v.tracking) || 1));
      const rows = ['', '', '', '', ''];
      const chars = [...text].filter((c) => c !== '\n');
      chars.forEach((c, i) => {
        const glyph = (FONT[c] || FONT['?']).split('|');
        glyph.forEach((line, r) => {
          rows[r] += [...line].map((p) => (p === '#' ? fill : bg)).join('');
          if (i < chars.length - 1) rows[r] += bg.repeat(gap);
        });
      });
      const art = rows.join('\n');
      const widest = Math.max(...rows.map((r) => r.length));
      return {
        title: 'ASCII art',
        stats: [
          { label: 'Characters', value: chars.length },
          { label: 'Art width', value: `${widest} cols` },
          { label: 'Art height', value: '5 rows' },
          { label: 'Unsupported', value: unknown.length ? unknown.join('') : 'None' },
        ],
        html: `<pre class="code" style="white-space:pre;overflow-x:auto">${art.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</pre>`,
        text: art,
        copy: art,
        downloadText: art,
        downloadName: 'ascii-art.txt',
        note: unknown.length
          ? `These characters have no glyph and were drawn as "?": ${unknown.join(' ')}. Stick to A–Z, 0–9 and basic punctuation.`
          : 'Paste it into a README, a terminal banner or a code comment. The block below scrolls sideways instead of breaking your layout.',
      };
    },
  },

  'unicode-inspector': {
    fields: [
      { id: 'mode', label: 'Mode', type: 'select', half: true, options: [
        ['chars', 'Inspect characters in text'], ['code', 'Look up a code point'],
      ], default: 'chars' },
      { id: 'input', label: 'Text or code point', type: 'text', default: 'Aa😀→₹', placeholder: 'Paste text, or enter U+1F600 / 128512' },
      { id: 'limit', label: 'Maximum characters to show', type: 'select', half: true, options: [['20', '20'], ['50', '50'], ['100', '100'], ['250', '250']], default: '50' },
    ],
    live: true,
    compute(v) {
      const raw = String(v.input || '');
      if (!raw.trim()) return 'Type some text or a code point.';
      const utf8Bytes = (s) => {
        try { return [...new TextEncoder().encode(s)]; } catch { return []; }
      };
      const BLOCKS = [
        [0x0000, 0x007F, 'Basic Latin'], [0x0080, 0x00FF, 'Latin-1 Supplement'], [0x0100, 0x024F, 'Latin Extended'],
        [0x0300, 0x036F, 'Combining Diacriticals'], [0x0370, 0x03FF, 'Greek and Coptic'], [0x0400, 0x04FF, 'Cyrillic'],
        [0x0590, 0x05FF, 'Hebrew'], [0x0600, 0x06FF, 'Arabic'], [0x0900, 0x097F, 'Devanagari'], [0x0980, 0x09FF, 'Bengali'],
        [0x0B80, 0x0BFF, 'Tamil'], [0x0C00, 0x0C7F, 'Telugu'], [0x2000, 0x206F, 'General Punctuation'], [0x2070, 0x209F, 'Superscripts and Subscripts'],
        [0x20A0, 0x20CF, 'Currency Symbols'], [0x2100, 0x214F, 'Letterlike Symbols'], [0x2150, 0x218F, 'Number Forms'],
        [0x2190, 0x21FF, 'Arrows'], [0x2200, 0x22FF, 'Mathematical Operators'], [0x2500, 0x257F, 'Box Drawing'],
        [0x2580, 0x259F, 'Block Elements'], [0x25A0, 0x25FF, 'Geometric Shapes'], [0x2600, 0x26FF, 'Miscellaneous Symbols'],
        [0x2700, 0x27BF, 'Dingbats'], [0x3000, 0x303F, 'CJK Symbols and Punctuation'], [0x4E00, 0x9FFF, 'CJK Unified Ideographs'],
        [0xFE00, 0xFE0F, 'Variation Selectors'], [0x1F300, 0x1F5FF, 'Misc Symbols and Pictographs'], [0x1F600, 0x1F64F, 'Emoticons'],
        [0x1F680, 0x1F6FF, 'Transport and Map'], [0x1F900, 0x1F9FF, 'Supplemental Symbols'], [0x1FA70, 0x1FAFF, 'Symbols Extended-A'],
        [0xE000, 0xF8FF, 'Private Use Area'], [0x1D400, 0x1D7FF, 'Mathematical Alphanumeric'],
      ];
      const blockOf = (cp) => BLOCKS.find(([lo, hi]) => cp >= lo && cp <= hi)?.[2] || 'Other';
      const describe = (ch) => {
        const cp = ch.codePointAt(0);
        const bytes = utf8Bytes(ch);
        return {
          char: ch,
          cp: `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`,
          dec: String(cp),
          hex: `0x${cp.toString(16).toUpperCase()}`,
          entity: `&#${cp}; / &#x${cp.toString(16).toUpperCase()};`,
          js: cp > 0xFFFF ? `'\\u{${cp.toString(16).toUpperCase()}}'` : `'\\u${cp.toString(16).toUpperCase().padStart(4, '0')}'`,
          utf8: bytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' '),
          bytes: String(bytes.length),
          block: blockOf(cp),
          surrogate: cp > 0xFFFF ? 'Yes (astral plane)' : 'No',
          visible: /\S/.test(ch) ? 'Yes' : 'Whitespace',
        };
      };

      if (v.mode === 'code') {
        const token = raw.trim().replace(/^(u\+|0x|\\u\{?|&#x?)/i, '').replace(/[};]$/, '');
        const cp = /^[0-9a-f]+$/i.test(token) ? parseInt(token, /^[0-9]+$/.test(token) ? 10 : 16) : Number(token);
        if (!Number.isFinite(cp) || cp < 0 || cp > 0x10FFFF) return 'Enter a code point like U+1F600, 0x41 or 128512.';
        let ch;
        try { ch = String.fromCodePoint(cp); } catch { return 'That code point cannot be represented.'; }
        const info = describe(ch);
        return {
          title: `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`,
          stats: [
            { label: 'Character', value: /\S/.test(ch) ? ch : '(whitespace)' },
            { label: 'Code point', value: info.cp },
            { label: 'Decimal', value: info.dec },
            { label: 'Block', value: info.block },
            { label: 'UTF-8 bytes', value: info.utf8 },
            { label: 'Byte length', value: info.bytes },
            { label: 'Surrogate pair', value: info.surrogate },
          ],
          html: `<div style="display:flex;align-items:center;justify-content:center;font-size:88px;line-height:1;padding:18px;background:var(--cream);border:1px solid var(--cream-line);border-radius:16px;overflow:hidden">${/\S/.test(ch) ? ch.replace(/[<>&]/g, '') : '␣'}</div>`,
          text: `${info.cp}  ${info.dec}  ${info.block}\nHTML entity: ${info.entity}\nJavaScript:  ${info.js}\nUTF-8:       ${info.utf8}`,
          copy: ch,
        };
      }

      const chars = [...raw];
      const limit = Number(v.limit) || 50;
      const shown = chars.slice(0, limit);
      const rows = shown.map((c) => {
        const i = describe(c);
        return [/\S/.test(c) ? c : '␣', i.cp, i.dec, i.block, i.utf8, i.js];
      });
      const astral = chars.filter((c) => c.codePointAt(0) > 0xFFFF).length;
      const combining = chars.filter((c) => { const cp = c.codePointAt(0); return cp >= 0x0300 && cp <= 0x036F; }).length;
      return {
        title: 'Character inspection',
        stats: [
          { label: 'Code points', value: chars.length },
          { label: 'UTF-16 units', value: raw.length },
          { label: 'UTF-8 bytes', value: utf8Bytes(raw).length },
          { label: 'Astral (emoji etc.)', value: astral },
          { label: 'Combining marks', value: combining },
          { label: 'Shown', value: `${shown.length}/${chars.length}` },
        ],
        html: scrollTable(['Char', 'Code point', 'Decimal', 'Block', 'UTF-8', 'JS escape'], rows, { minWidth: 105 }).outerHTML,
        text: rows.map((r) => r.join('\t')).join('\n'),
        copy: rows.map((r) => `${r[1]} ${r[0]}`).join('\n'),
        note: chars.length > limit
          ? `Showing the first ${limit} code points. Raise the limit to see the rest.`
          : 'UTF-16 units differ from code points whenever emoji or rare scripts are involved — that is why string.length can surprise you in JavaScript.',
      };
    },
  },

  'keyword-density': {
    fields: [
      { id: 'text', label: 'Content to analyse', type: 'textarea', rows: 9, default: 'PSDKIT is a free toolbox. PSDKIT tools run in your browser. Free tools are fast, private and simple. Use PSDKIT tools for daily work, internet checks and coding tasks.' },
      { id: 'keyword', label: 'Focus keyword (optional)', type: 'text', half: true, default: '', placeholder: 'e.g. free tools' },
      { id: 'top', label: 'Show top N words', type: 'select', half: true, options: [['10', '10'], ['20', '20'], ['30', '30'], ['50', '50']], default: '20' },
      { id: 'ignore', label: 'Ignore common stop words', type: 'checkbox', default: true },
    ],
    live: true,
    compute(v) {
      const src = v.text || '';
      const words = (src.toLowerCase().match(/[a-z0-9'’]+(?:-[a-z0-9]+)*/g) || []);
      if (!words.length) return 'Paste some text to analyse.';
      const STOP = new Set(('a an and are as at be but by for from had has have he her his i if in into is it its me my not of on or our she so than that the their them then there these they this to was we were what when where which who will with you your').split(' '));
      const filtered = v.ignore ? words.filter((w) => !STOP.has(w) && w.length > 1) : words;
      const freq = new Map();
      filtered.forEach((w) => freq.set(w, (freq.get(w) || 0) + 1));
      const topN = Number(v.top) || 20;
      const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, topN);
      const total = words.length;
      const rows = ranked.map(([w, c], i) => [String(i + 1), w, String(c), `${round((c / total) * 100, 2)}%`]);

      /* bigrams — the phrases search engines actually match */
      const bi = new Map();
      for (let i = 0; i < words.length - 1; i++) {
        const phrase = `${words[i]} ${words[i + 1]}`;
        if (v.ignore && STOP.has(words[i]) && STOP.has(words[i + 1])) continue;
        bi.set(phrase, (bi.get(phrase) || 0) + 1);
      }
      const topPhrases = [...bi.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, 10);

      const stats = [
        { label: 'Total words', value: fmt.num(total, 0) },
        { label: 'Unique words', value: fmt.num(freq.size, 0) },
        { label: 'Sentences', value: (src.match(/[.!?]+/g) || []).length || 1 },
        { label: 'Reading time', value: `${Math.max(1, Math.round(total / 220))} min` },
      ];

      let keywordHtml = '';
      let keywordNote = '';
      const kw = String(v.keyword || '').trim().toLowerCase();
      if (kw) {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matches = (src.toLowerCase().match(new RegExp(escaped, 'g')) || []).length;
        const kwWords = kw.split(/\s+/).filter(Boolean).length;
        const density = total > 0 ? (matches * kwWords / total) * 100 : 0;
        stats.push({ label: `"${kw}" count`, value: matches });
        stats.push({ label: `"${kw}" density`, value: `${round(density, 2)}%` });
        stats.push({ label: 'Verdict', value: density > 4 ? 'Over-optimised' : density >= 0.5 ? 'Healthy' : matches ? 'Thin' : 'Missing' });
        keywordNote = density > 4
          ? 'Above 4% reads as keyword stuffing. Rewrite some mentions as synonyms or pronouns.'
          : density >= 0.5
            ? 'A healthy density. Keep the phrase in the title, first paragraph and one heading.'
            : matches
              ? 'The phrase appears but rarely. Use it in your title and first 100 words if it matters.'
              : 'That exact phrase does not appear in the text at all.';
      }

      const html = [
        keywordHtml,
        `<div class="field-label" style="margin:4px 0 8px">Top single words</div>`,
        scrollTable(['#', 'Word', 'Count', 'Density'], rows, { minWidth: 80 }).outerHTML,
        topPhrases.length
          ? `<div class="field-label" style="margin:18px 0 8px">Repeated two-word phrases</div>${scrollTable(['Phrase', 'Count', 'Density'], topPhrases.map(([p, c]) => [p, String(c), `${round((c / total) * 100, 2)}%`]), { minWidth: 120 }).outerHTML}`
          : '',
      ].join('');

      return {
        title: 'Keyword density',
        stats,
        html,
        text: ranked.map(([w, c], i) => `${i + 1}. ${w} — ${c}× (${round((c / total) * 100, 2)}%)`).join('\n'),
        copy: ranked.map(([w, c]) => `${w}\t${c}\t${round((c / total) * 100, 2)}%`).join('\n'),
        downloadText: `word,count,density\n${ranked.map(([w, c]) => `${w},${c},${round((c / total) * 100, 3)}`).join('\n')}`,
        downloadName: 'keyword-density.csv',
        note: keywordNote || 'Add a focus keyword above to score its density. Search engines reward natural writing — aim for well under 3%.',
      };
    },
  },
};
