/**
 * Community publishing — end-to-end flow test.
 *
 * Drives the real pages and the real `src/firebase.js` against an in-memory
 * Firestore double. It exists because the bug it guards against was invisible:
 * every read used to swallow its error and fall back to the three built-in
 * sample tools, so "published but missing" looked identical to a healthy page.
 *
 * The double also enforces Firestore's composite-index rule, which is how
 * "my tools" on the profile page used to fail forever.
 *
 *   node scripts/community-flow.mjs
 */
import { setupEnv, settle } from './jsdom-env.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/* ── in-memory Firestore double ─────────────────────────────────────── */

const COLLECTIONS = ['communityTools', 'communityToolRatings', 'communityToolReports', 'admins'];
const store = Object.fromEntries(COLLECTIONS.map((name) => [name, new Map()]));

/** Mutable knobs the tests flip between scenarios. */
const state = {
  user: null,
  /** Throw from every operation, to prove failures reach the screen. */
  fail: null,
  /** Collections whose reads are denied while the rest stay healthy. */
  failCollections: new Set(),
  /** Composite indexes that exist. Equality + orderBy on another field needs one. */
  indexes: new Set(),
  docSeq: 0,
};

class FakeError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const INDEX_LINK = 'https://console.firebase.google.com/v1/r/project-x/databases/(default)/documents/indexes';

function indexKey(filters, orders) {
  const equality = filters.filter((f) => f.op === '==').map((f) => `${f.field}_ASC`).sort().join(',');
  return `${equality}|${orders.map((o) => `${o.field}_${o.dir}`).join(',')}`;
}

function collectionRows(name) {
  return [...store[name].entries()].map(([id, data]) => ({ id, data }));
}

function runQuery(name, { filters = [], orders = [], limitN = null }) {
  if (state.fail) throw state.fail;
  if (filters.length && orders.length) {
    const key = indexKey(filters, orders);
    if (!state.indexes.has(key)) {
      throw new FakeError('failed-precondition',
        `The query requires an index. You can create the index here: ${INDEX_LINK}`);
    }
  }
  let rows = collectionRows(name);
  for (const f of filters) {
    if (f.op !== '==') throw new FakeError('failed-precondition', `unsupported operator ${f.op}`);
    rows = rows.filter((row) => row.data[f.field] === f.value);
  }
  for (const order of [...orders].reverse()) {
    rows.sort((a, b) => {
      const av = a.data[order.field] ?? -Infinity;
      const bv = b.data[order.field] ?? -Infinity;
      if (av === bv) return 0;
      return (av < bv ? -1 : 1) * (order.dir === 'desc' ? -1 : 1);
    });
  }
  if (limitN != null) rows = rows.slice(0, limitN);
  /* QuerySnapshot.docs expose data() — the app layer depends on that shape. */
  return { docs: rows.map((row) => ({ id: row.id, data: () => row.data })), empty: rows.length === 0, size: rows.length };
}

const INCREMENT = Symbol('increment');
const increment = (n) => ({ [INCREMENT]: n });

function applyValue(current, patch) {
  if (patch && typeof patch === 'object' && INCREMENT in patch) {
    return (Number(current) || 0) + patch[INCREMENT];
  }
  return patch;
}

function checkWrite() {
  if (state.fail) throw state.fail;
}

function makeCollection(name) {
  const guard = () => {
    if (state.fail) throw state.fail;
    if (state.failCollections.has(name)) {
      throw new FakeError('permission-denied', `Missing or insufficient permissions. (${name})`);
    }
  };
  const makeQuery = (filters, orders, limitN) => ({
    where: (field, op, value) => makeQuery([...filters, { field, op, value }], orders, limitN),
    orderBy: (field, dir = 'asc') => makeQuery(filters, [...orders, { field, dir }], limitN),
    limit: (n) => makeQuery(filters, orders, n),
    get: async () => { guard(); return runQuery(name, { filters, orders, limitN }); },
  });
  return {
    ...makeQuery([], [], null),
    async add(data) {
      checkWrite();
      const id = `doc${++state.docSeq}`;
      store[name].set(id, { ...data });
      return { id };
    },
    doc(id) {
      return {
        async get() {
          guard();
          const data = store[name].get(id);
          return { id, exists: Boolean(data), data: () => data };
        },
        async set(data, opts = {}) {
          checkWrite();
          const prev = opts.merge ? store[name].get(id) : undefined;
          store[name].set(id, { ...(prev || {}), ...data });
        },
        async update(patch) {
          checkWrite();
          const prev = store[name].get(id);
          if (!prev) throw new FakeError('not-found', `No document to update: ${name}/${id}`);
          const next = { ...prev };
          for (const [key, value] of Object.entries(patch)) next[key] = applyValue(prev[key], value);
          store[name].set(id, next);
        },
        async delete() {
          checkWrite();
          if (!store[name].delete(id)) throw new FakeError('not-found', `No document to delete: ${name}/${id}`);
        },
      };
    },
  };
}

const firestoreInstance = () => ({ collection: (name) => makeCollection(name) });

const SDK = {
  apps: [],
  initializeApp(config) { SDK.apps.push(config); return { name: '[DEFAULT]' }; },
  auth: () => ({
    currentUser: state.user,
    onAuthStateChanged(cb) { cb(state.user); return () => { }; },
    async getRedirectResult() { return null; },
    async signInWithPopup() { return { user: state.user }; },
    async signInWithRedirect() { return null; },
    async signOut() { state.user = null; },
  }),
  firestore: firestoreInstance,
};
/* the compat SDK nests FieldValue under firebase.firestore */
SDK.firestore.FieldValue = { increment };

/* ── boot the app modules with the double in place ───────────────────── */

/* A build with no VITE_FIREBASE_* variables has to degrade gracefully, and it
   needs a genuinely empty module graph — the config is captured at import time
   and every import specifier is shared — so that case runs in its own process. */
const UNCONFIGURED = process.argv.includes('--unconfigured');

const { window } = setupEnv();
globalThis.firebase = SDK;
const TEST_CONFIG = {
  apiKey: 'AIzaTestKeyForTheDouble',
  authDomain: 'psdkit-test.firebaseapp.com',
  projectId: 'psdkit-test',
  appId: '1:1234567890:web:abcdef123456',
};
if (!UNCONFIGURED) globalThis.PSDKIT_FIREBASE_CONFIG = TEST_CONFIG;
window.PSDKIT_APP = { getAuthUser: () => state.user };

/* The modules snapshot the config at import time, so this must be set first. */
const fb = await import('../src/firebase.js');
const community = await import('../src/pages/community.js');
const profile = await import('../src/pages/profile.js');
const toolsPage = await import('../src/pages/tools.js');
const adminPage = await import('../src/pages/admin.js');

/* ── the unconfigured build, in isolation ────────────────────────────── */

if (UNCONFIGURED) {
  let bad = 0;
  const check = (label, ok) => {
    console.log(`  ${ok ? '✓' : '✗'} ${label}`);
    if (!ok) bad++;
  };
  check('firebaseReady is false without a config', fb.firebaseReady === false);
  check('a human-readable reason is offered', Boolean(fb.firebaseConfigProblem));

  const root = window.document.createElement('div');
  window.document.body.append(root);
  community.renderCommunityPage(root);
  await settle(60);
  check('the sample grid still renders', /Word of the Day/.test(root.textContent));
  check('the page says these are samples', /built-in sample/i.test(root.textContent));

  community.renderSubmitPage(root, null);
  await settle(60);
  check('the publish form renders', Boolean(root.querySelector('textarea.code-area')));
  check('the form explains publishing is disabled', /Publishing is disabled/.test(root.textContent));
  check('the reason names the missing variables', /VITE_FIREBASE|missing/i.test(root.textContent));

  const { tools, error } = await fb.listCommunityTools({});
  check('reads report "not configured" instead of throwing', tools === null && error === null);
  check('the run counter is a no-op', (await fb.incrementRuns('x')) === false);
  check('a write refuses with the reason', await fb.submitCommunityTool({ name: 'a' })
    .then(() => false, (e) => /not configured/i.test(e.message)));

  console.log(`\n${bad ? 1 : 0} unconfigured failure(s)\n`);
  process.exit(bad ? 1 : 0);
}

if (!fb.firebaseReady) throw new Error('the double did not register — community features would be disabled in the test');

/* ── harness ─────────────────────────────────────────────────────────── */

let failures = 0;
let successes = 0;
const logged = [];

const realError = console.error;
const realWarn = console.warn;
/* Captured rather than printed: the negative scenarios deliberately provoke
   errors, and the assertions below are what decide whether they were loud
   enough. */
console.error = (...args) => { logged.push(args.map(String).join(' ')); };
console.warn = () => { /* index/admin noise is expected in the negative cases */ };

async function test(name, fn) {
  try {
    await fn();
    successes++;
    console.log('  ✓', name);
  } catch (e) {
    failures++;
    console.log('  ✗', name, '→', e.message);
  }
}

function reset() {
  COLLECTIONS.forEach((name) => store[name].clear());
  state.fail = null;
  state.failCollections = new Set();
  state.indexes = new Set();
  state.docSeq = 0;
  logged.length = 0;
}

const USER = {
  uid: 'user-pavit',
  displayName: 'Pavit',
  email: 'pavit@example.com',
  photoURL: 'https://example.com/a.png',
  metadata: { creationTime: new Date().toISOString() },
};

const PAYLOAD = {
  name: '3D QR Code Studio',
  category: 'Essentials',
  description: 'Turn any link or text into a 3D QR code built from tiny light-shaded blocks.',
  code: '<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/dist/qrcode.js"><\/script><div id="qr3d">hi</div>',
};

async function publishTool(extra = {}) {
  return fb.submitCommunityTool({
    ...PAYLOAD,
    authorName: USER.displayName,
    authorUid: USER.uid,
    authorEmail: USER.email,
    authorPhotoURL: USER.photoURL,
    ...extra,
  });
}

function host() {
  const node = window.document.createElement('div');
  window.document.body.append(node);
  return node;
}

/* ── the reported bug ────────────────────────────────────────────────── */

console.log('\n— Publish → latest grid → profile —');

await test('publishing writes a complete document', async () => {
  reset();
  state.user = USER;
  const id = await publishTool();
  const doc = store.communityTools.get(id);
  if (!doc) throw new Error('nothing was written to communityTools');
  for (const field of ['name', 'description', 'category', 'code', 'authorName', 'authorUid', 'createdAt', 'updatedAt']) {
    if (doc[field] === undefined) throw new Error(`document is missing ${field}`);
  }
  if (doc.authorUid !== USER.uid) throw new Error('authorUid was not stamped');
  if (doc.runs !== 0) throw new Error('run counter did not start at 0');
});

await test('the new tool is in the latest grid on the very next read', async () => {
  const { tools, error } = await fb.listCommunityTools({ sort: 'latest' });
  if (error) throw new Error(`read failed: ${error.message}`);
  if (tools.length !== 1) throw new Error(`expected 1 tool, got ${tools.length}`);
  if (tools[0].name !== PAYLOAD.name) throw new Error(`got "${tools[0].name}"`);
});

await test('"My tools" on the profile needs NO composite index', async () => {
  /* state.indexes is empty on purpose. The old query was
     where('authorUid','==',uid) + orderBy('createdAt','desc'), which Firestore
     rejects until a composite index exists — the author then saw an empty
     profile and concluded the publish had failed. */
  reset();
  state.user = USER;
  await publishTool();
  const { tools, error } = await fb.listToolsByAuthor(USER.uid);
  if (error) throw new Error(`author read failed: ${error.message}`);
  if (!tools.length) throw new Error('author read returned nothing — the composite index is back');
  if (tools[0].name !== PAYLOAD.name) throw new Error(`got "${tools[0].name}"`);
  if (logged.some((line) => /requires an index/.test(line))) throw new Error('the author query asked for an index');
});

await test('author tools come back newest-first without a server-side orderBy', async () => {
  reset();
  state.user = USER;
  const older = await publishTool();
  store.communityTools.get(older).createdAt = Date.now() - 60000;
  const newer = await publishTool();
  store.communityTools.get(newer).createdAt = Date.now();
  const { tools } = await fb.listToolsByAuthor(USER.uid);
  if (tools.length !== 2) throw new Error(`expected 2 tools, got ${tools.length}`);
  if (tools[0].createdAt < tools[1].createdAt) throw new Error('not sorted newest first');
});

await test('publishing through the form button shows the tool immediately', async () => {
  reset();
  state.user = USER;
  const root = host();
  community.renderSubmitPage(root, USER);
  await settle();
  root.querySelector('input.input').value = PAYLOAD.name;
  root.querySelectorAll('textarea.textarea')[0].value = PAYLOAD.description;
  root.querySelector('textarea.code-area').value = PAYLOAD.code;
  [...root.querySelectorAll('button')].find((b) => /Publish tool/.test(b.textContent)).click();
  await settle(60);
  if (!store.communityTools.size) throw new Error('the form did not write anything');
  const [saved] = store.communityTools.values();
  if (saved.name !== PAYLOAD.name) throw new Error(`saved "${saved.name}"`);
  if (saved.description !== PAYLOAD.description) throw new Error('description was not saved');
  root.remove();
});

await test('the community page renders the just-published card', async () => {
  reset();
  state.user = USER;
  const root = host();
  community.renderCommunityPage(root);
  await settle(60);
  await fb.submitCommunityTool({ ...PAYLOAD, authorName: USER.displayName, authorUid: USER.uid, authorEmail: USER.email, authorPhotoURL: '' });
  /* simulate the redirect the router performs after publish */
  community.renderCommunityPage(root);
  await settle(60);
  if (!root.textContent.includes(PAYLOAD.name)) throw new Error('the published tool is not in the grid');
  if (/Loading community tools/.test(root.textContent)) throw new Error('the page never finished loading');
  root.remove();
});

await test('the profile page lists the published tool', async () => {
  reset();
  state.user = USER;
  await publishTool();
  const root = host();
  profile.renderProfilePage(root, USER);
  await settle(60);
  if (!root.textContent.includes(PAYLOAD.name)) throw new Error('the profile did not list the tool');
  root.remove();
});

/* ── ownership ───────────────────────────────────────────────────────── */

console.log('\n— Ownership and moderation —');

await test('a second account still sees the tool publicly', async () => {
  state.user = { uid: 'someone-else', displayName: 'Reader', email: 'reader@example.com' };
  const { tools, error } = await fb.listCommunityTools({});
  if (error) throw new Error(`signed-out read failed: ${error.message}`);
  if (!tools.some((tool) => tool.name === PAYLOAD.name)) throw new Error('not publicly visible');
  const { tools: mine } = await fb.listToolsByAuthor('someone-else');
  if (mine.length) throw new Error('another account claims ownership of it');
});

await test('rating and reporting write against the tool', async () => {
  const { tools } = await fb.listCommunityTools({});
  const id = tools[0].id;
  await fb.rateCommunityTool(id, 5, state.user);
  await fb.reportCommunityTool(id, 'Broken', state.user);
  if (!store.communityToolRatings.has(`${id}_${state.user.uid}`)) throw new Error('rating was not stored');
  if (!store.communityToolReports.has(`${id}_${state.user.uid}`)) throw new Error('report was not stored');
  const { tools: after } = await fb.listCommunityTools({});
  if (after[0].ratingAvg !== 5) throw new Error(`rating did not aggregate (${after[0].ratingAvg})`);
  if (after[0].reportCount !== 1) throw new Error(`report did not aggregate (${after[0].reportCount})`);
});

await test('the author can edit and delete; edit keeps the document id', async () => {
  state.user = USER;
  const { tools } = await fb.listCommunityTools({});
  const id = tools[0].id;
  await fb.updateCommunityTool(id, { name: '3D QR Studio v2' });
  if (store.communityTools.get(id).name !== '3D QR Studio v2') throw new Error('edit did not land');
  await fb.deleteCommunityTool(id);
  if (store.communityTools.has(id)) throw new Error('delete did not land');
});

await test('run counter increments once per preview', async () => {
  state.user = USER;
  const id = await publishTool();
  const ok = await fb.incrementRuns(id);
  if (!ok) throw new Error('incrementRuns reported failure');
  if (store.communityTools.get(id).runs !== 1) throw new Error(`runs is ${store.communityTools.get(id).runs}`);
  await fb.incrementRuns(id);
  if (store.communityTools.get(id).runs !== 2) throw new Error('second increment did not land');
});

/* ── failures must be visible ────────────────────────────────────────── */

console.log('\n— Failures are never silent —');

await test('a denied read logs the cause and the page says so', async () => {
  reset();
  state.user = USER;
  await publishTool();
  state.fail = new FakeError('permission-denied', 'Missing or insufficient permissions.');
  const root = host();
  community.renderCommunityPage(root);
  await settle(60);
  if (!/could not load/i.test(root.textContent)) throw new Error('the page hid the failure');
  if (!/rules/i.test(root.textContent)) throw new Error('the page did not name the likely cause');
  if (!logged.some((line) => /Missing or insufficient permissions/.test(line))) throw new Error('the real error never reached the console');
  root.remove();
});

await test('a denied "my tools" read does not claim you published nothing', async () => {
  reset();
  state.user = USER;
  await publishTool();
  state.fail = new FakeError('permission-denied', 'Missing or insufficient permissions.');
  const root = host();
  profile.renderProfilePage(root, USER);
  await settle(60);
  if (!/could not be loaded/i.test(root.textContent)) throw new Error('the profile hid the failure');
  root.remove();
});

await test('a failed publish surfaces the reason instead of navigating away', async () => {
  reset();
  state.user = USER;
  state.fail = new FakeError('permission-denied', 'Missing or insufficient permissions.');
  const root = host();
  community.renderSubmitPage(root, USER);
  await settle();
  root.querySelector('input.input').value = PAYLOAD.name;
  root.querySelectorAll('textarea.textarea')[0].value = PAYLOAD.description;
  root.querySelector('textarea.code-area').value = PAYLOAD.code;
  [...root.querySelectorAll('button')].find((b) => /Publish tool/.test(b.textContent)).click();
  await settle(60);
  if (store.communityTools.size) throw new Error('a denied write still got through the double');
  const toastText = [...window.document.querySelectorAll('.toast')].map((n) => n.textContent).join(' ');
  if (!/rules/i.test(toastText)) throw new Error(`the toast did not explain the failure: "${toastText}"`);
  root.remove();
});

await test('an empty community says so instead of showing samples', async () => {
  reset();
  state.user = USER;
  const root = host();
  community.renderCommunityPage(root);
  await settle(60);
  if (/Word of the Day/.test(root.textContent)) throw new Error('samples were passed off as live tools');
  if (!/No community tools yet/.test(root.textContent)) throw new Error('no honest empty state');
  root.remove();
});

/* ── the Tools catalogue ─────────────────────────────────────────────── */

console.log('\n— Community tools in the Tools catalogue —');

await test('the Community chip lists the published tool with its author', async () => {
  reset();
  state.user = USER;
  await publishTool();
  const root = host();
  toolsPage.renderToolsPage(root, 'community');
  await settle(80);
  const chip = [...root.querySelectorAll('.cat-chips .chip')].find((c) => c.dataset.cat === 'community');
  if (!chip) throw new Error('there is no Community chip in the Tools filter row');
  if (!/Community \(1\)/.test(chip.textContent)) throw new Error(`chip count is stale: "${chip.textContent.trim()}"`);
  const card = root.querySelector('.tool-card');
  if (!card) throw new Error('no card rendered for the published tool');
  if (!card.textContent.includes(PAYLOAD.name)) throw new Error('the card is missing the tool name');
  /* The creator has to be identifiable, not just implied. */
  if (!card.textContent.includes(`by ${USER.displayName}`)) throw new Error(`no author on the card: "${card.textContent}"`);
  const chipEl = card.querySelector('.author-chip');
  if (!chipEl) throw new Error('no author chip on the card');
  if (!/user-pavit/.test(chipEl.getAttribute('title') || '')) {
    throw new Error('the author Firebase uid is not exposed on the card');
  }
  root.remove();
});

await test('the catalogue card carries no run or rating counter', async () => {
  const card = community.communityCatalogueCard({
    id: 'x', name: 'n', description: 'd', category: 'Essentials', authorName: 'Pavit',
    authorUid: 'u1', runs: 412, ratingAvg: 4.9, ratingCount: 27, createdAt: Date.now(),
  });
  if (/\b412\b/.test(card.textContent)) throw new Error('the run counter leaked into the catalogue');
  if (/\b27\b/.test(card.textContent) || /4\.9/.test(card.textContent)) throw new Error('the rating tally leaked into the catalogue');
  if (/runs/i.test(card.textContent)) throw new Error(`"runs" is showing on the card: "${card.textContent}"`);
  /* …while the Community page card still reports them. */
  const grid = community.communityCard({
    id: 'x', name: 'n', description: 'd', category: 'Essentials', authorName: 'Pavit',
    authorUid: 'u1', runs: 412, ratingAvg: 4.9, ratingCount: 27, createdAt: Date.now(),
  });
  if (!/412/.test(grid.textContent)) throw new Error('the Community page lost its run counter');
});

await test('searching the Tools page finds a community tool by name', async () => {
  reset();
  state.user = USER;
  await publishTool();
  const root = host();
  toolsPage.renderToolsPage(root, null);
  await settle(80);
  const input = root.querySelector('[data-search-input]');
  input.value = '3D QR Code';
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  await settle(260);
  if (!root.textContent.includes(PAYLOAD.name)) throw new Error('the community tool did not appear in the search results');
  if (!/from the community/i.test(root.textContent)) throw new Error('community results are not labelled');
  root.remove();
});

await test('the catalogue never shows the built-in samples as if they were real', async () => {
  reset();
  state.user = USER;
  const root = host();
  toolsPage.renderToolsPage(root, 'community');
  await settle(80);
  if (/Word of the Day/.test(root.textContent)) throw new Error('a sample tool is sitting in the real catalogue');
  if (!/Nobody has published a tool yet/.test(root.textContent)) throw new Error('no honest empty state for the Community chip');
  root.remove();
});

await test('a failed community read leaves the catalogue empty, never fabricated', async () => {
  reset();
  state.user = USER;
  await publishTool();
  state.fail = new FakeError('permission-denied', 'Missing or insufficient permissions.');
  const root = host();
  toolsPage.renderToolsPage(root, 'community');
  await settle(80);
  state.fail = null;
  if (!/could not load/i.test(root.textContent)) throw new Error('the Tools page hid the failure');
  if (/Word of the Day/.test(root.textContent)) throw new Error('it fell back to samples inside the real catalogue');
  root.remove();
});

await test('a broken ratings read no longer blanks the tool list', async () => {
  reset();
  state.user = USER;
  await publishTool();
  /* Only the ratings collection is denied — the tools themselves are fine, and
     the list used to die with them because all three reads shared a catch. */
  state.failCollections = new Set(['communityToolRatings']);
  const { tools, error } = await fb.listCommunityTools({});
  state.failCollections = new Set();
  if (error) throw new Error('a ratings failure took the whole tool list down');
  if (!tools.length) throw new Error('the tool list came back empty');
  if (tools[0].ratingCount !== 0) throw new Error('expected the rating enrichment to degrade to zero');
  if (!logged.some((line) => /ratings enrichment/.test(line))) throw new Error('the degradation was not logged');
});

/* ── admin control center ──────────────────────────────────────── */

console.log('\n— Admin control center —');

const ADMIN = {
  uid: 'admin-ada',
  displayName: 'Ada Admin',
  email: 'ada@example.com',
  metadata: { creationTime: new Date().toISOString() },
};

function grantAdmin(uid = ADMIN.uid) {
  store.admins.set(uid, { grantedAt: Date.now() });
}

/* The destructive flows confirm first; the double drives them through. */
const realConfirm = window.confirm;
window.confirm = () => true;

await test('a signed-out visitor gets the sign-in gate', async () => {
  reset();
  state.user = null;
  const root = host();
  await adminPage.renderAdminDashboard(root);
  if (!/Admin access only/.test(root.textContent)) throw new Error('the sign-in gate is missing');
  if (!/Sign in with Google/.test(root.textContent)) throw new Error('no sign-in action offered');
  root.remove();
});

await test('a non-admin is refused and shown the uid to grant', async () => {
  reset();
  state.user = USER;
  const root = host();
  await adminPage.renderAdminDashboard(root);
  if (!/not an admin/i.test(root.textContent)) throw new Error('a non-admin walked straight in');
  if (!root.textContent.includes(USER.uid)) throw new Error('the uid to grant is not shown');
  if (!root.textContent.includes(`admins/${USER.uid}`)) throw new Error('the grant path is not spelled out');
  root.remove();
});

await test('an admin gets the dashboard with stats and every tab', async () => {
  reset();
  state.user = ADMIN;
  grantAdmin();
  const id = await publishTool();
  store.communityTools.get(id).runs = 42;
  const root = host();
  await adminPage.renderAdminDashboard(root);
  const text = root.textContent;
  if (!/Control Center/.test(text)) throw new Error('the hero is missing');
  if (!/Total tools/.test(text) || !/Total runs/.test(text)) throw new Error('the stat cards are missing');
  if (!text.includes(PAYLOAD.name)) throw new Error('the published tool is not on the dashboard');
  if (root.querySelectorAll('.adm-nav-btn').length !== 5) throw new Error('expected five tabs');
  if (!/42/.test(text)) throw new Error('the run counter never reached the overview');
  root.remove();
});

await test('feature and hide from the manager land in Firestore', async () => {
  reset();
  state.user = ADMIN;
  grantAdmin();
  const id = await publishTool();
  const root = host();
  await adminPage.renderAdminDashboard(root);
  [...root.querySelectorAll('.adm-nav-btn')].find((b) => /Tools/.test(b.textContent)).click();
  await settle(30);
  const featureBtn = root.querySelector('button[title="Feature"]');
  if (!featureBtn) throw new Error('no feature action in the manager');
  featureBtn.click();
  await settle(90);
  if (store.communityTools.get(id).featured !== true) throw new Error('the feature flag did not land');
  const hideBtn = root.querySelector('button[title="Hide"]');
  if (!hideBtn) throw new Error('no hide action in the manager');
  hideBtn.click();
  await settle(90);
  if (store.communityTools.get(id).hidden !== true) throw new Error('the hide flag did not land');
  root.remove();
});

await test('the search box narrows the manager', async () => {
  reset();
  state.user = ADMIN;
  grantAdmin();
  await publishTool();
  await publishTool({ name: 'Totally Different Name' });
  const root = host();
  await adminPage.renderAdminDashboard(root);
  [...root.querySelectorAll('.adm-nav-btn')].find((b) => /Tools/.test(b.textContent)).click();
  await settle(30);
  const input = root.querySelector('.adm-toolbar input[type="search"]');
  if (!input) throw new Error('the manager has no search box');
  input.value = 'Totally Different';
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  await settle(260);
  const names = [...root.querySelectorAll('.adm-cell-title .c-name')].map((n) => n.textContent);
  if (names.length !== 1 || names[0] !== 'Totally Different Name') {
    throw new Error(`search returned ${JSON.stringify(names)}`);
  }
  root.remove();
});

await test('reports show their reasons and can be dismissed', async () => {
  reset();
  state.user = ADMIN;
  grantAdmin();
  const id = await publishTool();
  await fb.reportCommunityTool(id, 'Broken', { uid: 'reader-one', displayName: 'Reader' });
  await fb.reportCommunityTool(id, 'Unsafe code', { uid: 'reader-two', displayName: 'Reader' });
  const root = host();
  await adminPage.renderAdminDashboard(root);
  [...root.querySelectorAll('.adm-nav-btn')].find((b) => /Reports/.test(b.textContent)).click();
  await settle(30);
  if (!/Broken/.test(root.textContent) || !/Unsafe code/.test(root.textContent)) {
    throw new Error('the report reasons are not listed');
  }
  const dismissBtn = [...root.querySelectorAll('button')].find((b) => /Dismiss reports/.test(b.textContent));
  if (!dismissBtn) throw new Error('no dismiss action in the queue');
  dismissBtn.click();
  await settle(120);
  const left = [...store.communityToolReports.keys()].filter((k) => k.startsWith(id));
  if (left.length) throw new Error('the reports were not dismissed');
  if (store.communityTools.get(id).hidden) throw new Error('dismissing reports should lift the auto-hide');
  if (!/Queue clear/.test(root.textContent)) throw new Error('the empty queue state is missing');
  root.remove();
});

await test('the edit modal saves metadata and code', async () => {
  reset();
  state.user = ADMIN;
  grantAdmin();
  const id = await publishTool();
  const root = host();
  await adminPage.renderAdminDashboard(root);
  [...root.querySelectorAll('.adm-nav-btn')].find((b) => /Tools/.test(b.textContent)).click();
  await settle(30);
  root.querySelector('button[title="Edit"]').click();
  await settle(30);
  const modal = [...window.document.querySelectorAll('.modal-backdrop')].pop();
  if (!modal) throw new Error('the edit modal did not open');
  const nameIn = modal.querySelector('input.input');
  nameIn.value = 'Renamed by admin';
  const runsIn = modal.querySelector('input[type="number"]');
  runsIn.value = '7';
  const saveBtn = [...modal.querySelectorAll('button')].find((b) => /Save changes/.test(b.textContent));
  if (!saveBtn) throw new Error('no save button');
  saveBtn.click();
  await settle(120);
  const doc = store.communityTools.get(id);
  if (doc.name !== 'Renamed by admin') throw new Error('the rename did not land');
  if (doc.runs !== 7) throw new Error('the run counter edit did not land');
  root.remove();
});

await test('bulk delete removes every selected tool', async () => {
  reset();
  state.user = ADMIN;
  grantAdmin();
  await publishTool();
  await publishTool({ name: 'Second Bulk Target' });
  const root = host();
  await adminPage.renderAdminDashboard(root);
  [...root.querySelectorAll('.adm-nav-btn')].find((b) => /Tools/.test(b.textContent)).click();
  await settle(30);
  const boxes = [...root.querySelectorAll('input[data-row-check]')];
  if (boxes.length !== 2) throw new Error(`expected two rows, got ${boxes.length}`);
  boxes.forEach((cb) => {
    cb.checked = true;
    cb.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  await settle(30);
  const bulk = root.querySelector('.adm-bulk');
  if (!bulk || bulk.style.display === 'none') throw new Error('the bulk bar never appeared');
  const deleteBtn = [...bulk.querySelectorAll('button')].find((b) => /Delete/.test(b.textContent));
  deleteBtn.click();
  await settle(150);
  if (store.communityTools.size) throw new Error('bulk delete left documents behind');
  root.remove();
});

await test('the activity log records moderation steps', async () => {
  const entries = JSON.parse(window.localStorage.getItem('psdkit_admin_log') || '[]');
  if (!entries.length) throw new Error('nothing was logged');
  const root = host();
  state.user = ADMIN;
  grantAdmin();
  await adminPage.renderAdminDashboard(root);
  [...root.querySelectorAll('.adm-nav-btn')].find((b) => /Activity/.test(b.textContent)).click();
  await settle(30);
  if (!root.querySelector('.adm-log-row')) throw new Error('the log tab renders no entries');
  root.remove();
});

await test('the panel survives a denied read without throwing', async () => {
  reset();
  state.user = ADMIN;
  grantAdmin();
  await publishTool();
  /* Only the tools collection is denied — the admin lookup still succeeds,
     so the frame must build and carry the failure honestly. */
  state.failCollections = new Set(['communityTools']);
  const root = host();
  await adminPage.renderAdminDashboard(root);
  if (!/Firestore problem/i.test(root.textContent)) {
    throw new Error(`the failure never reached the screen: ${root.textContent.slice(0, 160)}`);
  }
  const vals = [...root.querySelectorAll('.adm-stat .s-val')].map((n) => n.textContent);
  if (vals.some((v) => v !== '—')) throw new Error(`stats were fabricated from a failed read: ${JSON.stringify(vals)}`);
  root.remove();
  state.failCollections = new Set();
});

window.confirm = realConfirm;

/* ── unconfigured build still degrades safely ────────────────────────── */

console.log('\n— Firebase not configured —');

await test('a build with no Firebase config still renders samples and the disabled note', async () => {
  /* Own process: the config is read once at import time, so an in-process
     "second" instance would still be the configured one. */
  const self = fileURLToPath(import.meta.url);
  const result = spawnSync(process.execPath, [self, '--unconfigured'], { encoding: 'utf8' });
  if (result.stdout) console.log(result.stdout.replace(/^/gm, '    ').trimEnd());
  if (result.status !== 0) throw new Error(`unconfigured run failed:\n${result.stdout || ''}${result.stderr || ''}`);
});

console.error = realError;
console.warn = realWarn;
console.log(`\n${successes} passed, ${failures} failed\n`);
process.exit(failures ? 1 : 0);
