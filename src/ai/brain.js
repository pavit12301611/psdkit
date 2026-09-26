/* ============================================================
   PSDKIT AI — local knowledge engine (fallback + instant answers).
   When Vercel function /api/ai has an LLM key, chat.js prefers it
   and falls back to this engine. Replies reference pages of THIS
   site only, with real internal links.
   ============================================================ */
import { TOOLS, TOOL_MAP, CATEGORIES } from '../data/catalog.js';
import { GLOSSARY, LANGUAGE_GUIDES } from '../data/guides.js';

const toolLink = (id, label) => `[${label || TOOL_MAP[id]?.name || id}](#/tool/${id})`;
const pageLink = (hash, label) => `[${label}](#/${String(hash).replace(/^#?\/+/, '')})`;

const pick = (...arr) => arr[Math.floor(Math.random() * arr.length)];

/* Intent table: patterns → response builder */
const INTENTS = [
  {
    id: 'greet',
    match: /^(hi|hello|hey|yo|namaste|hola|good (morning|evening|afternoon))\b/i,
    run: () => pick(
      `Hey! 👋 Welcome to PSDKIT Pro. I can point you to the right tool, explain any tech word, or help with coding.\n\nTry the [toolkit](#/tools) or just tell me what you’re trying to do today!`,
      `Hello! Great to see you. I know all 175 tools on this site — tell me what you need (like “compress a PDF” or “what is an API”) and I’ll take you there.\n\nOr browse the [full toolkit](#/tools) yourself.`,
    ),
  },
  {
    id: 'thanks',
    match: /\b(thanks|thank you|thx|ty|dhanyavad|shukriya|great|awesome|perfect)\b/i,
    run: () => pick(
      `You’re welcome! Anything else you’d like to find on PSDKIT? I’m right here — or explore the [toolkit](#/tools). 😊`,
      `Happy to help! If you ever get stuck, just ask — or browse the [full toolkit](#/tools).`,
    ),
  },
  {
    id: 'who-are-you',
    match: /\b(who are you|what are you|what can you do|your name|how (do|does) (you|this) work|what is psdkit|about (this|the) (site|website))\b/i,
    run: () => `I’m the **PSDKIT AI** — your guide to this site. I can:\n\n• Find the right tool for any task — like ${toolLink('pdf-merge')} or ${toolLink('qr-generator')}\n• Explain tech words and concepts in plain English\n• Help with coding questions and point you to the right ${pageLink('learn', 'learning guide')}\n• Walk you through tools step by step\n\nJust describe what you need in your own words!`,
  },
  {
    id: 'pdf-merge',
    match: /\b(merge|combine|join).*(pdf|file)|pdf.*(merge|combine|join)\b/i,
    run: () => `Merging PDFs is easy here:\n\n1. Open ${toolLink('pdf-merge')}\n2. Drop all your PDF files (order matters — use ↑ to reorder)\n3. Click **Merge PDFs** and the combined file downloads instantly.\n\nEverything happens in your browser — your files never leave your device. Need the opposite? ${toolLink('pdf-split')} splits a PDF into pages.`,
  },
  {
    id: 'pdf-split',
    match: /\b(split|separate|extract).*(pdf|page)|pdf.*(split|separate|extract)\b/i,
    run: () => `To split a PDF:\n\n1. Open ${toolLink('pdf-split')}\n2. Drop your PDF\n3. Enter pages like \`1-3, 5\` (or leave empty for every page as its own file)\n4. Click **Split PDF** — each page downloads.\n\nYou can also turn PDFs into images with ${toolLink('pdf-to-images')}.`,
  },
  {
    id: 'pdf-other',
    match: /\bpdf\b/i,
    run: () => `Here’s everything PDF on PSDKIT:\n\n• ${toolLink('pdf-merge')} — combine multiple PDFs\n• ${toolLink('pdf-split')} — split into pages or ranges\n• ${toolLink('images-to-pdf')} — turn JPG/PNG into a PDF\n• ${toolLink('pdf-to-images')} — render PDF pages as PNGs\n\nAll free, no login, runs in your browser.`,
  },
  {
    id: 'qr',
    match: /\b(qr|barcode|scan)\b/i,
    run: () => `For QR codes:\n\n• ${toolLink('qr-generator')} — create QR codes for links, text or anything (with custom colours)\n• ${toolLink('qr-scanner')} — scan QR codes with your camera or an image\n• ${toolLink('wifi-qr')} — a QR code that connects guests to your Wi-Fi instantly\n\nAll run privately in your browser.`,
  },
  {
    id: 'image',
    match: /\b(compress|resize|reduce|shrink|convert).*(image|photo|jpg|png|webp)|image.*(compress|resize|convert)|photo.*(compress|resize)\b/i,
    run: () => `Image tools you need:\n\n• ${toolLink('image-compress')} — shrink file size with quality control\n• ${toolLink('image-resize')} — exact pixels or percentages\n• ${toolLink('image-convert')} — PNG ⇄ JPG ⇄ WebP\n\nDrop a file, pick your settings, download. Private and instant.`,
  },
  {
    id: 'password',
    match: /\b(password|strong password|secure)\b/i,
    run: () => `Staying safe online:\n\n• ${toolLink('password-gen')} — generate strong, random passwords (length, symbols, everything customisable)\n• ${toolLink('password-strength')} — check how strong a password is and how to improve it\n\nTip: use a unique password per account, 12+ characters with a mix of everything.`,
  },
  {
    id: 'convert-unit',
    match: /\b(convert|conversion|converter)\b.*/i,
    run: (q) => {
      const map = [
        ['currency|money|usd|inr|euro|dollar|rupee', 'currency-conv', 'Currency Converter'],
        ['temperature|celsius|fahrenheit|kelvin', 'temp-conv', 'Temperature Converter'],
        ['length|meter|feet|inch|mile|km', 'length-conv', 'Length Converter'],
        ['weight|kg|pound|ounce', 'weight-conv', 'Weight Converter'],
        ['data|bytes|kb|mb|gb', 'data-conv', 'Data Size Converter'],
        ['speed|kmh|mph', 'speed-conv', 'Speed Converter'],
        ['area|acre|hectare', 'area-conv', 'Area Converter'],
        ['volume|litre|gallon|cup', 'volume-conv', 'Volume Converter'],
        ['time zone|timezone', 'timezone-conv', 'Time Zone Converter'],
        ['time|hours|minutes|days', 'time-conv', 'Time Unit Converter'],
        ['energy|joule|calorie|kwh', 'energy-conv', 'Energy Converter'],
        ['pressure|bar|psi|pascal', 'pressure-conv', 'Pressure Converter'],
      ];
      for (const [pat, id, label] of map) {
        if (new RegExp(pat, 'i').test(q)) return `Use the ${toolLink(id, label)} — enter your value, pick the units and it converts live as you type.`;
      }
      return `We have converters for almost everything:\n\n${['currency-conv', 'length-conv', 'weight-conv', 'temp-conv', 'data-conv', 'speed-conv', 'area-conv', 'volume-conv', 'time-conv', 'energy-conv', 'pressure-conv', 'timezone-conv'].map((id) => `• ${toolLink(id)}`).join('\n')}\n\nWhich one are you after?`;
    },
  },
  {
    id: 'word-meaning',
    match: /\b(meaning|means|definition|define|what (does|is|do))\b.*/i,
    run: (q) => {
      const word = q.replace(/.*\b(?:meaning of|means|definition of|define|what (?:does|is|do))\b/i, '').replace(/[?.!]/g, '').trim();
      const glossHit = GLOSSARY.find(([t]) => word && t.toLowerCase() === word.toLowerCase());
      if (glossHit) return `**${glossHit[0]}** — ${glossHit[1]}\n\nWant more depth? ${pageLink('glossary', 'Browse the full tech glossary')} or ${toolLink('word-meaning', 'look the word up in the dictionary')}.`;
      if (word && word.split(/\s+/).length <= 3) {
        return `To look up “${word}”:\n\n1. Open the ${toolLink('word-meaning', 'Dictionary — Word Meaning')} tool\n2. Type **${word}** and click lookup\n\nYou’ll get the meaning, pronunciation and example sentences. For translations there’s the ${toolLink('translator', 'Translator')}, and for similar words the ${toolLink('thesaurus', 'Thesaurus')}.`;
      }
      return `Tell me the word you want defined and I’ll help! You can also search the ${pageLink('glossary', 'tech glossary')} or use the ${toolLink('word-meaning', 'dictionary tool')} for any English word.`;
    },
  },
  {
    id: 'translate',
    match: /\b(translate|translation|meaning in|hindi|spanish|french| tamil|telugu|language)\b/i,
    run: () => `For language help:\n\n• ${toolLink('translator', 'Translator')} — 30+ languages including Hindi, Spanish, Arabic, Japanese and more\n• ${toolLink('word-meaning', 'Dictionary')} — meanings, pronunciation and examples\n• ${toolLink('thesaurus', 'Thesaurus')} — synonyms and antonyms\n\nAnd if you’re learning to *code*, the ${pageLink('learn', 'Learn section')} covers Python, JavaScript, SQL and more in plain English.`,
  },
  {
    id: 'learn-coding',
    match: /\b(learn|learning|study|tutorial|beginner|start|teach|explain).*(code|coding|programming|python|javascript|java|sql|html|css|react)|how.*(code|coding|program)\b/i,
    run: (q) => {
      const langs = [
        ['python', 'python'], ['javascript|js', 'javascript'], ['typescript|ts', 'typescript'],
        ['java', 'java'], ['c\+\+|cpp| c ', 'cpp'], ['golang| go ', 'go'], ['rust', 'rust'],
        ['sql', 'sql'], ['html|css', 'htmlcss'], ['react', 'react'], ['node|npm', 'node'], ['git|github', 'git'],
      ];
      for (const [pat, id] of langs) {
        if (new RegExp(pat, 'i').test(q)) {
          const g = LANGUAGE_GUIDES.find((x) => x.id === id);
          return `Great choice! Start with the ${pageLink(`learn/${id}`, `${g.name} guide`)} — it covers what ${g.name} is, key concepts in plain English and starter code.\n\nThen practice with the ${toolLink('code-playground', 'playground')} and the ${toolLink(id === 'python' ? 'python-guide' : id === 'sql' ? 'sql-guide' : id === 'react' ? 'react-guide' : id === 'git' ? 'git-cheatsheet' : 'js-guide', 'cheatsheet tool')}.`;
        }
      }
      return `Here’s a good path for new coders:\n\n1. ${pageLink('learn/htmlcss', 'HTML & CSS')} — how web pages are built (best first step)\n2. ${pageLink('learn/javascript', 'JavaScript')} — make pages interactive\n3. ${pageLink('learn/python', 'Python')} — the friendliest all-round language\n\nEach guide has plain-English explanations and real code. Practice live in the ${toolLink('code-playground')}!`;
    },
  },
  {
    id: 'code-help',
    match: /\b(error|bug|debug|not working|fix|syntax|code)\b/i,
    run: (q) => {
      if (/json/i.test(q)) return `JSON trouble? ${toolLink('json-format')} validates and formats JSON — it shows exactly where the error is. Common gotchas: double quotes on keys/strings, no trailing commas.`;
      if (/regex|regular expression/i.test(q)) return `For regular expressions, the ${toolLink('regex-tester')} tests patterns live with highlighted matches — plus a flags cheat sheet. Tell me the pattern you’re struggling with and I’ll help debug it.`;
      if (/css|style|layout|flex/i.test(q)) return `For CSS: ${toolLink('flexbox-play')} and ${toolLink('grid-play')} let you build layouts visually and copy the code. ${toolLink('css-format')} tidies messy stylesheets.`;
      return `I can help debug! A few things that usually fix it:\n\n• Read the error message carefully — it names the line and problem\n• Check brackets, quotes and semicolons (${toolLink('js-format', 'the formatter')} will spot stray ones)\n• Search your error text in the ${pageLink('learn', 'guides')} or paste the code in ${toolLink('code-playground')} to test it live\n\nTell me the exact error and language and I’ll narrow it down.`;
    },
  },
  {
    id: 'internet',
    match: /\b(ip address|my ip|dns|internet speed|speed test|ping|website (down|up|status)|headers|whois|cors)\b/i,
    run: (q) => {
      const map = [
        ['ip', 'ip-lookup', 'IP & Network Lookup'],
        ['dns', 'dns-lookup', 'DNS Lookup'],
        ['speed', 'speed-test', 'Internet Speed Test'],
        ['ping|latency|lag', 'latency-test', 'Latency Test'],
        ['down|up|status', 'site-status', 'Website Status Checker'],
        ['header', 'http-headers', 'HTTP Header Checker'],
        ['whois|domain', 'domain-lookup', 'Domain WHOIS'],
        ['cors', 'cors-checker', 'CORS Checker'],
      ];
      for (const [pat, id, label] of map) {
        if (new RegExp(pat, 'i').test(q)) return `Try the ${toolLink(id, label)} — it runs instantly in your browser and shows results in seconds.`;
      }
      return `Our ${pageLink('tools/internet', 'Internet shelf')} has 25 network tools: IP lookup, DNS, speed test, headers, WHOIS, CORS checker and more. What are you trying to find out?`;
    },
  },
  {
    id: 'image-pdf-convert',
    match: /\b(image|jpg|png).*(pdf)|(pdf).*(image|jpg|png)\b/i,
    run: () => `Both directions work here:\n\n• ${toolLink('images-to-pdf')} — turn JPG/PNG images into a PDF (set the order and page size)\n• ${toolLink('pdf-to-images')} — render PDF pages as PNG images\n\nDrag, drop, done — no upload limits.`,
  },
  {
    id: 'summarize-text',
    match: /\b(word count|count words|reading time|summarize|summarise)\b/i,
    run: () => `For text analysis use ${toolLink('word-counter')} — it counts words, characters, sentences, paragraphs and estimates reading/speaking time. For cleaning text there’s ${toolLink('case-convert')} and ${toolLink('line-tools')}.`,
  },
  {
    id: 'json',
    match: /\bjson\b/i,
    run: () => `JSON tools on PSDKIT:\n\n• ${toolLink('json-format')} — format, validate and minify\n• ${toolLink('json-yaml')} — JSON ⇄ YAML\n• ${toolLink('json-csv')} — JSON ⇄ CSV spreadsheets\n• ${toolLink('jwt-decoder')} — decode JWT tokens\n\nPaste your JSON and get instant results with clear error messages.`,
  },
  {
    id: 'time-date',
    match: /\b(age|birthday|countdown|timer|stopwatch|pomodoro|alarm|calendar|date|days between|world clock|time zone)\b/i,
    run: (q) => {
      const map = [
        ['age|birthday', 'age-calc', 'Age Calculator'],
        ['countdown', 'countdown-timer', 'Countdown Timer'],
        ['stopwatch|lap', 'stopwatch', 'Stopwatch'],
        ['pomodoro|focus', 'pomodoro', 'Pomodoro Timer'],
        ['alarm', 'alarm-clock', 'Alarm Clock'],
        ['calendar', 'month-calendar', 'Calendar Generator'],
        ['days between|between dates', 'days-between', 'Days Between Dates'],
        ['world clock', 'world-clock', 'World Clock'],
        ['time zone|timezone', 'timezone-conv', 'Time Zone Converter'],
        ['date', 'date-calc', 'Date Calculator'],
        ['timer', 'countdown-timer', 'Countdown Timer'],
      ];
      for (const [pat, id, label] of map) {
        if (new RegExp(pat, 'i').test(q)) return `The ${toolLink(id, label)} does exactly that — open it and it works instantly.`;
      }
      return `The ${pageLink('tools/daily', 'Daily shelf')} has every date and time tool: timers, stopwatch, countdowns, calendars, world clock and more.`;
    },
  },
  {
    id: 'design-color',
    match: /\b(color|colour|hex|rgb|hsl|palette|contrast|gradient|shadow|design)\b/i,
    run: (q) => {
      const map = [
        ['contrast|accessible|wcag', 'contrast-check', 'Colour Contrast Checker'],
        ['palette|scheme', 'palette-gen', 'Palette Generator'],
        ['shadow', 'box-shadow', 'Box Shadow Generator'],
        ['border radius|rounded', 'border-radius', 'Border Radius Generator'],
        ['picker|pick', 'color-picker', 'Colour Picker'],
      ];
      for (const [pat, id, label] of map) {
        if (new RegExp(pat, 'i').test(q)) return `Use the ${toolLink(id, label)} — visual, instant and copy-ready.`;
      }
      return `For design work: ${toolLink('color-picker')} (pick colours), ${toolLink('color-code')} (HEX ⇄ RGB ⇄ HSL), ${toolLink('palette-gen')} (colour palettes) and ${toolLink('contrast-check')} (accessibility contrast).`;
    },
  },
  {
    id: 'video-audio',
    match: /\b(record|recorder|microphone|voice|audio|screen record|text to speech|speech|speak|read aloud)\b/i,
    run: () => `Media tools in ${pageLink('tools/essentials', 'Essentials')}:\n\n• ${toolLink('voice-recorder')} — record audio from your mic\n• ${toolLink('screen-recorder')} — record your screen or a tab\n• ${toolLink('text-speech')} — read text aloud in natural voices\n• ${toolLink('speech-text')} — dictate and transcribe\n\nEverything saves locally — private by design.`,
  },
  {
    id: 'note-todo',
    match: /\b(note|notes|todo|task|checklist|reminder)\b/i,
    run: () => `For staying organised:\n\n• ${toolLink('notes-app')} — instant notepad (saved in your browser)\n• ${toolLink('todo-list')} — task list with due dates\n\nBoth work offline and need no account. For focus, the ${toolLink('pomodoro')} timer is a great companion.`,
  },
  {
    id: 'hash',
    match: /\b(hash|md5|sha|checksum|encrypt)\b/i,
    run: () => `For hashing:\n\n• ${toolLink('hash-gen')} — MD5, SHA-1, SHA-256 and SHA-512 for text\n• ${toolLink('file-hash')} — checksums for files (verify downloads)\n\nAll computed in your browser with the Web Crypto API.`,
  },
  {
    id: 'recommend',
    match: /\b(recommend|suggest|best tool|which tool|popular|what tools|tools for)\b/i,
    run: () => `Here are the crowd favourites:\n\n• ${toolLink('qr-generator')} — QR codes for anything\n• ${toolLink('pdf-merge')} — combine PDFs\n• ${toolLink('password-gen')} — strong passwords\n• ${toolLink('image-compress')} — shrink images\n• ${toolLink('code-playground')} — live HTML/CSS/JS editor\n• ${toolLink('word-meaning')} — dictionary lookups\n\nBrowse the ${pageLink('tools', 'full toolkit')} — or tell me your task and I’ll pick for you.`,
  },
  {
    id: 'community',
    match: /\b(community|publish|submit|add tool|create tool|open source|contribute)\b/i,
    run: () => `You can publish your own tools! Here’s how:\n\n1. Go to ${pageLink('community/add', 'Publish a tool')}\n2. Give it a name, description and the HTML/CSS/JS code\n3. Sign in with Google (keeps it spam-free) and publish\n\nYour tool goes live for everyone in the ${pageLink('community', 'Community Toolbox')} — like open source, but zero setup.`,
  },
  {
    id: 'mobile',
    match: /\b(mobile|phone|android|iphone|tablet)\b/i,
    run: () => `PSDKIT Pro is fully mobile-optimised — every tool works great on phones and tablets. For device-specific tools: ${toolLink('webcam-mirror')} (mirror + snapshot), ${toolLink('qr-scanner')} (camera scanning) and ${toolLink('speech-text')} (voice typing on supported browsers).`,
  },
  {
    id: 'privacy',
    match: /\b(privacy|safe|secure|data|tracking|store my)\b/i,
    run: () => `Your privacy is the design:\n\n• Tools run **in your browser** — files, passwords and text stay on your device\n• We store nothing about your usage — no accounts needed for tools\n• Network tools fetch only the public info you ask for (IP, DNS, rates)\n• Community tools run in a locked sandbox\n\nIt’s a toolkit, not a data company.`,
  },
];

/* Glossary term detection: "what is X" / "X meaning" */
function glossaryAnswer(query) {
  const q = query.toLowerCase().replace(/[?.!]/g, '').replace(/\b(what is|what's|what are|define|meaning of|the meaning of|about|tell me about)\b/g, ' ').replace(/\b(an|a|the|of)\b/g, ' ').replace(/\s+/g, ' ').trim();
  if (!q) return null;
  const hit = GLOSSARY.find(([term]) => {
    const t = term.toLowerCase().split('/')[0].trim();
    return q === t || q === t.replace(/&/g, ' ').trim() || (q.length > 1 && (q === t || t.includes(q) && q.length > 2.5 && t.length - q.length < 3));
  });
  return hit;
}

/* Fuzzy tool-name detection */
function toolAnswer(query) {
  const q = query.toLowerCase();
  let best = null, bestScore = 0;
  for (const t of TOOLS) {
    let score = 0;
    const nameWords = t.name.toLowerCase().split(/\s+/);
    for (const w of nameWords) {
      if (w.length > 2 && q.includes(w)) score += 2;
    }
    for (const k of (t.keys || '').split(' ')) {
      if (k.length > 3 && q.includes(k)) score += 1;
    }
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return bestScore >= 4 ? best : null;
}

export function localAnswer(message) {
  const q = (message || '').trim();
  if (!q) return `Ask me anything about PSDKIT Pro — finding tools, coding help, word meanings or how things works.`;

  /* Glossary terms get priority so “what is an API” answers instantly */
  const gloss = glossaryAnswer(q);
  if (gloss && /\b(what|meaning|define|explain|about|means)\b/i.test(q)) {
    return `**${gloss[0]}** — ${gloss[1]}\n\nSee the ${pageLink('glossary', 'full tech glossary')} for more terms like this, or ${toolLink('word-meaning', 'look up any English word in the dictionary')}.`;
  }

  for (const intent of INTENTS) {
    if (intent.match.test(q)) return intent.run(q);
  }

  const t = toolAnswer(q);
  if (t) return `It sounds like the **${t.name}** is what you need — ${t.desc.charAt(0).toLowerCase() + t.desc.slice(1)}\n\nOpen it here: ${toolLink(t.id)}\n\nNeed steps or alternatives? Just ask.`;

  /* Final fallback — helpful, not defeatist */
  return pick(
    `I want to point you to the right place! Try telling me:\n\n• **A task** — e.g. “merge two PDFs”, “compress an image”, “make a QR code”\n• **A word to understand** — e.g. “what does API mean”\n• **A coding question** — e.g. “help me learn Python”\n\nYou can also browse the ${pageLink('tools', 'toolkit')} or the ${pageLink('learn', 'learning guides')}.`,
    `Hmm, I’m not fully sure about that one — but I can still help! Describe your goal (like “convert currency” or “test my website”) and I’ll find the exact tool. The ${pageLink('tools', 'all tools page')} and ${pageLink('glossary', 'glossary')} are great quick stops too.`,
  );
}

/** Compact catalog summary for the LLM system prompt (server uses this too) */
export function siteIndexForPrompt() {
  return CATEGORIES.map((c) =>
    `### ${c.name} (#/tools/${c.id})\n` +
    TOOLS.filter((t) => t.cat === c.id).map((t) => `- ${t.name} → #/tool/${t.id} — ${t.desc}`).join('\n')
  ).join('\n\n') +
    `\n\n### Pages\n- Home → #/home\n- All tools → #/tools\n- Learn coding guides → #/learn (e.g. #/learn/python, #/learn/javascript)\n- Tech glossary → #/glossary\n- Community tools → #/community\n- Publish a tool → #/community/add\n- Help & FAQ → #/help`;
}
