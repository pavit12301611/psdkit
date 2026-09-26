# PSDKIT Pro — 150+ Free Online Tools

**Every tool you need. No login. Free forever.**

PSDKIT Pro is a fast, pastel-calm toolkit website with **150 fully working tools** that run straight in the browser — built for tech-savvy users and beginners alike, with plain-English guides and an AI assistant that knows every page of the site.

| Shelf | Count | Examples |
|---|---|---|
| 🟠 **Daily Tools** | 50 | Age calculator, BMI, EMI, currency converter, unit converters, timers, password generator, notes, todo list |
| 🔵 **Internet Tools** | 25 | IP lookup, DNS lookup, speed test, HTTP headers, meta tag generator, WHOIS, CORS checker, API tester |
| 🟢 **Essential Tools** | 25 | QR codes, PDF merge/split, image compressor, colour picker, voice/screen recorder, whiteboard |
| 🟣 **Coding & Learn** | 50 | Code playground, formatters, regex tester, JWT decoder, git cheatsheets, dictionary, translator, thesaurus |

Plus:
- 📖 **Learning guides** for Python, JavaScript, TypeScript, Java, C/C++, Go, Rust, SQL, HTML & CSS, React, Node.js and Git — with word meanings explained
- 📗 **Tech glossary** — 65+ tech words in plain English
- 🤖 **PSDKIT AI assistant** (bottom-right) — answers naturally and links you to the right pages *of this site*
- 🧰 **Community Toolbox** — anyone can publish a tool (name + description + code), like open source
- 📱 Fully mobile-optimised · ⚡ No lag · 🔒 Privacy-first (files never leave your browser)

---

## Quick start (local)

```bash
npm install
npm run dev        # → http://localhost:5173
npm run build      # production build in /dist
npm run preview    # preview the production build
```

## Tech stack

- **Vite + vanilla JS (ES modules)** — zero framework overhead, instant loads, buttery on mobile
- **Custom CSS design system** — warm cream palette (`#F5EFE6`), flat pastels, Plus Jakarta Sans + Instrument Serif
- **Firebase** — Google sign-in + Firestore for the Community Toolbox (optional — site works fully without it)
- **Vercel** — hosting + serverless `/api/ai` function for the AI assistant
- Heavy libraries (qrcode, pdf-lib, pdf.js, js-beautify…) lazy-load **only when a tool opens**

---

## 🚀 Deploy to Vercel & connect Firebase (step-by-step)

### 1. Push to GitHub

```bash
git add .
git commit -m "PSDKIT Pro"
git push origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import your GitHub repo → Vercel auto-detects **Vite**
3. Click **Deploy** — done, the site is live on `your-project.vercel.app`

### 3. Add environment variables (Vercel)

In your project: **Settings → Environment Variables** → add these (all optional but recommended):

| Variable | Where it's used | Purpose |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Browser | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Browser | e.g. `your-app.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Browser | e.g. `your-app` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Browser | e.g. `your-app.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Browser | Numeric sender ID |
| `VITE_FIREBASE_APP_ID` | Browser | Firebase app ID |
| `OPENAI_API_KEY` | Server (secret) | Powers the AI assistant (GPT) |
| `GEMINI_API_KEY` | Server (secret) | Alternative: Google Gemini |
| `AI_MODEL` | Server (optional) | Default `gpt-4o-mini` (or e.g. `gemini-1.5-flash`) |

> ⚠️ Client variables **must** start with `VITE_` so Vite can expose them. The server-side AI keys are **never** exposed to the browser.
> After adding variables: **Deployments → ⋯ → Redeploy** so the build picks them up.

### 4. Create the Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**
2. **Build → Authentication → Get started → Sign-in method → Google → Enable**
3. **Build → Firestore Database → Create database** (production mode)
4. **Firestore → Rules** → paste the contents of [`firestore.rules`](./firestore.rules) → **Publish**
5. **Project settings (⚙) → General → Your apps → Web (`</>`)** → register app `psdkit-pro` → copy the `firebaseConfig` values into the six `VITE_FIREBASE_*` variables above
6. **Authentication → Settings → Authorized domains** → add:
   - `your-project.vercel.app`
   - your custom domain (if any)

### 5. Configure the AI assistant (optional but recommended)

- **OpenAI**: add `OPENAI_API_KEY` (from platform.openai.com) — recommended model `gpt-4o-mini`
- **or Google Gemini**: add `GEMINI_API_KEY` (from aistudio.google.com)
- Without any key the assistant still works — it uses the built-in knowledge engine that knows all 150 tools and pages.

### 6. Custom domain (optional)

Vercel → **Settings → Domains** → add your domain → follow the DNS instructions.

### 7. Verify everything

- [ ] Tools work without login on the live URL
- [ ] Google sign-in works on your `.vercel.app` domain
- [ ] Publishing a community tool appears in the Community Toolbox
- [ ] The AI button (bottom right) answers and links to site pages
- [ ] Mobile layout feels smooth on a phone

---

## Project structure

```
psdkit/
├── api/ai.js              # Vercel function — AI assistant (OpenAI/Gemini)
├── public/logo.png        # Site logo
├── firestore.rules        # Firestore security rules
├── index.html
├── src/
│   ├── main.js            # App shell: nav, footer, boot
│   ├── router.js          # Hash router (#/tool/:id, #/learn/:id …)
│   ├── ui.js              # DOM helpers, toasts, formatting
│   ├── icons.js           # Inline SVG icon set (zero CDN)
│   ├── firebase.js        # Google auth + Firestore (lazy, optional)
│   ├── data/
│   │   ├── catalog.js     # All 150 tool definitions (shared with AI)
│   │   └── guides.js      # Coding guides + tech glossary content
│   ├── tools/             # Tool implementations (150)
│   │   ├── formkit.js     # Declarative calculator/converter engine
│   │   ├── daily.js       # 50 daily tools
│   │   ├── internet.js    # 25 internet tools
│   │   ├── essentials.js  # 25 essential tools
│   │   └── coding.js      # 50 coding & learn tools
│   ├── pages/             # home, tools, learn, community, help
│   ├── ai/                # chat UI + local knowledge engine
│   └── styles/            # design system (cream / pastel theme)
└── vercel.json
```

## Adding a new tool (for developers)

1. Add metadata to `src/data/catalog.js`:
   ```js
   { id: 'my-tool', name: 'My Tool', cat: 'daily', icon: 'zap',
     desc: 'One-line description.', keys: 'search keywords here' }
   ```
2. Add the implementation to the matching `src/tools/*.js`:
   ```js
   'my-tool': {
     fields: [ { id: 'x', label: 'Input', type: 'number', default: 1 } ],
     compute(v) {
       return { title: 'Result', text: `Answer: ${v.x * 2}` };
     },
   },
   // — or fully custom UI —
   'my-tool': { mount(container) { container.append(/* DOM */); } },
   ```
3. That's it — it appears in search, browse, the footer and the AI assistant automatically.

## Community tools (open-source style)

Anyone can publish a tool via **Community → Publish a tool** (Google sign-in):
- Name + short description + HTML/CSS/JS code
- Runs for everyone in a **sandboxed iframe** (no access to the site or your data)
- Stored in Firestore `communityTools` collection with author credit

## Privacy

- 100+ tools run entirely client-side — files, text and passwords never leave the device
- Network tools fetch only the public data you request (IP info, DNS, dictionary, rates)
- The AI assistant sends only your chat message to the AI provider (when configured)
- No tracking, no ads, no analytics

## License

MIT — use it, fork it, build on it.
