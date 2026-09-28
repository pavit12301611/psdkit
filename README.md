# PSDKIT Pro — 201 Free Online Tools

**Every tool you need. Calm design. No login required for the main toolkit.**

PSDKIT Pro is a Vite + vanilla JS toolkit site with **201 browser-based tools**, coding guides, a tech glossary, a floating AI assistant, Google sign-in for community publishing, favourites, recent history, a warm/dim theme toggle, Hindi UI support, and a moderated community toolbox.

## What’s inside

| Area | Count | Highlights |
|---|---:|---|
| Daily tools | 66 | Age, BMI, GST, income tax (India), FD/RD, CGPA, attendance, fractions, rent affordability, passphrases |
| Internet tools | 29 | IP, DNS, headers, subnet/CIDR, MAC generator, ports cheatsheet, UTM builder, SEO mini-audit |
| Essential tools | 36 | QR tools, PDF merge/split/watermark, photo filters, favicon generator, colour-blind simulator, screen picker |
| Coding & learn tools | 70 | Playground, formatters, JSON diff, HTML→JSX, .env parser, ASCII art, Unicode inspector, keyword density |

Counts are derived from `src/data/catalog.js` at runtime (`TOOL_COUNT`), and a test fails if any hardcoded number in the shipped copy drifts from the catalog.

## Major product features

- **Authentication & account UI**
  - `#/signin` page with Firebase-aware Google sign-in
  - smart popup → redirect fallback for mobile / blocked popups
  - profile page with stats, your community tools, edit/delete controls
  - navbar avatar menu and mobile drawer account state
- **Personalisation**
  - favourites on tool cards and tool detail pages
  - recently used tools on home and tools pages
  - typo-tolerant search, recent search chips, `/` and `Ctrl+K`
- **Community toolbox**
  - publish, edit, delete, rate, report
  - a **Community** filter inside the Tools catalogue, crediting the creator on
    every card (name, avatar, and the author's uid on hover) — no run or rating
    counters there; those live in the tool's own modal
  - community tools are also returned by the Tools search box, labelled as such
  - trending sort by runs
  - auto-hide after 3+ reports
  - homepage live community picks with built-in fallback samples
  - admin control center at `#/admin` — dashboard stats, a report queue with
    dismiss, a searchable/sortable tool manager with bulk feature · hide ·
    delete, inline editing (metadata, flags, runs, code + live preview),
    an author directory, a moderation log and JSON export
- **AI assistant**
  - local knowledge fallback always works even with no API keys
  - optional OpenAI / Gemini upgrade through `/api/ai`
  - voice input, new chat, conversation history, typewriter replies, feedback row
  - internal links only — no external links in responses
- **SEO / performance / PWA**
  - dynamic route titles and descriptions
  - JSON-LD for home, help and tool breadcrumbs
  - generated sitemap + robots.txt
  - installable PWA with service worker and generated icons
- **UX / accessibility**
  - real 404 page
  - share row on tool pages
  - keyboard shortcuts modal
  - warm / dim theme
  - scroll progress on guides + back-to-top button
  - skip link, focus-visible styles, focus traps, reduced-motion support
- **Localization**
  - English / Hindi UI toggle via `src/data/i18n.js`

## 2026 batch — 26 new tools

| Category | Tools |
|---|---|
| Daily (10) | Roman Numeral Converter · Fraction Calculator · CGPA ⇄ Percentage · Attendance Calculator · Income Tax Calculator (India, FY 2025-26) · FD & RD Maturity · Unit Price Comparator · Passphrase Generator · Rent Affordability · Final Exam Grade Calculator |
| Internet (3) | IP Subnet Calculator (CIDR) · MAC Address Generator · Common Ports Cheatsheet |
| Essentials (6) | Image to Base64 · Photo Filter Studio · Favicon & App Icon Generator · Aspect Ratio Calculator · Colour Blindness Simulator · Screen Colour Picker |
| Coding (7) | JSON Diff / Compare · HTML to JSX · REM ⇄ PX Converter · .env Parser & Converter · ASCII Art Text Generator · Unicode Character Inspector · Keyword Density Analyzer |

Every new tool has an AI-assistant intent, so asking the assistant about income tax, subnets, CGPA, favicons or JSON diffs links straight to the right page.

## No CDN dependencies

Every third-party library is vendored through npm and code-split into its own lazily-fetched chunk by Vite, served from our own origin:

| Library | Used by |
|---|---|
| `qrcode` · `jsqr` | QR generator, Wi-Fi QR, vCard QR, QR batch sheet, QR scanner |
| `pdf-lib` · `pdfjs-dist` | PDF merge/split/watermark/page numbers, images → PDF, PDF → image |
| `marked` · `turndown` · `js-beautify` | Markdown preview, Markdown ⇄ HTML, HTML/CSS/JS formatters |

`src/tools/libs.js` is the single place that knows about them. It used to be `<script src="https://cdn.jsdelivr.net/…">` injected on demand — when that request failed (blocked network, CDN outage, offline PWA, corporate proxy) the QR, PDF and formatter tools died with `Failed to load <url>` and could not recover. They now load from the same origin as everything else and work offline once cached.

Two libraries were also made unnecessary:

- **Hashing** uses Web Crypto when available and a pure-JS SHA-1/256/512 otherwise. `crypto.subtle` only exists in a secure context, so over plain HTTP (a LAN IP, a dev box on a phone) the checksum tools used to throw. Both paths are verified against `node:crypto` in the test suite.
- **Colour parsing** no longer round-trips through `canvas.fillStyle`, which silently reported black for any input the browser rejected. `parseColour()` handles hex, `rgb()`, `hsl()` and CSS names directly; the canvas is only a fallback for names outside that table.

## Text-fit work in this upgrade

Text used to escape its box in several places — stat tiles, result headers, tables and long tokens. Both root causes are now fixed in CSS and guarded by a test:

1. **Flex/grid children default to `min-width: auto`**, so they refuse to shrink below their longest word and push through the parent border. Every layout container now zeroes it.
2. **Long unbreakable tokens** (URLs, hashes, slugs, Base64, emails) never wrap unless asked. Result outputs, notes, stat values, breadcrumbs and chat bubbles now break them.

Also fixed: `.result-head` wraps instead of overflowing, `.stat` tiles clamp and scale their value, wide tables scroll inside `.table-scroll`, `.hero-h1 em` only refuses to wrap on screens wide enough for it, and stat values that were full sentences (a raw `Date.toString()`) were reshaped into short ones.

## Earlier upgrade

1. PDF Watermark  
2. PDF Page Numbers  
3. CSV Viewer & Editor  
4. QR Batch Generator  
5. Image Colour Extractor  
6. Number to Words  
7. GST Calculator  
8. Salary Hike / Increment Calculator  
9. vCard QR Generator  
10. Key Code Detector  
11. Fancy Text Generator  
12. Braille Translator  
13. Emoji Finder  
14. Common Regex Library  
15. Cron Next-Run Calculator  
16. JSON → TypeScript Interface  
17. .gitignore Generator  
18. package.json Generator  
19. README.md Generator  
20. Linux Permissions Calculator  
21. HTTP Methods & Headers Reference  
22. Design Patterns Cheatsheet  
23. Markdown Cheatsheet  
24. SEO Mini-Audit  
25. Leap Year & Zodiac Finder

## Local development

```bash
npm ci
npm run dev
npm test
npm run build
```

## Environment variables

Copy `.env.example` to `.env` for local testing if needed. Keep real secrets out of git.

### Server only
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `AI_MODEL` (optional, defaults in code when blank)

### Client / public Firebase config
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

These are baked into the bundle at build time. If a deployment ships without them,
sign-in, publishing, ratings and moderation are all disabled — the site says so on
`#/signin` and `#/community/add` rather than pretending. To switch a static
deployment on **without a rebuild**, set the same public values on `window`
before the bundle loads, in `index.html`:

```html
<script>
  window.PSDKIT_FIREBASE_CONFIG = {
    apiKey: '…', authDomain: '….firebaseapp.com', projectId: '…',
    storageBucket: '….appspot.com', messagingSenderId: '…', appId: '…',
  };
</script>
```

These are the standard public Firebase web-config fields, not secrets.

### Optional local deploy helper
- `VERCEL_TOKEN`

## Scripts

- `npm run dev` — Vite dev server
- `npm test` — jsdom smoke suite, the community flow suite **plus** the audits (all must pass)
- `npm run test:smoke` — jsdom smoke suite only
- `npm run test:community` — publishes a tool end to end against an in-memory Firestore double
- `npm run audit` — text-fit audit only
- `npm run audit:tools` — deep tool auditor, `--mode=healthy|hostile`, `--only=<id>` to iterate on one tool
- `npm run audit:browser` — **opt-in** real-Chromium audit, `--url=http://localhost:5173`
- `npm run build` — generates sitemap/robots then builds production assets
- `npm run preview` — preview the production build

### Community tools troubleshooting

A published tool can only be missing from a list if the read failed, so the reads
no longer hide it. `src/firebase.js` returns `{ tools, error }` (and
`{ tool, error }` for a single document) instead of `null`/`[]`, logs the real
error with `console.error`, and `src/pages/community.js` turns a failure into a
visible banner plus a one-time toast instead of three silent sample cards.

| Symptom on screen | Meaning | Fix |
|---|---|---|
| `Publishing is disabled. Firebase is not configured — missing …` | no `VITE_FIREBASE_*` values in the build | set them in Vercel and redeploy, or set `window.PSDKIT_FIREBASE_CONFIG` |
| `Community tools could not load … Firestore rules blocked this` | rules not deployed, or a collection is locked | Firebase console → Firestore → Rules, paste [`firestore.rules`](./firestore.rules) |
| `… requires an index` | a composite index is missing for the query that just ran | open the `console.error` link, or `firebase deploy --only firestore:indexes` |
| `Google sign-in did not complete` | provider off, or the domain is not authorised | Authentication → Sign-in method → Google; add the domain to Authorised domains |

The profile's **My tools** query deliberately avoids a composite index: it filters
on `authorUid` (an automatic single-field index) and sorts newest-first in memory.
`firestore.indexes.json` still declares the `authorUid + createdAt` index for
server-side and admin queries, but a fresh Firestore database works without it.

### What the audits check

`scripts/audit-tools.mjs` is the deepest one: it does not merely mount each tool, it **operates** it. Every field is filled with a realistic value (inferred from the field's id, label and placeholder), every button is clicked, and anything escaping as an exception, an unhandled rejection or a `console.error` is attributed to the tool that caused it. It runs twice:

- **healthy** — network answers with plausible canned data per API, canvas works
- **hostile** — `fetch` rejects, `getContext('2d')` returns `null`, the camera is denied, `crypto.subtle` is absent

The hostile pass is the one that matters. A tool is allowed to fail to do its job when the network is down; it is not allowed to throw at the user. That pass is what caught six tools crashing on a null canvas context and the checksum tool crashing without `crypto.subtle`.

`scripts/smoke.mjs` mounts all 201 tools and every page in jsdom, then asserts:

- catalog ↔ implementation parity, unique ids, known icons, real descriptions and keywords
- the AI assistant answers for each new tool and links to the right page
- no hardcoded tool count anywhere in shipped copy (`TOOL_COUNT` is the only source)
- `el()` assigns `value` / `checked` as DOM properties, not attributes
- the CSV viewer renders an editable table inside a scroll wrapper
- no stat tile is handed a value too long for its box
- SHA-1/256/512 match `node:crypto` on **both** the Web Crypto path and the pure-JS fallback, across every block-boundary length
- file checksums digest the actual bytes (two different files must not collide)
- the colour parser reads hex, `rgb()`, `hsl()` and CSS names, and rejects junk
- the QR pipeline round-trips — a payload is encoded, rendered to raw pixels and decoded back to the same text
- the vendored libraries genuinely work: pdf-lib emits a real `%PDF-` document, marked/turndown/beautifiers produce correct output
- no tool pulls a library from a CDN, no tool calls `getContext` without the null-safe helper, and no handler reads `e.currentTarget` after an `await`

### The real-browser audit

`scripts/audit-browser.mjs` measures what Chromium actually painted rather than modelling it. It drives the site with puppeteer-core, visits all 201 tools and 13 pages at three viewports (390 / 768 / 1280), fills every field so live-computing tools render their real output, and reports:

- **page-scrolls-sideways** — the whole document is wider than the viewport
- **text-escapes-box** — content wider than its own box while `overflow-x` is still `visible`, so nothing clips or scrolls it
- **text-cut-off** — content reaching past an `overflow:hidden` ancestor, i.e. silently truncated
- **markup-shown-as-text** — raw HTML painted as visible text
- **runtime-error** — any uncaught exception, console error or failed same-origin request

A finding counts only when the content crosses the *visible bound* — the viewport edge or the nearest clipping ancestor, whichever comes first. A decorative badge sitting 5px past its own container but still inside the page is not a defect, and a swipeable `.ai-chips` row whose children run off-screen is working as designed. The detector is checked against deliberately injected defects so it cannot silently go blind.

Getting a browser here took some doing: Playwright's and Puppeteer's installers download from `cdn.playwright.dev` and `storage.googleapis.com`, neither of which is reachable — only the npm registry is. `@sparticuz/chromium` ships the Chromium binary *inside its npm tarball*, so it installs from the registry alone. That build links against NSS/NSPR (`libnss3`, `libnspr4`, `libnssutil3`), which are absent and cannot be apt-installed; the package also ships an `al2023.tar.br` bundle containing exactly those libraries, so `scripts/browser.mjs` decompresses it with Node's built-in brotli and points `LD_LIBRARY_PATH` at it. No system packages required.

`scripts/audit-overflow.mjs` runs a small layout model over every tool at seven viewport widths (360 → 1440). It estimates text advance widths per character, compares them against the width the real CSS gives each container, and reports two levels:

- **HARD** — text that genuinely cannot fit its box (fails the run)
- **SOFT** — text that fits but wraps into an unreadable block (warning)

Because jsdom has no layout engine, the model encodes `src/styles/*.css`. If you change wrapping or grid behaviour there, update the tables in the auditor. It runs in the default `npm test`; the Chromium audit above is the ground truth when you can run it.

It found what the model could not: the flexbox playground's `flex-wrap:nowrap` demo widened every ancestor up to `<html>` and made the whole page scroll sideways on phones (`.canvas-stage` now scrolls its own overflow), and the home hero's scroll cue passed `icon()` — an HTML *string* — as a bare child of `el()`, which stringifies children into text nodes. That painted ~300 characters of raw `<svg>` source on screen and, with `width:max-content`, blew the element out to 1761px and broke its auto-margin centering.

## Project structure

```text
api/ai.js                    AI endpoint with OpenAI/Gemini + safe fallback
public/                      logo, PWA files, sitemap, robots
scripts/gen-sitemap.mjs      sitemap generator (derived from the catalog)
scripts/smoke.mjs            smoke tests for tools + pages + count drift
scripts/audit-overflow.mjs   text-fit layout auditor
scripts/audit-tools.mjs      deep tool auditor (healthy + hostile passes)
scripts/audit-browser.mjs    real-Chromium layout + error audit (opt-in)
scripts/browser.mjs          Chromium launcher, incl. the NSS library bootstrap
scripts/jsdom-env.mjs        shared jsdom environment for both auditors
src/ai/                      chat UI + local knowledge brain
src/data/catalog.js          all tool records + TOOL_COUNT
src/data/guides.js           guides + glossary
src/data/i18n.js             EN / Hindi UI strings
src/firebase.js              optional Firebase auth + Firestore helpers
src/pages/                   home, tools, learn, community, help, signin, profile, admin, 404
src/prefs.js                 favourites, theme, recent history, feedback
src/seo.js                   dynamic meta tags + JSON-LD
src/tools/                   tool implementations by shelf
src/tools/extras.js          the 2026 batch (26 tools)
src/tools/libs.js            vendored third-party libraries (lazy chunks)
src/tools/formkit.js         declarative fields + compute engine
src/styles/                  design system, hero/tool pages, product layer
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the exact **Vercel env var checklist**, Firebase setup, admin UID note, and post-deploy verification steps.

## Privacy

- Most tools run entirely in the browser.
- Community tools run in a sandboxed iframe.
- `/api/ai` safely falls back when no keys exist.
- No API keys are hardcoded in this repo.

## License

MIT
