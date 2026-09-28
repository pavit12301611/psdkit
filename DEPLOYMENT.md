# Deployment Guide — PSDKIT Pro

This app is designed to work in two modes:

1. **No keys set yet** → the toolkit still works, the AI falls back to the local knowledge brain, and Firebase-powered community/account features show friendly degraded states.
2. **Keys set in Vercel + redeployed** → Google sign-in, Firestore community features, and upgraded AI replies all turn on automatically.

---

# 🔑 PASTE YOUR KEYS HERE

## Step 1 — Vercel dashboard

Go to **Vercel dashboard → your project → Settings → Environment Variables**.
Add **every variable below** with scope **Production + Preview**, then **Redeploy**.

| Variable name | Where to find the value | Where to paste it |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI dashboard → API keys | Vercel → Settings → Environment Variables |
| `GEMINI_API_KEY` | Google AI Studio → API keys | Vercel → Settings → Environment Variables |
| `AI_MODEL` | Optional custom model name, otherwise leave blank and code defaults automatically | Vercel → Settings → Environment Variables |
| `VITE_FIREBASE_API_KEY` | Firebase console → Project settings → Your apps → Web app config → `apiKey` | Vercel → Settings → Environment Variables |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase console → Web app config → `authDomain` | Vercel → Settings → Environment Variables |
| `VITE_FIREBASE_PROJECT_ID` | Firebase console → Web app config → `projectId` | Vercel → Settings → Environment Variables |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase console → Web app config → `storageBucket` | Vercel → Settings → Environment Variables |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase console → Web app config → `messagingSenderId` | Vercel → Settings → Environment Variables |
| `VITE_FIREBASE_APP_ID` | Firebase console → Web app config → `appId` | Vercel → Settings → Environment Variables |
| `VERCEL_TOKEN` | Optional, only if you personally want to use the Vercel CLI from a terminal | Vercel or local shell only |

### Exact user steps
1. **Vercel dashboard → project → Settings → Environment Variables → Add each variable (scope: Production + Preview) → Redeploy.**
2. **Terminal alternative (run locally):** `npx vercel env add OPENAI_API_KEY` and repeat for each variable.
3. **Firebase console:** enable Google sign-in, create Firestore, paste `firestore.rules`, add the `.vercel.app` domain to **Authentication → Authorized domains**.

---

## Step 2 — Terminal alternative

If you prefer the CLI locally, run:

```bash
npx vercel env add OPENAI_API_KEY
npx vercel env add GEMINI_API_KEY
npx vercel env add AI_MODEL
npx vercel env add VITE_FIREBASE_API_KEY
npx vercel env add VITE_FIREBASE_AUTH_DOMAIN
npx vercel env add VITE_FIREBASE_PROJECT_ID
npx vercel env add VITE_FIREBASE_STORAGE_BUCKET
npx vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID
npx vercel env add VITE_FIREBASE_APP_ID
```

Then redeploy:

```bash
npx vercel --prod
```

---

## Step 3 — Firebase setup

### A. Create the Firebase project
- Firebase console → **Add project**
- Open **Project settings**
- Register a **Web app**
- Copy the config values into the `VITE_FIREBASE_*` variables above

### B. Enable Google sign-in
- Firebase console → **Authentication**
- **Sign-in method** → **Google** → Enable

### C. Create Firestore
- Firebase console → **Firestore Database**
- Create database in production mode
- Open the **Rules** tab
- Paste the contents of [`firestore.rules`](./firestore.rules)
- Publish

> **Rules that live in the repo are not rules that are live.** Until you publish
> them, a fresh database denies every write, and "I published it and nothing
> happened" is the symptom. Check the Rules tab after any project change.

### D. Authorized domains
Add your deployed domain(s):
- `your-project.vercel.app`
- any custom domain you connect later

### E. Composite indexes (optional)
The client does **not** need one: "my tools" filters on `authorUid` and sorts in
memory, so a brand-new database works as soon as the rules are published. If you
want the index anyway — for admin or future server-side queries — publish
[`firestore.indexes.json`](./firestore.indexes.json) with:

```bash
firebase deploy --only firestore:indexes
```

If a query ever does need one, Firestore returns a `failed-precondition` error
containing a console link; the app logs that error verbatim under
`[psdkit] Firestore …` and shows a banner instead of silently falling back.

---

## Step 4 — Admin / moderation setup

The admin page reads the Firestore collection:

```text
admins/{uid}
```

To make yourself an admin:
1. Sign in once on the live site.
2. Copy your Firebase Auth UID from the console / user record.
3. In Firestore, create a document in the `admins` collection with the document ID set to your UID.
4. Visit `#/admin`.

The document can be empty; only the UID/doc id matters.

---

## Step 5 — What works before keys exist?

Even with **no keys set**:
- the main 201-tool toolkit still works
- `/api/ai` returns a safe fallback signal
- the client-side local AI brain still answers naturally
- sign-in/community areas show friendly fallback states instead of breaking

Once you add the keys and redeploy, the upgraded behaviour switches on automatically.

---

## Step 6 — Verification after redeploy

After you add the keys and click **Redeploy**, verify in this order:

### A. AI
1. Open the live site
2. Open the chat button
3. Ask: **“How do I merge a PDF?”**
4. Confirm you get a natural reply with internal site links

### B. Google sign-in
1. Go to `#/signin`
2. Click **Continue with Google**
3. Confirm you return to the page you came from
4. Confirm the navbar now shows your avatar + profile menu

### C. Community / Firestore
1. Go to `#/community/add`
2. Publish a small sample tool
3. Confirm it appears on `#/community` **and** in `#/profile` → *Your community tools*
4. Rate it, report it from another account if needed, and confirm the profile/admin flows work

If the tool does not show up, the page now tells you why instead of showing
samples — a banner names the cause (rules / index / config) and the full error is
in the browser console under `[psdkit] Firestore …`. The troubleshooting table in
[README.md](./README.md#community-tools-troubleshooting) maps each banner to its fix.

Remember that community tools show up in three places: `#/community`, the **Community**
filter in the `#/tools` catalogue, and the author's profile — plus the home page's
community strip. The catalogue card credits the creator and deliberately shows no run
or rating counter; those live in the tool's own modal.

### D. PWA / SEO
- Check `manifest.webmanifest` loads
- Check `robots.txt` and `sitemap.xml` are live
- On mobile, confirm the install prompt can appear

---

## Notes

- `.env` stays gitignored.
- `.env.example` contains variable names only with empty values.
- Never hardcode secrets in source files, docs, screenshots or fixtures.
- `OPENAI_API_KEY` / `GEMINI_API_KEY` are server-side only.
- `VITE_FIREBASE_*` values are expected public Firebase web config values.

---

## Local quality checks

Run before pushing:

```bash
npm ci
npm test
npm run build
```

## CI

GitHub Actions runs on push and pull request:

```bash
npm ci
npm test
npm run build
```
