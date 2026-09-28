/* ============================================================
   Admin control center — #/admin

   Full moderation surface for the community toolbox:

     • Overview  — live stats, most-used leaderboard, latest
                   activity, category split (stat cards jump
                   straight into the matching filtered view)
     • Reports   — the queue with reporter, reason and time;
                   dismiss one, dismiss all, hide, feature,
                   edit or delete the offending tool
     • Tools     — searchable / sortable manager with bulk
                   feature · hide · delete and a full editor
                   (metadata, flags, runs, code + live preview)
     • Authors   — publisher directory with per-author stats
                   and one-click filtering of the manager
     • Activity  — a local moderation log of everything done
                   from this panel, plus JSON export

   Every write goes through the existing firebase.js helpers, so
   firestore.rules stays the single source of truth on what an
   admin may change. Failures always surface as a toast — a denied
   write must never look like it landed.
   ============================================================ */
import { el, toast, copyText, downloadFile, createAvatar, trapFocus, fmt, debounce } from '../ui.js';
import { icon } from '../icons.js';
import {
  firebaseReady, firebaseConfigProblem, signInWithGoogle, signOutUser,
  currentUser, isAdmin, listCommunityTools, listReportedTools,
  updateCommunityTool, deleteCommunityTool, featureCommunityTool,
  dismissToolReports,
} from '../firebase.js';

const CATS = ['Daily', 'Internet', 'Essentials', 'Coding', 'Learning', 'Fun', 'Wellness', 'Productivity'];
const LOG_KEY = 'psdkit_admin_log';
const LOG_CAP = 60;

const TABS = [
  ['overview', 'grid', 'Overview'],
  ['reports', 'flag', 'Reports'],
  ['tools', 'layers', 'Tools'],
  ['authors', 'users', 'Authors'],
  ['log', 'clock', 'Activity'],
];

/* ---------- small helpers ---------- */

function googleIcon() {
  return `<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path fill="#EA4335" d="M9 7.364v3.545h4.929c-.218 1.14-.873 2.104-1.855 2.75l3 2.327C16.823 14.387 18 11.95 18 9c0-.61-.055-1.197-.155-1.773H9Z"/><path fill="#4285F4" d="M9 18c2.43 0 4.47-.805 5.96-2.186l-3-2.327c-.833.559-1.9.891-2.96.891-2.276 0-4.204-1.536-4.893-3.6H1.005v2.391A9 9 0 0 0 9 18Z"/><path fill="#FBBC05" d="M4.107 10.778A5.407 5.407 0 0 1 3.833 9c0-.616.1-1.214.274-1.778V4.831H1.005A9.001 9.001 0 0 0 0 9c0 1.45.346 2.824 1.005 4.169l3.102-2.391Z"/><path fill="#34A853" d="M9 3.622c1.322 0 2.509.455 3.443 1.35l2.582-2.582C13.464.949 11.425 0 9 0A9 9 0 0 0 1.005 4.831l3.102 2.391C4.796 5.158 6.724 3.622 9 3.622Z"/></svg>`;
}

function sessionUser() {
  /* PSDKIT_APP (main.js) is the live auth state once the shell has booted —
     treat a signed-out answer there as authoritative instead of falling back
     to firebase's own snapshot, which can be stale in tests and after a
     redirect sign-out. Before the shell exists, read Firebase directly. */
  if (window.PSDKIT_APP?.getAuthUser) return window.PSDKIT_APP.getAuthUser() || null;
  return currentUser();
}

function timeAgo(ts) {
  if (!ts) return 'unknown time';
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return fmt.date(ts);
}

function srcdoc(code) {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:8px;background:#FAF7F2;font-family:'Plus Jakarta Sans',sans-serif}</style></head><body>${code || ''}</body></html>`;
}

/* ---------- local moderation log ---------- */

function readLog() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLog(entries) {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(0, LOG_CAP)));
  } catch {
    /* private mode — the toast still confirms the action */
  }
}

function logAction(message) {
  writeLog([{ at: Date.now(), message }, ...readLog()]);
}

/* ---------- shared UI atoms ---------- */

function pill(text, tone = 'info') {
  return el(`span.adm-pill.pill-${tone}`, { text });
}

function statusPills(tool) {
  const out = [];
  if (tool.featured) out.push(pill('Featured', 'info'));
  if (tool.hidden) out.push(tool.hiddenFlag ? pill('Hidden', 'warn') : pill('Auto-hidden', 'danger'));
  if (!out.length) out.push(pill('Live', 'ok'));
  return out;
}

function iconAction(ic, title, onclick, { on = false, danger = false } = {}) {
  const cls = ['adm-ico-btn'];
  if (on) cls.push('on');
  if (danger) cls.push('danger');
  return el('button', {
    class: cls.join(' '),
    html: icon(ic, 15),
    title,
    'aria-label': title,
    onclick,
  });
}

function emptyLine(text) {
  return el('div.field-hint', { style: { padding: '10px 2px' }, text });
}

/**
 * `window.confirm`, not bare `confirm`: the jsdom test harness defines
 * `window` but not the bare global, and tests stub `window.confirm`
 * to drive the destructive flows.
 */
function askConfirm(message) {
  try {
    return typeof window.confirm === 'function' ? window.confirm(message) : false;
  } catch {
    return false;
  }
}

function panelHead(title, extra = null) {
  return el('div.adm-panel-head',
    el('div.adm-panel-title', { text: title }),
    extra,
  );
}

/**
 * Validate against the exact limits firestore.rules enforces on updates
 * (name 3–79, description 6–499, code 11–99999 characters) so a doomed save
 * is caught here with a readable message instead of a denied write.
 * @returns {string} '' when the form is legal.
 */
function validateForm({ name, description, code }) {
  if (name.length < 3 || name.length > 79) return 'Name must be between 3 and 79 characters.';
  if (description.length < 6 || description.length > 499) return 'Description must be between 6 and 499 characters.';
  if (code.length < 11 || code.length > 99999) return 'Code must be between 11 and 99,999 characters.';
  return '';
}

/* ---------- entry points ---------- */

export function renderAdminPage(root, authUser = null) {
  const host = el('div');
  root.append(host);
  return renderAdminDashboard(host, authUser);
}

/**
 * The dashboard itself. `community.js` keeps a thin `renderAdminPanel`
 * wrapper that delegates here, so both entry points share one panel.
 * Never rejects: every failure renders as a gate card instead.
 */
export async function renderAdminDashboard(root, seedUser = null) {
  const state = {
    me: null,
    tab: 'overview',
    tools: [],
    reportsByTool: new Map(),
    error: null,
    query: '',
    filter: 'all',
    sort: 'newest',
    selected: new Set(),
    authorUid: null,
  };

  let sideEl = null;
  let mainEl = null;

  root.innerHTML = '';
  const body = el('div');
  const heroActions = el('div.adm-hero-actions');
  root.append(el('div.page-top.adm-shell',
    el('div.page-head',
      el('div.wrap',
        el('div.breadcrumb',
          el('a', { href: '#/', text: 'Home' }),
          el('span.sep', { text: '/' }),
          el('span', { text: 'Admin' }),
        ),
        el('div.row-between.adm-hero-row', { style: { marginTop: '14px' } },
          el('div',
            el('div.eyebrow', { text: 'control center' }),
            el('h1.display.h-section', { style: { marginTop: '8px' }, html: 'Admin <em>Control Center</em>' }),
            el('p.lede', { style: { marginTop: '10px' }, text: 'Every community tool, report and publisher in one place — review, edit, feature, hide or remove with full control.' }),
          ),
          heroActions,
        ),
      ),
    ),
    el('div.wrap', body),
  ));

  /* ---------- data ---------- */

  async function loadData() {
    state.error = null;
    const [allRes, repRes] = await Promise.all([
      listCommunityTools({ limit: 300, includeHidden: true }),
      listReportedTools(),
    ]);
    if (allRes.error) state.error = allRes.error;
    else if (repRes.error) state.error = repRes.error;
    state.tools = allRes.tools || [];
    const map = new Map();
    (repRes.tools || []).forEach((tool) => {
      map.set(tool.id, (tool.reports || []).filter((r) => r && r.id));
    });
    state.reportsByTool = map;
    /* Drop selections whose tool was deleted or filtered away server-side. */
    const alive = new Set(state.tools.map((t) => t.id));
    [...state.selected].forEach((id) => { if (!alive.has(id)) state.selected.delete(id); });
  }

  async function reload() {
    await loadData();
    renderTab();
  }

  function pendingReports() {
    let n = 0;
    state.reportsByTool.forEach((items) => { n += items.length; });
    return n;
  }

  function authorDirectory() {
    const byUid = new Map();
    for (const tool of state.tools) {
      const key = tool.authorUid || `anon:${tool.authorName || 'unknown'}`;
      if (!byUid.has(key)) {
        byUid.set(key, {
          uid: key,
          name: tool.authorName || 'Anonymous',
          email: tool.authorEmail || '',
          photoURL: tool.authorPhotoURL || '',
          tools: 0,
          runs: 0,
          reports: 0,
          hidden: 0,
        });
      }
      const entry = byUid.get(key);
      entry.tools += 1;
      entry.runs += tool.runs || 0;
      entry.reports += tool.reportCount || 0;
      if (tool.hidden) entry.hidden += 1;
      if (tool.authorName) entry.name = tool.authorName;
      if (tool.authorEmail) entry.email = tool.authorEmail;
      if (tool.authorPhotoURL) entry.photoURL = tool.authorPhotoURL;
    }
    return [...byUid.values()].sort((a, b) => (b.runs - a.runs) || (b.tools - a.tools));
  }

  /* ---------- gates ---------- */

  function showGate(node) {
    body.innerHTML = '';
    body.append(el('div.adm-gate', node));
  }

  function gateLoading() {
    return el('div', { style: { display: 'grid', gap: '14px' } },
      el('div.adm-skel', { style: { height: '118px' } }),
      el('div.adm-skel', { style: { height: '240px' } }),
    );
  }

  function gateSignIn() {
    return el('div.auth-card',
      el('div.gate-ico', { html: icon('shield', 24) }),
      el('h2', { text: 'Admin access only' }),
      el('p', { text: 'The control center is limited to project admins. Sign in with the Google account that owns this project to moderate community tools.' }),
      el('div.row', { style: { gap: '10px', flexWrap: 'wrap' } },
        el('button.btn.btn-primary', { html: `${googleIcon()} Sign in with Google`, onclick: signIn }),
        el('a.btn.btn-soft', { href: '#/', text: 'Back home' }),
      ),
      el('div.field-hint', { text: 'Access is granted by creating an admins/{uid} document in Firestore (see DEPLOYMENT.md).' }),
    );
  }

  function gateDenied(me) {
    return el('div.auth-card',
      el('div.gate-ico.danger', { html: icon('lock', 24) }),
      el('h2', { text: 'You are not an admin' }),
      el('p', { text: 'This account can sign in and use the site, but it has no moderation rights on this project.' }),
      el('div.gate-meta',
        createAvatar(me, 32),
        el('div', { style: { minWidth: '0', flex: '1 1 160px' } },
          el('div', { style: { fontWeight: 800, fontSize: '13.5px', overflowWrap: 'anywhere' }, text: me.displayName || me.email || 'Member' }),
          el('code.adm-mono', { text: me.uid }),
        ),
        el('button.copy-btn', { html: `${icon('copy', 13)} Copy UID`, onclick: () => copyText(me.uid) }),
      ),
      el('div.row', { style: { gap: '10px', flexWrap: 'wrap' } },
        el('button.btn.btn-soft', { html: `${icon('user', 15)} Sign out`, onclick: signOutAndReset }),
        el('a.btn.btn-soft', { href: '#/', text: 'Back home' }),
      ),
      el('div.field-hint', { text: `Ask the project owner to add this UID to the admins collection (admins/${me.uid}), then reload.` }),
    );
  }

  function gateConfig() {
    return el('div.auth-card',
      el('div.gate-ico.danger', { html: icon('database', 24) }),
      el('h2', { text: 'Firebase is not connected' }),
      el('p', { text: `${firebaseConfigProblem || 'Firebase is not configured'} — the control center needs a live Firestore to moderate.` }),
      el('p', { text: 'Set the VITE_FIREBASE_* variables and redeploy, or set window.PSDKIT_FIREBASE_CONFIG before the bundle loads to switch it on without a redeploy.' }),
      el('a.btn.btn-soft', { href: '#/', text: 'Back home' }),
    );
  }

  function gateError(error) {
    return el('div.auth-card',
      el('div.gate-ico.danger', { html: icon('bug', 24) }),
      el('h2', { text: 'The panel could not start' }),
      el('p', { text: error?.message || 'Something went wrong while loading the control center.' }),
      el('div.row', { style: { gap: '10px', flexWrap: 'wrap' } },
        el('button.btn.btn-primary', { html: `${icon('refresh', 15)} Retry`, onclick: () => renderAdminDashboard(root, seedUser) }),
        el('a.btn.btn-soft', { href: '#/', text: 'Back home' }),
      ),
    );
  }

  async function signIn() {
    try {
      await signInWithGoogle({ returnTo: '#/admin' });
    } catch (error) {
      toast(error.message || 'Sign-in failed', 'x');
    }
  }

  async function signOutAndReset() {
    try {
      await signOutUser();
    } catch (error) {
      toast(error.message || 'Sign-out failed', 'x');
    }
    await renderAdminDashboard(root, null);
  }

  /* ---------- frame ---------- */

  function buildFrame() {
    body.innerHTML = '';
    sideEl = el('div.adm-side');
    mainEl = el('div.adm-main');
    body.append(el('div.adm-layout', sideEl, mainEl));
    heroActions.append(
      el('button.btn.btn-soft', { html: `${icon('refresh', 15)} Refresh`, onclick: async () => { await reload(); toast('Data refreshed'); } }),
      el('button.btn.btn-soft', { html: `${icon('download', 15)} Export JSON`, onclick: exportJson }),
    );
  }

  function renderSide() {
    if (!sideEl || !state.me) return;
    const pending = pendingReports();
    sideEl.innerHTML = '';
    sideEl.append(
      el('div.adm-me',
        createAvatar(state.me, 36),
        el('div',
          el('div.m-name', { text: state.me.displayName || state.me.email || 'Admin' }),
          el('div.m-mail', { text: state.me.email || state.me.uid }),
        ),
      ),
      el('div.adm-nav', ...TABS.map(([key, ic, label]) => {
        const count = key === 'reports' ? pending
          : key === 'tools' ? state.tools.length
            : key === 'authors' ? authorDirectory().length
              : 0;
        return el('button.adm-nav-btn', {
          class: state.tab === key ? 'active' : '',
          onclick: () => { state.tab = key; renderTab(); },
        },
        el('span', { html: icon(ic, 16) }),
        el('span.n-label', { text: label }),
        count ? el('span', {
          class: key === 'reports' && pending > 0 ? 'adm-count alert' : 'adm-count',
          text: String(count),
        }) : null);
      })),
      el('div.adm-side-status',
        el('span', { class: state.error ? 'adm-live-dot off' : 'adm-live-dot' }),
        el('span', { text: state.error ? 'Firestore issue' : 'Firestore live' }),
      ),
    );
  }

  function renderTab() {
    renderSide();
    if (!mainEl) return;
    mainEl.innerHTML = '';
    if (state.tab === 'overview') tabOverview();
    else if (state.tab === 'reports') tabReports();
    else if (state.tab === 'tools') tabTools();
    else if (state.tab === 'authors') tabAuthors();
    else tabLog();
  }

  /* ---------- actions ---------- */

  async function run(fn, message) {
    try {
      await fn();
      logAction(message);
      toast(message);
    } catch (error) {
      console.error('[psdkit] admin action failed:', error);
      toast(error.message || 'Action failed', 'x');
    }
    await reload();
  }

  function toggleFeature(tool) {
    return run(
      () => featureCommunityTool(tool.id, !tool.featured),
      `${tool.featured ? 'Unfeatured' : 'Featured'} “${tool.name}”`,
    );
  }

  function toggleHide(tool) {
    if (tool.hiddenFlag) {
      return run(() => updateCommunityTool(tool.id, { hidden: false }), `Unhid “${tool.name}”`);
    }
    const stillAuto = (tool.reportCount || 0) >= 3;
    return run(
      () => updateCommunityTool(tool.id, { hidden: true }),
      stillAuto ? `Hid “${tool.name}” (still auto-hidden by reports)` : `Hid “${tool.name}”`,
    );
  }

  async function removeTool(tool) {
    if (!askConfirm(`Delete “${tool.name}” permanently? This cannot be undone.`)) return;
    await run(() => deleteCommunityTool(tool.id), `Deleted “${tool.name}”`);
  }

  async function dismissAll(tool) {
    const items = state.reportsByTool.get(tool.id) || [];
    if (!items.length) return toast('No reports to dismiss', 'info');
    if (!askConfirm(`Dismiss the ${items.length} report(s) on “${tool.name}”? The queue clears and any auto-hide lifts.`)) return;
    await run(() => dismissToolReports(tool.id), `Dismissed ${items.length} report(s) on “${tool.name}”`);
  }

  async function dismissOne(tool, reportId) {
    await run(() => dismissToolReports(tool.id, reportId), `Dismissed one report on “${tool.name}”`);
  }

  async function clearQueue() {
    const reported = state.tools.filter((t) => (state.reportsByTool.get(t.id) || []).length);
    if (!reported.length) return toast('The queue is already clear', 'info');
    if (!askConfirm(`Dismiss every open report? ${reported.length} item(s) in the queue will be cleared.`)) return;
    let ok = 0;
    for (const tool of reported) {
      try {
        await dismissToolReports(tool.id);
        ok += 1;
      } catch (error) {
        console.error('[psdkit] dismiss failed:', error);
      }
    }
    logAction(`Cleared report queue (${ok}/${reported.length} affected)`);
    toast(ok ? 'Report queue cleared' : 'Could not clear the queue', ok ? 'check' : 'x');
    await reload();
  }

  function exportJson() {
    if (!state.me) return toast('Sign in as an admin first', 'info');
    const payload = state.tools.map((tool) => ({
      ...tool,
      reports: state.reportsByTool.get(tool.id) || [],
    }));
    downloadFile(
      `psdkit-community-export-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      'application/json',
    );
    logAction(`Exported ${payload.length} community entr${payload.length === 1 ? 'y' : 'ies'}`);
    toast('Export downloaded');
  }

  /* ---------- overview ---------- */

  function statCard({ k, v, hint, ic, alert = false, go = null }) {
    const inner = [
      el('div.s-top',
        el('span.s-k', { text: k }),
        el('span.s-ico', { html: icon(ic, 16) }),
      ),
      el('div.s-val', { text: String(v) }),
      el('div.s-hint', { text: hint }),
    ];
    if (!go) return el('div.adm-stat', { class: alert ? 'alert' : '' }, ...inner);
    return el('button.adm-stat', { class: alert ? 'alert' : '', onclick: go, type: 'button' }, ...inner);
  }

  function goTab(tab, patch = {}) {
    Object.assign(state, { filter: 'all', query: '', authorUid: null, selected: new Set() }, patch);
    state.tab = tab;
    renderTab();
  }

  function tabOverview() {
    const degraded = Boolean(state.error);
    if (state.error) mainEl.append(errorNote());

    const total = state.tools.length;
    const runs = state.tools.reduce((sum, t) => sum + (t.runs || 0), 0);
    const pending = pendingReports();
    const featured = state.tools.filter((t) => t.featured).length;
    const hidden = state.tools.filter((t) => t.hidden).length;
    const authors = authorDirectory().length;
    const ratedCount = state.tools.reduce((sum, t) => sum + (t.ratingCount || 0), 0);
    const weighted = ratedCount
      ? (state.tools.reduce((sum, t) => sum + (t.ratingAvg || 0) * (t.ratingCount || 0), 0) / ratedCount).toFixed(1)
      : '—';
    const week = state.tools.filter((t) => (t.createdAt || 0) > Date.now() - 7 * 86400000).length;
    /* A failed read must not read as "everything is at zero". */
    const d = (value) => (degraded ? '—' : fmt.num(value));
    const stale = 'Unavailable while the Firestore read is failing.';

    mainEl.append(el('div.adm-stats',
      statCard({ k: 'Total tools', v: d(total), hint: degraded ? stale : `${hidden} hidden · ${featured} featured`, ic: 'layers', go: () => goTab('tools') }),
      statCard({ k: 'Total runs', v: d(runs), hint: degraded ? stale : 'every preview opened', ic: 'activity', go: () => goTab('tools', { sort: 'runs' }) }),
      statCard({ k: 'Open reports', v: d(pending), hint: degraded ? stale : (pending ? 'waiting for review' : 'queue is clear'), ic: 'flag', alert: !degraded && pending > 0, go: () => goTab('reports') }),
      statCard({ k: 'Featured', v: d(featured), hint: degraded ? stale : 'shown as community picks', ic: 'star', go: () => goTab('tools', { filter: 'featured' }) }),
      statCard({ k: 'Hidden', v: d(hidden), hint: degraded ? stale : 'hidden or auto-hidden', ic: 'eye', go: () => goTab('tools', { filter: 'hidden' }) }),
      statCard({ k: 'Authors', v: d(authors), hint: degraded ? stale : 'unique publishers', ic: 'users', go: () => goTab('authors') }),
      statCard({ k: 'Avg rating', v: degraded ? '—' : weighted, hint: degraded ? stale : `${fmt.num(ratedCount)} ratings recorded`, ic: 'award', go: () => goTab('tools', { sort: 'rating' }) }),
      statCard({ k: 'New this week', v: d(week), hint: degraded ? stale : 'last 7 days', ic: 'zap', go: () => goTab('tools', { sort: 'newest' }) }),
    ));

    const top = state.tools
      .filter((t) => !t.hidden)
      .slice()
      .sort((a, b) => (b.runs || 0) - (a.runs || 0))
      .slice(0, 6);
    const recent = state.tools
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 6);

    mainEl.append(el('div.grid.grid-2',
      el('div.adm-panel',
        panelHead('Most used', el('button.btn.btn-ghost.btn-sm', { text: 'Open manager', onclick: () => goTab('tools', { sort: 'runs' }) })),
        degraded ? emptyLine(stale)
          : top.length ? el('div', ...top.map((tool, i) => rankRow(tool, i)))
            : emptyLine('No runs recorded yet.'),
      ),
      el('div.adm-panel',
        panelHead('Latest activity', el('button.btn.btn-ghost.btn-sm', { text: 'See all', onclick: () => goTab('tools') })),
        degraded ? emptyLine(stale)
          : recent.length ? el('div', ...recent.map((tool) => activityRow(tool)))
            : emptyLine('Nothing has been published yet.'),
      ),
    ));

    const counts = new Map();
    state.tools.forEach((t) => {
      const cat = t.category || 'General';
      counts.set(cat, (counts.get(cat) || 0) + 1);
    });
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const max = entries.length ? entries[0][1] : 1;
    mainEl.append(el('div.adm-panel',
      panelHead('Catalogue split', el('span.field-hint', { text: degraded ? 'read failing' : `${entries.length} categor${entries.length === 1 ? 'y' : 'ies'}` })),
      degraded ? emptyLine(stale)
        : entries.length
          ? el('div', ...entries.map(([cat, n]) => el('div.adm-bar-row',
            el('div.b-label', { text: cat }),
            el('div.b-track', el('span', { style: { width: `${Math.max(8, Math.round((n / max) * 100))}%` } })),
            el('div.b-count', { text: String(n) }),
          )))
          : emptyLine('No categories yet.'),
    ));
  }

  function errorNote() {
    return el('div.note',
      el('div', { html: icon('info', 17) }),
      el('span', {},
        el('strong', { text: 'Firestore problem. ' }),
        el('span', { text: state.error?.message || 'The latest read failed — figures may be stale.' }),
      ),
    );
  }

  function rankRow(tool, i) {
    return el('div.adm-rank-row',
      el('div.adm-rank-n', { text: String(i + 1) }),
      el('div.r-body',
        el('div.r-name', { text: tool.name, onclick: () => inspectModal(tool) }),
        el('div.r-meta', { text: `${tool.authorName || 'Anonymous'} · ${tool.category || 'General'}` }),
      ),
      el('div.r-right',
        tool.featured ? el('span', { html: icon('star', 13) }) : null,
        el('span', { html: `${icon('activity', 14)} ${fmt.num(tool.runs || 0)}` }),
      ),
    );
  }

  function activityRow(tool) {
    return el('div.adm-rank-row',
      el('div.r-body',
        el('div.r-name', { text: tool.name, onclick: () => inspectModal(tool) }),
        el('div.r-meta', { text: `${tool.authorName || 'Anonymous'} · ${timeAgo(tool.createdAt)}` }),
      ),
      el('div.r-right.adm-cell-pills', ...statusPills(tool)),
    );
  }

  /* ---------- reports ---------- */

  function tabReports() {
    const reported = state.tools
      .filter((t) => (state.reportsByTool.get(t.id) || []).length)
      .sort((a, b) => (state.reportsByTool.get(b.id) || []).length - (state.reportsByTool.get(a.id) || []).length);
    const pending = pendingReports();

    const head = panelHead(`Report queue · ${pending} open`,
      reported.length
        ? el('button.btn.btn-soft.btn-sm', { html: `${icon('check', 14)} Dismiss all`, onclick: clearQueue })
        : null);

    if (!reported.length) {
      mainEl.append(el('div.adm-panel', head,
        el('div.adm-empty',
          el('div.e-ico', { html: icon('check', 22) }),
          el('strong', { text: 'Queue clear' }),
          el('span', { text: 'No reports are waiting. Tools auto-hide after three reports and unhide here once the reports are dismissed.' }),
        ),
      ));
      return;
    }

    if (state.error) mainEl.append(errorNote());
    mainEl.append(el('div.adm-panel', head,
      el('div', { style: { display: 'grid', gap: '14px' } }, ...reported.map(reportCard)),
    ));
  }

  function reportCard(tool) {
    const items = state.reportsByTool.get(tool.id) || [];
    return el('div.card.adm-report-card',
      el('div.row-between',
        el('div', { style: { minWidth: '0' } },
          el('div', { style: { fontWeight: 800, fontSize: '15px', overflowWrap: 'anywhere' }, text: tool.name }),
          el('div.field-hint', { text: `${tool.authorName || 'Anonymous'} · ${items.length} report${items.length === 1 ? '' : 's'} · ${fmt.num(tool.runs || 0)} runs` }),
        ),
        el('div.row', { style: { gap: '8px', flexWrap: 'wrap' } }, ...statusPills(tool)),
      ),
      el('div', ...items.map((r) => el('div.adm-report-item',
        el('span.ri-reason', { text: r.reason || 'No reason' }),
        el('span.ri-meta', { text: `${r.uid || 'unknown reporter'} · ${timeAgo(r.createdAt)}` }),
        el('button.adm-ico-btn.ri-dismiss.danger', {
          html: icon('x', 14),
          title: 'Dismiss this report',
          'aria-label': 'Dismiss this report',
          onclick: () => dismissOne(tool, r.id),
        }),
      ))),
      el('div.row', { style: { gap: '8px', flexWrap: 'wrap' } },
        el('button.btn.btn-soft.btn-sm', { html: `${icon('check', 14)} Dismiss reports`, onclick: () => dismissAll(tool) }),
        el('button.btn.btn-soft.btn-sm', { html: `${icon('edit', 14)} Edit`, onclick: () => editModal(tool) }),
        el('button.btn.btn-soft.btn-sm', { html: `${icon(tool.hiddenFlag ? 'eye' : 'lock', 14)} ${tool.hiddenFlag ? 'Unhide' : 'Hide'}`, onclick: () => toggleHide(tool) }),
        el('button.btn.btn-soft.btn-sm', { html: `${icon('star', 14)} ${tool.featured ? 'Unfeature' : 'Feature'}`, onclick: () => toggleFeature(tool) }),
        el('button.btn.btn-soft.btn-sm', { html: `${icon('trash', 14)} Delete`, onclick: () => removeTool(tool) }),
      ),
    );
  }

  /* ---------- tools manager ---------- */

  function visibleTools() {
    let list = state.tools.slice();
    if (state.authorUid) list = list.filter((t) => t.authorUid === state.authorUid);
    if (state.filter === 'featured') list = list.filter((t) => t.featured);
    else if (state.filter === 'hidden') list = list.filter((t) => t.hidden);
    else if (state.filter === 'reported') list = list.filter((t) => (state.reportsByTool.get(t.id) || []).length > 0);
    const q = state.query.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => [t.name, t.description, t.category, t.authorName, t.authorEmail, t.id]
        .some((field) => String(field || '').toLowerCase().includes(q)));
    }
    const byNewest = (a, b) => (b.createdAt || 0) - (a.createdAt || 0);
    if (state.sort === 'runs') list.sort((a, b) => (b.runs || 0) - (a.runs || 0) || byNewest(a, b));
    else if (state.sort === 'rating') list.sort((a, b) => (b.ratingAvg || 0) - (a.ratingAvg || 0) || byNewest(a, b));
    else if (state.sort === 'name') list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    else if (state.sort === 'oldest') list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    else list.sort(byNewest);
    return list;
  }

  function tabTools() {
    const bulkBar = el('div.adm-bulk', { style: { display: 'none' } });
    const tableHost = el('div');

    function paintRows() {
      syncBulk();
      tableHost.innerHTML = '';
      const list = visibleTools();

      if (state.error) tableHost.append(errorNote());

      if (!state.tools.length) {
        tableHost.append(el('div.adm-empty',
          el('div.e-ico', { html: icon('sparkles', 22) }),
          el('strong', { text: 'No community tools yet' }),
          el('span', { text: 'Once someone publishes, every tool shows up here for full management.' }),
        ));
        return;
      }

      tableHost.append(el('div.field-hint', {
        style: { margin: '0 2px 10px' },
        text: `Showing ${list.length} of ${state.tools.length} entries`,
      }));

      if (!list.length) {
        tableHost.append(el('div.adm-empty',
          el('div.e-ico', { html: icon('search', 22) }),
          el('strong', { text: 'Nothing matches this view' }),
          el('span', { text: 'Clear the search or switch the filter to see more.' }),
        ));
        return;
      }

      const allChecked = list.every((t) => state.selected.has(t.id));
      const headCb = el('input', { type: 'checkbox', 'aria-label': 'Select every tool in this view' });
      headCb.checked = allChecked && list.length > 0;
      headCb.addEventListener('change', () => {
        if (headCb.checked) list.forEach((t) => state.selected.add(t.id));
        else list.forEach((t) => state.selected.delete(t.id));
        paintRows();
      });

      const table = el('table.adm-table',
        el('thead', el('tr',
          el('th.col-check', headCb),
          el('th', { text: 'Tool' }),
          el('th', { text: 'Author' }),
          el('th', { text: 'Runs' }),
          el('th', { text: 'Rating' }),
          el('th', { text: 'Reports' }),
          el('th', { text: 'Status' }),
          el('th', { style: { textAlign: 'right' }, text: 'Actions' }),
        )),
        el('tbody', ...list.map((tool) => toolRow(tool, paintRows))),
      );
      tableHost.append(el('div.adm-table-wrap', table));
    }

    function syncBulk() {
      bulkBar.innerHTML = '';
      const n = state.selected.size;
      if (!n) {
        bulkBar.style.display = 'none';
        return;
      }
      bulkBar.style.display = '';
      const bulkBtn = (label, onclick) => el('button.btn.btn-soft.btn-sm', { text: label, onclick });
      bulkBar.append(
        el('span', { text: `${n} selected` }),
        bulkBtn('Feature', () => bulkDo((id) => featureCommunityTool(id, true), 'Featured')),
        bulkBtn('Unfeature', () => bulkDo((id) => featureCommunityTool(id, false), 'Unfeatured')),
        bulkBtn('Hide', () => bulkDo((id) => updateCommunityTool(id, { hidden: true }), 'Hid')),
        bulkBtn('Unhide', () => bulkDo((id) => updateCommunityTool(id, { hidden: false }), 'Unhid')),
        el('button.btn.btn-soft.btn-sm', { html: `${icon('trash', 13)} Delete`, onclick: bulkDelete }),
        el('button.btn.btn-ghost.btn-sm.bulk-spacer', { text: 'Clear selection', onclick: () => { state.selected.clear(); paintRows(); } }),
      );
    }

    async function bulkDo(fn, label) {
      const ids = [...state.selected];
      state.selected.clear();
      let ok = 0;
      let failed = 0;
      for (const id of ids) {
        try {
          await fn(id);
          ok += 1;
        } catch (error) {
          failed += 1;
          console.error('[psdkit] bulk action failed:', error);
        }
      }
      logAction(`${label} · ${ok} of ${ids.length} selected entr${ids.length === 1 ? 'y' : 'ies'}${failed ? ` · ${failed} failed` : ''}`);
      toast(failed ? `${failed} failed, ${ok} updated` : `${ok} of ${ids.length} entries updated`, failed ? 'x' : 'check');
      await reload();
    }

    async function bulkDelete() {
      const n = state.selected.size;
      if (!n) return;
      if (!askConfirm(`Delete the ${n} selected entries? This cannot be undone.`)) return;
      await bulkDo((id) => deleteCommunityTool(id), 'Deleted');
    }

    /* toolbar */
    const applyQuery = debounce((value) => {
      state.query = value;
      paintRows();
    }, 180);
    const searchInput = el('input', {
      type: 'search',
      placeholder: 'Search name, author, email, id…',
      value: state.query,
      oninput: (e) => applyQuery(e.target.value),
    });

    const FILTERS = [
      ['all', 'All'],
      ['featured', 'Featured'],
      ['hidden', 'Hidden'],
      ['reported', 'Reported'],
    ];
    const chips = el('div.adm-chips', ...FILTERS.map(([key, label]) => el('button.adm-filter-chip', {
      class: state.filter === key ? 'active' : '',
      dataset: { filter: key },
      text: label,
      onclick: () => {
        state.filter = key;
        [...chips.children].forEach((c) => c.classList.toggle('active', c.dataset.filter === key));
        paintRows();
      },
    })));

    const sortSel = el('select.select',
      ...[
        ['newest', 'Newest first'],
        ['oldest', 'Oldest first'],
        ['runs', 'Most runs'],
        ['rating', 'Top rated'],
        ['name', 'Name A–Z'],
      ].map(([value, label]) => el('option', { value, text: label })),
    );
    sortSel.value = state.sort;
    sortSel.addEventListener('change', () => {
      state.sort = sortSel.value;
      paintRows();
    });

    const authorChip = state.authorUid
      ? (() => {
        const author = authorDirectory().find((a) => a.uid === state.authorUid);
        return el('div.adm-author-chip',
          el('span', { text: `By ${author ? author.name : state.authorUid}` }),
          el('button', {
            html: icon('x', 13),
            title: 'Clear author filter',
            'aria-label': 'Clear author filter',
            onclick: () => { state.authorUid = null; renderTab(); },
          }),
        );
      })()
      : null;

    const toolbar = el('div.adm-toolbar',
      el('div.search-box',
        el('span.s-ico', { html: icon('search', 17) }),
        searchInput,
      ),
      chips,
      sortSel,
      authorChip,
    );

    mainEl.append(el('div.adm-panel',
      panelHead('Tool manager', el('span.field-hint', { text: 'Search · filter · bulk edit · full control' })),
      toolbar,
      bulkBar,
      tableHost,
    ));
    paintRows();
  }

  function toolRow(tool, repaint) {
    const reports = (state.reportsByTool.get(tool.id) || []).length;
    const cb = el('input', { type: 'checkbox', 'aria-label': `Select ${tool.name}` });
    cb.checked = state.selected.has(tool.id);
    cb.dataset.rowCheck = tool.id;
    cb.addEventListener('change', () => {
      if (cb.checked) state.selected.add(tool.id);
      else state.selected.delete(tool.id);
      repaint();
    });

    return el('tr',
      el('td.col-check', cb),
      el('td', el('div.adm-cell-title',
        el('span.c-name', { text: tool.name, onclick: () => inspectModal(tool) }),
        el('span.c-cat', { text: tool.category || 'General' }),
      )),
      el('td', el('div.adm-cell-author',
        createAvatar({ displayName: tool.authorName, photoURL: tool.authorPhotoURL }, 24),
        el('span', {
          text: tool.authorName || 'Anonymous',
          title: tool.authorEmail || tool.authorUid || '',
        }),
      )),
      el('td.adm-cell-num', { text: fmt.num(tool.runs || 0) }),
      el('td.adm-cell-num', { text: tool.ratingAvg ? tool.ratingAvg.toFixed(1) : '—' }),
      el('td', el('span', { class: reports ? 'adm-cell-num warn' : 'adm-cell-num', text: String(reports) })),
      el('td', el('div.adm-cell-pills', ...statusPills(tool))),
      el('td', el('div.adm-row-actions',
        iconAction('eye', 'Inspect', () => inspectModal(tool)),
        iconAction('edit', 'Edit', () => editModal(tool)),
        iconAction('star', tool.featured ? 'Unfeature' : 'Feature', () => toggleFeature(tool), { on: tool.featured }),
        iconAction('lock', tool.hiddenFlag ? 'Unhide' : 'Hide', () => toggleHide(tool), { on: tool.hiddenFlag }),
        iconAction('trash', 'Delete', () => removeTool(tool), { danger: true }),
      )),
    );
  }

  /* ---------- authors ---------- */

  function tabAuthors() {
    const authors = authorDirectory();
    mainEl.append(el('div.adm-panel',
      panelHead('Author directory',
        el('span.field-hint', { text: `${authors.length} publisher${authors.length === 1 ? '' : 's'} · sorted by runs` })),
      authors.length
        ? el('div', { style: { display: 'grid', gap: '12px' } }, ...authors.map(authorCard))
        : el('div.adm-empty',
          el('div.e-ico', { html: icon('users', 22) }),
          el('strong', { text: 'No publishers yet' }),
          el('span', { text: 'Authors appear here as soon as tools are published.' }),
        ),
    ));
  }

  function authorCard(a) {
    const statTile = (html) => el('span.adm-author-stat', { html });
    return el('div.card.adm-author-card',
      createAvatar({ displayName: a.name, photoURL: a.photoURL }, 42),
      el('div.a-body',
        el('div.a-name', { text: a.name }),
        el('div.a-mail', { text: a.email || 'No email on file' }),
        el('div.a-uid.adm-mono', { text: a.uid }),
      ),
      el('div.adm-author-stats',
        statTile(`<strong>${fmt.num(a.tools)}</strong> tool${a.tools === 1 ? '' : 's'}`),
        statTile(`<strong>${fmt.num(a.runs)}</strong> runs`),
        statTile(`<strong>${fmt.num(a.reports)}</strong> reports`),
        a.hidden ? statTile(`<strong>${fmt.num(a.hidden)}</strong> hidden`) : null,
      ),
      el('div.adm-row-actions',
        iconAction('search', 'View their tools', () => {
          state.authorUid = a.uid;
          state.query = '';
          state.filter = 'all';
          state.tab = 'tools';
          renderTab();
        }),
        iconAction('copy', 'Copy UID', () => copyText(a.uid)),
      ),
    );
  }

  /* ---------- activity log ---------- */

  function tabLog() {
    const entries = readLog();
    mainEl.append(el('div.adm-panel',
      panelHead('Moderation log',
        entries.length
          ? el('button.btn.btn-soft.btn-sm', {
            html: `${icon('trash', 14)} Clear log`,
            onclick: () => { writeLog([]); renderTab(); toast('Log cleared'); },
          })
          : null),
      entries.length
        ? el('div', ...entries.map((entry) => el('div.adm-log-row',
          el('span.lg-time', { text: new Date(entry.at).toLocaleString() }),
          el('span.lg-msg', { text: entry.message }),
        )))
        : el('div.adm-empty',
          el('div.e-ico', { html: icon('clock', 22) }),
          el('strong', { text: 'Nothing logged yet' }),
          el('span', { text: 'Every moderation step from this panel is recorded here and persists in this browser.' }),
        ),
    ));
  }

  /* ---------- modals ---------- */

  function adminModal({ title, subtitle, body, width = 'min(880px,100%)' }) {
    const modalEl = el('div.modal-backdrop',
      el('div.modal', { style: { width } },
        el('div.modal-head',
          el('div',
            el('div.modal-title', { text: title }),
            subtitle ? el('div.field-hint.mt-1', { text: subtitle }) : null,
          ),
          el('button.modal-close', { html: icon('x', 18), 'aria-label': 'Close dialog' }),
        ),
        el('div.modal-body', body),
      ),
    );
    const close = () => {
      modalEl.classList.remove('open');
      stopTrap?.();
      document.body.style.overflow = '';
      setTimeout(() => modalEl.remove(), 240);
    };
    const stopTrap = trapFocus(modalEl.querySelector('.modal'), { onEscape: close });
    modalEl.querySelector('.modal-close').addEventListener('click', close);
    modalEl.addEventListener('click', (e) => { if (e.target === modalEl) close(); });
    document.body.append(modalEl);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => modalEl.classList.add('open'));
    return { modal: modalEl, close };
  }

  function metaTile(k, vNode) {
    return el('div.adm-meta-tile',
      el('span.mt-k', { text: k }),
      el('span.mt-v', vNode instanceof Node ? vNode : { text: String(vNode) }),
    );
  }

  function inspectModal(tool) {
    const items = state.reportsByTool.get(tool.id) || [];
    const frame = el('iframe.preview-frame', {
      sandbox: 'allow-scripts',
      srcdoc: srcdoc(tool.code),
      style: { height: '320px' },
      title: `Preview of ${tool.name}`,
    });
    const codePre = el('pre.code', {
      style: { display: 'none', maxHeight: '300px', overflow: 'auto', marginTop: '12px' },
      text: tool.code || '',
    });
    const codeToggle = el('button.btn.btn-soft.btn-sm', {
      html: `${icon('code', 14)} View source`,
      onclick: () => {
        const open = codePre.style.display === 'block';
        codePre.style.display = open ? 'none' : 'block';
        codeToggle.innerHTML = `${icon('code', 14)} ${open ? 'View source' : 'Hide source'}`;
      },
    });

    const panelBody = el('div',
      el('p.text-muted', { style: { fontSize: '14px', lineHeight: 1.7, marginBottom: '12px' }, text: tool.description || 'No description.' }),
      el('div.row', { style: { gap: '8px', flexWrap: 'wrap', marginBottom: '12px' } }, ...statusPills(tool)),
      frame,
      el('div.adm-modal-meta',
        metaTile('Author', el('span', { style: { display: 'flex', alignItems: 'center', gap: '7px', minWidth: '0' } },
          createAvatar({ displayName: tool.authorName, photoURL: tool.authorPhotoURL }, 24),
          el('span', { style: { minWidth: '0', overflowWrap: 'anywhere' }, text: tool.authorName || 'Anonymous' }),
        )),
        metaTile('Email', tool.authorEmail || '—'),
        metaTile('Author UID', el('code.adm-mono', { text: tool.authorUid || '—' })),
        metaTile('Doc ID', el('code.adm-mono', { text: tool.id })),
        metaTile('Category', tool.category || 'General'),
        metaTile('Runs', fmt.num(tool.runs || 0)),
        metaTile('Rating', tool.ratingAvg ? `${tool.ratingAvg.toFixed(1)} ★ · ${fmt.num(tool.ratingCount || 0)}` : '—'),
        metaTile('Reports', String(items.length || tool.reportCount || 0)),
        metaTile('Created', tool.createdAt ? fmt.date(tool.createdAt) : '—'),
        metaTile('Updated', tool.updatedAt ? fmt.date(tool.updatedAt) : '—'),
      ),
      items.length
        ? el('div.card', { style: { marginBottom: '12px' } },
          el('div.adm-panel-title', { style: { marginBottom: '8px' }, text: 'Open reports' }),
          ...items.map((r) => el('div.adm-report-item',
            el('span.ri-reason', { text: r.reason || 'No reason' }),
            el('span.ri-meta', { text: `${r.uid || 'unknown reporter'} · ${timeAgo(r.createdAt)}` }),
            el('button.adm-ico-btn.ri-dismiss.danger', {
              html: icon('x', 14),
              title: 'Dismiss this report',
              'aria-label': 'Dismiss this report',
              onclick: () => { dismissOne(tool, r.id); },
            }),
          )),
        )
        : null,
      el('div.tool-actions', { style: { flexWrap: 'wrap', gap: '8px' } },
        el('button.btn.btn-primary.btn-sm', { html: `${icon('edit', 14)} Edit tool`, onclick: () => { close(); editModal(tool); } }),
        el('button.btn.btn-soft.btn-sm', { html: `${icon('star', 14)} ${tool.featured ? 'Unfeature' : 'Feature'}`, onclick: () => { close(); toggleFeature(tool); } }),
        el('button.btn.btn-soft.btn-sm', { html: `${icon(tool.hiddenFlag ? 'eye' : 'lock', 14)} ${tool.hiddenFlag ? 'Unhide' : 'Hide'}`, onclick: () => { close(); toggleHide(tool); } }),
        el('button.btn.btn-soft.btn-sm', { html: `${icon('copy', 14)} Copy code`, onclick: () => copyText(tool.code || '') }),
        el('button.btn.btn-soft.btn-sm', { html: `${icon('copy', 14)} Copy ID`, onclick: () => copyText(tool.id) }),
        codeToggle,
        el('button.btn.btn-soft.btn-sm', { html: `${icon('trash', 14)} Delete`, onclick: () => { close(); removeTool(tool); } }),
      ),
      codePre,
    );

    const { close } = adminModal({
      title: tool.name,
      subtitle: `${tool.authorName || 'Anonymous'} · ${tool.category || 'General'} · updated ${timeAgo(tool.updatedAt || tool.createdAt)}`,
      body: panelBody,
    });
  }

  function editModal(tool) {
    const nameIn = el('input.input', { value: tool.name || '', maxlength: 80, placeholder: 'Tool name' });
    const descIn = el('textarea.textarea', { rows: 3, maxlength: 500, placeholder: 'What does it do?', value: tool.description || '' });
    const catIn = el('select.select');
    const cats = CATS.includes(tool.category) ? CATS : [...CATS, tool.category || 'General'].filter(Boolean);
    cats.forEach((c) => catIn.append(el('option', { text: c })));
    catIn.value = tool.category || cats[0];
    const runsIn = el('input.input', { type: 'number', min: '0', step: '1', value: String(tool.runs || 0) });

    const featIn = el('input', { type: 'checkbox' });
    featIn.checked = !!tool.featured;
    const hideIn = el('input', { type: 'checkbox' });
    hideIn.checked = !!tool.hiddenFlag;

    const codeIn = el('textarea.textarea.code-area', { rows: 12, value: tool.code || '' });
    const preview = el('iframe.preview-frame', {
      sandbox: 'allow-scripts',
      style: { height: '260px', width: '100%' },
      title: 'Live preview',
    });
    const refreshPreview = debounce(() => {
      preview.srcdoc = srcdoc(codeIn.value);
    }, 250);
    codeIn.addEventListener('input', refreshPreview);
    refreshPreview();

    const errLine = el('div.field-hint', { style: { color: 'var(--adm-danger)', minHeight: '16px' } });

    const save = async () => {
      const name = nameIn.value.trim();
      const description = descIn.value.trim();
      const code = codeIn.value.trim();
      const problem = validateForm({ name, description, code });
      if (problem) {
        errLine.textContent = problem;
        return toast(problem, 'x');
      }
      const runs = Math.max(0, Math.floor(Number(runsIn.value) || 0));
      const patch = {
        name,
        description,
        code,
        category: catIn.value,
        runs,
        featured: featIn.checked,
        hidden: hideIn.checked,
      };
      close();
      await run(() => updateCommunityTool(tool.id, patch), `Edited “${name}”`);
    };

    const formBody = el('div',
      el('div.adm-edit-grid',
        el('div.col', { style: { gap: '14px' } },
          el('div.field', el('label.field-label', { text: 'Tool name' }), nameIn),
          el('div.field', el('label.field-label', { text: 'Description' }), descIn),
          el('div.adm-edit-grid',
            el('div.field', el('label.field-label', { text: 'Category' }), catIn),
            el('div.field', el('label.field-label', { text: 'Runs (edit the counter)' }), runsIn),
          ),
          el('div.adm-toggles',
            el('label.checkline', featIn, el('span', { text: 'Featured — show as a community pick' })),
            el('label.checkline', hideIn, el('span', { text: 'Hidden — keep off every public list' })),
          ),
          errLine,
        ),
        el('div.col', { style: { gap: '12px' } },
          el('div.adm-panel-title', { text: 'live preview' }),
          preview,
          el('div.field', el('label.field-label', { text: 'Code (HTML / CSS / JS)' }), codeIn),
          el('div.adm-hint-row',
            el('span', { html: icon('info', 14) }),
            el('span', { text: 'Runs in a sandboxed iframe. Name, description and code limits match firestore.rules — the save is checked here before it is sent.' }),
          ),
        ),
      ),
      el('div.tool-actions', { style: { marginTop: '16px', gap: '10px' } },
        el('button.btn.btn-primary', { html: `${icon('check', 15)} Save changes`, onclick: save }),
        el('button.btn.btn-soft', { text: 'Cancel', onclick: () => close() }),
      ),
    );

    const { close } = adminModal({
      title: `Edit “${tool.name}”`,
      subtitle: `doc ${tool.id} · created ${tool.createdAt ? fmt.date(tool.createdAt) : '—'}`,
      body: formBody,
      width: 'min(980px,100%)',
    });
  }

  /* ---------- boot ---------- */

  try {
    showGate(gateLoading());
    const me = seedUser || sessionUser();
    if (!firebaseReady) {
      showGate(gateConfig());
      return;
    }
    if (!me) {
      showGate(gateSignIn());
      return;
    }
    const admin = await isAdmin(me.uid);
    if (!admin) {
      showGate(gateDenied(me));
      return;
    }
    state.me = me;
    await loadData();
    buildFrame();
    renderTab();
  } catch (error) {
    console.error('[psdkit] admin panel failed:', error);
    showGate(gateError(error));
  }
}
