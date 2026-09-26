# PSDKIT Pro — 175 Free Online Tools

**Every tool you need. Calm design. No login required for the main toolkit.**

PSDKIT Pro is a Vite + vanilla JS toolkit site with **175 browser-based tools**, coding guides, a tech glossary, a floating AI assistant, Google sign-in for community publishing, favourites, recent history, a warm/dim theme toggle, Hindi UI support, and a moderated community toolbox.

## What’s inside

| Area | Count | Highlights |
|---|---:|---|
| Daily tools | 56 | Age, BMI, GST, salary hike, number-to-words, leap year & zodiac, notes, todo, timers |
| Internet tools | 26 | IP, DNS, headers, website status, UTM builder, page weight, SEO mini-audit |
| Essential tools | 30 | QR tools, PDF merge/split/watermark/page numbers, image tools, palette extraction, voice/screen tools |
| Coding & learn tools | 63 | Playground, formatters, regex, cron, JSON → TS, .gitignore, package.json, README generator, references |

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
  - trending sort by runs
  - auto-hide after 3+ reports
  - homepage live community picks with built-in fallback samples
  - admin moderation page at `#/admin`
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

## New tools added in this upgrade

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

### Optional local deploy helper
- `VERCEL_TOKEN`

## Scripts

- `npm run dev` — Vite dev server
- `npm test` — jsdom smoke suite
- `npm run build` — generates sitemap/robots then builds production assets
- `npm run preview` — preview the production build

## Project structure

```text
api/ai.js                    AI endpoint with OpenAI/Gemini + safe fallback
public/                      logo, PWA files, sitemap, robots
scripts/gen-sitemap.mjs      sitemap generator
scripts/smoke.mjs            smoke tests for tools + pages
src/ai/                      chat UI + local knowledge brain
src/data/catalog.js          all 175 tool records
src/data/guides.js           guides + glossary
src/data/i18n.js             EN / Hindi UI strings
src/firebase.js              optional Firebase auth + Firestore helpers
src/pages/                   home, tools, learn, community, help, signin, profile, admin, 404
src/prefs.js                 favourites, theme, recent history, feedback
src/seo.js                   dynamic meta tags + JSON-LD
src/tools/                   tool implementations by shelf
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
