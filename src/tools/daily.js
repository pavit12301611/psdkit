/* ============================================================
   DAILY TOOLS (50) — calculators, converters, timers, generators
   ============================================================ */
import { el, fmt, copyText, toast, downloadFile, readFileAs, debounce, requireCtx } from '../ui.js';
import { icon } from '../icons.js';
import {
  mountFormTool, converterTool, UNITS, num, wordsCapitalise, renderResult,
} from './formkit.js';

/* ── small helpers ── */
const D = (s) => (s ? new Date(s + 'T00:00:00') : null);
const dayDiff = (a, b) => Math.round((b - a) / 86400000);

function numberToWordsEn(n) {
  const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const scales = [['billion', 1_000_000_000], ['million', 1_000_000], ['thousand', 1000], ['hundred', 100]];
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? `-${ones[n % 10]}` : '');
  for (const [label, value] of scales) {
    if (n >= value) {
      const head = Math.floor(n / value);
      const tail = n % value;
      return `${numberToWordsEn(head)} ${label}${tail ? ` ${numberToWordsEn(tail)}` : ''}`;
    }
  }
  return String(n);
}

function numberToWordsIndian(n) {
  const units = [['crore', 10000000], ['lakh', 100000], ['thousand', 1000], ['hundred', 100]];
  if (n < 1000) return numberToWordsEn(n);
  for (const [label, value] of units) {
    if (n >= value) {
      const head = Math.floor(n / value);
      const tail = n % value;
      return `${numberToWordsIndian(head)} ${label}${tail ? ` ${numberToWordsIndian(tail)}` : ''}`;
    }
  }
  return String(n);
}

const FANCY_STYLE_MAPS = {
  Bold: ['𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇', '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭'],
  Italic: ['𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻', '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡'],
  Script: ['𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃', '𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩'],
  Bubble: ['ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ', 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ'],
};
const EMOJIS = [
  ['😀', 'grinning face happy smile'], ['😂', 'face tears of joy laugh funny'], ['😍', 'heart eyes love crush'], ['🔥', 'fire hot trending lit'], ['✅', 'check success done tick'], ['🎉', 'party celebration confetti'], ['🚀', 'rocket launch fast growth'], ['✨', 'sparkles magic shine'], ['💡', 'idea bulb tip'], ['📌', 'pin mark save'], ['🙏', 'folded hands thank you namaste'], ['🤖', 'robot ai assistant'], ['❤️', 'red heart love'], ['👍', 'thumbs up approve yes'], ['👀', 'eyes look watch'], ['📈', 'chart growth analytics'], ['🧠', 'brain thinking learn'], ['💻', 'laptop coding computer'], ['📱', 'phone mobile smartphone'], ['🔒', 'lock secure privacy'],
];

export const DAILY_IMPLS = {

  /* 1 ── Age Calculator */
  'age-calc': {
    fields: [
      { id: 'birth', label: 'Date of birth', type: 'date', default: '2000-01-01', half: true },
      { id: 'until', label: 'Calculate age at (default: today)', type: 'date', half: true },
    ],
    compute(v) {
      const birth = D(v.birth), at = v.until ? D(v.until) : new Date();
      if (!birth || isNaN(birth)) return 'Pick a valid date of birth.';
      if (at < birth) return 'The end date is before the birth date.';
      let y = at.getFullYear() - birth.getFullYear();
      let m = at.getMonth() - birth.getMonth();
      let d = at.getDate() - birth.getDate();
      if (d < 0) { m--; d += new Date(at.getFullYear(), at.getMonth(), 0).getDate(); }
      if (m < 0) { y--; m += 12; }
      const totalDays = dayDiff(birth, at);
      const nextBday = new Date(at.getFullYear(), birth.getMonth(), birth.getDate());
      if (nextBday < at) nextBday.setFullYear(at.getFullYear() + 1);
      const daysToBday = dayDiff(at, nextBday);
      return {
        title: 'Age',
        stats: [
          { label: 'Age', value: `${y}y ${m}m ${d}d` },
          { label: 'Total days', value: fmt.num(totalDays, 0) },
          { label: 'Total hours', value: fmt.num(totalDays * 24, 0) },
          { label: 'Next birthday in', value: `${daysToBday} days` },
        ],
        text: `Age: ${y} years, ${m} months, ${d} days\nThat is ${fmt.num(totalDays, 0)} days, ${fmt.num(totalDays * 24, 0)} hours or ${fmt.num(totalDays * 24 * 60, 0)} minutes.\nNext birthday in ${daysToBday} day(s).`,
      };
    },
  },

  /* 2 ── BMI */
  'bmi-calc': {
    fields: [
      { id: 'h', label: 'Height (cm)', type: 'number', default: 170, half: true },
      { id: 'w', label: 'Weight (kg)', type: 'number', default: 65, half: true },
    ],
    compute(v) {
      const h = num(v.h), w = num(v.w);
      if (!h || !w || h <= 0 || w <= 0) return 'Enter your height and weight.';
      const bmi = w / (h / 100) ** 2;
      const cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal (healthy)' : bmi < 30 ? 'Overweight' : 'Obese';
      const ideal = `18.5–24.9 → ${fmt.num(18.5 * (h / 100) ** 2, 1)}–${fmt.num(24.9 * (h / 100) ** 2, 1)} kg`;
      return {
        title: 'Your BMI',
        stats: [
          { label: 'BMI', value: fmt.num(bmi, 1) },
          { label: 'Category', value: cat },
          { label: 'Healthy weight', value: `${fmt.num(18.5 * (h / 100) ** 2, 0)}–${fmt.num(24.9 * (h / 100) ** 2, 0)} kg` },
        ],
        text: `BMI = ${fmt.num(bmi, 1)} — ${cat}\nHealthy weight range for ${h} cm: ${ideal}`,
        note: 'BMI is a simple screening measure, not a medical diagnosis.',
      };
    },
  },

  /* 3 ── Calorie / BMR */
  'calorie-calc': {
    fields: [
      { id: 'age', label: 'Age (years)', type: 'number', default: 28, half: true },
      { id: 'sex', label: 'Sex', type: 'select', options: [['male', 'Male'], ['female', 'Female']], half: true },
      { id: 'h', label: 'Height (cm)', type: 'number', default: 170, half: true },
      { id: 'w', label: 'Weight (kg)', type: 'number', default: 65, half: true },
      { id: 'act', label: 'Activity level', type: 'select', options: [
        [1.2, 'Sedentary (little exercise)'], [1.375, 'Light (1–3 days/week)'],
        [1.55, 'Moderate (3–5 days/week)'], [1.725, 'Active (6–7 days/week)'],
        [1.9, 'Very active (physical job)'],
      ], default: 1.375 },
    ],
    compute(v) {
      const age = num(v.age), h = num(v.h), w = num(v.w);
      if (!age || !h || !w) return 'Fill in all fields.';
      const s = v.sex === 'male' ? 5 : -161;
      const bmr = 10 * w + 6.25 * h - 5 * age + s;
      const tdee = bmr * Number(v.act);
      return {
        title: 'Daily energy needs',
        stats: [
          { label: 'BMR (rest)', value: `${fmt.num(bmr, 0)} kcal` },
          { label: 'Maintain weight', value: `${fmt.num(tdee, 0)} kcal` },
          { label: 'Mild fat loss', value: `${fmt.num(tdee - 350, 0)} kcal` },
          { label: 'Mild muscle gain', value: `${fmt.num(tdee + 300, 0)} kcal` },
        ],
        text: `BMR (Mifflin–St Jeor): ${fmt.num(bmr, 0)} kcal/day\nMaintenance (TDEE): ${fmt.num(tdee, 0)} kcal/day\nFat-loss target: ~${fmt.num(tdee - 350, 0)} kcal/day · Muscle gain: ~${fmt.num(tdee + 300, 0)} kcal/day`,
      };
    },
  },

  /* 4 ── Percentage */
  'percent-calc': {
    fields: [
      { id: 'mode', label: 'What do you want to calculate?', type: 'select', options: [
        ['of', 'X% of Y'], ['is', 'X is what % of Y'], ['chg', 'Percentage change from X to Y'], ['add', 'Add X% to Y'], ['sub', 'Subtract X% from Y'],
      ] },
      { id: 'x', label: 'X', type: 'number', default: 15, half: true },
      { id: 'y', label: 'Y', type: 'number', default: 200, half: true },
    ],
    compute(v) {
      const x = num(v.x), y = num(v.y);
      if (x == null || y == null) return 'Enter both numbers.';
      let out, explain;
      switch (v.mode) {
        case 'of': out = (x / 100) * y; explain = `${x}% of ${y} = ${fmt.num(out, 4)}`; break;
        case 'is': out = (x / y) * 100; explain = `${x} is ${fmt.num(out, 4)}% of ${y}`; break;
        case 'chg': out = ((y - x) / Math.abs(x)) * 100; explain = `Change from ${x} to ${y} = ${fmt.num(out, 4)}%${out >= 0 ? ' increase' : ' decrease'}`; break;
        case 'add': out = y * (1 + x / 100); explain = `${y} + ${x}% = ${fmt.num(out, 4)}`; break;
        case 'sub': out = y * (1 - x / 100); explain = `${y} − ${x}% = ${fmt.num(out, 4)}`; break;
      }
      return { title: 'Percentage result', stats: [{ label: 'Answer', value: fmt.num(out, 4) }], text: explain, copy: explain };
    },
  },

  /* 5 ── Discount */
  'discount-calc': {
    fields: [
      { id: 'price', label: 'Original price', type: 'number', default: 1000, half: true },
      { id: 'disc', label: 'Discount (%)', type: 'number', default: 25, half: true },
      { id: 'extra', label: 'Extra coupon (%)', type: 'number', default: 0, half: true },
      { id: 'tax', label: 'Tax added (%)', type: 'number', default: 0, half: true },
    ],
    compute(v) {
      const p = num(v.price), d = num(v.disc), e = num(v.extra) || 0, t = num(v.tax) || 0;
      if (p == null || d == null) return 'Enter price and discount.';
      let price = p * (1 - d / 100);
      price *= (1 - e / 100);
      const saved = p - price;
      const withTax = price * (1 + t / 100);
      return {
        title: 'Discount result',
        stats: [
          { label: 'You pay', value: fmt.num(withTax, 2) },
          { label: 'You save', value: fmt.num(saved, 2) },
          { label: 'Final price', value: fmt.num(price, 2) },
          { label: 'Total off', value: `${fmt.num((saved / p) * 100, 1)}%` },
        ],
        text: `Original: ${fmt.num(p, 2)}\nAfter ${d}%${e ? ` + ${e}% coupon` : ''}: ${fmt.num(price, 2)}${t ? `\nWith ${t}% tax: ${fmt.num(withTax, 2)}` : ''}\nYou save ${fmt.num(saved, 2)} (${fmt.num((saved / p) * 100, 1)}%)`,
      };
    },
  },

  /* 6 ── Tip */
  'tip-calc': {
    fields: [
      { id: 'bill', label: 'Bill amount', type: 'number', default: 1200, half: true },
      { id: 'tip', label: 'Tip (%)', type: 'select', options: [10, 12, 15, 18, 20, 25], default: 15, half: true },
      { id: 'people', label: 'Number of people', type: 'number', default: 2, min: 1 },
    ],
    compute(v) {
      const bill = num(v.bill), people = num(v.people) || 1;
      if (bill == null) return 'Enter the bill amount.';
      const tip = bill * (Number(v.tip) / 100);
      const total = bill + tip;
      return {
        title: 'Tip & split',
        stats: [
          { label: 'Tip', value: fmt.num(tip, 2) },
          { label: 'Total', value: fmt.num(total, 2) },
          { label: 'Per person', value: fmt.num(total / people, 2) },
        ],
        text: `Bill: ${fmt.num(bill, 2)}\nTip (${v.tip}%): ${fmt.num(tip, 2)}\nTotal: ${fmt.num(total, 2)}\nSplit ${people} way(s): ${fmt.num(total / people, 2)} each`,
      };
    },
  },

  /* 7 ── Bill splitter */
  'bill-split': {
    fields: [
      { id: 'bill', label: 'Bill total', type: 'number', default: 2000 },
      { id: 'names', label: 'Names (comma separated)', type: 'text', default: 'Aman, Priya, Rahul, Sara', hint: 'Leave empty to split equally by count' },
      { id: 'people', label: 'Or number of people', type: 'number', default: 4, half: true },
      { id: 'tip', label: 'Tip (%)', type: 'number', default: 10, half: true },
    ],
    compute(v) {
      const bill = num(v.bill), tip = num(v.tip) || 0;
      if (bill == null) return 'Enter the bill total.';
      const names = (v.names || '').split(',').map((s) => s.trim()).filter(Boolean);
      const count = names.length || Math.max(1, num(v.people) || 1);
      const total = bill * (1 + tip / 100);
      const share = total / count;
      const lines = (names.length ? names : Array.from({ length: count }, (_, i) => `Person ${i + 1}`))
        .map((n) => `${n}: ${fmt.num(share, 2)}`).join('\n');
      return {
        title: 'Split result',
        stats: [
          { label: 'Total w/ tip', value: fmt.num(total, 2) },
          { label: 'Each pays', value: fmt.num(share, 2) },
          { label: 'People', value: count },
        ],
        text: `Total (with ${tip}% tip): ${fmt.num(total, 2)}\nEach of ${count} pays: ${fmt.num(share, 2)}\n\n${lines}`,
      };
    },
  },

  /* 8 ── EMI */
  'emi-calc': {
    fields: [
      { id: 'p', label: 'Loan amount (principal)', type: 'number', default: 2500000 },
      { id: 'r', label: 'Annual interest rate (%)', type: 'number', default: 8.5, half: true },
      { id: 'yrs', label: 'Tenure (years)', type: 'number', default: 20, half: true },
    ],
    compute(v) {
      const p = num(v.p), r = (num(v.r) || 0) / 12 / 100, n = (num(v.yrs) || 0) * 12;
      if (!p || !n) return 'Enter loan amount and tenure.';
      const emi = r === 0 ? p / n : (p * r * (1 + r) ** n) / ((1 + r) ** n - 1);
      const total = emi * n;
      return {
        title: 'Loan summary',
        stats: [
          { label: 'Monthly EMI', value: fmt.num(emi, 2) },
          { label: 'Total interest', value: fmt.num(total - p, 2) },
          { label: 'Total payment', value: fmt.num(total, 2) },
          { label: 'Months', value: n },
        ],
        text: `EMI = ${fmt.num(emi, 2)} per month\nTotal interest: ${fmt.num(total - p, 2)}\nTotal repayment: ${fmt.num(total, 2)} over ${n} months`,
      };
    },
  },

  /* 9 ── Simple interest */
  'simple-interest': {
    fields: [
      { id: 'p', label: 'Principal', type: 'number', default: 10000, half: true },
      { id: 'r', label: 'Rate (% per year)', type: 'number', default: 6, half: true },
      { id: 't', label: 'Time (years)', type: 'number', default: 3, half: true },
    ],
    compute(v) {
      const p = num(v.p), r = num(v.r), t = num(v.t);
      if (p == null || r == null || t == null) return 'Enter principal, rate and time.';
      const si = (p * r * t) / 100;
      return {
        title: 'Simple interest',
        stats: [{ label: 'Interest', value: fmt.num(si, 2) }, { label: 'Total amount', value: fmt.num(p + si, 2) }],
        text: `SI = P × R × T / 100\nInterest = ${fmt.num(si, 2)}\nMaturity amount = ${fmt.num(p + si, 2)}`,
      };
    },
  },

  /* 10 ── Compound interest */
  'compound-interest': {
    fields: [
      { id: 'p', label: 'Principal', type: 'number', default: 10000, half: true },
      { id: 'r', label: 'Rate (% per year)', type: 'number', default: 7, half: true },
      { id: 't', label: 'Time (years)', type: 'number', default: 5, half: true },
      { id: 'n', label: 'Compounds per year', type: 'select', options: [[1, 'Yearly'], [2, 'Half-yearly'], [4, 'Quarterly'], [12, 'Monthly'], [365, 'Daily']], default: 12, half: true },
    ],
    compute(v) {
      const p = num(v.p), r = num(v.r), t = num(v.t), n = Number(v.n);
      if (p == null || r == null || t == null) return 'Enter principal, rate and time.';
      const amt = p * (1 + r / 100 / n) ** (n * t);
      return {
        title: 'Compound interest',
        stats: [{ label: 'Interest earned', value: fmt.num(amt - p, 2) }, { label: 'Maturity amount', value: fmt.num(amt, 2) }],
        text: `A = P(1 + r/n)^(nt)\nMaturity = ${fmt.num(amt, 2)}\nInterest = ${fmt.num(amt - p, 2)}`,
      };
    },
  },

  /* 11 ── SIP */
  'sip-calc': {
    fields: [
      { id: 'm', label: 'Monthly investment', type: 'number', default: 5000, half: true },
      { id: 'r', label: 'Expected return (% per year)', type: 'number', default: 12, half: true },
      { id: 't', label: 'Time (years)', type: 'number', default: 10, half: true },
    ],
    compute(v) {
      const m = num(v.m), r = (num(v.r) || 0) / 100 / 12, t = (num(v.t) || 0) * 12;
      if (!m || !t) return 'Enter monthly amount and time.';
      const fv = r === 0 ? m * t : (m * ((1 + r) ** t - 1) / r) * (1 + r);
      const invested = m * t;
      return {
        title: 'SIP projection',
        stats: [
          { label: 'Invested', value: fmt.num(invested, 0) },
          { label: 'Est. returns', value: fmt.num(fv - invested, 0) },
          { label: 'Future value', value: fmt.num(fv, 0) },
        ],
        text: `Monthly: ${fmt.num(m, 0)} for ${v.t} years\nInvested: ${fmt.num(invested, 0)}\nEstimated returns: ${fmt.num(fv - invested, 0)}\nFuture value: ${fmt.num(fv, 0)}`,
        note: 'Mutual fund returns are market-linked — this is an estimate, not a promise.',
      };
    },
  },

  /* 12 ── Salary ⇄ hourly */
  'salary-hourly': {
    fields: [
      { id: 'mode', label: 'Convert', type: 'select', options: [['a2h', 'Annual salary → Hourly'], ['h2a', 'Hourly → Annual salary']] },
      { id: 'amount', label: 'Amount', type: 'number', default: 60000, half: true },
      { id: 'hours', label: 'Hours per week', type: 'number', default: 40, half: true },
      { id: 'weeks', label: 'Working weeks per year', type: 'number', default: 50, half: true },
      { id: 'days', label: 'Days per week', type: 'number', default: 5, half: true },
    ],
    compute(v) {
      const amt = num(v.amount), h = num(v.hours) || 40, wk = num(v.weeks) || 50, d = num(v.days) || 5;
      if (amt == null) return 'Enter an amount.';
      const yearlyHours = h * wk;
      const hourly = v.mode === 'a2h' ? amt / yearlyHours : amt;
      const yearly = v.mode === 'a2h' ? amt : amt * yearlyHours;
      return {
        title: v.mode === 'a2h' ? 'Hourly rate' : 'Annual salary',
        stats: [
          { label: 'Per hour', value: fmt.num(hourly, 2) },
          { label: 'Per day', value: fmt.num(hourly * (h / d), 2) },
          { label: 'Per week', value: fmt.num(hourly * h, 2) },
          { label: 'Per year', value: fmt.num(yearly, 2) },
        ],
        text: v.mode === 'a2h'
          ? `Annual ${fmt.num(amt, 0)} ÷ ${fmt.num(yearlyHours, 0)} h/yr = ${fmt.num(hourly, 2)}/hour\nPer day: ${fmt.num(hourly * (h / d), 2)} · Per week: ${fmt.num(hourly * h, 2)}`
          : `Hourly ${fmt.num(amt, 2)} × ${fmt.num(yearlyHours, 0)} h/yr = ${fmt.num(yearly, 2)}/year\nPer day: ${fmt.num(amt * (h / d), 2)} · Per week: ${fmt.num(amt * h, 2)}`,
      };
    },
  },

  /* 13 ── Fuel cost */
  'fuel-cost': {
    fields: [
      { id: 'dist', label: 'Distance (km)', type: 'number', default: 250, half: true },
      { id: 'mileage', label: 'Mileage (km per litre)', type: 'number', default: 15, half: true },
      { id: 'price', label: 'Fuel price (per litre)', type: 'number', default: 100, half: true },
    ],
    compute(v) {
      const d = num(v.dist), m = num(v.mileage), p = num(v.price);
      if (!d || !m || p == null) return 'Enter distance, mileage and fuel price.';
      const litres = d / m;
      return {
        title: 'Trip fuel cost',
        stats: [
          { label: 'Fuel needed', value: `${fmt.num(litres, 2)} L` },
          { label: 'Total cost', value: fmt.num(litres * p, 2) },
          { label: 'Cost per km', value: fmt.num((litres * p) / d, 2) },
        ],
        text: `${fmt.num(d, 0)} km ÷ ${m} km/L = ${fmt.num(litres, 2)} L\nFuel cost = ${fmt.num(litres * p, 2)} (at ${p}/L)`,
      };
    },
  },

  /* 14 ── Electricity bill */
  'electricity-bill': {
    fields: [
      { id: 'watts', label: 'Appliance wattage (W)', type: 'number', default: 1500, half: true },
      { id: 'hours', label: 'Hours used per day', type: 'number', default: 4, half: true },
      { id: 'days', label: 'Days', type: 'number', default: 30, half: true },
      { id: 'rate', label: 'Electricity rate (per kWh)', type: 'number', default: 8, half: true },
    ],
    compute(v) {
      const w = num(v.watts), h = num(v.hours), d = num(v.days), r = num(v.rate);
      if (w == null || !h || !d || r == null) return 'Enter all values.';
      const kwh = (w / 1000) * h * d;
      return {
        title: 'Energy usage',
        stats: [
          { label: 'Consumption', value: `${fmt.num(kwh, 2)} kWh` },
          { label: 'Total cost', value: fmt.num(kwh * r, 2) },
          { label: 'Per day cost', value: fmt.num((kwh * r) / d, 2) },
        ],
        text: `${w} W × ${h} h × ${d} days = ${fmt.num(kwh, 2)} kWh\nBill = ${fmt.num(kwh * r, 2)} at ${r}/kWh`,
      };
    },
  },

  /* 15 ── Water intake */
  'water-intake': {
    fields: [
      { id: 'w', label: 'Weight (kg)', type: 'number', default: 70, half: true },
      { id: 'act', label: 'Exercise (minutes/day)', type: 'number', default: 30, half: true },
      { id: 'climate', label: 'Climate', type: 'select', options: [['cool', 'Cool / air-conditioned'], ['moderate', 'Moderate'], ['hot', 'Hot / humid']], half: true },
    ],
    compute(v) {
      const w = num(v.w), act = num(v.act) || 0;
      if (!w) return 'Enter your weight.';
      let litres = w * 0.033 + (act / 30) * 0.35;
      if (v.climate === 'moderate') litres += 0.25;
      if (v.climate === 'hot') litres += 0.55;
      return {
        title: 'Daily water target',
        stats: [
          { label: 'Per day', value: `${fmt.num(litres, 2)} L` },
          { label: 'Glasses (250 ml)', value: fmt.num(litres / 0.25, 1) },
          { label: 'Per week', value: `${fmt.num(litres * 7, 1)} L` },
        ],
        text: `Aim for about ${fmt.num(litres, 2)} litres (~${fmt.num(litres / 0.25, 0)} glasses) of water a day.`,
        note: 'A general wellness estimate — needs can vary with health conditions.',
      };
    },
  },

  /* 16 ── GPA */
  'gpa-calc': {
    fields: [
      { id: 'rows', label: 'Courses — format: grade,credits per line', type: 'textarea', default: 'A,4\nB+,3\nA-,3\nB,2', rows: 5, hint: 'Example: A,4  ·  grade point scale: A=10/A+=4.3 style chosen below' },
      { id: 'scale', label: 'Scale', type: 'select', options: [['10', '10-point (A=10, B=8 …)'], ['4', '4-point (A=4.0, B=3.0 …)']], half: true },
    ],
    compute(v) {
      const map10 = { a: 10, 'a+': 10, 'a-': 9, b: 8, 'b+': 8, 'b-': 7, c: 6, 'c+': 6, 'c-': 5, d: 4, f: 0 };
      const map4 = { 'a+': 4.3, a: 4, 'a-': 3.7, 'b+': 3.3, b: 3, 'b-': 2.7, 'c+': 2.3, c: 2, 'c-': 1.7, d: 1, f: 0 };
      const map = v.scale === '10' ? map10 : map4;
      let credits = 0, points = 0, used = 0;
      for (const line of (v.rows || '').split('\n')) {
        const [g, c] = line.split(',').map((s) => s && s.trim().toLowerCase());
        if (!g || !c) continue;
        const gp = map[g] ?? parseFloat(g);
        const cr = parseFloat(c);
        if (isFinite(gp) && isFinite(cr)) { points += gp * cr; credits += cr; used++; }
      }
      if (!credits) return 'Enter courses as grade,credits — one per line.';
      const gpa = points / credits;
      return {
        title: 'GPA result',
        stats: [
          { label: 'GPA', value: fmt.num(gpa, 2) },
          { label: 'Credits', value: fmt.num(credits, 1) },
          { label: 'Courses counted', value: used },
        ],
        text: `GPA (${v.scale}-point) = ${fmt.num(gpa, 2)} from ${used} courses (${fmt.num(credits, 1)} credits)`,
      };
    },
  },

  /* 17–26 ── Unit converters */
  'length-conv': converterTool(UNITS.length),
  'weight-conv': converterTool(UNITS.weight),
  'temp-conv': {
    fields: [
      { id: 'value', label: 'Temperature', type: 'number', default: 37, half: true },
      { id: 'from', label: 'From', type: 'select', options: [['C', 'Celsius (°C)'], ['F', 'Fahrenheit (°F)'], ['K', 'Kelvin (K)']], half: true },
      { id: 'to', label: 'To', type: 'select', options: [['C', 'Celsius (°C)'], ['F', 'Fahrenheit (°F)'], ['K', 'Kelvin (K)']], default: 'F' },
    ],
    compute(v) {
      const x = num(v.value);
      if (x == null) return 'Enter a temperature.';
      const toC = { C: (n) => n, F: (n) => (n - 32) * 5 / 9, K: (n) => n - 273.15 };
      const fromC = { C: (n) => n, F: (n) => n * 9 / 5 + 32, K: (n) => n + 273.15 };
      const out = fromC[v.to](toC[v.from](x));
      return {
        title: 'Temperature',
        stats: [{ label: 'Input', value: `${x}° ${v.from}` }, { label: 'Result', value: `${fmt.num(out, 2)}° ${v.to}` }],
        text: `${x} °${v.from} = ${fmt.num(out, 2)} °${v.to}`,
      };
    },
  },
  'area-conv': converterTool(UNITS.area),
  'volume-conv': converterTool(UNITS.volume),
  'speed-conv': converterTool(UNITS.speed),
  'time-conv': converterTool(UNITS.time),
  'data-conv': converterTool(UNITS.data),
  'pressure-conv': converterTool(UNITS.pressure),
  'energy-conv': converterTool(UNITS.energy),

  /* 27 ── Currency */
  'currency-conv': {
    fields: [
      { id: 'amount', label: 'Amount', type: 'number', default: 100, half: true },
      { id: 'from', label: 'From', type: 'select', options: ['USD', 'EUR', 'INR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD', 'SGD', 'HKD', 'AED', 'BRL', 'ZAR', 'RUB', 'KRW', 'MYR', 'THB', 'PKR', 'BDT', 'LKR', 'NPR', 'PHP', 'IDR', 'TRY', 'MXN', 'PLN', 'NGN', 'EGP', 'SAR', 'QAR', 'KWD', 'ILS', 'VND'], default: 'USD', half: true },
      { id: 'to', label: 'To', type: 'select', options: ['USD', 'EUR', 'INR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD', 'SGD', 'HKD', 'AED', 'BRL', 'ZAR', 'RUB', 'KRW', 'MYR', 'THB', 'PKR', 'BDT', 'LKR', 'NPR', 'PHP', 'IDR', 'TRY', 'MXN', 'PLN', 'NGN', 'EGP', 'SAR', 'QAR', 'KWD', 'ILS', 'VND'], default: 'INR' },
    ],
    live: true,
    async compute(v) {
      const amount = num(v.amount);
      if (amount == null) return 'Enter an amount.';
      try {
        const res = await fetch(`https://open.er-api.com/v6/latest/${v.from}`);
        const data = await res.json();
        const rate = data?.rates?.[v.to];
        if (!rate) throw new Error('rate unavailable');
        const out = amount * rate;
        return {
          title: 'Currency conversion',
          stats: [
            { label: 'Result', value: fmt.num(out, 2) },
            { label: 'Rate', value: `1 ${v.from} = ${fmt.num(rate, 4)} ${v.to}` },
          ],
          text: `${fmt.num(amount, 2)} ${v.from} = ${fmt.num(out, 2)} ${v.to}\nRate: 1 ${v.from} = ${fmt.num(rate, 6)} ${v.to}\nUpdated: ${data.time_last_update_utc || 'live'}`,
          note: 'Rates from open.er-api.com and may differ from bank rates.',
        };
      } catch {
        return {
          title: 'Currency conversion (offline estimate)',
          text: `Could not reach the live rates service — check your connection and try again.\nTip: the Internet → API Tester tool can confirm if the network is reachable.`,
        };
      }
    },
  },

  /* 28 ── Time zone */
  'timezone-conv': {
    fields: [
      { id: 'dt', label: 'Date & time (in your zone)', type: 'text', default: '', placeholder: 'e.g. 2026-01-01 14:30 (leave empty for now)' },
      { id: 'from', label: 'Your zone', type: 'select', options: [
        ['Asia/Kolkata', 'India (IST)'], ['UTC', 'UTC'], ['America/New_York', 'New York'], ['America/Los_Angeles', 'Los Angeles'],
        ['Europe/London', 'London'], ['Europe/Paris', 'Paris'], ['Asia/Dubai', 'Dubai'], ['Asia/Singapore', 'Singapore'],
        ['Asia/Tokyo', 'Tokyo'], ['Australia/Sydney', 'Sydney'], ['America/Chicago', 'Chicago'], ['Asia/Shanghai', 'Shanghai'],
      ], half: true },
      { id: 'to', label: 'Target zone', type: 'select', options: [
        ['Asia/Kolkata', 'India (IST)'], ['UTC', 'UTC'], ['America/New_York', 'New York'], ['America/Los_Angeles', 'Los Angeles'],
        ['Europe/London', 'London'], ['Europe/Paris', 'Paris'], ['Asia/Dubai', 'Dubai'], ['Asia/Singapore', 'Singapore'],
        ['Asia/Tokyo', 'Tokyo'], ['Australia/Sydney', 'Sydney'], ['America/Chicago', 'Chicago'], ['Asia/Shanghai', 'Shanghai'],
      ], default: 'America/New_York', half: true },
    ],
    compute(v) {
      const base = v.dt ? new Date(v.dt.replace(' ', 'T')) : new Date();
      if (isNaN(base)) return 'Enter a valid date-time like 2026-01-01 14:30.';
      const fmtZone = (tz) => new Intl.DateTimeFormat('en-GB', {
        timeZone: tz, dateStyle: 'full', timeStyle: 'medium', hour12: true,
      }).format(base);
      /* Stats must stay short — a full "Sunday, 27 September 2026 at 07:55 pm"
         string never fits a stat tile, so split it into compact parts and keep
         the full sentence in the copyable text block. */
      const parts = (tz) => {
        const d = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: '2-digit', month: 'short' }).format(base);
        const time = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true }).format(base);
        const offset = new Intl.DateTimeFormat('en-GB', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(base)
          .find((p) => p.type === 'timeZoneName')?.value || '';
        return { d, time, offset };
      };
      const from = parts(v.from);
      const to = parts(v.to);
      const zoneName = (tz) => tz.replace(/_/g, ' ');
      return {
        title: 'Time zone conversion',
        stats: [
          { label: `${zoneName(v.from)} · time`, value: from.time },
          { label: `${zoneName(v.to)} · time`, value: to.time },
          { label: 'Source date', value: from.d },
          { label: 'Target date', value: to.d },
          { label: 'Offset', value: `${from.offset} → ${to.offset}` },
        ],
        text: `${v.from} (${from.offset}): ${fmtZone(v.from)}\n${v.to} (${to.offset}): ${fmtZone(v.to)}`,
      };
    },
  },

  /* 29 ── World clock (custom) */
  'world-clock': {
    mount(container) {
      const zones = [
        ['Asia/Kolkata', 'India'], ['UTC', 'UTC'], ['America/New_York', 'New York'], ['Europe/London', 'London'],
        ['Europe/Paris', 'Paris'], ['Asia/Dubai', 'Dubai'], ['Asia/Tokyo', 'Tokyo'], ['Australia/Sydney', 'Sydney'],
      ];
      const grid = el('div.grid.grid-2', { style: { gap: '12px' } });
      const render = () => {
        grid.innerHTML = '';
        const now = new Date();
        for (const [tz, name] of zones) {
          const time = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).format(now);
          const date = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' }).format(now);
          grid.append(el('div.stat', {
            style: { padding: '18px' },
            html: `<div class="k">${name}</div><div class="v" style="font-size:24px">${time}</div><div class="k" style="margin-top:4px">${date}</div>`,
          }));
        }
      };
      render();
      const timer = setInterval(render, 1000);
      container._cleanup = () => clearInterval(timer);
      container.append(el('div.note', { html: icon('globe', 17) + '<span>Times update every second — daylight saving is handled automatically.</span>' }), grid);
    },
  },

  /* 30 ── Countdown (custom) */
  'countdown-timer': {
    mount(container) {
      let remaining = 0, running = false, endAt = 0, raf = null;
      const display = el('div.big-timer', { text: '00:00.00' });
      display.textContent = '00:00:00';
      const status = el('div.text-muted.center-x', { text: 'Set a duration and press Start.', style: { fontSize: '13.5px' } });
      const inputs = el('div.grid.grid-3', { style: { gap: '10px' } },
        el('div.field', el('label.field-label', { text: 'Hours' }), el('input.input#cd-h', { type: 'number', min: 0, value: 0 })),
        el('div.field', el('label.field-label', { text: 'Minutes' }), el('input.input#cd-m', { type: 'number', min: 0, value: 5 })),
        el('div.field', el('label.field-label', { text: 'Seconds' }), el('input.input#cd-s', { type: 'number', min: 0, value: 0 })),
      );
      const draw = () => {
        const s = Math.max(0, Math.ceil(remaining / 1000));
        display.textContent = fmt.dur(s);
      };
      const beep = () => {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value = 880; g.gain.value = 0.12;
          o.start(); o.stop(ctx.currentTime + 0.55);
          setTimeout(() => { o.frequency.value = 660; }, 190);
        } catch { /* audio optional */ }
      };
      const tick = () => {
        remaining = endAt - Date.now();
        draw();
        if (remaining <= 0) {
          running = false; cancelAnimationFrame(raf);
          display.textContent = '00:00:00';
          status.textContent = "⏰ Time's up!";
          beep();
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      const getDur = () => {
        const h = +container.querySelector('#cd-h').value || 0;
        const m = +container.querySelector('#cd-m').value || 0;
        const s = +container.querySelector('#cd-s').value || 0;
        return h * 3600000 + m * 60000 + s * 1000;
      };
      const btns = el('div.tool-row-btns',
        el('button.btn.btn-accent', {
          html: `${icon('play', 16)} Start`,
          onclick: () => {
            if (running) return;
            remaining = remaining > 0 && remaining < getDur() ? remaining : getDur();
            if (remaining <= 0) { toast('Set a duration first', 'info'); return; }
            endAt = Date.now() + remaining;
            running = true;
            status.textContent = 'Counting down…';
            tick();
          },
        }),
        el('button.btn.btn-soft', {
          html: `${icon('pause', 16)} Pause`,
          onclick: () => { running = false; cancelAnimationFrame(raf); status.textContent = 'Paused.'; },
        }),
        el('button.btn.btn-soft', {
          html: `${icon('refresh', 16)} Reset`,
          onclick: () => {
            running = false; cancelAnimationFrame(raf); remaining = getDur(); draw(); status.textContent = 'Ready.';
          },
        }),
      );
      container.append(inputs, el('div.canvas-stage', { style: { flexDirection: 'column', gap: '10px', padding: '30px' } }, display, status), btns);
      draw();
    },
  },

  /* 31 ── Stopwatch (custom) */
  'stopwatch': {
    mount(container) {
      let start = 0, elapsed = 0, running = false, raf = null;
      const laps = [];
      const display = el('div.big-timer', { text: '00:00.00' });
      const lapList = el('div.col', { style: { gap: '8px', width: '100%', maxHeight: '240px', overflowY: 'auto' } });
      const draw = () => { display.textContent = fmt.clock(elapsed + (running ? performance.now() - start : 0)); };
      const loop = () => { draw(); if (running) raf = requestAnimationFrame(loop); };
      const btns = el('div.tool-row-btns',
        el('button.btn.btn-accent', {
          html: `${icon('play', 16)} Start`,
          onclick: (e) => {
            if (running) return;
            running = true; start = performance.now();
            e.currentTarget.innerHTML = `${icon('timer', 16)} Running…`;
            loop();
          },
        }),
        el('button.btn.btn-soft', {
          html: `${icon('pause', 16)} Pause`,
          onclick: () => {
            if (!running) return;
            elapsed += performance.now() - start; running = false; cancelAnimationFrame(raf); draw();
          },
        }),
        el('button.btn.btn-soft', {
          html: `${icon('plus', 16)} Lap`,
          onclick: () => {
            const t = elapsed + (running ? performance.now() - start : 0);
            if (t === 0) return;
            laps.push(t);
            lapList.prepend(el('div.stat', {
              html: `<div class="k">Lap ${laps.length}</div><div class="v" style="font-size:18px">${fmt.clock(t)}</div>`,
            }));
          },
        }),
        el('button.btn.btn-soft', {
          html: `${icon('refresh', 16)} Reset`,
          onclick: () => {
            running = false; elapsed = 0; laps.length = 0; cancelAnimationFrame(raf); draw();
            lapList.innerHTML = '';
          },
        }),
      );
      container.append(
        el('div.canvas-stage', { style: { flexDirection: 'column', padding: '30px' } }, display),
        btns, lapList,
      );
      draw();
    },
  },

  /* 32 ── Pomodoro (custom) */
  'pomodoro': {
    mount(container) {
      const MODES = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
      let mode = 'focus', left = MODES.focus, running = false, endAt = 0, raf = null, sessions = 0;
      const label = el('div.eyebrow.no-dots', { text: 'FOCUS SESSION' });
      const display = el('div.big-timer', { text: '25:00' });
      const status = el('div.text-muted.center-x', { text: 'One task. 25 minutes. Full focus.', style: { fontSize: '13.5px' } });
      const draw = () => { display.textContent = fmt.dur(Math.max(0, Math.ceil(left / 1000))); };
      const beep = () => {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination); o.frequency.value = 740; g.gain.value = 0.12;
          o.start(); o.stop(ctx.currentTime + 0.6);
        } catch { /* optional */ }
      };
      const tick = () => {
        left = endAt - Date.now();
        draw();
        if (left <= 0) {
          running = false; cancelAnimationFrame(raf); beep();
          if (mode === 'focus') sessions++;
          status.textContent = mode === 'focus' ? '✅ Session done — take a break!' : 'Break over — back to focus!';
          left = 0;
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      const setMode = (m) => {
        mode = m; running = false; cancelAnimationFrame(raf);
        left = MODES[m] * 1000;
        label.textContent = m === 'focus' ? 'FOCUS SESSION' : m === 'short' ? 'SHORT BREAK' : 'LONG BREAK';
        status.textContent = m === 'focus' ? 'One task. 25 minutes. Full focus.' : 'Recharge — you earned it.';
        draw();
      };
      container.append(
        el('div.canvas-stage', { style: { flexDirection: 'column', gap: '12px', padding: '32px' } }, label, display, status),
        el('div.tool-row-btns',
          el('button.btn.btn-accent', {
            html: `${icon('play', 16)} Start`,
            onclick: () => {
              if (running) return;
              if (left <= 0) left = MODES[mode] * 1000;
              endAt = Date.now() + left; running = true;
              status.textContent = 'Stay with it…';
              tick();
            },
          }),
          el('button.btn.btn-soft', {
            html: `${icon('pause', 16)} Pause`,
            onclick: () => { running = false; cancelAnimationFrame(raf); status.textContent = 'Paused.'; },
          }),
          el('button.btn.btn-soft', { html: 'Focus 25', onclick: () => setMode('focus') }),
          el('button.btn.btn-soft', { html: 'Short 5', onclick: () => setMode('short') }),
          el('button.btn.btn-soft', { html: 'Long 15', onclick: () => setMode('long') }),
        ),
        el('div.note', { html: icon('info', 17) + `<span>Sessions completed this visit: <strong>${''}<span id="pom-count">${sessions}</span></strong>. The Pomodoro method: 25 min focus → 5 min break, longer break after 4 sessions.</span>` }),
      );
      const countEl = container.querySelector('#pom-count');
      setInterval(() => { if (countEl) countEl.textContent = sessions; }, 1000);
      draw();
    },
  },

  /* 33 ── Date calculator */
  'date-calc': {
    fields: [
      { id: 'start', label: 'Start date', type: 'date', default: new Date().toISOString().slice(0, 10), half: true },
      { id: 'op', label: 'Operation', type: 'select', options: [['add', 'Add'], ['sub', 'Subtract']], half: true },
      { id: 'n', label: 'Amount', type: 'number', default: 30, half: true },
      { id: 'unit', label: 'Unit', type: 'select', options: [['days', 'Days'], ['weeks', 'Weeks'], ['months', 'Months'], ['years', 'Years']], half: true },
    ],
    compute(v) {
      const d = D(v.start);
      if (!d) return 'Pick a start date.';
      const n = (v.op === 'sub' ? -1 : 1) * (num(v.n) || 0);
      const out = new Date(d);
      if (v.unit === 'days') out.setDate(out.getDate() + n);
      else if (v.unit === 'weeks') out.setDate(out.getDate() + n * 7);
      else if (v.unit === 'months') out.setMonth(out.getMonth() + n);
      else out.setFullYear(out.getFullYear() + n);
      return {
        title: 'Result date',
        stats: [
          { label: 'Date', value: fmt.date(out) },
          { label: 'Weekday', value: out.toLocaleDateString('en-US', { weekday: 'long' }) },
          { label: 'Day of year', value: Math.ceil((out - new Date(out.getFullYear(), 0, 0)) / 86400000) },
        ],
        text: `${fmt.date(d)} ${v.op === 'sub' ? '−' : '+'} ${Math.abs(n)} ${v.unit} = ${fmt.date(out)} (${out.toLocaleDateString('en-US', { weekday: 'long' })})`,
      };
    },
  },

  /* 34 ── Days between */
  'days-between': {
    fields: [
      { id: 'a', label: 'From date', type: 'date', default: '2024-01-01', half: true },
      { id: 'b', label: 'To date', type: 'date', default: new Date().toISOString().slice(0, 10), half: true },
    ],
    compute(v) {
      const a = D(v.a), b = D(v.b);
      if (!a || !b) return 'Pick both dates.';
      const sign = b >= a ? 1 : -1;
      const days = Math.abs(dayDiff(a, b)) * sign;
      let weeks = (Math.abs(days) / 7);
      let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
      if (b.getDate() < a.getDate()) months -= sign >= 0 ? 1 : -1;
      return {
        title: 'Date difference',
        stats: [
          { label: 'Days', value: fmt.num(days, 0) },
          { label: 'Weeks', value: fmt.num(weeks, 1) },
          { label: 'Months (approx)', value: fmt.num(months, 0) },
          { label: 'Weekdays', value: (() => {
            let c = 0;
            const step = sign >= 0 ? 1 : -1;
            for (let t = new Date(a); dayDiff(t, b) * step >= 0; t.setDate(t.getDate() + step)) {
              const w = t.getDay();
              if (w !== 0 && w !== 6) c += 1;
              if (Math.abs(dayDiff(a, t)) > 37000) break;
            }
            return c;
          })() },
        ],
        text: `From ${fmt.date(a)} to ${fmt.date(b)}\n= ${Math.abs(days)} days (${fmt.num(Math.abs(days) / 365.25, 2)} years)`,
      };
    },
  },

  /* 35 ── Calendar generator (custom) */
  'month-calendar': {
    mount(container) {
      const now = new Date();
      const yIn = el('input.input', { type: 'number', value: now.getFullYear(), min: 1900, max: 2200 });
      const mIn = el('input.input', { type: 'number', value: now.getMonth() + 1, min: 1, max: 12 });
      const out = el('div');
      const render = () => {
        const y = +yIn.value, m = +mIn.value - 1;
        const first = new Date(y, m, 1);
        const startDay = first.getDay();
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const monthName = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        let html = `<div class="row-between" style="margin-bottom:14px"><div style="font-family:var(--serif);font-style:italic;font-size:28px">${monthName}</div><div class="badge badge-free">${new Date(y, m, 1).toLocaleDateString('en-US', { weekday: 'long' })} start</div></div>`;
        html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">';
        for (const d of ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']) html += `<div style="text-align:center;font-size:11px;font-weight:800;letter-spacing:.12em;color:var(--muted-light);padding:6px 0">${d}</div>`;
        for (let i = 0; i < startDay; i++) html += '<div></div>';
        const isToday = (day) => day === now.getDate() && m === now.getMonth() && y === now.getFullYear();
        for (let day = 1; day <= daysInMonth; day++) {
          html += `<div style="text-align:center;padding:9px 0;border-radius:10px;font-weight:${isToday(day) ? 800 : 600};font-size:13.5px;${isToday(day) ? 'background:var(--accent);color:#fff' : 'background:var(--cream-soft);border:1px solid var(--cream-line)'}">${day}</div>`;
        }
        html += '</div>';
        out.innerHTML = html;
      };
      const ctrl = el('div.grid.grid-2', { style: { gap: '12px' } },
        el('div.field', el('label.field-label', { text: 'Year' }), yIn),
        el('div.field', el('label.field-label', { text: 'Month (1–12)' }), mIn),
      );
      const update = debounce(render, 200);
      ctrl.addEventListener('input', update);
      container.append(ctrl, el('div.tool-actions', { style: { marginTop: '4px' } },
        el('button.btn.btn-soft', {
          html: `${icon('download', 15)} Copy as text`,
          onclick: () => {
            const y = +yIn.value, m = +mIn.value;
            const first = new Date(y, m - 1, 1);
            copyText(`${first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} calendar generated by PSDKIT Pro`);
          },
        }),
      ), el('div.tool-panel', { style: { marginTop: '14px' } }, out));
      render();
    },
  },

  /* 36 ── Random number */
  'random-number': {
    fields: [
      { id: 'min', label: 'Minimum', type: 'number', default: 1, half: true },
      { id: 'max', label: 'Maximum', type: 'number', default: 100, half: true },
      { id: 'count', label: 'How many numbers?', type: 'number', default: 1, min: 1, max: 50, half: true },
      { id: 'unique', label: 'Unique only', type: 'checkbox', default: true, checkLabel: 'All numbers unique' },
    ],
    live: false,
    buttonLabel: 'Generate',
    compute(v) {
      const min = Math.ceil(num(v.min) ?? 0), max = Math.floor(num(v.max) ?? 100);
      const count = Math.min(50, Math.max(1, num(v.count) || 1));
      if (max < min) return 'Maximum must be ≥ minimum.';
      if (v.unique && max - min + 1 < count) return 'Range too small for that many unique numbers.';
      const set = new Set();
      const list = [];
      for (let i = 0; i < count; i++) {
        let n;
        do { n = Math.floor(Math.random() * (max - min + 1)) + min; } while (v.unique && set.has(n));
        if (v.unique) set.add(n);
        list.push(n);
      }
      return {
        title: 'Random numbers',
        stats: [{ label: 'Count', value: count }, { label: 'Range', value: `${min} – ${max}` }],
        text: list.join(', '),
        copy: list.join(', '),
      };
    },
  },

  /* 37 ── Dice roller (custom) */
  'dice-roller': {
    mount(container) {
      const history = [];
      const faces = el('div.row', { style: { justifyContent: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '46px', minHeight: '64px' } });
      const totalEl = el('div.center-x');
      const histEl = el('div.wrap-gap-sm', { style: { justifyContent: 'center' } });
      const roll = (sides, count) => {
        faces.innerHTML = '';
        let total = 0;
        const rolls = [];
        for (let i = 0; i < count; i++) {
          const v = 1 + Math.floor(Math.random() * sides);
          total += v;
          rolls.push(v);
          faces.append(el('div', {
            style: { width: '58px', height: '58px', background: 'var(--cream-soft)', border: '1.5px solid var(--cream-line)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '24px' },
            text: String(v),
          }));
        }
        totalEl.innerHTML = `<div class="badge badge-free">d${sides} × ${count} → total <strong style="margin-left:6px;font-size:15px">${total}</strong></div>`;
        history.unshift(`d${sides}×${count}: [${rolls.join(', ')}]`);
        histEl.innerHTML = history.slice(0, 10).map((h) => `<span class="chip" style="cursor:default">${h}</span>`).join('');
      };
      const sidesIn = el('input.input', { type: 'number', value: 6, min: 2, max: 100 });
      const countIn = el('input.input', { type: 'number', value: 2, min: 1, max: 20 });
      container.append(
        el('div.canvas-stage', { style: { flexDirection: 'column', gap: '16px', padding: '26px' } }, faces, totalEl),
        el('div.grid.grid-2', { style: { gap: '12px' } },
          el('div.field', el('label.field-label', { text: 'Dice sides' }), sidesIn),
          el('div.field', el('label.field-label', { text: 'Number of dice' }), countIn),
        ),
        el('div.tool-row-btns', { style: { marginTop: '14px' } },
          el('button.btn.btn-accent', { html: `${icon('gamepad', 16)} Roll`, onclick: () => roll(+sidesIn.value || 6, +countIn.value || 1) }),
          el('button.btn.btn-soft', { html: 'd20', onclick: () => roll(20, 1) }),
          el('button.btn.btn-soft', { html: '2d6', onclick: () => roll(6, 2) }),
          el('button.btn.btn-soft', { html: '4d6', onclick: () => roll(6, 4) }),
        ),
        el('div.mt-3', histEl),
      );
      roll(6, 2);
    },
  },

  /* 38 ── Coin flip (custom) */
  'coin-flip': {
    mount(container) {
      const history = [];
      const coin = el('div', {
        style: {
          width: '128px', height: '128px', borderRadius: '50%', margin: '0 auto',
          background: 'var(--cream-soft)', border: '3px solid var(--accent-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '30px', color: 'var(--accent-deep)',
          transition: 'transform .55s cubic-bezier(.2,.9,.3,1.1)',
        },
        text: 'Flip me',
      });
      const status = el('div.center-x.text-muted.mt-2', { text: 'Call it in your head…', style: { fontSize: '13.5px' } });
      const hist = el('div.wrap-gap-sm', { style: { justifyContent: 'center' } });
      const flip = () => {
        coin.style.transform = 'rotateY(1260deg) translateY(-14px)';
        status.textContent = 'Flipping…';
        setTimeout(() => {
          const r = Math.random() < 0.5 ? 'Heads' : 'Tails';
          coin.textContent = r;
          coin.style.transform = '';
          status.textContent = r === 'Heads' ? '🪙 It landed on Heads!' : '🪙 It landed on Tails!';
          history.unshift(r);
          hist.innerHTML = history.slice(0, 12).map((h) => `<span class="chip" style="cursor:default">${h}</span>`).join('');
        }, 560);
      };
      container.append(
        el('div.canvas-stage', { style: { flexDirection: 'column', padding: '34px' } }, coin, status),
        el('div.tool-row-btns', { style: { marginTop: '16px' } },
          el('button.btn.btn-accent', { html: `${icon('refresh', 16)} Flip the coin`, onclick: flip }),
        ),
        el('div.mt-3', hist),
      );
    },
  },

  /* 39 ── Team picker */
  'team-picker': {
    fields: [
      { id: 'names', label: 'Names (one per line)', type: 'textarea', default: 'Aman\nPriya\nRahul\nSara\nVikram\nNeha', rows: 6 },
      { id: 'teams', label: 'Number of teams', type: 'number', default: 2, min: 2, max: 10, half: true },
      { id: 'mode', label: 'Mode', type: 'select', options: [['teams', 'Split into teams'], ['winner', 'Pick one winner']], half: true },
    ],
    live: false,
    buttonLabel: 'Shuffle & pick',
    compute(v) {
      const names = (v.names || '').split('\n').map((s) => s.trim()).filter(Boolean);
      if (names.length < 2) return 'Add at least two names.';
      const shuffled = [...names].sort(() => Math.random() - 0.5);
      if (v.mode === 'winner') {
        const w = shuffled[0];
        return { title: 'And the winner is…', stats: [{ label: 'Winner', value: w }], text: `🎉 ${w} was picked at random from ${names.length} names.` };
      }
      const n = Math.max(2, num(v.teams) || 2);
      const teams = Array.from({ length: n }, () => []);
      shuffled.forEach((name, i) => teams[i % n].push(name));
      const text = teams.map((t, i) => `Team ${i + 1}: ${t.join(', ')}`).join('\n');
      return {
        title: 'Teams ready',
        stats: teams.map((t, i) => ({ label: `Team ${i + 1}`, value: t.length })),
        text,
        copy: text,
      };
    },
  },

  /* 40 ── Yes/No */
  'yes-no': {
    mount(container) {
      const answers = [
        ['Yes, definitely.', 'ok'], ['It is decidedly so.', 'ok'], ['Without a doubt.', 'ok'],
        ['Yes — go for it.', 'ok'], ['Most likely.', 'ok'], ['Outlook good.', 'ok'],
        ['Signs point to yes.', 'ok'], ['Reply hazy, try again.', 'mid'], ['Ask again later.', 'mid'],
        ['Better not tell you now.', 'mid'], ['Cannot predict now.', 'mid'], ['Concentrate and ask again.', 'mid'],
        ['Don’t count on it.', 'no'], ['My reply is no.', 'no'], ['My sources say no.', 'no'],
        ['Outlook not so good.', 'no'], ['Very doubtful.', 'no'],
      ];
      const ball = el('div', {
        style: {
          width: '170px', height: '170px', borderRadius: '50%', margin: '0 auto',
          background: 'var(--ink)', color: 'var(--cream-soft)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '19px', padding: '22px',
          boxShadow: 'inset 0 -14px 30px rgba(255,255,255,.08)', lineHeight: 1.35,
          transition: 'transform .45s cubic-bezier(.2,.9,.3,1.15)',
        },
        text: 'Ask me…',
      });
      const qIn = el('input.input', { placeholder: 'Type your yes/no question…' });
      const ask = () => {
        if (!qIn.value.trim()) { toast('Ask a question first', 'info'); return; }
        ball.style.transform = 'scale(.9) rotate(-7deg)';
        setTimeout(() => {
          const [txt, tone] = answers[Math.floor(Math.random() * answers.length)];
          ball.textContent = txt;
          ball.style.background = tone === 'ok' ? '#3E6B4F' : tone === 'no' ? '#8A3A2A' : 'var(--ink)';
          ball.style.transform = '';
        }, 320);
      };
      qIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') ask(); });
      container.append(
        el('div.canvas-stage', { style: { flexDirection: 'column', padding: '30px' } }, ball),
        el('div.row', { style: { marginTop: '16px', gap: '10px' } }, qIn, el('button.btn.btn-accent', { text: 'Ask', onclick: ask })),
      );
    },
  },

  /* 41 ── Wheel spinner (custom) */
  'wheel-spinner': {
    mount(container) {
      const listIn = el('textarea.textarea', { rows: 6 });
      listIn.value = 'Pizza\nBurger\nSushi\nPasta\nSalad\nTacos';
      const canvas = el('canvas', { width: 320, height: 320, class: 'stage-canvas' });
      /* Without a 2D context there is no wheel to draw, so say so instead of
         throwing inside the render loop and leaving a blank tool. */
      const ctx = requireCtx(canvas, container);
      if (!ctx) return;
      const resultEl = el('div.center-x.mt-2');
      let items = [], angle = 0, spinning = false;

      const draw = () => {
        items = listIn.value.split('\n').map((s) => s.trim()).filter(Boolean);
        const n = Math.max(2, items.length);
        const colors = ['#F2CDBD', '#DEE7DA', '#DAE5EF', '#E6DEF0', '#F2E9CF', '#F6E0E0', '#DCEBE4', '#EDE2CE'];
        ctx.clearRect(0, 0, 320, 320);
        ctx.save();
        ctx.translate(160, 160);
        ctx.rotate(angle);
        const slice = (Math.PI * 2) / n;
        for (let i = 0; i < n; i++) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, 152, i * slice, (i + 1) * slice);
          ctx.closePath();
          ctx.fillStyle = colors[i % colors.length];
          ctx.fill();
          ctx.strokeStyle = '#FAF7F2';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.save();
          ctx.rotate(i * slice + slice / 2);
          ctx.fillStyle = '#2B2825';
          ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(items[i] ? items[i].slice(0, 14) : `Option ${i + 1}`, 138, 5);
          ctx.restore();
        }
        ctx.restore();
        ctx.beginPath();
        ctx.arc(160, 160, 26, 0, Math.PI * 2);
        ctx.fillStyle = '#161514';
        ctx.fill();
      };

      const spin = () => {
        if (spinning) return;
        items = listIn.value.split('\n').map((s) => s.trim()).filter(Boolean);
        if (items.length < 2) { toast('Add at least 2 options', 'info'); return; }
        spinning = true;
        resultEl.innerHTML = '';
        const target = angle + Math.PI * (4 + Math.random() * 4);
        const start = angle, delta = target - start, t0 = performance.now(), dur = 3200;
        const ease = (t) => 1 - Math.pow(1 - t, 3);
        const step = (now) => {
          const t = Math.min(1, (now - t0) / dur);
          angle = start + delta * ease(t);
          draw();
          if (t < 1) requestAnimationFrame(step);
          else {
            spinning = false;
            const slice = (Math.PI * 2) / items.length;
            const norm = ((Math.PI * 2) - (angle % (Math.PI * 2))) % (Math.PI * 2);
            const idx = Math.floor(norm / slice) % items.length;
            resultEl.innerHTML = `<div class="badge badge-free" style="font-size:14px;padding:10px 20px">🎉 Picked: <strong style="margin-left:6px">${items[idx]}</strong></div>`;
          }
        };
        requestAnimationFrame(step);
      };

      listIn.addEventListener('input', debounce(draw, 250));
      container.append(
        el('div.field', el('label.field-label', { text: 'Options (one per line)' }), listIn),
        el('div.canvas-stage', { style: { marginTop: '14px', position: 'relative' } },
          el('div.wheel-wrap', el('div.wheel-pointer'), canvas),
        ),
        resultEl,
        el('div.tool-row-btns', { style: { marginTop: '14px' } },
          el('button.btn.btn-accent', { html: `${icon('refresh', 16)} Spin the wheel`, onclick: spin }),
        ),
      );
      draw();
    },
  },

  /* 42 ── Password generator */
  'password-gen': {
    fields: [
      { id: 'len', label: 'Length', type: 'range', min: 6, max: 64, default: 16, unit: 'chars' },
      { id: 'upper', label: 'Uppercase (A–Z)', type: 'checkbox', default: true, checkLabel: 'Include uppercase letters' },
      { id: 'lower', label: 'Lowercase (a–z)', type: 'checkbox', default: true, checkLabel: 'Include lowercase letters' },
      { id: 'num', label: 'Numbers (0–9)', type: 'checkbox', default: true, checkLabel: 'Include numbers' },
      { id: 'sym', label: 'Symbols (!@#$…)', type: 'checkbox', default: true, checkLabel: 'Include symbols' },
      { id: 'count', label: 'How many passwords', type: 'number', default: 5, min: 1, max: 20, half: true },
    ],
    live: true,
    compute(v) {
      let pool = '';
      if (v.upper) pool += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (v.lower) pool += 'abcdefghijklmnopqrstuvwxyz';
      if (v.num) pool += '0123456789';
      if (v.sym) pool += '!@#$%^&*()-_=+[]{};:,.?';
      if (!pool) return 'Select at least one character set.';
      const len = Math.max(4, Math.min(64, num(v.len) || 16));
      const count = Math.min(20, Math.max(1, num(v.count) || 5));
      const rnd = (n) => {
        const a = new Uint32Array(n);
        crypto.getRandomValues(a);
        return a;
      };
      const list = [];
      for (let p = 0; p < count; p++) {
        const arr = rnd(len);
        let s = '';
        for (let i = 0; i < len; i++) s += pool[arr[i] % pool.length];
        list.push(s);
      }
      return {
        title: 'Strong passwords',
        text: list.join('\n'),
        copy: list.join('\n'),
        note: 'Generated with your browser’s cryptographic random source — nothing leaves this device.',
      };
    },
  },

  /* 43 ── Password strength */
  'password-strength': {
    fields: [
      { id: 'pw', label: 'Password', type: 'text', placeholder: 'Type or paste a password…', hint: 'Stays in your browser — never sent anywhere.' },
    ],
    compute(v) {
      const pw = v.pw || '';
      if (!pw) return 'Type a password to check.';
      let score = 0;
      const checks = [
        ['At least 8 characters', pw.length >= 8],
        ['At least 12 characters', pw.length >= 12],
        ['Uppercase letter', /[A-Z]/.test(pw)],
        ['Lowercase letter', /[a-z]/.test(pw)],
        ['Number', /\d/.test(pw)],
        ['Symbol', /[^A-Za-z0-9]/.test(pw)],
        ['No common words', !/^(password|123456|qwerty|letmein|admin|welcome|iloveyou|monkey|dragon)/i.test(pw)],
        ['No obvious patterns', !/(0123|1234|abcd|qwer|aaab|zzzz)/i.test(pw)],
      ];
      for (const [, ok] of checks) if (ok) score++;
      const label = score <= 2 ? 'Very weak' : score <= 4 ? 'Weak' : score <= 6 ? 'Good' : score <= 7 ? 'Strong' : 'Excellent';
      const crack = pw.length <= 6 ? 'instantly' : pw.length <= 8 ? 'in hours' : score <= 5 ? 'in months' : score <= 6 ? 'in years' : 'in centuries';
      return {
        title: 'Strength report',
        stats: [
          { label: 'Score', value: `${score}/8` },
          { label: 'Rating', value: label },
          { label: 'Length', value: pw.length },
          { label: 'Crackable', value: crack },
        ],
        text: checks.map(([t, ok]) => `${ok ? '✓' : '✗'} ${t}`).join('\n'),
        note: 'Estimated with simple heuristics — use a unique password per account and a password manager.',
      };
    },
  },

  /* 44 ── Username generator */
  'username-gen': {
    fields: [
      { id: 'word', label: 'A word you like', type: 'text', default: 'pixel', half: true },
      { id: 'style', label: 'Style', type: 'select', options: [
        ['clean', 'Clean & modern'], ['game', 'Gamer'], ['aesthetic', 'Aesthetic'], ['pro', 'Professional'],
      ], half: true },
      { id: 'num', label: 'Add numbers', type: 'checkbox', default: true, checkLabel: 'Append numbers' },
    ],
    live: true,
    compute(v) {
      const base = (v.word || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
      const tails = {
        clean: ['', 'hq', 'lab', 'hq', 'studio', 'io', 'hq'],
        game: ['x', 'yt', 'ttv', 'plays', 'gaming', 'xz', 'pro'],
        aesthetic: ['vibes', 'soft', 'glow', 'mood', 'era', 'day', 'sky'],
        pro: ['dev', 'pro', 'tech', 'io', 'labs', 'hq', 'code'],
      };
      const prefixes = ['', 'the', 'its', 'hey', 'mr', 'ms', 'real'];
      const pool = tails[v.style] || tails.clean;
      const list = [];
      for (let i = 0; i < 10; i++) {
        const pre = prefixes[Math.floor(Math.random() * prefixes.length)];
        const tail = pool[Math.floor(Math.random() * pool.length)];
        const n = v.num ? Math.floor(Math.random() * 900 + 10) : '';
        let name = `${pre ? pre + '_' : ''}${base}${tail ? '_' + tail : ''}${n}`;
        if (Math.random() > 0.5) name = name.replace(/_/g, '');
        list.push(name);
      }
      return { title: 'Username ideas', text: [...new Set(list)].join('\n'), copy: [...new Set(list)].join('\n') };
    },
  },

  /* 45 ── UUID */
  'uuid-gen': {
    fields: [
      { id: 'count', label: 'How many', type: 'number', default: 5, min: 1, max: 100, half: true },
      { id: 'type', label: 'Type', type: 'select', options: [['v4', 'UUID v4 (random)'], ['ulid', 'ULID (sortable)']], half: true },
    ],
    live: true,
    compute(v) {
      const count = Math.min(100, Math.max(1, num(v.count) || 5));
      const list = [];
      for (let i = 0; i < count; i++) {
        list.push(v.type === 'ulid' ? makeUlid() : crypto.randomUUID());
      }
      return { title: 'Identifiers', text: list.join('\n'), copy: list.join('\n') };
    },
  },

  /* 46 ── Lorem ipsum */
  'lorem-ipsum': {
    fields: [
      { id: 'type', label: 'Generate', type: 'select', options: [['para', 'Paragraphs'], ['sent', 'Sentences'], ['words', 'Words']], half: true },
      { id: 'count', label: 'How many', type: 'number', default: 3, min: 1, max: 20, half: true },
      { id: 'start', label: 'Start with “Lorem ipsum dolor sit amet”', type: 'checkbox', default: true, checkLabel: 'Classic lorem opening' },
    ],
    live: true,
    compute(v) {
      const words = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(' ');
      const sentence = (n) => {
        const out = [];
        for (let i = 0; i < n; i++) out.push(words[Math.floor(Math.random() * words.length)]);
        return wordsCapitalise(out.join(' ')) + '.';
      };
      const para = (n) => Array.from({ length: n }, () => sentence(8 + Math.floor(Math.random() * 9))).join(' ');
      const count = Math.min(20, Math.max(1, num(v.count) || 3));
      let out;
      if (v.type === 'words') out = Array.from({ length: count * 6 }, () => words[Math.floor(Math.random() * words.length)]).join(' ');
      else if (v.type === 'sent') out = Array.from({ length: count }, () => sentence(9)).join(' ');
      else out = Array.from({ length: count }, () => para(4)).join('\n\n');
      if (v.start) out = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' + out.replace(/^Lorem ipsum dolor sit amet, consectetur adipiscing elit\. /, '');
      return { title: 'Placeholder text', text: out, copy: out };
    },
  },

  /* 47 ── Word counter */
  'word-counter': {
    fields: [
      { id: 'text', label: 'Paste or type your text', type: 'textarea', rows: 8, default: '' },
    ],
    compute(v) {
      const t = v.text || '';
      if (!t.trim()) return 'Type or paste some text to analyse.';
      const words = (t.trim().match(/\S+/g) || []).length;
      const chars = t.length;
      const charsNoSpace = t.replace(/\s/g, '').length;
      const sentences = (t.match(/[.!?]+/g) || []).length || 1;
      const paragraphs = (t.split(/\n{2,}/).filter((p) => p.trim()).length) || 1;
      const reading = Math.max(1, Math.round(words / 220));
      return {
        title: 'Text statistics',
        stats: [
          { label: 'Words', value: fmt.num(words, 0) },
          { label: 'Characters', value: fmt.num(chars, 0) },
          { label: 'Sentences', value: fmt.num(sentences, 0) },
          { label: 'Reading time', value: `${reading} min` },
        ],
        text: `Words: ${words}\nCharacters (with spaces): ${chars}\nCharacters (no spaces): ${charsNoSpace}\nSentences: ${sentences}\nParagraphs: ${paragraphs}\nAvg words/sentence: ${fmt.num(words / sentences, 1)}\nReading time (~220 wpm): ${reading} min\nSpeaking time (~130 wpm): ${Math.max(1, Math.round(words / 130))} min`,
      };
    },
  },

  /* 48 ── Case converter */
  'case-convert': {
    fields: [
      { id: 'text', label: 'Text', type: 'textarea', rows: 5, default: 'PSDKIT Pro makes tools simple' },
    ],
    compute(v) {
      const t = v.text || '';
      if (!t) return 'Type some text first.';
      const s = t.replace(/([a-z])([A-Z])/g, '$1 $2');
      return {
        title: 'Converted cases',
        text:
          `UPPERCASE: ${t.toUpperCase()}\n` +
          `lowercase: ${t.toLowerCase()}\n` +
          `Title Case: ${wordsCapitalise(t.toLowerCase())}\n` +
          `Sentence case: ${t.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (c) => c.toUpperCase())}\n` +
          `aLtErNaTiNg: ${t.split('').map((c, i) => (i % 2 ? c.toUpperCase() : c.toLowerCase())).join('')}\n` +
          `snake_case: ${s.toLowerCase().replace(/\s+/g, '_')}\n` +
          `kebab-case: ${s.toLowerCase().replace(/\s+/g, '-')}`,
        copy: t.toLowerCase().replace(/\s+/g, '-'),
      };
    },
  },

  /* 49 ── Notes (custom) */
  'notes-app': {
    mount(container) {
      const KEY = 'psdkit_notes';
      const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
      const listEl = el('div.col');
      const ta = el('textarea.textarea', { rows: 5, placeholder: 'Write a note and click Save…' });

      const render = () => {
        listEl.innerHTML = '';
        if (!saved.length) {
          listEl.append(el('div.empty-state', { html: `${icon('note', 26)}<div style="margin-top:8px">No notes yet — they are saved in your browser.</div>` }));
          return;
        }
        saved.forEach((n, i) => {
          listEl.append(el('div.card', { style: { padding: '16px' } },
            el('div.row-between',
              el('div', { style: { whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: 1.65, flex: 1 } }, n.text),
              el('button.copy-btn', {
                html: icon('trash', 14),
                onclick: () => { saved.splice(i, 1); persist(); },
              }),
            ),
            el('div.field-hint.mt-1', { text: fmt.date(n.at) }),
          ));
        });
      };
      const persist = () => {
        localStorage.setItem(KEY, JSON.stringify(saved));
        render();
      };
      container.append(
        el('div.field', el('label.field-label', { text: 'New note' }), ta),
        el('div.tool-actions', { style: { marginTop: '10px' } },
          el('button.btn.btn-accent', {
            html: `${icon('plus', 16)} Save note`,
            onclick: () => {
              const text = ta.value.trim();
              if (!text) { toast('Write something first', 'info'); return; }
              saved.unshift({ text, at: Date.now() });
              ta.value = '';
              persist();
              toast('Note saved');
            },
          }),
          el('button.btn.btn-soft', {
            html: `${icon('download', 15)} Export all`,
            onclick: () => downloadFile('psdkit-notes.txt', saved.map((n) => `• ${n.text}\n  (${fmt.date(n.at)})`).join('\n\n')),
          }),
        ),
        el('div.mt-3', listEl),
      );
      render();
    },
  },

  /* 50 ── Todo list (custom) */
  'todo-list': {
    mount(container) {
      const KEY = 'psdkit_todos';
      let todos = JSON.parse(localStorage.getItem(KEY) || '[]');
      const input = el('input.input', { placeholder: 'Add a task…', style: { flex: 1 } });
      const dueIn = el('input.input', { type: 'date', style: { width: '160px' } });
      const listEl = el('div.col');
      const counter = el('div.field-hint');

      const save = () => localStorage.setItem(KEY, JSON.stringify(todos));
      const render = () => {
        listEl.innerHTML = '';
        const open = todos.filter((t) => !t.done).length;
        counter.textContent = `${open} open · ${todos.length - open} done`;
        if (!todos.length) {
          listEl.append(el('div.empty-state', { html: `${icon('listChecks', 26)}<div style="margin-top:8px">Nothing here yet — add your first task above.</div>` }));
          return;
        }
        todos.forEach((t, i) => {
          listEl.append(el('div.card', {
            style: { padding: '14px 16px', opacity: t.done ? 0.55 : 1 },
          },
            el('div.row', { style: { gap: '12px' } },
              (() => {
                const cb = el('input', { type: 'checkbox', style: { width: '19px', height: '19px', accentColor: 'var(--accent)', cursor: 'pointer' } });
                cb.checked = t.done;
                cb.addEventListener('change', () => { t.done = cb.checked; save(); render(); });
                return cb;
              })(),
              el('div', { style: { flex: 1 } },
                el('div', { text: t.text, style: { fontSize: '14.5px', fontWeight: 600, textDecoration: t.done ? 'line-through' : 'none' } }),
                t.due ? el('div.field-hint', { text: `Due ${t.due}` }) : null,
              ),
              el('button.copy-btn', { html: icon('trash', 14), onclick: () => { todos.splice(i, 1); save(); render(); } }),
            ),
          ));
        });
      };
      const add = () => {
        const text = input.value.trim();
        if (!text) return;
        todos.unshift({ text, done: false, due: dueIn.value || null });
        input.value = '';
        dueIn.value = '';
        save();
        render();
      };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
      container.append(
        el('div.row', { style: { gap: '10px', flexWrap: 'wrap' } }, input, dueIn,
          el('button.btn.btn-accent', { html: `${icon('plus', 16)} Add`, onclick: add })),
        counter,
        el('div.tool-actions', { style: { marginTop: '4px' } },
          el('button.btn.btn-soft', {
            html: `${icon('trash', 15)} Clear completed`,
            onclick: () => { todos = todos.filter((t) => !t.done); save(); render(); },
          }),
        ),
        el('div.mt-2', listEl),
      );
      render();
    },
  },

  'number-to-words': {
    fields: [
      { id: 'value', label: 'Number', type: 'number', default: 1234567 },
      { id: 'style', label: 'Format', type: 'select', options: [['international', 'International (million/billion)'], ['indian', 'Indian (lakh/crore)']], default: 'indian' },
    ],
    compute(v) {
      const raw = num(v.value);
      if (raw == null) return 'Enter a number to convert.';
      const sign = raw < 0 ? 'minus ' : '';
      const abs = Math.abs(Math.trunc(raw));
      const words = v.style === 'indian' ? numberToWordsIndian(abs) : numberToWordsEn(abs);
      return {
        title: 'Number in words',
        stats: [{ label: 'Input', value: fmt.num(raw, 0) }, { label: 'Format', value: v.style === 'indian' ? 'Lakh / Crore' : 'Million / Billion' }],
        text: `${sign}${words}`,
        copy: `${sign}${words}`,
      };
    },
  },

  'gst-calculator': {
    fields: [
      { id: 'amount', label: 'Amount', type: 'number', default: 1000, half: true },
      { id: 'rate', label: 'GST rate (%)', type: 'select', half: true, options: [3, 5, 12, 18, 28], default: 18 },
      { id: 'mode', label: 'This amount is', type: 'select', options: [['exclusive', 'Before GST'], ['inclusive', 'Including GST']], default: 'exclusive' },
    ],
    compute(v) {
      const amount = num(v.amount);
      const rate = Number(v.rate || 0);
      if (amount == null) return 'Enter an amount.';
      const exclusive = v.mode === 'inclusive' ? amount / (1 + rate / 100) : amount;
      const gst = exclusive * rate / 100;
      const inclusive = exclusive + gst;
      return {
        title: 'GST summary',
        stats: [
          { label: 'Base amount', value: fmt.num(exclusive, 2) },
          { label: 'GST amount', value: fmt.num(gst, 2) },
          { label: 'Final amount', value: fmt.num(inclusive, 2) },
          { label: 'CGST / SGST', value: `${fmt.num(gst / 2, 2)} / ${fmt.num(gst / 2, 2)}` },
        ],
        text: `Base amount: ${fmt.num(exclusive, 2)}\nGST (${rate}%): ${fmt.num(gst, 2)}\nCGST: ${fmt.num(gst / 2, 2)} · SGST: ${fmt.num(gst / 2, 2)}\nFinal amount: ${fmt.num(inclusive, 2)}`,
      };
    },
  },

  'salary-hike-calc': {
    fields: [
      { id: 'current', label: 'Current annual CTC', type: 'number', default: 600000 },
      { id: 'hike', label: 'Hike (%)', type: 'number', default: 12, half: true },
      { id: 'bonus', label: 'Monthly deductions (%)', type: 'number', default: 18, half: true, hint: 'Used for a quick in-hand estimate' },
    ],
    compute(v) {
      const current = num(v.current);
      const hike = num(v.hike) || 0;
      const deductions = num(v.bonus) || 0;
      if (current == null) return 'Enter your current annual CTC.';
      const next = current * (1 + hike / 100);
      const monthly = next / 12;
      const inHand = monthly * (1 - deductions / 100);
      return {
        title: 'Salary hike result',
        stats: [
          { label: 'New CTC', value: fmt.num(next, 2) },
          { label: 'Increase', value: fmt.num(next - current, 2) },
          { label: 'Monthly gross', value: fmt.num(monthly, 2) },
          { label: 'Estimated in-hand', value: fmt.num(inHand, 2) },
        ],
        text: `Current CTC: ${fmt.num(current, 2)}\nAfter a ${hike}% hike: ${fmt.num(next, 2)}\nIncrease: ${fmt.num(next - current, 2)}\nMonthly gross: ${fmt.num(monthly, 2)}\nEstimated in-hand after ${deductions}% deductions: ${fmt.num(inHand, 2)}`,
      };
    },
  },

  'fancy-text-generator': {
    fields: [{ id: 'text', label: 'Text to style', type: 'textarea', rows: 4, default: 'PSDKIT Pro makes everyday tools feel calm.' }],
    compute(v) {
      const src = String(v.text || '').trim();
      if (!src) return 'Type some text first.';
      const convert = (style) => src.split('').map((ch) => {
        const code = ch.charCodeAt(0);
        if (code >= 97 && code <= 122) return FANCY_STYLE_MAPS[style][0][code - 97] || ch;
        if (code >= 65 && code <= 90) return FANCY_STYLE_MAPS[style][1][code - 65] || ch;
        return ch;
      }).join('');
      const rows = Object.keys(FANCY_STYLE_MAPS).map((style) => `<div class="term-row"><div class="term-name">${style}</div><div class="term-mean">${convert(style)}</div></div>`).join('');
      return {
        title: 'Fancy styles',
        html: rows,
        copy: Object.keys(FANCY_STYLE_MAPS).map((style) => `${style}: ${convert(style)}`).join('\n'),
      };
    },
  },

  'emoji-finder': {
    mount(container) {
      const input = el('input.input', { placeholder: 'Search emoji meanings… like happy, coding, fire' });
      const grid = el('div.grid.grid-3');
      const render = () => {
        const q = input.value.trim().toLowerCase();
        const list = q ? EMOJIS.filter((item) => item[1].includes(q) || item[0].includes(q)) : EMOJIS;
        grid.innerHTML = '';
        grid.append(...list.map(([emoji, meta]) => el('button.card.card-hover', {
          style: { textAlign: 'left', padding: '16px' },
          onclick: () => copyText(emoji),
          html: `<div style="font-size:28px">${emoji}</div><div style="font-weight:800;margin-top:8px">${meta.split(' ')[0]}</div><div class="field-hint" style="margin-top:6px">${meta}</div>`,
        })));
      };
      input.addEventListener('input', debounce(render, 120));
      container.append(input, el('div.field-hint', { text: 'Tap any emoji to copy it.' }), el('div.mt-2', grid));
      render();
    },
  },

  'leap-year-zodiac': {
    fields: [{ id: 'date', label: 'Date of birth', type: 'date', default: '2000-01-01' }],
    compute(v) {
      const date = D(v.date);
      if (!date || Number.isNaN(date.getTime())) return 'Pick a valid date.';
      const year = date.getFullYear();
      const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      const m = date.getMonth() + 1;
      const d = date.getDate();
      const zodiac = (() => {
        const z = [
          ['Capricorn', 1, 19], ['Aquarius', 2, 18], ['Pisces', 3, 20], ['Aries', 4, 19], ['Taurus', 5, 20], ['Gemini', 6, 20], ['Cancer', 7, 22], ['Leo', 8, 22], ['Virgo', 9, 22], ['Libra', 10, 22], ['Scorpio', 11, 21], ['Sagittarius', 12, 21],
        ];
        for (const [name, mm, dd] of z) if (m < mm || (m === mm && d <= dd)) return name;
        return 'Capricorn';
      })();
      return {
        title: 'Leap year & zodiac',
        stats: [
          { label: 'Year', value: year },
          { label: 'Leap year', value: leap ? 'Yes' : 'No' },
          { label: 'Zodiac', value: zodiac },
        ],
        text: `${fmt.date(date)} falls in ${zodiac}. ${year} is ${leap ? '' : 'not '}a leap year.`,
      };
    },
  },
};

/* ULID generator for uuid tool */
function makeUlid() {
  const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const TIME = 10;
  const RANDOM = 16;
  const now = Date.now();
  let time = '';
  let t = now;
  for (let i = TIME - 1; i >= 0; i--) {
    time = ENCODING[t % 32] + time;
    t = Math.floor(t / 32);
  }
  const rand = new Uint8Array(RANDOM);
  crypto.getRandomValues(rand);
  let str = '';
  for (let i = 0; i < RANDOM; i++) str += ENCODING[rand[i] % 32];
  return time + str;
}
