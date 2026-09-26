# Deployment Guide — PSDKIT Pro (Vercel + Firebase)

This checklist makes the app **fully live and production ready**.

---

## A. Vercel deployment

### 1. Push code to GitHub
```bash
git add .
git commit -m "feat: PSDKIT Pro"
git push origin main
```

### 2. Import to Vercel
1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository**
2. Select the repo → Framework preset: **Vite** (auto-detected)
3. Build command: `npm run build` · Output directory: `dist` (defaults are correct)
4. **Deploy**

### 3. Environment variables (Settings → Environment Variables)

**Client (needed for Google login + community tools):**
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

**Server (needed for the smart AI assistant):**
```
OPENAI_API_KEY        # from https://platform.openai.com/api-keys
# — or —
GEMINI_API_KEY        # from https://aistudio.google.com/apikey

AI_MODEL              # optional: gpt-4o-mini (default) | gpt-4o | gemini-1.5-flash
```

> Select **Production, Preview and Development** for each variable.
> After adding/changing variables → **Deployments → ⋯ → Redeploy**.

> 💡 Without any AI key the assistant automatically uses its built-in
> knowledge engine (it knows all 150 tools & pages). With a key it becomes
> a full conversational AI. The site never breaks either way.

---

## B. Firebase setup (Google auth + database)

### 1. Create project
[console.firebase.google.com](https://console.firebase.google.com) → **Add project** → disable Analytics if you like → Create.

### 2. Enable Google sign-in
**Build → Authentication → Sign-in method → Google → Enable → Save**

### 3. Create the database
**Build → Firestore Database → Create database → Production mode →** choose the closest region → Create.

### 4. Paste security rules
**Firestore → Rules** → paste everything from [`firestore.rules`](./firestore.rules) → **Publish**.

Rules summary:
- `communityTools`: world-readable, signed-in users can create, only the author can edit/delete their own tool
- Everything else: locked

### 5. Register the web app & copy config
**Project settings ⚙ → General → Your apps → Web `</>`** → nickname `psdkit-pro` → Register.
Copy each value into Vercel:

| Firebase config field | Vercel variable |
|---|---|
| `apiKey` | `VITE_FIREBASE_API_KEY` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` |
| `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` |
| `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` |
| `appId` | `VITE_FIREBASE_APP_ID` |

### 6. Authorize your domains
**Authentication → Settings → Authorized domains → Add domain:**
- `your-project.vercel.app`
- your custom domain (if any)

---

## C. Custom domain (optional)
Vercel → **Settings → Domains → Add** → update nameservers/CNAME at your registrar → SSL is automatic.

---

## D. Production checklist

- [ ] `npm run build` succeeds locally
- [ ] Live site loads, hero video plays, tools work
- [ ] Search & category browsing work
- [ ] Google sign-in pops up and returns to the site
- [ ] Publishing a community tool shows it in the toolbox for logged-out visitors
- [ ] AI button answers with links to site pages
- [ ] Mobile: drawer nav, tool pages and chat feel smooth
- [ ] `firestore.rules` deployed
- [ ] AI key set (or accepted the built-in assistant)

---

## E. Updating
Every push to `main` auto-deploys. To update Firebase rules later — republish in the Firebase console. To rotate AI keys — update the env var and redeploy.

## F. Troubleshooting

| Problem | Fix |
|---|---|
| Google login popup blocked | Make sure the domain is in Firebase → Authentication → Authorized domains |
| "Firebase is not configured" toast | Env vars missing or not prefixed with `VITE_` → recheck + redeploy |
| Community publish fails | Check Firestore rules are published; user must be signed in |
| AI replies are generic | Add `OPENAI_API_KEY` or `GEMINI_API_KEY` and redeploy |
| Build fails | Node 18+ required on Vercel (default is fine); run `npm run build` locally to see errors |
