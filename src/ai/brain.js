/* ============================================================
   PSDKIT AI — local knowledge engine (fallback + instant answers).
   When Vercel function /api/ai has an LLM key, chat.js prefers it
   and falls back to this engine. Replies reference pages of THIS
   site only, with real internal links.
   ============================================================ */
import { TOOLS, TOOL_MAP, CATEGORIES, TOOL_COUNT } from '../data/catalog.js';
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
      `Hello! Great to see you. I know all ${TOOL_COUNT} tools on this site — tell me what you need (like “compress a PDF” or “what is an API”) and I’ll take you there.\n\nOr browse the [full toolkit](#/tools) yourself.`,
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
  /* ── 2026 tool batch — specific intents placed before the generic
        image / password / convert-unit matchers so they win ── */
  {
    id: 'image-base64',
    match: /\b(image|photo|png|jpg|svg).*(base ?64|data ?uri)|base ?64.*(image|photo)|inline (image|css)\b/i,
    run: () => `Use the ${toolLink('image-base64')} — drop an image and you get the data URI, its Base64 size, dimensions and a ready-made CSS rule.\n\nFor plain text, the ${toolLink('base64-codec')} encodes and decodes strings instead.`,
  },
  {
    id: 'photo-filters',
    match: /\b(photo|image|picture).*(filter|edit|bright|contrast|saturat|sepia|grayscale|greyscale|hue|invert)|\bfilter.*(photo|image)\b/i,
    run: () => `The ${toolLink('image-filters')} does that live in your browser: brightness, contrast, saturation, hue, sepia, grayscale and invert, then download a PNG or copy the matching CSS filter rule.`,
  },
  {
    id: 'favicon-icons',
    match: /\b(favicon|app icon|apple.?touch.?icon|pwa icon|manifest icon|logo sizes)\b/i,
    run: () => `Use the ${toolLink('favicon-generator')}:\n\n1. Drop a square logo (512×512 PNG is ideal)\n2. Set the background, padding and corner rounding\n3. Download 16, 32, 48, 180, 192 and 512px icons and copy the HTML snippet\n\nNeed a QR of it too? The ${toolLink('qr-generator')} covers that.`,
  },
  {
    id: 'colour-blindness',
    match: /\b(colou?r ?blind\w*|protanopia|deuteranopia|tritanopia|achromatopsia|daltoni\w*)\b/i,
    run: () => `The ${toolLink('colour-blind-sim')} previews a hex colour or a whole screenshot under protanopia, deuteranopia, tritanopia and total colour blindness.\n\nPair it with the ${toolLink('contrast-check')} for WCAG contrast — the rule of thumb is never let colour be the only signal.`,
  },
  {
    id: 'screen-picker',
    match: /\b(eye ?dropper|pick.*(colour|color).*screen|sample.*(pixel|colour)|screen (colour|color) picker)\b/i,
    run: () => `The ${toolLink('screen-colour-picker')} samples any pixel on your screen (Chrome and Edge support the EyeDropper API) and returns HEX, RGB, HSL, CMYK plus WCAG contrast on white and black.\n\nPrefer typing a value? Use the ${toolLink('color-picker')} or ${toolLink('color-code')}.`,
  },
  {
    id: 'aspect-ratio',
    match: /\b(aspect ratio|16:9|21:9|4:3|9:16|1:1|resize.*(ratio|proportion)|widescreen)\b/i,
    run: () => `The ${toolLink('aspect-ratio-calc')} simplifies any width × height, scales it to a new size, or forces a common ratio like 16:9, 21:9, 4:3, 1:1 or 9:16 — and tells you the closest standard.`,
  },
  {
    id: 'income-tax-india',
    match: /\b(income tax|tax slab|new regime|old regime|87a|rebate|cess|\bitr\b|tds|taxable income|section 80c)\b/i,
    run: () => `The ${toolLink('income-tax-india')} compares both regimes for FY 2025-26 and tells you which one is cheaper:\n\n1. Enter your annual income and tick "salaried" for the standard deduction\n2. Add your 80C / HRA / interest deductions for the old regime\n3. Read the tax, the saving and your monthly take-home\n\nFor invoices and prices, the ${toolLink('gst-calculator')} handles GST and the ${toolLink('salary-hike-calc')} handles appraisals.`,
  },
  {
    id: 'deposits',
    match: /\b(fd|rd|fixed deposit|recurring deposit|deposit maturity|post office scheme|maturity amount)\b/i,
    run: () => `The ${toolLink('fd-rd-calc')} projects both:\n\n• **FD** — a lump sum with monthly, quarterly, half-yearly or yearly compounding\n• **RD** — a monthly instalment where each payment earns interest from the month it goes in\n\nRelated: ${toolLink('sip-calc')} for mutual-fund SIPs and ${toolLink('compound-interest')} for the raw maths.`,
  },
  {
    id: 'attendance',
    match: /\b(attendance|bunk|skip (class|lecture|school|college)|short attendance)\b/i,
    run: () => `The ${toolLink('attendance-calc')} answers all three questions at once: your current percentage, how many classes you can still skip, and how many you must attend in a row to get back above the requirement.\n\nFor overall grades use the ${toolLink('gpa-calc')}, and to plan a target score use the ${toolLink('final-exam-calc')}.`,
  },
  {
    id: 'cgpa',
    match: /\b(cgpa|sgpa|cgpa to percentage|percentage to cgpa|grade point average|9\.5)\b/i,
    run: () => `The ${toolLink('cgpa-percentage')} converts both ways with the formula your institution actually uses:\n\n• **CGPA × 9.5** — CBSE and most schools\n• **(CGPA − 0.75) × 10** — many universities\n• **CGPA × 10** — a straight 10-point scale\n• **CGPA × 25** — a 4.0 scale\n\nAlways check your own marksheet — universities differ. For course-wise grades use the ${toolLink('gpa-calc')}.`,
  },
  {
    id: 'final-exam',
    match: /\b(final exam|exam calculator|score.*need.*exam|target grade|grade calculator|what do i need.*exam)\b/i,
    run: () => `The ${toolLink('final-exam-calc')} works out the score you need on the final, given your current percentage and how much each part is weighted — and tells you honestly if the target is no longer reachable.`,
  },
  {
    id: 'rent-afford',
    match: /\b(rent afford|how much rent|30% rule|30 percent rule|rent budget|can i afford.*(flat|apartment|house|rent))\b/i,
    run: () => `The ${toolLink('rent-affordability')} caps your rent from your take-home pay using the 25 / 30 / 35 / 40% rules, and scores a specific rent you are considering.\n\nFor the loan side of a purchase, the ${toolLink('emi-calc')} gives EMI and total interest.`,
  },
  {
    id: 'unit-price',
    match: /\b(unit price|price per|which (is|pack|one) (is )?cheap\w*|cheap(est|er) (per|pack|option)|better (deal|value)|value for money|per (gram|ml|kg|litre|piece)|bulk buy|bigger pack)\b/i,
    run: () => `The ${toolLink('unit-price-compare', 'Unit Price Comparator')} compares two packs after converting both to the same base unit — grams, ml, cm, pieces or area — and tells you which is cheaper and by what percentage.`,
  },
  {
    id: 'roman-numerals',
    match: /\b(roman numeral|roman number|mmxx|\bix\b|\bxii\b|numeral converter)\b/i,
    run: () => `The ${toolLink('roman-numeral')} converts both directions: any number from 1 to 3999 into Roman numerals, and any valid numeral back into a number.`,
  },
  {
    id: 'fractions',
    match: /\b(fraction|numerator|denominator|simplify.*(fraction|ratio)|mixed number|add.*\/)\b/i,
    run: () => `The ${toolLink('fraction-calc')} adds, subtracts, multiplies and divides two fractions, then gives the simplified fraction, the mixed number, the decimal and the percentage.`,
  },
  {
    id: 'passphrase',
    match: /\b(passphrase|diceware|memorable password|word password|xkcd password)\b/i,
    run: () => `The ${toolLink('passphrase-gen')} builds random word passphrases — pick 3 to 12 words, a separator, optional capitalisation and a number — and shows the entropy in bits.\n\nNeed a conventional random string instead? Use the ${toolLink('password-gen')}, then check it with the ${toolLink('password-strength')}.`,
  },
  {
    id: 'subnet',
    match: /\b(subnet|cidr|netmask|subnet mask|wildcard mask|broadcast address|ip range|vlsm|usable hosts|\/24|\/16)\b/i,
    run: () => `The ${toolLink('subnet-calc')} splits any IPv4 CIDR into network address, subnet mask, wildcard, broadcast, first and last usable host, total addresses and usable hosts — plus whether the range is private or public.\n\nFor live lookups use the ${toolLink('ip-lookup')} or the ${toolLink('dns-lookup')}.`,
  },
  {
    id: 'mac-address',
    match: /\b(mac address|physical address|hwaddr|aa:bb:cc)\b/i,
    run: () => `The ${toolLink('mac-address-gen')} generates random MAC addresses in colon, hyphen, Cisco-dot or plain format, unicast or multicast, and can set the "locally administered" bit so they never collide with a real vendor prefix — ideal for VMs, containers and tests.`,
  },
  {
    id: 'ports',
    match: /\b(port number|common ports|which port|ports list|port 22|port 443|port 3306|port 5432|port 8080|well.?known ports)\b/i,
    run: () => `The ${toolLink('port-reference')} is a searchable list of the TCP and UDP ports that matter — SSH, DNS, HTTP(S), SMTP, IMAP, RDP, and every common database port — with what each one is for.\n\nTo see what a server actually answers, use the ${toolLink('http-headers')} or the ${toolLink('api-tester')}.`,
  },
  {
    id: 'json-diff',
    match: /\b(json diff|diff json|compare (two )?json|json compare|difference between.*json|api response.*chang)\b/i,
    run: () => `The ${toolLink('json-diff')} compares two JSON documents and lists every added, removed and changed value with its full path (including array indexes).\n\nTo tidy one document first use the ${toolLink('json-format')}, and to test a single value use the ${toolLink('regex-tester')}.`,
  },
  {
    id: 'html-to-jsx',
    match: /\b(html to jsx|jsx convert|classname|convert.*jsx|react.*html attribute)\b/i,
    run: () => `The ${toolLink('html-to-jsx')} converts HTML to JSX: class → className, for → htmlFor, inline style strings → style objects, void tags self-closed, comments turned into {/* */} and entities escaped.\n\nThen paste it into the ${toolLink('code-playground')} to see it run.`,
  },
  {
    id: 'rem-px',
    match: /\b(rem to px|px to rem|rem\b.*convert|root font size|em to px|css (unit|length) convert)\b/i,
    run: () => `The ${toolLink('rem-px-conv')} converts px, rem, em, pt, percent, cm, in and mm using your own root font size, so you can keep spacing accessible and responsive.`,
  },
  {
    id: 'env-file',
    match: /(^|[^a-z0-9])\.env\b|\bdotenv\b|\benv files?\b|\bprocess\.env\b|\benvironment variables?\b|\bconfig secrets?\b/i,
    run: () => `The ${toolLink('env-parser')} reads a .env file and turns it into JSON, shell exports or a Markdown table — with secret-looking values masked on screen. It can also go the other way, JSON → .env, flattening nested objects.\n\nThen add it to your ignores with the ${toolLink('gitignore-generator')}.`,
  },
  {
    id: 'ascii-art',
    match: /\b(ascii art|text art|banner text|figlet|ascii text|block letters)\b/i,
    run: () => `The ${toolLink('ascii-art-text')} renders text as a five-row block banner in the fill character you choose — great for a README header or a terminal splash. The output scrolls sideways instead of breaking your layout.`,
  },
  {
    id: 'unicode-inspect',
    match: /\b(unicode|code ?point|utf-?8|utf-?16|html entity|character code|surrogate pair|zero width)\b/i,
    run: () => `The ${toolLink('unicode-inspector')} inspects every character in a string — code point, decimal, Unicode block, UTF-8 bytes, HTML entity and the JavaScript escape — or looks up a single code point like U+1F600.\n\nFor readable text transformations, the ${toolLink('ascii-convert')} and ${toolLink('braille-translator')} are handy companions.`,
  },
  {
    id: 'keyword-density',
    match: /\b(keyword density|word frequency|word density|seo density|focus keyword|keyword count|stuffing)\b/i,
    run: () => `The ${toolLink('keyword-density')} counts total and unique words, ranks the top single words and repeated two-word phrases, and scores a focus keyword for density.\n\nFor overall on-page checks use the ${toolLink('seo-mini-audit')} and the ${toolLink('meta-generator')}.`,
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
