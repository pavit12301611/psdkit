/* ============================================================
   PSDKIT Pro — Master Tool Catalog (pure data, no DOM)
   TOOL_COUNT tools, split across four categories. Counts are
   derived below, never hardcoded, so adding a tool to TOOLS
   updates the UI, meta tags, sitemap and AI copy automatically.
   Consumed by the app (search, browse) AND the AI backend
   so every assistant reply can link to real pages of this site.
   ============================================================ */

export const CATEGORIES = [
  {
    id: 'daily',
    name: 'Daily Tools',
    short: 'Daily',
    tag: 'Everyday',
    tile: 'tile-peach',
    badge: 'badge-daily',
    icon: 'calculator',
    blurb: 'Calculators and converters for money, health, time, dates and everyday decisions — {n} tools that save you a search.',
  },
  {
    id: 'internet',
    name: 'Internet Tools',
    short: 'Internet',
    tag: 'Network',
    tile: 'tile-sky',
    badge: 'badge-internet',
    icon: 'globe',
    blurb: 'Look up IPs and DNS, test speed and headers, inspect websites and build links — {n} tools for everything online.',
  },
  {
    id: 'essentials',
    name: 'Essential Tools',
    short: 'Essentials',
    tag: 'Media & Files',
    tile: 'tile-sage',
    badge: 'badge-essentials',
    icon: 'wrench',
    blurb: 'QR codes, PDFs, images, colours, audio and camera tools — {n} workhorse utilities that run right in your browser.',
  },
  {
    id: 'coding',
    name: 'Coding & Learn',
    short: 'Coding',
    tag: 'Developer',
    tile: 'tile-lavender',
    badge: 'badge-coding',
    icon: 'code',
    blurb: 'Formatters, converters, regex, git, playgrounds, cheatsheets plus word meanings and translation — {n} tools for developers.',
  },
];

/** id, name, cat, icon, desc, keys */
export const TOOLS = [
  /* ─────────────── DAILY ─────────────── */
  { id: 'age-calc', name: 'Age Calculator', cat: 'daily', icon: 'calendar', desc: 'Find your exact age in years, months, days — plus total days, hours and your next birthday.', keys: 'age birthday years old date born' },
  { id: 'bmi-calc', name: 'BMI Calculator', cat: 'daily', icon: 'heart', desc: 'Calculate your Body Mass Index from height and weight and see what the number means.', keys: 'bmi body mass index health weight height fitness' },
  { id: 'calorie-calc', name: 'Calorie & BMR Calculator', cat: 'daily', icon: 'activity', desc: 'Estimate daily calories your body burns at rest and what to eat to reach your goal.', keys: 'calories bmr tdee diet metabolism health food' },
  { id: 'percent-calc', name: 'Percentage Calculator', cat: 'daily', icon: 'percent', desc: 'Every percentage sum in one place — X% of Y, percent change, increase and decrease.', keys: 'percentage percent math discount change increase' },
  { id: 'discount-calc', name: 'Discount Calculator', cat: 'daily', icon: 'tag', desc: 'See how much you actually save and the final price after any discount or coupon.', keys: 'discount sale offer price saving coupon shopping' },
  { id: 'tip-calc', name: 'Tip Calculator', cat: 'daily', icon: 'dollar', desc: 'Work out the tip, the total bill and what each person pays in seconds.', keys: 'tip restaurant bill gratuity money food' },
  { id: 'bill-split', name: 'Bill Splitter', cat: 'daily', icon: 'users', desc: 'Split any bill evenly or with custom shares between friends — tips included.', keys: 'split bill friends share money group' },
  { id: 'emi-calc', name: 'Loan EMI Calculator', cat: 'daily', icon: 'calculator', desc: 'Monthly EMI, total interest and full repayment for home, car or personal loans.', keys: 'emi loan interest mortgage finance bank monthly' },
  { id: 'simple-interest', name: 'Simple Interest Calculator', cat: 'daily', icon: 'percent', desc: 'Compute simple interest and maturity amount for any principal, rate and time.', keys: 'simple interest finance principal rate time' },
  { id: 'compound-interest', name: 'Compound Interest Calculator', cat: 'daily', icon: 'percent', desc: 'See how money grows with compounding — yearly, quarterly, monthly or daily.', keys: 'compound interest savings growth finance invest' },
  { id: 'sip-calc', name: 'SIP Investment Calculator', cat: 'daily', icon: 'target', desc: 'Project the future value of monthly investments with expected returns.', keys: 'sip investment mutual fund returns savings finance' },
  { id: 'salary-hourly', name: 'Salary ⇄ Hourly Converter', cat: 'daily', icon: 'dollar', desc: 'Convert annual salary to hourly rate and back — accounting for work hours.', keys: 'salary hourly wage pay job income career' },
  { id: 'fuel-cost', name: 'Fuel Cost Calculator', cat: 'daily', icon: 'droplet', desc: 'Trip fuel cost and consumption based on distance, mileage and fuel price.', keys: 'fuel petrol gas cost trip car mileage travel' },
  { id: 'electricity-bill', name: 'Electricity Bill Calculator', cat: 'daily', icon: 'zap', desc: 'Estimate power consumption and cost from appliance wattage and usage hours.', keys: 'electricity bill power energy consumption appliance cost' },
  { id: 'water-intake', name: 'Water Intake Calculator', cat: 'daily', icon: 'droplet', desc: 'Get a personalised daily water intake target from your body and lifestyle.', keys: 'water intake hydration health drink fitness' },
  { id: 'gpa-calc', name: 'GPA Calculator', cat: 'daily', icon: 'graduation', desc: 'Calculate GPA or CGPA from courses, credits and grades — 4.0 and 10.0 scales.', keys: 'gpa cgpa grade college school marks study' },
  { id: 'length-conv', name: 'Length Converter', cat: 'daily', icon: 'ruler', desc: 'Convert metres, feet, inches, miles, km, yards and more instantly.', keys: 'length meter feet inch mile km convert unit distance' },
  { id: 'weight-conv', name: 'Weight Converter', cat: 'daily', icon: 'scale', desc: 'Kilograms, pounds, ounces, grams, stones — every weight unit converted.', keys: 'weight kg pound ounce gram stone mass convert' },
  { id: 'temp-conv', name: 'Temperature Converter', cat: 'daily', icon: 'thermometer', desc: 'Celsius, Fahrenheit and Kelvin converted live as you type.', keys: 'temperature celsius fahrenheit kelvin convert hot cold' },
  { id: 'area-conv', name: 'Area Converter', cat: 'daily', icon: 'ruler', desc: 'Square metres, acres, hectares, square feet, hectares and more.', keys: 'area acre hectare square feet land convert' },
  { id: 'volume-conv', name: 'Volume Converter', cat: 'daily', icon: 'box', desc: 'Litres, gallons, cups, millilitres, cubic metres and every volume unit.', keys: 'volume litre gallon cup ml convert liquid' },
  { id: 'speed-conv', name: 'Speed Converter', cat: 'daily', icon: 'speed', desc: 'km/h, mph, m/s, knots — convert any speed measurement.', keys: 'speed kmh mph knots velocity convert' },
  { id: 'time-conv', name: 'Time Unit Converter', cat: 'daily', icon: 'clock', desc: 'Seconds, minutes, hours, days, weeks and months in any direction.', keys: 'time seconds minutes hours days convert duration' },
  { id: 'data-conv', name: 'Data Size Converter', cat: 'daily', icon: 'database', desc: 'Bytes, KB, MB, GB, TB and bits — storage and bandwidth units.', keys: 'data bytes kb mb gb tb storage convert bits' },
  { id: 'pressure-conv', name: 'Pressure Converter', cat: 'daily', icon: 'wind', desc: 'Bar, pascal, PSI, atm, torr and every pressure unit.', keys: 'pressure bar pascal psi atm convert' },
  { id: 'energy-conv', name: 'Energy Converter', cat: 'daily', icon: 'zap', desc: 'Joules, calories, kilowatt-hours, BTU and electronvolts.', keys: 'energy joule calorie kwh btu convert power' },
  { id: 'currency-conv', name: 'Currency Converter', cat: 'daily', icon: 'dollar', desc: 'Live exchange rates for 150+ currencies — USD, EUR, INR, GBP, JPY and more.', keys: 'currency money exchange rate usd eur inr gbp forex' },
  { id: 'timezone-conv', name: 'Time Zone Converter', cat: 'daily', icon: 'globe', desc: 'Compare date and time across cities and time zones — daylight saving aware.', keys: 'timezone time zone convert city gmt utc local' },
  { id: 'world-clock', name: 'World Clock', cat: 'daily', icon: 'clock', desc: 'A live clock wall for your favourite cities around the world.', keys: 'world clock time city international now' },
  { id: 'countdown-timer', name: 'Countdown Timer', cat: 'daily', icon: 'timer', desc: 'A clean countdown for any duration with an audible alert when it ends.', keys: 'countdown timer minutes seconds alert' },
  { id: 'stopwatch', name: 'Stopwatch', cat: 'daily', icon: 'timer', desc: 'Precise stopwatch with laps — perfect for workouts, cooking and study.', keys: 'stopwatch timer laps sports clock' },
  { id: 'pomodoro', name: 'Pomodoro Timer', cat: 'daily', icon: 'target', desc: 'Focus in 25-minute sprints with breaks — the classic productivity method.', keys: 'pomodoro focus study productivity timer work' },
  { id: 'date-calc', name: 'Date Calculator', cat: 'daily', icon: 'calendar', desc: 'Add or subtract days, weeks, months and years from any date.', keys: 'date add subtract days weeks months calendar' },
  { id: 'days-between', name: 'Days Between Dates', cat: 'daily', icon: 'calendar', desc: 'Count days, weeks, months and working days between two dates.', keys: 'days between dates difference count age duration' },
  { id: 'month-calendar', name: 'Calendar Generator', cat: 'daily', icon: 'calendar', desc: 'Generate any month calendar — print or download as an image file.', keys: 'calendar month year printable schedule' },
  { id: 'random-number', name: 'Random Number Generator', cat: 'daily', icon: 'hash', desc: 'Fair random numbers in any range, with options for repeats and lists.', keys: 'random number generator pick lottery fair' },
  { id: 'dice-roller', name: 'Dice Roller', cat: 'daily', icon: 'gamepad', desc: 'Roll d4, d6, d8, d10, d12, d20 and custom dice for any game.', keys: 'dice roll dnd board game random d20' },
  { id: 'coin-flip', name: 'Coin Flip', cat: 'daily', icon: 'refresh', desc: 'A fair digital coin toss — heads or tails, with flip history.', keys: 'coin flip toss heads tails random decide' },
  { id: 'team-picker', name: 'Random Team Picker', cat: 'daily', icon: 'users', desc: 'Split names into random teams or pick a winner from a list.', keys: 'team picker random names groups winner draw' },
  { id: 'yes-no', name: 'Yes / No Decider', cat: 'daily', icon: 'sparkles', desc: 'Let the magic 8-ball decide when you cannot — yes, no or maybe.', keys: 'yes no maybe decide 8ball question answer magic' },
  { id: 'wheel-spinner', name: 'Wheel Spinner', cat: 'daily', icon: 'refresh', desc: 'Spin a colourful wheel to pick fairly from any list of options.', keys: 'wheel spinner spin pick random choice raffle' },
  { id: 'password-gen', name: 'Password Generator', cat: 'daily', icon: 'lock', desc: 'Strong, random passwords you can customise — length, symbols, numbers.', keys: 'password generator secure strong random login' },
  { id: 'password-strength', name: 'Password Strength Checker', cat: 'daily', icon: 'shield', desc: 'See how strong a password is and how to make it better — locally.', keys: 'password strength check secure safety crack' },
  { id: 'username-gen', name: 'Username Generator', cat: 'daily', icon: 'user', desc: 'Creative, available-looking usernames from words, styles and moods.', keys: 'username generator name handle gamer social' },
  { id: 'uuid-gen', name: 'UUID Generator', cat: 'daily', icon: 'hash', desc: 'Generate v4 UUIDs (and ULIDs) — one or a thousand at a time.', keys: 'uuid guid random id generate v4 unique' },
  { id: 'lorem-ipsum', name: 'Lorem Ipsum Generator', cat: 'daily', icon: 'fileText', desc: 'Placeholder text for designs — words, sentences or paragraphs.', keys: 'lorem ipsum dummy text placeholder filler' },
  { id: 'word-counter', name: 'Word & Character Counter', cat: 'daily', icon: 'type', desc: 'Words, characters, sentences, reading time and more — live as you type.', keys: 'word count character counter reading time text essay' },
  { id: 'case-convert', name: 'Case Converter', cat: 'daily', icon: 'type', desc: 'UPPER, lower, Title Case, Sentence case and more in one click.', keys: 'case upper lower title capital text convert' },
  { id: 'notes-app', name: 'Quick Notes', cat: 'daily', icon: 'note', desc: 'Instant notepad that saves in your browser — no account needed.', keys: 'notes notepad write memo remember sticky' },
  { id: 'todo-list', name: 'Todo List', cat: 'daily', icon: 'listChecks', desc: 'A fast, offline task list that lives in your browser with due dates.', keys: 'todo task list checklist productivity done' },

  /* ─────────────── INTERNET (25) ─────────────── */
  { id: 'ip-lookup', name: 'IP & Network Lookup', cat: 'internet', icon: 'wifi', desc: 'Your public IP, city, country, ISP and timezone — one click.', keys: 'ip address location isp network lookup my ip' },
  { id: 'dns-lookup', name: 'DNS Lookup', cat: 'internet', icon: 'server', desc: 'Query A, AAAA, MX, TXT, NS and CNAME records for any domain.', keys: 'dns domain records mx txt ns lookup nameserver' },
  { id: 'http-headers', name: 'HTTP Header Checker', cat: 'internet', icon: 'fileText', desc: 'Inspect the response headers any website sends back — status, server, cache.', keys: 'http headers response status server check website' },
  { id: 'site-status', name: 'Website Status Checker', cat: 'internet', icon: 'activity', desc: 'Is a site up? Check status code, response time and redirect chain.', keys: 'uptime status down online check website ping' },
  { id: 'speed-test', name: 'Internet Speed Test', cat: 'internet', icon: 'speed', desc: 'Measure your download speed right now — quick and privacy-friendly.', keys: 'speed test internet download bandwidth fast mbps' },
  { id: 'latency-test', name: 'Latency / Ping Test', cat: 'internet', icon: 'activity', desc: 'Measure network latency to major endpoints with jitter analysis.', keys: 'ping latency lag jitter ms network delay' },
  { id: 'browser-info', name: 'Browser & Device Info', cat: 'internet', icon: 'monitor', desc: 'Browser, engine, operating system, language and connection details.', keys: 'browser device info os language user agent detect' },
  { id: 'screen-info', name: 'Screen & Display Info', cat: 'internet', icon: 'smartphone', desc: 'Resolution, viewport, pixel ratio, colour depth and orientation.', keys: 'screen resolution viewport display pixels size' },
  { id: 'ua-parser', name: 'User Agent Parser', cat: 'internet', icon: 'search', desc: 'Decode any user agent string into readable browser and OS details.', keys: 'user agent ua parse browser os string detect' },
  { id: 'url-parser', name: 'URL Parser', cat: 'internet', icon: 'link', desc: 'Break any URL into protocol, host, path, params and hash — or build one.', keys: 'url parse query string params uri link decode' },
  { id: 'utm-builder', name: 'UTM Link Builder', cat: 'internet', icon: 'link', desc: 'Build campaign tracking links with clean UTM parameters.', keys: 'utm campaign tracking marketing link source medium analytics' },
  { id: 'meta-generator', name: 'Meta Tag Generator', cat: 'internet', icon: 'code', desc: 'Generate SEO meta tags — title, description, Open Graph and Twitter cards.', keys: 'meta tags seo og open graph twitter html head' },
  { id: 'og-preview', name: 'Social Share Preview', cat: 'internet', icon: 'image', desc: 'Preview how a link looks when shared on WhatsApp, X, Facebook or Slack.', keys: 'og preview social share card facebook twitter whatsapp' },
  { id: 'robots-viewer', name: 'robots.txt Viewer', cat: 'internet', icon: 'fileText', desc: 'View and understand any site’s robots.txt and crawl rules.', keys: 'robots txt seo crawl googlebot disallow sitemap' },
  { id: 'sitemap-viewer', name: 'Sitemap Viewer', cat: 'internet', icon: 'layers', desc: 'Fetch a sitemap.xml and list every URL inside — clean and searchable.', keys: 'sitemap xml seo urls crawl pages list' },
  { id: 'favicon-grabber', name: 'Favicon & Icon Grabber', cat: 'internet', icon: 'image', desc: 'Download any website’s favicon and app icons in every size.', keys: 'favicon icon logo grab download website brand' },
  { id: 'email-validator', name: 'Email Validator', cat: 'internet', icon: 'mail', desc: 'Check email syntax, detect providers and spot disposable addresses.', keys: 'email validate syntax check disposable verify' },
  { id: 'domain-lookup', name: 'Domain WHOIS (RDAP)', cat: 'internet', icon: 'globe', desc: 'Registration info for any domain — registrar, dates, status and nameservers.', keys: 'whois domain rdap registered expiry registrar lookup' },
  { id: 'cors-checker', name: 'CORS Checker', cat: 'internet', icon: 'shield', desc: 'Test whether an API or website allows browser (CORS) requests.', keys: 'cors api browser fetch test allow origin' },
  { id: 'api-tester', name: 'API Request Tester', cat: 'internet', icon: 'terminal', desc: 'Send GET, POST, PUT and DELETE requests and inspect the JSON reply.', keys: 'api rest request fetch post get json test endpoint' },
  { id: 'html-source', name: 'HTML Source Viewer', cat: 'internet', icon: 'code', desc: 'View the raw HTML source of any public page, neatly formatted.', keys: 'html source view code page website inspect' },
  { id: 'link-extractor', name: 'Web Page Link Extractor', cat: 'internet', icon: 'link', desc: 'Pull every link out of a webpage — internal, external or both.', keys: 'links extract scrape anchors href page urls' },
  { id: 'tech-detector', name: 'Website Tech Detector', cat: 'internet', icon: 'cpu', desc: 'Guess the CMS, frameworks and services a website runs on.', keys: 'technology detect cms wordpress react framework stack' },
  { id: 'wifi-qr', name: 'Wi-Fi QR Code Generator', cat: 'internet', icon: 'qr', desc: 'Create a QR code that connects guests to your Wi-Fi instantly.', keys: 'wifi qr code password connect guest network' },
  { id: 'page-weight', name: 'Page Weight Analyzer', cat: 'internet', icon: 'scale', desc: 'Measure the size of any page and where its weight is going.', keys: 'page size weight performance load bytes analyze' },

  /* ─────────────── ESSENTIALS (25) ─────────────── */
  { id: 'qr-generator', name: 'QR Code Generator', cat: 'essentials', icon: 'qr', desc: 'Create QR codes for links, text, contacts — with colours and sizes.', keys: 'qr code generator link scan barcode' },
  { id: 'qr-scanner', name: 'QR Code Scanner', cat: 'essentials', icon: 'camera', desc: 'Scan QR codes using your camera or from an image file.', keys: 'qr scan camera read barcode decode image' },
  { id: 'pdf-merge', name: 'PDF Merge', cat: 'essentials', icon: 'file', desc: 'Combine multiple PDFs into one file — drag, drop, reorder, merge.', keys: 'pdf merge combine join files document' },
  { id: 'pdf-split', name: 'PDF Split', cat: 'essentials', icon: 'file', desc: 'Split a PDF into separate pages or custom page ranges.', keys: 'pdf split pages separate extract document' },
  { id: 'images-to-pdf', name: 'Images to PDF', cat: 'essentials', icon: 'image', desc: 'Turn JPG and PNG images into a neat PDF — set order and size.', keys: 'images to pdf jpg png convert document' },
  { id: 'pdf-to-images', name: 'PDF to Images', cat: 'essentials', icon: 'image', desc: 'Render PDF pages as PNG or JPG images you can download.', keys: 'pdf to image png jpg render pages convert' },
  { id: 'image-compress', name: 'Image Compressor', cat: 'essentials', icon: 'image', desc: 'Shrink image file size with visible quality control — keeps privacy.', keys: 'image compress reduce size jpg png optimize shrink' },
  { id: 'image-resize', name: 'Image Resizer', cat: 'essentials', icon: 'image', desc: 'Resize images to exact pixels or percentages — batch friendly.', keys: 'image resize scale pixels dimensions photo' },
  { id: 'image-convert', name: 'Image Format Converter', cat: 'essentials', icon: 'repeat', desc: 'Convert between PNG, JPG and WebP with quality settings.', keys: 'image convert png jpg webp format change' },
  { id: 'color-picker', name: 'Colour Picker', cat: 'essentials', icon: 'palette', desc: 'Pick any colour and get HEX, RGB, HSL and a matching name.', keys: 'color picker hex rgb hsl palette design' },
  { id: 'contrast-check', name: 'Colour Contrast Checker', cat: 'essentials', icon: 'eye', desc: 'Check if text passes WCAG accessibility contrast requirements.', keys: 'contrast wcag accessibility a11y color check design' },
  { id: 'palette-gen', name: 'Colour Palette Generator', cat: 'essentials', icon: 'palette', desc: 'Generate beautiful, accessible colour palettes from one colour.', keys: 'palette color scheme generate design ui harmony' },
  { id: 'hash-gen', name: 'Text Hash Generator', cat: 'essentials', icon: 'hash', desc: 'MD5, SHA-1, SHA-256 and SHA-512 hashes for any text.', keys: 'hash md5 sha sha256 checksum digest encrypt' },
  { id: 'file-hash', name: 'File Checksum', cat: 'essentials', icon: 'file', desc: 'Generate a file’s SHA-256/SHA-1 checksum to verify downloads.', keys: 'file checksum hash verify sha256 integrity download' },
  { id: 'text-speech', name: 'Text to Speech', cat: 'essentials', icon: 'volume', desc: 'Hear any text read aloud in natural voices — many languages.', keys: 'text to speech voice read aloud tts speak audio' },
  { id: 'speech-text', name: 'Speech to Text', cat: 'essentials', icon: 'mic', desc: 'Dictate and transcribe your voice into text — hands-free typing.', keys: 'speech to text dictation voice transcribe microphone' },
  { id: 'voice-recorder', name: 'Voice Recorder', cat: 'essentials', icon: 'mic', desc: 'Record audio from your microphone and download as a file.', keys: 'voice audio recorder microphone record sound' },
  { id: 'screen-recorder', name: 'Screen Recorder', cat: 'essentials', icon: 'video', desc: 'Record your screen or a browser tab — save as a video file.', keys: 'screen record video capture tab demo' },
  { id: 'whiteboard', name: 'Whiteboard & Sketch Pad', cat: 'essentials', icon: 'paint', desc: 'Draw, sketch and explain on a clean canvas — export as PNG.', keys: 'whiteboard draw sketch paint canvas doodle' },
  { id: 'signature-pad', name: 'Signature Pad', cat: 'essentials', icon: 'pen', desc: 'Draw and save a transparent digital signature for documents.', keys: 'signature sign draw pad e-sign document' },
  { id: 'webcam-mirror', name: 'Webcam Mirror', cat: 'essentials', icon: 'camera', desc: 'Use your webcam as a mirror — with zoom, freeze and snapshot.', keys: 'webcam mirror camera selfie freeze snapshot' },
  { id: 'ruler-screen', name: 'On-Screen Ruler', cat: 'essentials', icon: 'ruler', desc: 'A precise on-screen ruler in millimetres or inches — calibratable.', keys: 'ruler measure screen cm inches px design' },
  { id: 'magnifier', name: 'Magnifier & Flashlight', cat: 'essentials', icon: 'eye', desc: 'Magnify the screen or turn it into a bright flashlight.', keys: 'magnifier zoom flashlight loupe screen light' },
  { id: 'metronome', name: 'Metronome', cat: 'essentials', icon: 'music', desc: 'An accurate, adjustable metronome for musicians and learners.', keys: 'metronome beat bpm tempo music practice rhythm' },
  { id: 'alarm-clock', name: 'Alarm Clock', cat: 'essentials', icon: 'clock', desc: 'Set alarms in your browser with sound — perfect at a desk.', keys: 'alarm clock wake alert timer remind' },

  /* ─────────────── CODING & LEARN (50) ─────────────── */
  { id: 'code-playground', name: 'HTML / CSS / JS Playground', cat: 'coding', icon: 'code', desc: 'Write HTML, CSS and JavaScript and see the result live — instantly.', keys: 'playground html css javascript live editor preview web' },
  { id: 'js-console', name: 'JavaScript Console', cat: 'coding', icon: 'terminal', desc: 'Run JavaScript snippets in a sandbox with instant output.', keys: 'javascript console run execute repl node snippet' },
  { id: 'json-format', name: 'JSON Formatter & Validator', cat: 'coding', icon: 'braces', desc: 'Format, validate and inspect JSON with error line reporting.', keys: 'json format validate pretty print minify lint parse' },
  { id: 'json-yaml', name: 'JSON ⇄ YAML Converter', cat: 'coding', icon: 'repeat', desc: 'Convert JSON to YAML and back with copy-ready output.', keys: 'json yaml convert swap config serialize' },
  { id: 'json-csv', name: 'JSON ⇄ CSV Converter', cat: 'coding', icon: 'repeat', desc: 'Turn JSON arrays into CSV spreadsheets and back again.', keys: 'json csv convert table spreadsheet excel data' },
  { id: 'xml-format', name: 'XML Formatter & Validator', cat: 'coding', icon: 'braces', desc: 'Pretty-print and validate XML documents with error hints.', keys: 'xml format validate pretty soap svg lint' },
  { id: 'html-format', name: 'HTML Formatter & Minifier', cat: 'coding', icon: 'code', desc: 'Beautify or minify HTML markup — with optional comment removal.', keys: 'html format beautify minify prettify compress markup' },
  { id: 'css-format', name: 'CSS Formatter & Minifier', cat: 'coding', icon: 'type', desc: 'Tidy messy stylesheets or shrink them for production.', keys: 'css format beautify minify stylesheet compress' },
  { id: 'js-format', name: 'JS Formatter & Minifier', cat: 'coding', icon: 'braces', desc: 'Indent and clean JavaScript, or minify it for the web.', keys: 'javascript format beautify minify prettify js compress' },
  { id: 'sql-format', name: 'SQL Formatter', cat: 'coding', icon: 'database', desc: 'Format SQL queries with proper keyword casing and indentation.', keys: 'sql format query beautify database mysql postgres' },
  { id: 'markdown-preview', name: 'Markdown Preview', cat: 'coding', icon: 'fileText', desc: 'Write Markdown and see the rendered result side by side.', keys: 'markdown md preview editor readme render' },
  { id: 'markdown-html', name: 'Markdown ⇄ HTML', cat: 'coding', icon: 'repeat', desc: 'Convert Markdown to HTML and HTML back to clean Markdown.', keys: 'markdown html convert md markup turndown' },
  { id: 'base64-codec', name: 'Base64 Encode / Decode', cat: 'coding', icon: 'lock', desc: 'Encode text or data to Base64 and decode it back safely.', keys: 'base64 encode decode encode64 data text' },
  { id: 'url-codec', name: 'URL Encode / Decode', cat: 'coding', icon: 'link', desc: 'Percent-encode URLs and query strings — or decode them.', keys: 'url encode decode percent uri escape encodeURIComponent' },
  { id: 'html-entities', name: 'HTML Entities Encoder', cat: 'coding', icon: 'code', desc: 'Convert special characters to HTML entities and back.', keys: 'html entities encode decode escape special characters' },
  { id: 'jwt-decoder', name: 'JWT Decoder', cat: 'coding', icon: 'key', desc: 'Decode JWT headers and payloads and inspect claims safely.', keys: 'jwt token decode claims auth bearer oauth security' },
  { id: 'regex-tester', name: 'Regex Tester', cat: 'coding', icon: 'search', desc: 'Test regular expressions live with matches, groups and flags.', keys: 'regex regexp regular expression test match pattern grep' },
  { id: 'cron-builder', name: 'Cron Expression Builder', cat: 'coding', icon: 'clock', desc: 'Build cron schedules visually and read what they mean in English.', keys: 'cron schedule expression crontab job timer linux' },
  { id: 'unix-time', name: 'Unix Timestamp Converter', cat: 'coding', icon: 'clock', desc: 'Convert Unix epoch timestamps to dates and back — live clock.', keys: 'unix timestamp epoch epoch millis date convert' },
  { id: 'base-convert', name: 'Number Base Converter', cat: 'coding', icon: 'binary', desc: 'Binary, octal, decimal and hex conversions for any number.', keys: 'binary hex octal decimal base convert number radix' },
  { id: 'hex-convert', name: 'Hex ⇄ Text Converter', cat: 'coding', icon: 'hash', desc: 'Convert hexadecimal strings to readable text and back.', keys: 'hex text convert ascii bytes decode encode' },
  { id: 'ascii-convert', name: 'ASCII ⇄ Text Converter', cat: 'coding', icon: 'type', desc: 'Turn text into ASCII codes and codes into text instantly.', keys: 'ascii text codes characters convert unicode table' },
  { id: 'binary-convert', name: 'Text ⇄ Binary Converter', cat: 'coding', icon: 'binary', desc: 'Encode text as binary (0s and 1s) and decode it back.', keys: 'binary text encode decode zeros ones convert' },
  { id: 'morse-code', name: 'Morse Code Translator', cat: 'coding', icon: 'radio', desc: 'Translate text to Morse code and back — with audio playback.', keys: 'morse code translate dots dashes signal audio' },
  { id: 'slug-gen', name: 'Slug Generator', cat: 'coding', icon: 'type', desc: 'Turn any title into a clean, SEO-friendly URL slug.', keys: 'slug url seo friendly title permalink convert' },
  { id: 'code-case', name: 'Code Case Converter', cat: 'coding', icon: 'type', desc: 'camelCase, snake_case, kebab-case, PascalCase and CONSTANT_CASE.', keys: 'camelCase snake kebab pascal case variable naming convert' },
  { id: 'text-diff', name: 'Text Diff Checker', cat: 'coding', icon: 'fileText', desc: 'Compare two texts line by line and highlight every difference.', keys: 'diff compare text files changes merge review' },
  { id: 'line-tools', name: 'Line Sorter & Deduplicator', cat: 'coding', icon: 'listChecks', desc: 'Sort lines A–Z or Z–A, remove duplicates and blank lines.', keys: 'sort lines duplicate remove unique alphabetically list' },
  { id: 'find-replace', name: 'Find & Replace', cat: 'coding', icon: 'search', desc: 'Find and replace text with regex support and live match count.', keys: 'find replace search substitute regex text' },
  { id: 'comment-strip', name: 'Code Comment Remover', cat: 'coding', icon: 'code', desc: 'Strip comments from JavaScript, CSS, HTML or SQL code safely.', keys: 'comments remove strip clean code js css html' },
  { id: 'color-code', name: 'Colour Code Converter', cat: 'coding', icon: 'palette', desc: 'Convert HEX ⇄ RGB ⇄ HSL colours with a live preview.', keys: 'hex rgb hsl color convert code design css' },
  { id: 'box-shadow', name: 'CSS Box Shadow Generator', cat: 'coding', icon: 'box', desc: 'Design box shadows visually and copy the ready CSS.', keys: 'css box shadow generator design elevation copy' },
  { id: 'border-radius', name: 'CSS Border Radius Generator', cat: 'coding', icon: 'box', desc: 'Craft rounded corners and blob shapes with live CSS output.', keys: 'border radius css rounded corners blob generator' },
  { id: 'flexbox-play', name: 'Flexbox Playground', cat: 'coding', icon: 'layers', desc: 'Learn and tune CSS Flexbox visually with live code output.', keys: 'flexbox css flex layout align justify playground' },
  { id: 'grid-play', name: 'Grid Playground', cat: 'coding', icon: 'layers', desc: 'Experiment with CSS Grid layouts and copy the generated code.', keys: 'css grid layout columns rows template playground' },
  { id: 'git-cheatsheet', name: 'Git Cheatsheet', cat: 'coding', icon: 'git', desc: 'Every essential git command with plain-English explanations.', keys: 'git github version control commit branch merge commands' },
  { id: 'git-builder', name: 'Git Command Builder', cat: 'coding', icon: 'git', desc: 'Build complex git commands step by step without memorising flags.', keys: 'git command builder flags commit push branch' },
  { id: 'http-status', name: 'HTTP Status Codes', cat: 'coding', icon: 'activity', desc: 'Every HTTP status code explained with what to do about it.', keys: 'http status code 404 500 200 error meaning rest api' },
  { id: 'linux-commands', name: 'Linux Commands', cat: 'coding', icon: 'terminal', desc: 'Searchable reference of the Linux commands you use every day.', keys: 'linux bash shell terminal commands ubuntu unix' },
  { id: 'npm-commands', name: 'npm & Yarn Commands', cat: 'coding', icon: 'box', desc: 'The npm and yarn commands every developer needs, explained.', keys: 'npm yarn node package commands install publish' },
  { id: 'vscode-shortcuts', name: 'VS Code Shortcuts', cat: 'coding', icon: 'monitor', desc: 'Keyboard shortcuts that make you faster in VS Code.', keys: 'vscode shortcuts keyboard editor ide visual studio code' },
  { id: 'python-guide', name: 'Python Cheatsheet', cat: 'coding', icon: 'book', desc: 'Python syntax, built-ins and patterns with runnable examples.', keys: 'python tutorial learn syntax basics examples py' },
  { id: 'js-guide', name: 'JavaScript Cheatsheet', cat: 'coding', icon: 'book', desc: 'Modern JavaScript in one page — syntax, arrays, async and more.', keys: 'javascript js es6 tutorial learn syntax async' },
  { id: 'ts-guide', name: 'TypeScript Cheatsheet', cat: 'coding', icon: 'book', desc: 'Types, interfaces, generics and everyday TypeScript patterns.', keys: 'typescript ts type interface generics learn' },
  { id: 'react-guide', name: 'React Cheatsheet', cat: 'coding', icon: 'book', desc: 'Components, hooks, props and patterns for modern React.', keys: 'react hooks components jsx frontend learn tutorial' },
  { id: 'sql-guide', name: 'SQL Cheatsheet', cat: 'coding', icon: 'database', desc: 'Queries, joins, grouping and indexes explained with examples.', keys: 'sql database query join select mysql postgres learn' },
  { id: 'ds-big-o', name: 'Data Structures & Big-O', cat: 'coding', icon: 'layers', desc: 'Complexity table and when to use arrays, maps, trees and graphs.', keys: 'big o complexity data structures algorithms interview' },
  { id: 'word-meaning', name: 'Dictionary — Word Meaning', cat: 'coding', icon: 'bookOpen', desc: 'Look up any English word: meaning, pronunciation and examples.', keys: 'dictionary meaning definition words english vocabulary' },
  { id: 'translator', name: 'Translator', cat: 'coding', icon: 'languages', desc: 'Translate words and sentences between 30+ languages instantly.', keys: 'translate language meaning hindi spanish french words' },
  { id: 'thesaurus', name: 'Thesaurus — Synonyms', cat: 'coding', icon: 'bookOpen', desc: 'Find synonyms and antonyms to write with the perfect word.', keys: 'synonym antonyms thesaurus words similar meaning vocabulary' },

  /* ─────────────── NEW TOOLS (25) ─────────────── */
  { id: 'pdf-watermark', name: 'PDF Watermark', cat: 'essentials', icon: 'file', desc: 'Stamp any PDF with text watermarks like DRAFT, CONFIDENTIAL or your brand name.', keys: 'pdf watermark stamp draft confidential text overlay' },
  { id: 'pdf-page-numbers', name: 'PDF Page Numbers', cat: 'essentials', icon: 'hash', desc: 'Add page numbers to a PDF with position, colour and custom prefixes.', keys: 'pdf page numbers paginate footer header pages' },
  { id: 'csv-viewer-editor', name: 'CSV Viewer & Editor', cat: 'coding', icon: 'database', desc: 'Open CSV files as a table, edit cells, and export as CSV or JSON.', keys: 'csv editor viewer spreadsheet table rows columns export json' },
  { id: 'qr-batch-generator', name: 'QR Batch Generator', cat: 'essentials', icon: 'qr', desc: 'Generate many QR codes at once from a list, with individual downloads and a contact sheet.', keys: 'batch qr generator multiple codes list sheet png' },
  { id: 'image-colour-extractor', name: 'Image Colour Extractor', cat: 'essentials', icon: 'palette', desc: 'Pull a colour palette from any photo and copy the HEX values instantly.', keys: 'image color colour palette extractor photo hex swatches' },
  { id: 'number-to-words', name: 'Number to Words', cat: 'daily', icon: 'type', desc: 'Turn numbers into English words, including Indian lakh and crore formatting.', keys: 'number to words indian lakh crore cheque writing text' },
  { id: 'gst-calculator', name: 'GST Calculator', cat: 'daily', icon: 'percent', desc: 'Add or remove GST and split tax into CGST and SGST in seconds.', keys: 'gst tax calculator india cgst sgst inclusive exclusive' },
  { id: 'salary-hike-calc', name: 'Salary Hike / Increment Calculator', cat: 'daily', icon: 'dollar', desc: 'Compare your current CTC with a new hike, monthly pay and in-hand estimate.', keys: 'salary hike increment ctc raise appraisal in hand' },
  { id: 'vcard-qr-generator', name: 'vCard QR Generator', cat: 'essentials', icon: 'user', desc: 'Create a contact QR code from your name, phone, email and company details.', keys: 'vcard qr contact card phone email business' },
  { id: 'key-code-detector', name: 'Key Code Detector', cat: 'coding', icon: 'keyboard', desc: 'Press any key to see its key, code, keyCode and modifier state.', keys: 'keydown key code keycode keyboard event detector' },
  { id: 'fancy-text-generator', name: 'Fancy Text Generator', cat: 'daily', icon: 'sparkles', desc: 'Convert plain text into bold, italic, script and aesthetic Unicode styles.', keys: 'fancy text generator unicode bold italic script social bio' },
  { id: 'braille-translator', name: 'Braille Translator', cat: 'coding', icon: 'type', desc: 'Translate text to Braille patterns and basic Braille back to text.', keys: 'braille translator accessibility dots text convert' },
  { id: 'emoji-finder', name: 'Emoji Finder', cat: 'daily', icon: 'smile', desc: 'Search emojis by meaning, keyword or mood and copy them with one click.', keys: 'emoji finder search meaning keyword smile copy' },
  { id: 'regex-library', name: 'Common Regex Library', cat: 'coding', icon: 'search', desc: 'Handy regex patterns for email, URL, phone, date and more — ready to copy and test.', keys: 'regex library patterns email phone url date validation' },
  { id: 'cron-next-run', name: 'Cron Next-Run Calculator', cat: 'coding', icon: 'clock', desc: 'Paste a cron expression and preview the next five run times in your timezone.', keys: 'cron next run calculator schedule crontab preview expression' },
  { id: 'json-to-ts', name: 'JSON → TypeScript Interface', cat: 'coding', icon: 'braces', desc: 'Generate TypeScript interfaces from sample JSON with nested object support.', keys: 'json typescript interface generator types ts models' },
  { id: 'gitignore-generator', name: '.gitignore Generator', cat: 'coding', icon: 'git', desc: 'Build a clean .gitignore from presets like Node, Python, Java and macOS.', keys: 'gitignore generator node python java macos presets' },
  { id: 'packagejson-generator', name: 'package.json Generator', cat: 'coding', icon: 'box', desc: 'Create a valid package.json with scripts, dependencies and metadata.', keys: 'package json generator npm node scripts dependencies' },
  { id: 'readme-generator', name: 'README.md Generator', cat: 'coding', icon: 'fileText', desc: 'Generate a polished README with install, usage, features and license sections.', keys: 'readme generator markdown github project docs' },
  { id: 'linux-permissions', name: 'Linux Permissions Calculator', cat: 'coding', icon: 'shield', desc: 'Toggle read, write and execute permissions to get chmod octal and symbolic values.', keys: 'chmod permissions linux rwx octal symbolic calculator' },
  { id: 'http-methods-headers', name: 'HTTP Methods & Headers Reference', cat: 'coding', icon: 'activity', desc: 'Searchable guide to common HTTP methods, headers and what they are used for.', keys: 'http methods headers reference get post content-type authorization' },
  { id: 'design-patterns', name: 'Design Patterns Cheatsheet', cat: 'coding', icon: 'layers', desc: 'A searchable cheatsheet of common software design patterns and when to use them.', keys: 'design patterns cheatsheet singleton observer strategy factory' },
  { id: 'markdown-cheatsheet', name: 'Markdown Cheatsheet', cat: 'coding', icon: 'fileText', desc: 'Searchable Markdown syntax reference with copy-ready examples.', keys: 'markdown cheatsheet md syntax headings table code block' },
  { id: 'seo-mini-audit', name: 'SEO Mini-Audit', cat: 'internet', icon: 'searchCheck', desc: 'Fetch a URL and score its title, meta description, H1 and Open Graph basics.', keys: 'seo audit meta title description h1 og tags score' },
  { id: 'leap-year-zodiac', name: 'Leap Year & Zodiac Finder', cat: 'daily', icon: 'star', desc: 'Check whether a year is a leap year and discover zodiac signs from a date.', keys: 'leap year zodiac horoscope date sign birth' },

  /* ─────────────── 2026 BATCH (26) ─────────────── */
  /* daily — money, study and everyday maths */
  { id: 'roman-numeral', name: 'Roman Numeral Converter', cat: 'daily', icon: 'hash', desc: 'Convert any number from 1 to 3999 into Roman numerals and back again.', keys: 'roman numeral converter mmxxvi i v x l c d m ancient numbers' },
  { id: 'fraction-calc', name: 'Fraction Calculator', cat: 'daily', icon: 'percent', desc: 'Add, subtract, multiply or divide fractions with simplified and mixed-number answers.', keys: 'fraction calculator add subtract multiply divide simplify mixed number numerator denominator' },
  { id: 'cgpa-percentage', name: 'CGPA ⇄ Percentage Converter', cat: 'daily', icon: 'graduation', desc: 'Convert CGPA to percentage and back using CBSE ×9.5, (CGPA−0.75)×10 or 4.0-scale formulas.', keys: 'cgpa percentage converter cbse 9.5 university grade result marks india' },
  { id: 'attendance-calc', name: 'Attendance Calculator', cat: 'daily', icon: 'listChecks', desc: 'See your attendance percentage, how many classes you can skip and how many you must attend.', keys: 'attendance calculator percentage bunk skip classes college school 75 percent required' },
  { id: 'income-tax-india', name: 'Income Tax Calculator (India)', cat: 'daily', icon: 'dollar', desc: 'Compare the new and old regime for FY 2025-26 and see which one saves you more tax.', keys: 'income tax india calculator new old regime slab fy 2025 26 ay 2026 27 87a rebate cess salary' },
  { id: 'fd-rd-calc', name: 'FD & RD Maturity Calculator', cat: 'daily', icon: 'target', desc: 'Project fixed deposit and recurring deposit maturity with monthly, quarterly or yearly compounding.', keys: 'fd rd fixed deposit recurring deposit maturity calculator interest compound bank post office india' },
  { id: 'unit-price-compare', name: 'Unit Price Comparator', cat: 'daily', icon: 'tag', desc: 'Find out which pack is really cheaper once you compare price per gram, ml or piece.', keys: 'unit price comparator best value deal per gram litre piece shopping grocery compare offer' },
  { id: 'passphrase-gen', name: 'Passphrase Generator', cat: 'daily', icon: 'lock', desc: 'Build memorable, high-entropy passphrases from random words with a strength estimate.', keys: 'passphrase generator diceware words entropy memorable strong security password xkcd' },
  { id: 'rent-affordability', name: 'Rent Affordability Calculator', cat: 'daily', icon: 'home', desc: 'Work out the maximum rent you can comfortably afford from your monthly income.', keys: 'rent affordability calculator 30 percent rule budget house flat deposit metro salary' },
  { id: 'final-exam-calc', name: 'Final Exam Grade Calculator', cat: 'daily', icon: 'graduation', desc: 'Find the score you need on your final exam to hit your target grade — or see if it is still possible.', keys: 'final exam grade calculator target score needed weight percentage college school result' },

  /* internet — addressing and networking */
  { id: 'subnet-calc', name: 'IP Subnet Calculator', cat: 'internet', icon: 'server', desc: 'Split any IPv4 CIDR into network, mask, wildcard, broadcast, host range and usable hosts.', keys: 'subnet calculator cidr ipv4 netmask wildcard broadcast host range network prefix vlsm' },
  { id: 'mac-address-gen', name: 'MAC Address Generator', cat: 'internet', icon: 'cpu', desc: 'Generate random MAC addresses in any format, unicast or multicast, locally administered or not.', keys: 'mac address generator random locally administered multicast unicast vm container testing aa bb cc' },
  { id: 'port-reference', name: 'Common Ports Cheatsheet', cat: 'internet', icon: 'terminal', desc: 'Searchable reference for TCP and UDP ports — SSH, DNS, HTTPS, databases and more.', keys: 'port reference cheatsheet tcp udp 22 80 443 3306 5432 6379 ssh dns http https database firewall' },

  /* essentials — images, colour and design */
  { id: 'image-base64', name: 'Image to Base64', cat: 'essentials', icon: 'binary', desc: 'Turn any image into a Base64 data URI with size, dimensions and a ready CSS rule.', keys: 'image base64 data uri converter encode inline css background png jpg svg' },
  { id: 'image-filters', name: 'Photo Filter Studio', cat: 'essentials', icon: 'paint', desc: 'Apply brightness, contrast, saturation, hue, sepia and grayscale to a photo and download it.', keys: 'photo filter studio image edit brightness contrast saturation sepia grayscale hue invert canvas' },
  { id: 'favicon-generator', name: 'Favicon & App Icon Generator', cat: 'essentials', icon: 'image', desc: 'Turn one logo into 16, 32, 48, 180, 192 and 512px icons plus the HTML to embed them.', keys: 'favicon generator app icon pwa apple touch icon 16 32 180 192 512 logo png manifest' },
  { id: 'aspect-ratio-calc', name: 'Aspect Ratio Calculator', cat: 'essentials', icon: 'monitor', desc: 'Simplify any width and height, scale to a new size, or match 16:9, 4:3, 1:1 and 21:9.', keys: 'aspect ratio calculator 16 9 4 3 1 1 21 9 resize dimensions video image scale simplify' },
  { id: 'colour-blind-sim', name: 'Colour Blindness Simulator', cat: 'essentials', icon: 'eye', desc: 'Preview a colour or a whole screenshot as seen with protanopia, deuteranopia or tritanopia.', keys: 'colour blindness simulator colorblind protanopia deuteranopia tritanopia accessibility a11y design contrast' },
  { id: 'screen-colour-picker', name: 'Screen Colour Picker', cat: 'essentials', icon: 'palette', desc: 'Sample any pixel on your screen and get HEX, RGB, HSL, CMYK and WCAG contrast in one go.', keys: 'screen colour picker eyedropper pixel hex rgb hsl cmyk contrast wcag design' },

  /* coding — converters, diffing and text analysis */
  { id: 'json-diff', name: 'JSON Diff / Compare', cat: 'coding', icon: 'braces', desc: 'Compare two JSON documents and see every added, removed and changed value by path.', keys: 'json diff compare difference two objects api response change detect path' },
  { id: 'html-to-jsx', name: 'HTML to JSX Converter', cat: 'coding', icon: 'code', desc: 'Convert HTML to JSX — class to className, inline styles to objects, void tags self-closed.', keys: 'html to jsx converter react class classname style object self closing tag comment' },
  { id: 'rem-px-conv', name: 'REM ⇄ PX Converter', cat: 'coding', icon: 'ruler', desc: 'Convert px, rem, em, pt, percent, cm, in and mm with your own root font size.', keys: 'rem px converter css em pt percent root font size 16 responsive unit length' },
  { id: 'env-parser', name: '.env Parser & Converter', cat: 'coding', icon: 'settings', desc: 'Parse a .env file into JSON, shell exports or a Markdown table — with secrets masked.', keys: 'env parser dotenv json shell export markdown environment variables config secret mask' },
  { id: 'ascii-art-text', name: 'ASCII Art Text Generator', cat: 'coding', icon: 'type', desc: 'Render text as a 5-row block ASCII banner with your choice of fill character.', keys: 'ascii art text generator banner block figlet readme terminal logo letters' },
  { id: 'unicode-inspector', name: 'Unicode Character Inspector', cat: 'coding', icon: 'sparkles', desc: 'Inspect every character in a string — code point, block, UTF-8 bytes and JS escape.', keys: 'unicode inspector codepoint utf-8 bytes block emoji character html entity escape javascript' },
  { id: 'keyword-density', name: 'Keyword Density Analyzer', cat: 'coding', icon: 'searchCheck', desc: 'Count words and phrases, rank them by density and score a focus keyword for SEO.', keys: 'keyword density analyzer seo word frequency count phrase bigram focus keyword content' },
];

export const TOOL_MAP = Object.fromEntries(TOOLS.map((t) => [t.id, t]));

/** Total number of tools — the single source of truth for every count shown
 *  in the UI, meta tags, sitemap and AI replies. Never hardcode it again. */
export const TOOL_COUNT = TOOLS.length;

export function toolsByCat(cat) {
  return TOOLS.filter((t) => t.cat === cat);
}

/* Attach the live count to each category and resolve the {n} placeholder in
   the blurbs, so category copy can never drift from the real catalog. */
for (const c of CATEGORIES) {
  c.count = toolsByCat(c.id).length;
  if (typeof c.blurb === 'string') c.blurb = c.blurb.replace(/\{n\}/g, c.count);
}

function fuzzyDistance(a = '', b = '') {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  const dp = Array.from({ length: x.length + 1 }, () => Array(y.length + 1).fill(0));
  for (let i = 0; i <= x.length; i++) dp[i][0] = i;
  for (let j = 0; j <= y.length; j++) dp[0][j] = j;
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[x.length][y.length];
}

export function searchTools(query) {
  const q = query.trim().toLowerCase();
  if (!q) return TOOLS;
  const terms = q.split(/\s+/).filter(Boolean);
  return TOOLS.map((t) => {
    const name = t.name.toLowerCase();
    const hay = `${t.name} ${t.desc} ${t.keys} ${t.cat}`.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (name === term) score += 20;
      if (name.startsWith(term)) score += 12;
      if (name.includes(term)) score += 8;
      if (t.id.includes(term)) score += 7;
      if (hay.includes(term)) score += 4;
      for (const token of [name, ...name.split(/\W+/), ...String(t.keys || '').toLowerCase().split(/\s+/)]) {
        if (token && term.length > 2) {
          const dist = fuzzyDistance(term, token.slice(0, Math.max(term.length, token.length)));
          if (dist === 1) score += 5;
          else if (dist === 2) score += 2;
        }
      }
    }
    return { t, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || a.t.name.localeCompare(b.t.name)).map((x) => x.t);
}

/** Compact index used in the AI system prompt */
export function catalogForAI() {
  const byCat = {};
  for (const c of CATEGORIES) {
    byCat[c.id] = toolsByCat(c.id).map((t) => ({ id: t.id, name: t.name, desc: t.desc }));
  }
  return byCat;
}
