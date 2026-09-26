/* ============================================================
   Firebase — Google auth + Firestore for community tools.
   Loads only when env config is present, so the site still works
   with no backend. Auth uses popup first and falls back to redirect
   on mobile or popup-blocked browsers.
   ============================================================ */
import { loadScript } from './ui.js';

const BASE = 'https://www.gstatic.com/firebasejs/10.14.1';
const ENV = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
const RETURN_KEY = 'psdkit_auth_return';
const COLLECTION = 'communityTools';
const RATINGS = 'communityToolRatings';
const REPORTS = 'communityToolReports';
const ADMINS = 'admins';

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
let redirectHandled = false;
let auth = null;
let db = null;
let lastUser = null;

function setReturnTo(hash) {
  try { sessionStorage.setItem(RETURN_KEY, hash || location.hash || '#/'); } catch { /* ignore */ }
}
function takeReturnTo() {
  try {
    const value = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    return value;
  } catch {
    return null;
  }
}
function isMobileLike() {
  return /Android|iPhone|iPad|Mobile|Opera Mini/i.test(navigator.userAgent || '') || matchMedia?.('(pointer: coarse)')?.matches;
}

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
    if (!redirectHandled) {
      redirectHandled = true;
      try {
        const res = await auth.getRedirectResult();
        if (res?.user) {
          const target = takeReturnTo();
          if (target && target !== location.hash) location.hash = target;
        }
      } catch {
        /* ignore redirect issues */
      }
    }
    return { auth, db };
  })();
  return initPromise;
}

function emitAuth(user) {
  lastUser = user || null;
  window.dispatchEvent(new CustomEvent('psdkit:auth', { detail: lastUser }));
}

/* ---------- Auth ---------- */
export async function signInWithGoogle({ returnTo } = {}) {
  await init();
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  setReturnTo(returnTo || location.hash || '#/');
  if (isMobileLike()) {
    await auth.signInWithRedirect(provider);
    return null;
  }
  try {
    const cred = await auth.signInWithPopup(provider);
    const target = takeReturnTo();
    if (target && target !== location.hash) location.hash = target;
    return cred.user;
  } catch (error) {
    const code = String(error?.code || '');
    if (/popup-blocked|popup-closed-by-user|cancelled-popup-request|web-storage-unsupported/.test(code)) {
      await auth.signInWithRedirect(provider);
      return null;
    }
    throw error;
  }
}

export async function signOutUser() {
  await init();
  await auth.signOut();
}

export function onAuth(cb) {
  if (!firebaseReady) {
    cb(null);
    return () => { };
  }
  let unsub = () => { };
  init().then(({ auth: a }) => {
    unsub = a.onAuthStateChanged((user) => {
      emitAuth(user);
      cb(user || null);
    });
  }).catch(() => cb(null));
  return () => unsub();
}

export function currentUser() {
  return auth?.currentUser || lastUser || null;
}

export async function isAdmin(uid = currentUser()?.uid) {
  if (!firebaseReady || !uid) return false;
  try {
    await init();
    const snap = await db.collection(ADMINS).doc(uid).get();
    return snap.exists;
  } catch {
    return false;
  }
}

/* ---------- Firestore helpers ---------- */
function normalizeTool(doc, ratingsMap = {}, reportsMap = {}) {
  const data = doc.data ? doc.data() : doc;
  const rate = ratingsMap[data.id || doc.id] || { count: 0, avg: 0, mine: 0 };
  const report = reportsMap[data.id || doc.id] || { count: 0, mine: false };
  return {
    id: doc.id || data.id,
    ...data,
    ratingCount: rate.count,
    ratingAvg: rate.avg,
    myRating: rate.mine || 0,
    reportCount: report.count,
    reportedByMe: report.mine || false,
    hidden: Boolean(data.hidden) || report.count >= 3,
  };
}

async function fetchRatingsMap(uid) {
  const snap = await db.collection(RATINGS).limit(1000).get();
  const map = {};
  snap.docs.forEach((doc) => {
    const data = doc.data();
    if (!map[data.toolId]) map[data.toolId] = { total: 0, count: 0, mine: 0 };
    map[data.toolId].total += Number(data.value || 0);
    map[data.toolId].count += 1;
    if (uid && data.uid === uid) map[data.toolId].mine = Number(data.value || 0);
  });
  Object.values(map).forEach((entry) => {
    entry.avg = entry.count ? +(entry.total / entry.count).toFixed(1) : 0;
  });
  return map;
}

async function fetchReportsMap(uid) {
  const snap = await db.collection(REPORTS).limit(1000).get();
  const map = {};
  snap.docs.forEach((doc) => {
    const data = doc.data();
    if (!map[data.toolId]) map[data.toolId] = { count: 0, mine: false, items: [] };
    map[data.toolId].count += 1;
    if (uid && data.uid === uid) map[data.toolId].mine = true;
    map[data.toolId].items.push({ id: doc.id, ...data });
  });
  return map;
}

/* ---------- Community tools ---------- */
export async function submitCommunityTool({ name, description, category, code, authorName, authorUid, authorEmail, authorPhotoURL }) {
  await init();
  const doc = await db.collection(COLLECTION).add({
    name,
    description,
    category,
    code,
    authorName,
    authorUid,
    authorEmail: authorEmail || '',
    authorPhotoURL: authorPhotoURL || '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    runs: 0,
    featured: false,
    hidden: false,
  });
  return doc.id;
}

export async function updateCommunityTool(id, patch) {
  if (!firebaseReady) throw new Error('Firebase is not configured');
  await init();
  await db.collection(COLLECTION).doc(id).update({ ...patch, updatedAt: Date.now() });
}

export async function deleteCommunityTool(id) {
  if (!firebaseReady) throw new Error('Firebase is not configured');
  await init();
  await db.collection(COLLECTION).doc(id).delete();
}

export async function getCommunityTool(id, uid = currentUser()?.uid) {
  if (!firebaseReady || !id) return null;
  try {
    await init();
    const [doc, ratingsMap, reportsMap] = await Promise.all([
      db.collection(COLLECTION).doc(id).get(),
      fetchRatingsMap(uid),
      fetchReportsMap(uid),
    ]);
    if (!doc.exists) return null;
    return normalizeTool(doc, ratingsMap, reportsMap);
  } catch {
    return null;
  }
}

export async function listCommunityTools({ limit = 60, sort = 'latest', includeHidden = false, uid = currentUser()?.uid } = {}) {
  if (!firebaseReady) return null;
  try {
    await init();
    let query = db.collection(COLLECTION);
    query = sort === 'trending' ? query.orderBy('runs', 'desc') : query.orderBy('createdAt', 'desc');
    query = query.limit(limit);
    const [toolsSnap, ratingsMap, reportsMap] = await Promise.all([
      query.get(),
      fetchRatingsMap(uid),
      fetchReportsMap(uid),
    ]);
    const tools = toolsSnap.docs
      .map((doc) => normalizeTool(doc, ratingsMap, reportsMap))
      .filter((tool) => includeHidden || !tool.hidden)
      .sort((a, b) => {
        if (sort === 'trending') return (b.runs || 0) - (a.runs || 0);
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    return tools;
  } catch {
    return null;
  }
}

export async function listToolsByAuthor(uid) {
  if (!firebaseReady || !uid) return [];
  try {
    await init();
    const [toolsSnap, ratingsMap, reportsMap] = await Promise.all([
      db.collection(COLLECTION).where('authorUid', '==', uid).orderBy('createdAt', 'desc').get(),
      fetchRatingsMap(uid),
      fetchReportsMap(uid),
    ]);
    return toolsSnap.docs.map((doc) => normalizeTool(doc, ratingsMap, reportsMap));
  } catch {
    return [];
  }
}

export async function incrementRuns(id) {
  if (!firebaseReady) return;
  try {
    await init();
    await db.collection(COLLECTION).doc(id).update({
      runs: firebase.firestore.FieldValue.increment(1),
      updatedAt: Date.now(),
    });
  } catch { /* non-critical */ }
}

export async function rateCommunityTool(toolId, value, user = currentUser()) {
  if (!firebaseReady) throw new Error('Firebase is not configured');
  if (!user?.uid) throw new Error('Sign in required');
  await init();
  const clean = Math.max(1, Math.min(5, Number(value) || 0));
  if (!clean) throw new Error('Choose a rating');
  await db.collection(RATINGS).doc(`${toolId}_${user.uid}`).set({
    toolId,
    uid: user.uid,
    value: clean,
    authorName: user.displayName || user.email || 'Member',
    updatedAt: Date.now(),
  }, { merge: true });
}

export async function reportCommunityTool(toolId, reason, user = currentUser()) {
  if (!firebaseReady) throw new Error('Firebase is not configured');
  if (!user?.uid) throw new Error('Sign in required');
  await init();
  await db.collection(REPORTS).doc(`${toolId}_${user.uid}`).set({
    toolId,
    uid: user.uid,
    reason,
    createdAt: Date.now(),
  }, { merge: true });
}

export async function listReportedTools() {
  if (!firebaseReady) return [];
  await init();
  const tools = await listCommunityTools({ limit: 200, includeHidden: true });
  const reportsMap = await fetchReportsMap(currentUser()?.uid);
  return (tools || [])
    .filter((tool) => (reportsMap[tool.id]?.count || 0) > 0)
    .map((tool) => ({ ...tool, reports: reportsMap[tool.id]?.items || [] }));
}

export async function featureCommunityTool(id, featured = true) {
  if (!firebaseReady) throw new Error('Firebase is not configured');
  await init();
  await db.collection(COLLECTION).doc(id).update({ featured: !!featured, updatedAt: Date.now() });
}

export async function adminDeleteCommunityTool(id) {
  return deleteCommunityTool(id);
}
