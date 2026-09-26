/* ============================================================
   Firebase — Google auth + Firestore for community tools.
   Loads only when env config is present (lazy CDN scripts),
   so the site stays fast and works without any backend.
   Env vars (Vercel → Settings → Environment Variables):
     VITE_FIREBASE_API_KEY
     VITE_FIREBASE_AUTH_DOMAIN
     VITE_FIREBASE_PROJECT_ID
     VITE_FIREBASE_STORAGE_BUCKET
     VITE_FIREBASE_MESSAGING_SENDER_ID
     VITE_FIREBASE_APP_ID
   ============================================================ */
import { loadScript } from './ui.js';

const BASE = 'https://www.gstatic.com/firebasejs/10.14.1';

const ENV = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

export const firebaseConfig = {
  apiKey: ENV.VITE_FIREBASE_API_KEY,
  authDomain: ENV.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: ENV.VITE_FIREBASE_PROJECT_ID,
  storageBucket: ENV.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: ENV.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: ENV.VITE_FIREBASE_APP_ID,
};

export const firebaseReady = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

let initPromise = null;
let auth = null;
let db = null;

async function init() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (!firebaseReady) throw new Error('Firebase is not configured');
    await loadScript(`${BASE}/firebase-app-compat.js`);
    await loadScript(`${BASE}/firebase-auth-compat.js`);
    await loadScript(`${BASE}/firebase-firestore-compat.js`);
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    return { auth, db };
  })();
  return initPromise;
}

/* ---------- Auth ---------- */
export async function signInWithGoogle() {
  await init();
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await auth.signInWithPopup(provider);
  return cred.user;
}

export async function signOutUser() {
  await init();
  await auth.signOut();
}

export function onAuth(cb) {
  if (!firebaseReady) { cb(null); return () => { }; }
  let unsub = () => { };
  init().then(({ auth: a }) => {
    unsub = a.onAuthStateChanged(cb);
  }).catch(() => cb(null));
  return () => unsub();
}

export function currentUser() {
  return auth?.currentUser || null;
}

/* ---------- Firestore: community tools ---------- */
const COLLECTION = 'communityTools';

export async function submitCommunityTool({ name, description, category, code, authorName, authorUid }) {
  await init();
  const doc = await db.collection(COLLECTION).add({
    name,
    description,
    category,
    code,
    authorName,
    authorUid,
    createdAt: Date.now(),
    runs: 0,
    featured: false,
  });
  return doc.id;
}

export async function listCommunityTools(limit = 60) {
  if (!firebaseReady) return null;
  try {
    await init();
    const snap = await db.collection(COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    return null;
  }
}

export async function incrementRuns(id) {
  if (!firebaseReady) return;
  try {
    await init();
    await db.collection(COLLECTION).doc(id).update({
      runs: firebase.firestore.FieldValue.increment(1),
    });
  } catch { /* non-critical */ }
}
