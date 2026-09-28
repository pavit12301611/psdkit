/* ============================================================
   Firebase — Google auth + Firestore for community tools.
   Loads only when env config is present, so the site still works
   with no backend. Auth uses popup first and falls back to redirect
   on mobile or popup-blocked browsers.

   Every read returns `{ …, error }` instead of quietly degrading to
   an empty value. Swallowing the error is what made "published but
   invisible" impossible to diagnose: a missing Firestore index and a
   healthy empty database both rendered as "no tools of yours".
   ============================================================ */
import { loadScript } from './ui.js';

const BASE = 'https://www.gstatic.com/firebasejs/10.14.1';
const ENV = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
/* Runtime escape hatch. The build bakes VITE_FIREBASE_* in at compile time, so
   a deployment that forgot them is unfixable without a rebuild — which is how a
   "Community features are live" badge can end up lying. Setting
   `window.PSDKIT_FIREBASE_CONFIG` (plain public firebaseConfig fields) before
   the bundle loads turns the features on with no redeploy. */
const RUNTIME = (typeof globalThis !== 'undefined' && globalThis.PSDKIT_FIREBASE_CONFIG) || {};
const RETURN_KEY = 'psdkit_auth_return';
const COLLECTION = 'communityTools';
const RATINGS = 'communityToolRatings';
const REPORTS = 'communityToolReports';
const ADMINS = 'admins';
const NOT_CONFIGURED = 'Firebase is not configured';

export const firebaseConfig = {
  apiKey: ENV.VITE_FIREBASE_API_KEY || RUNTIME.apiKey || '',
  authDomain: ENV.VITE_FIREBASE_AUTH_DOMAIN || RUNTIME.authDomain || '',
  projectId: ENV.VITE_FIREBASE_PROJECT_ID || RUNTIME.projectId || '',
  storageBucket: ENV.VITE_FIREBASE_STORAGE_BUCKET || RUNTIME.storageBucket || '',
  messagingSenderId: ENV.VITE_FIREBASE_MESSAGING_SENDER_ID || RUNTIME.messagingSenderId || '',
  appId: ENV.VITE_FIREBASE_APP_ID || RUNTIME.appId || '',
};

/* An unset env var must not read as "configured", and neither must a
   half-filled one that still carries the variable name as its value. */
const PLACEHOLDER = /^\s*(\$\{.*\}|VITE_[A-Z_]+|YOUR[_-]|CHANGE[_-]|PASTE[_-])/i;
function usable(value) {
  return typeof value === 'string' && value.trim().length > 0 && !PLACEHOLDER.test(value);
}

export const firebaseConfigProblem = (() => {
  const needed = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missing = needed.filter((key) => !usable(firebaseConfig[key]));
  if (!missing.length) return '';
  const placeholders = needed.filter((key) => !usable(firebaseConfig[key]) && String(firebaseConfig[key] || '').trim());
  if (placeholders.length) {
    return `${NOT_CONFIGURED} — ${placeholders.join(', ')} still holds a placeholder value`;
  }
  return `${NOT_CONFIGURED} — missing ${missing.join(', ')}`;
})();

export const firebaseReady = !firebaseConfigProblem;

let initPromise = null;
let redirectHandled = false;
let auth = null;
let db = null;
let lastUser = null;

/* ---------- Failure reporting ----------
   One channel for "something in Firestore went wrong" so no call site can
   quietly turn an exception into an empty list again. */
const STATUS_EVENT = 'psdkit:community-status';
const statusListeners = new Set();
let lastStatus = { ok: true, code: '', scope: '', message: '', hint: '', at: 0 };

const FRIENDLY = [
  [/missing or insufficient permissions|permission-denied/i,
    'Firestore rules blocked this. Publish the repo’s firestore.rules in Firebase console → Firestore → Rules.'],
  [/requires an index|no matching index|failed-precondition/i,
    'A Firestore composite index is missing. Create it from the link in the console error, or run `firebase deploy --only firestore:indexes`.'],
  [/invalid-api-key|configuration-not-found|invalid-credential|api-key-not-valid/i,
    'The Firebase config was rejected. Re-check the VITE_FIREBASE_* values against the Firebase console.'],
  [/unavailable|deadline-exceeded|network-request-failed|internal-error|transport/i,
    'Firestore could not be reached. Check the network, then retry.'],
  [/unauthenticated|auth\/operation-not-allowed|popup|redirect/i,
    'Google sign-in did not complete. Check Authentication → Sign-in method and the authorised domains.'],
];

/** Turn a raw Firestore/Auth error into one short sentence a human can act on. */
export function friendlyError(error) {
  const text = String(error?.message || error || '');
  const hit = FRIENDLY.find(([re]) => re.test(text));
  return hit ? hit[1] : (text || 'Unknown error');
}

/** Classify an error for the status channel (see FRIENDLY for the wording). */
function classify(error) {
  const text = String(error?.message || error || '');
  if (/requires an index|no matching index/i.test(text)) return 'missing-index';
  if (/missing or insufficient permissions|permission-denied/i.test(text)) return 'permission-denied';
  if (/invalid-api-key|configuration-not-found|api-key-not-valid/i.test(text)) return 'bad-config';
  if (/auth\/|unauthenticated|operation-not-allowed/i.test(text)) return 'auth';
  if (/unavailable|deadline|network|internal-error|transport/i.test(text)) return 'offline';
  return 'unknown';
}

/**
 * Log the real error once and broadcast it. `quiet` failures (ratings, admin
 * lookups) are logged but do not flip the page into its degraded state.
 */
function reportFirestore(scope, error, { quiet = false } = {}) {
  if (!error) return null;
  const code = classify(error);
  const message = friendlyError(error);
  if (code === 'missing-index' || /index/i.test(String(error?.message || ''))) {
    console.error(`[psdkit] Firestore "${scope}" needs a composite index — create it here:`, error);
  } else {
    console.error(`[psdkit] Firestore "${scope}" failed:`, error);
  }
  if (!quiet) {
    lastStatus = { ok: false, code, scope, message, hint: String(error?.message || ''), at: Date.now() };
    statusListeners.forEach((fn) => { try { fn(lastStatus); } catch { /* listener bug must not cascade */ } });
    try { window.dispatchEvent(new CustomEvent(STATUS_EVENT, { detail: lastStatus })); } catch { /* no DOM */ }
  }
  return lastStatus;
}

export function onCommunityStatus(cb) {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
}

export function communityStatus() {
  return lastStatus;
}

function clearStatus(scope) {
  if (lastStatus.ok || lastStatus.scope !== scope) return;
  lastStatus = { ok: true, code: '', scope: '', message: '', hint: '', at: Date.now() };
  statusListeners.forEach((fn) => { try { fn(lastStatus); } catch { /* listener bug */ } });
  try { window.dispatchEvent(new CustomEvent(STATUS_EVENT, { detail: lastStatus })); } catch { /* no DOM */ }
}

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

/* Tests (and any page that already loaded the SDK itself) can predefine
   `firebase`; skip the three network script tags when it is there. */
function sdkPresent() {
  return typeof globalThis !== 'undefined' && Boolean(globalThis.firebase?.apps);
}

async function init() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (!firebaseReady) throw new Error(NOT_CONFIGURED);
    if (!sdkPresent()) {
      await loadScript(`${BASE}/firebase-app-compat.js`);
      await loadScript(`${BASE}/firebase-auth-compat.js`);
      await loadScript(`${BASE}/firebase-firestore-compat.js`);
    }
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
      } catch (error) {
        reportFirestore('auth redirect', error);
      }
    }
    return { auth, db };
  })();
  /* A failed init must not be cached forever — the user can fix the config
     and retry without a full page reload. */
  initPromise.catch(() => { initPromise = null; });
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
    reportFirestore('google sign-in', error);
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
  }).catch((error) => {
    reportFirestore('auth state', error);
    cb(null);
  });
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
  } catch (error) {
    /* Not being an admin is a normal answer; only log it. */
    console.warn('[psdkit] admin lookup failed:', error);
    return false;
  }
}

/* ---------- Firestore helpers ---------- */
function normalizeTool(doc, ratingsMap = {}, reportsMap = {}) {
  const data = doc.data ? doc.data() : doc;
  const id = doc.id || data.id;
  const rate = ratingsMap[id] || { count: 0, avg: 0, mine: 0 };
  const report = reportsMap[id] || { count: 0, mine: false };
  return {
    id,
    ...data,
    ratingCount: rate.count,
    ratingAvg: rate.avg,
    myRating: rate.mine || 0,
    reportCount: report.count,
    reportedByMe: report.mine || false,
    hidden: Boolean(data.hidden) || report.count >= 3,
    /* The raw moderation flag before auto-hide joins in — the admin panel has
       to tell "an admin hid this" from "three reports hid this", and only the
       raw flag may be toggled back off without touching the reports. */
    hiddenFlag: Boolean(data.hidden),
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

/* Ratings and reports are decoration on top of the tool list. If their read is
   blocked the tools must still load — an empty star row beats an empty page. */
async function enrichment(kind, fn) {
  try {
    return await fn();
  } catch (error) {
    reportFirestore(`${kind} enrichment`, error, { quiet: true });
    return {};
  }
}

/* ---------- Community tools ---------- */
export async function submitCommunityTool({ name, description, category, code, authorName, authorUid, authorEmail, authorPhotoURL }) {
  if (!firebaseReady) throw new Error(NOT_CONFIGURED);
  await init();
  try {
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
    clearStatus('publish');
    return doc.id;
  } catch (error) {
    /* Re-throw with the real cause attached — publish() shows it in a toast. */
    reportFirestore('publish', error);
    const wrapped = new Error(friendlyError(error));
    wrapped.code = error?.code || '';
    throw wrapped;
  }
}

export async function updateCommunityTool(id, patch) {
  if (!firebaseReady) throw new Error(NOT_CONFIGURED);
  await init();
  try {
    await db.collection(COLLECTION).doc(id).update({ ...patch, updatedAt: Date.now() });
    clearStatus('update');
  } catch (error) {
    reportFirestore('update', error);
    const wrapped = new Error(friendlyError(error));
    wrapped.code = error?.code || '';
    throw wrapped;
  }
}

export async function deleteCommunityTool(id) {
  if (!firebaseReady) throw new Error(NOT_CONFIGURED);
  await init();
  try {
    await db.collection(COLLECTION).doc(id).delete();
    clearStatus('delete');
  } catch (error) {
    reportFirestore('delete', error);
    const wrapped = new Error(friendlyError(error));
    wrapped.code = error?.code || '';
    throw wrapped;
  }
}

/** @returns {Promise<{tool: object|null, error: Error|null}>} */
export async function getCommunityTool(id, uid = currentUser()?.uid) {
  if (!firebaseReady || !id) return { tool: null, error: null };
  try {
    await init();
    const [doc, ratingsMap, reportsMap] = await Promise.all([
      db.collection(COLLECTION).doc(id).get(),
      enrichment('ratings', () => fetchRatingsMap(uid)),
      enrichment('reports', () => fetchReportsMap(uid)),
    ]);
    if (!doc.exists) return { tool: null, error: null };
    clearStatus('tool detail');
    return { tool: normalizeTool(doc, ratingsMap, reportsMap), error: null };
  } catch (error) {
    return { tool: null, error: reportFirestore('tool detail', error) || error };
  }
}

/**
 * @returns {Promise<{tools: object[]|null, error: Error|null}>} `tools` is null
 * only when the read failed; an empty array means the database really is empty
 * and the UI must say so instead of pretending three sample tools are live.
 */
export async function listCommunityTools({ limit = 60, sort = 'latest', includeHidden = false, uid = currentUser()?.uid } = {}) {
  if (!firebaseReady) return { tools: null, error: null };
  try {
    await init();
    let query = db.collection(COLLECTION);
    query = sort === 'trending' ? query.orderBy('runs', 'desc') : query.orderBy('createdAt', 'desc');
    query = query.limit(limit);
    const [toolsSnap, ratingsMap, reportsMap] = await Promise.all([
      query.get(),
      enrichment('ratings', () => fetchRatingsMap(uid)),
      enrichment('reports', () => fetchReportsMap(uid)),
    ]);
    const tools = toolsSnap.docs
      .map((doc) => normalizeTool(doc, ratingsMap, reportsMap))
      .filter((tool) => includeHidden || !tool.hidden)
      .sort((a, b) => {
        if (sort === 'trending') return (b.runs || 0) - (a.runs || 0);
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    clearStatus('community list');
    return { tools, error: null };
  } catch (error) {
    return { tools: null, error: reportFirestore('community list', error) || error };
  }
}

/**
 * A user's own tools.
 *
 * `where('authorUid','==',uid) + orderBy('createdAt')` needs a composite index
 * that nobody is told to create, and the query then fails with
 * `failed-precondition` — which used to be caught and returned as `[]`, so an
 * author who had published successfully still saw "you have not published any
 * tools yet" on their profile. The equality filter alone uses Firestore's
 * automatic single-field index, so the newest-first order is applied here.
 *
 * @returns {Promise<{tools: object[]|null, error: Error|null}>}
 */
export async function listToolsByAuthor(uid) {
  if (!firebaseReady || !uid) return { tools: [], error: null };
  try {
    await init();
    const [toolsSnap, ratingsMap, reportsMap] = await Promise.all([
      db.collection(COLLECTION).where('authorUid', '==', uid).limit(200).get(),
      enrichment('ratings', () => fetchRatingsMap(uid)),
      enrichment('reports', () => fetchReportsMap(uid)),
    ]);
    clearStatus('my tools');
    const tools = toolsSnap.docs
      .map((doc) => normalizeTool(doc, ratingsMap, reportsMap))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return { tools, error: null };
  } catch (error) {
    return { tools: null, error: reportFirestore('my tools', error) || error };
  }
}

/** @returns {Promise<boolean>} false when the counter could not be written. */
export async function incrementRuns(id) {
  if (!firebaseReady || !id) return false;
  try {
    await init();
    await db.collection(COLLECTION).doc(id).update({
      runs: firebase.firestore.FieldValue.increment(1),
      updatedAt: Date.now(),
    });
    return true;
  } catch (error) {
    /* Non-critical: the preview still opened, and the next visit tries again. */
    console.warn('[psdkit] run counter not updated:', error);
    return false;
  }
}

export async function rateCommunityTool(toolId, value, user = currentUser()) {
  if (!firebaseReady) throw new Error(NOT_CONFIGURED);
  if (!user?.uid) throw new Error('Sign in required');
  await init();
  const clean = Math.max(1, Math.min(5, Number(value) || 0));
  try {
    await db.collection(RATINGS).doc(`${toolId}_${user.uid}`).set({
      toolId,
      uid: user.uid,
      value: clean,
      authorName: user.displayName || user.email || 'Member',
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (error) {
    reportFirestore('rating', error);
    throw new Error(friendlyError(error));
  }
}

export async function reportCommunityTool(toolId, reason, user = currentUser()) {
  if (!firebaseReady) throw new Error(NOT_CONFIGURED);
  if (!user?.uid) throw new Error('Sign in required');
  await init();
  try {
    await db.collection(REPORTS).doc(`${toolId}_${user.uid}`).set({
      toolId,
      uid: user.uid,
      reason,
      createdAt: Date.now(),
    }, { merge: true });
  } catch (error) {
    reportFirestore('report', error);
    throw new Error(friendlyError(error));
  }
}

export async function listReportedTools() {
  if (!firebaseReady) return { tools: [], error: null };
  const { tools, error } = await listCommunityTools({ limit: 200, includeHidden: true });
  if (!tools) return { tools: [], error };
  const reportsMap = await enrichment('reports', () => fetchReportsMap(currentUser()?.uid));
  return {
    tools: tools
      .filter((tool) => (reportsMap[tool.id]?.count || 0) > 0)
      .map((tool) => ({ ...tool, reports: reportsMap[tool.id]?.items || [] })),
    error: null,
  };
}

export async function featureCommunityTool(id, featured = true) {
  if (!firebaseReady) throw new Error(NOT_CONFIGURED);
  await init();
  try {
    await db.collection(COLLECTION).doc(id).update({ featured: !!featured, updatedAt: Date.now() });
  } catch (error) {
    reportFirestore('feature', error);
    throw new Error(friendlyError(error));
  }
}

/**
 * Admin: clear one report, or every report filed against a tool.
 *
 * firestore.rules lets an admin delete report documents but nobody else —
 * this is what makes the moderation queue emptyable. Without it a tool that
 * auto-hided at three reports stayed flagged forever, because reports could
 * only ever be added.
 *
 * The query filters on `toolId` alone, so Firestore's automatic single-field
 * index covers it — no composite index required.
 *
 * @param {string} toolId whose reports to dismiss
 * @param {string|null} [reportId] dismiss just this one; null clears them all
 * @returns {Promise<number>} how many report documents were removed
 */
export async function dismissToolReports(toolId, reportId = null) {
  if (!firebaseReady) throw new Error(NOT_CONFIGURED);
  if (!toolId) throw new Error('No tool selected');
  await init();
  try {
    let ids = reportId ? [reportId] : [];
    if (!ids.length) {
      const snap = await db.collection(REPORTS).where('toolId', '==', toolId).get();
      ids = snap.docs.map((doc) => doc.id);
    }
    if (ids.length) {
      await Promise.all(ids.map((id) => db.collection(REPORTS).doc(id).delete()));
    }
    clearStatus('dismiss reports');
    return ids.length;
  } catch (error) {
    reportFirestore('dismiss reports', error);
    throw new Error(friendlyError(error));
  }
}

export async function adminDeleteCommunityTool(id) {
  return deleteCommunityTool(id);
}
