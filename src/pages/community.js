/* Community tools — browse, rate, report, publish and manage */
import { el, toast, copyText, debounce, fmt, createAvatar, trapFocus } from '../ui.js';
import { icon } from '../icons.js';
import {
  firebaseReady, firebaseConfigProblem, signInWithGoogle, signOutUser,
  submitCommunityTool, listCommunityTools, incrementRuns,
  updateCommunityTool, deleteCommunityTool, rateCommunityTool, reportCommunityTool,
  currentUser, isAdmin, getCommunityTool, featureCommunityTool, adminDeleteCommunityTool, listReportedTools,
  onCommunityStatus,
} from '../firebase.js';
import { t } from '../data/i18n.js';

export const SAMPLE_TOOLS = [
  {
    id: 'sample-lorem', name: 'Word of the Day', authorName: 'PSDKIT Team', featured: true, runs: 1204,
    description: 'Shows a fresh English word with its meaning every time you open it — a tiny vocabulary habit.',
    category: 'Learning',
    ratingAvg: 4.8,
    ratingCount: 18,
    code: `<div style="font-family:Georgia,serif;text-align:center;padding:28px"><div style="font-size:11px;letter-spacing:.22em;color:#DE5D35;text-transform:uppercase">word of the day</div><h1 id="w" style="font-size:38px;margin:12px 0 6px;color:#161514"></h1><div id="p" style="color:#8A8178;font-size:14px"></div><p id="d" style="max-width:420px;margin:14px auto;line-height:1.7;color:#635E59"></p><button onclick="pick()" style="background:#DE5D35;color:#fff;border:none;padding:11px 22px;border-radius:999px;font-size:14px;cursor:pointer">Another word</button></div><script>const words=[["Serendipity","/ˌsɛrənˈdɪpɪti/","Finding something good without looking for it."],["Ephemeral","/ɪˈfɛm(ə)rəl/","Lasting for a very short time."],["Luminous","/ˈluːmɪnəs/","Giving off light; bright or shining."],["Resilient","/rɪˈzɪlɪənt/","Able to recover quickly from difficulties."],["Eloquent","/ˈɛləkwənt/","Fluent and persuasive in speaking or writing."]];function pick(){const [w,p,d]=words[Math.floor(Math.random()*words.length)];document.getElementById('w').textContent=w;document.getElementById('p').textContent=p;document.getElementById('d').textContent=d;}pick();<\/script>`,
  },
  {
    id: 'sample-timer', name: 'Breathing Exercise', authorName: 'PSDKIT Team', featured: true, runs: 862,
    description: 'A calm 4-7-8 breathing circle to reset your focus in one minute.', category: 'Wellness', ratingAvg: 4.7, ratingCount: 11,
    code: `<div style="text-align:center;padding:24px;font-family:sans-serif"><div id="circle" style="width:150px;height:150px;border-radius:50%;background:#F2CDBD;margin:10px auto;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#8A4227;transition:transform 4s ease-in-out">Ready</div><p id="t" style="color:#635E59;min-height:24px">Press start for the 4-7-8 breathing cycle</p><button onclick="start()" style="background:#161514;color:#F5EFE6;border:none;padding:11px 22px;border-radius:999px;font-size:14px;cursor:pointer">Start</button></div><script>function start(){const c=document.getElementById('circle'),t=document.getElementById('t');const phase=()=>{c.style.transform='scale(1.25)';c.textContent='Breathe in';t.textContent='Inhale through your nose — 4 seconds';setTimeout(()=>{c.textContent='Hold';t.textContent='Hold — 7 seconds';},4000);setTimeout(()=>{c.style.transform='scale(1)';c.textContent='Breathe out';t.textContent='Exhale slowly — 8 seconds';},11000);setTimeout(phase,19000);};phase();}<\/script>`,
  },
  {
    id: 'sample-focus', name: 'Focus Quote Spinner', authorName: 'PSDKIT Team', featured: false, runs: 531,
    description: 'Spin for a motivational quote when you need a little push to keep going.', category: 'Motivation', ratingAvg: 4.5, ratingCount: 9,
    code: `<div style="text-align:center;padding:30px;font-family:sans-serif"><p id="q" style="font-size:20px;line-height:1.6;color:#161514;max-width:420px;margin:0 auto 8px"></p><div id="a" style="color:#DE5D35;font-weight:700;margin-bottom:18px"></div><button onclick="spin()" style="background:#DE5D35;color:#fff;border:none;padding:11px 22px;border-radius:999px;font-size:14px;cursor:pointer">New quote</button></div><script>const qs=[["The secret of getting ahead is getting started.","Mark Twain"],["Focus is deciding what you are not going to do.","John Carmack"],["Simplicity is the ultimate sophistication.","Leonardo da Vinci"],["First, solve the problem. Then, write the code.","John Johnson"]];function spin(){const [q,a]=qs[Math.floor(Math.random()*qs.length)];document.getElementById('q').textContent='"'+q+'"';document.getElementById('a').textContent='— '+a;}spin();<\/script>`,
  },
];

function googleIcon() {
  return `<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path fill="#EA4335" d="M9 7.364v3.545h4.929c-.218 1.14-.873 2.104-1.855 2.75l3 2.327C16.823 14.387 18 11.95 18 9c0-.61-.055-1.197-.155-1.773H9Z"/><path fill="#4285F4" d="M9 18c2.43 0 4.47-.805 5.96-2.186l-3-2.327c-.833.559-1.9.891-2.96.891-2.276 0-4.204-1.536-4.893-3.6H1.005v2.391A9 9 0 0 0 9 18Z"/><path fill="#FBBC05" d="M4.107 10.778A5.407 5.407 0 0 1 3.833 9c0-.616.1-1.214.274-1.778V4.831H1.005A9.001 9.001 0 0 0 0 9c0 1.45.346 2.824 1.005 4.169l3.102-2.391Z"/><path fill="#34A853" d="M9 3.622c1.322 0 2.509.455 3.443 1.35l2.582-2.582C13.464.949 11.425 0 9 0A9 9 0 0 0 1.005 4.831l3.102 2.391C4.796 5.158 6.724 3.622 9 3.622Z"/></svg>`;
}

function currentSessionUser() {
  return window.PSDKIT_APP?.getAuthUser?.() || currentUser();
}

/* ---------- data health ----------
   The grid used to answer "did the read work?" with `live.length ? live : SAMPLES`,
   which renders a missing Firestore index, a denied rule and a genuinely empty
   database as the exact same three sample cards. Now the read's error travels
   with the data all the way to the screen. */

/** Built-in demos live in this file only — they have no Firestore document. */
export function isSampleTool(tool) {
  return !tool?.authorUid || String(tool.id || '').startsWith('sample-');
}

/* A tool published a second ago must not wait for the next read to show up. */
let pendingTools = [];

/** Queue a just-published tool so the grid can render it before the refetch. */
export function notePublishedTool(tool) {
  if (!tool?.id) return;
  pendingTools = [tool, ...pendingTools.filter((t) => t.id !== tool.id)];
}

/** Drop queued tools the server has caught up with; prepend the rest. */
function reconcilePending(live, sort) {
  if (!pendingTools.length) return live;
  const seen = new Set(live.map((tool) => tool.id));
  pendingTools = pendingTools.filter((tool) => !seen.has(tool.id));
  if (!pendingTools.length) return live;
  /* A brand-new tool has no runs yet, so under "trending" it belongs last. */
  return sort === 'trending' ? [...live, ...pendingTools] : [...pendingTools, ...live];
}

const announcedProblems = new Set();
/** Say it once per kind of failure instead of hiding it behind sample cards. */
function announceProblem(error) {
  const key = error?.code || error?.message || 'unknown';
  if (!key || announcedProblems.has(key)) return;
  announcedProblems.add(key);
  toast('Community tools could not load — check the note on the page', 'info');
}

onCommunityStatus((status) => {
  if (status && !status.ok) announceProblem(status);
});

/** The red banner that replaces the old "everything is fine" silence. */
function dataProblemNote(error) {
  return el('div.note', { style: { marginBottom: '22px' } },
    el('div', { html: icon('info', 17) }),
    el('span', {},
      el('strong', { text: 'Community tools could not load. ' }),
      el('span', { text: `${error?.message || 'Firestore request failed.'} Built-in samples are shown below — anything you published is still saved in Firestore.` }),
    ),
  );
}

function ratingStars(tool, user, onRefresh) {
  const wrap = el('div.rating-row');
  const mine = tool.myRating || 0;
  /* Built-in samples have no Firestore document, so a rating written against
     them would be an orphan row that no query ever joins back to. */
  const sample = isSampleTool(tool);
  wrap.append(el('div.field-hint', { text: `${tool.ratingAvg ? tool.ratingAvg.toFixed(1) : '—'} ★ · ${tool.ratingCount || 0} rating${tool.ratingCount === 1 ? '' : 's'}` }));
  for (let i = 1; i <= 5; i++) {
    wrap.append(el('button.rating-star', {
      class: i <= mine ? 'active' : '',
      'aria-label': `Rate ${i} star${i === 1 ? '' : 's'}`,
      html: icon('star', 15),
      onclick: async (e) => {
        e.stopPropagation();
        if (sample) return toast('Built-in samples cannot be rated', 'info');
        if (!firebaseReady) return toast('Connect Firebase to enable ratings', 'info');
        if (!user) return toast('Sign in to rate community tools', 'info');
        try {
          await rateCommunityTool(tool.id, i, user);
          toast('Thanks for rating this tool');
          onRefresh?.();
        } catch (error) {
          toast(error.message || 'Rating failed', 'x');
        }
      },
    }));
  }
  return wrap;
}

export function communityCard(tool, { compact = false, onRefresh } = {}) {
  const user = currentSessionUser();
  const sample = isSampleTool(tool);
  return el('div.card.card-hover.community-card', {
    onclick: () => openToolModal(tool, { onRefresh }),
  },
  el('div.row-between',
    el('div.t-icon.tile-sand', { style: { width: compact ? '40px' : '42px', height: compact ? '40px' : '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }, html: icon('sparkles', 19) }),
    el('div.row', { style: { gap: '8px' } },
      sample ? el('span.badge.badge-free', { text: 'Sample' }) : null,
      tool.featured ? el('span.badge.badge-free', { text: 'Featured' }) : null,
      tool.hidden ? el('span.badge.badge-free', { text: 'Hidden' }) : null,
    ),
  ),
  el('div.t-name', { text: tool.name }),
  el('div.t-desc', { text: tool.description }),
  el('div.community-meta',
    el('span', { html: `${icon('activity', 14)} ${tool.runs || 0}` }),
    el('span', { html: `${icon('star', 14)} ${tool.ratingAvg ? tool.ratingAvg.toFixed(1) : '—'} (${tool.ratingCount || 0})` }),
  ),
  el('div.row-between', { style: { marginTop: 'auto' } },
    el('div.author-chip',
      createAvatar({ displayName: tool.authorName, photoURL: tool.authorPhotoURL }, 28),
      el('span', { text: tool.authorName || 'Anonymous' }),
    ),
    el('span.field-hint', { text: tool.category || 'General' }),
  ),
  ratingStars(tool, user, onRefresh));
}

export function openToolModal(tool, { onRefresh } = {}) {
  const sample = isSampleTool(tool);
  const user = currentSessionUser();
  const body = el('div.modal-body');
  const modal = el('div.modal-backdrop',
    el('div.modal', { style: { width: 'min(860px,100%)' } },
      el('div.modal-head',
        el('div',
          el('div.modal-title', { text: tool.name }),
          el('div.author-chip.mt-1', createAvatar({ displayName: tool.authorName, photoURL: tool.authorPhotoURL }, 28), el('span', { text: `${tool.authorName || 'Anonymous'} · ${tool.category || 'General'}` })),
        ),
        el('button.modal-close', { html: icon('x', 18), 'aria-label': 'Close tool preview' }),
      ),
      body,
    ),
  );

  const close = () => {
    modal.classList.remove('open');
    stopTrap?.();
    document.body.style.overflow = '';
    setTimeout(() => modal.remove(), 240);
  };
  const stopTrap = trapFocus(modal.querySelector('.modal'), { onEscape: close });
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  const frame = el('iframe.preview-frame', {
    sandbox: 'allow-scripts',
    srcdoc: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:8px;background:#FAF7F2;font-family:'Plus Jakarta Sans',sans-serif}</style></head><body>${tool.code}</body></html>`,
    style: { height: '380px' },
  });

  const reportReason = el('select.select', { style: { maxWidth: '220px' } });
  ['Spam', 'Broken', 'Unsafe code', 'Copyright concern', 'Other'].forEach((label) => reportReason.append(el('option', { text: label })));

  const actionRow = el('div.tool-actions', { style: { marginTop: '14px', flexWrap: 'wrap' } },
    el('button.btn.btn-soft', { html: `${icon('code', 15)} View source`, onclick: () => { source.style.display = source.style.display === 'none' ? 'block' : 'none'; } }),
    el('button.btn.btn-soft', { html: `${icon('copy', 15)} Copy code`, onclick: () => copyText(tool.code) }),
  );
  if (firebaseReady && !sample) {
    actionRow.append(reportReason,
      el('button.btn.btn-soft', { html: `${icon('flag', 15)} ${t('report')}`, onclick: async () => {
        if (!user) return toast('Sign in to report a tool', 'info');
        try {
          await reportCommunityTool(tool.id, reportReason.value, user);
          toast('Report sent — thank you');
          onRefresh?.();
        } catch (error) {
          toast(error.message || 'Report failed', 'x');
        }
      } }));
  }
  const canManage = !sample && user && (user.uid === tool.authorUid || (!!tool.authorEmail && tool.authorEmail === user.email));
  if (canManage) {
    actionRow.append(
      el('a.btn.btn-soft', { href: `#/community/edit/${tool.id}`, html: `${icon('edit', 15)} ${t('edit')}`, onclick: close }),
      el('button.btn.btn-soft', { html: `${icon('trash', 15)} ${t('delete')}`, onclick: async () => {
        if (!confirm(`Delete “${tool.name}”?`)) return;
        try {
          await deleteCommunityTool(tool.id);
          toast('Tool deleted');
          close();
          onRefresh?.();
        } catch (error) {
          toast(error.message || 'Delete failed', 'x');
        }
      } }),
    );
  }

  const source = el('pre.code', { style: { display: 'none', maxHeight: '280px', overflow: 'auto' }, text: tool.code });
  const refreshData = async () => {
    if (sample || !firebaseReady) return onRefresh?.();
    const { tool: fresh, error } = await getCommunityTool(tool.id);
    if (error) {
      toast(error.message || 'Could not refresh this tool', 'x');
    } else if (fresh) {
      tool = fresh;
      ratingHost.innerHTML = '';
      ratingHost.append(ratingStars(tool, currentSessionUser(), refreshData));
    }
    onRefresh?.();
  };
  const ratingHost = el('div', ratingStars(tool, user, refreshData));

  /* The counter was written before this frame existed but the label kept the
     old number until the whole grid refetched — it looked stuck at 0. */
  const runsLabel = el('span', { html: `${icon('activity', 14)} ${tool.runs || 0} runs` });
  if (!sample) {
    incrementRuns(tool.id).then((ok) => {
      if (!ok) return;
      tool.runs = (tool.runs || 0) + 1;
      runsLabel.innerHTML = `${icon('activity', 14)} ${tool.runs} runs`;
    });
  }

  body.append(
    el('p.text-muted', { style: { fontSize: '14px', lineHeight: 1.7, marginBottom: '14px' }, text: tool.description }),
    sample ? el('div.note', { style: { marginBottom: '14px' }, html: `${icon('info', 16)}<span>Built-in sample — it is not stored in Firestore, so it cannot be rated, edited or deleted.</span>` }) : null,
    frame,
    el('div.community-meta.mt-2',
      runsLabel,
      el('span', { html: `${icon('flag', 14)} ${tool.reportCount || 0} reports` }),
    ),
    ratingHost,
    actionRow,
    source,
  );
  document.body.append(modal);
  requestAnimationFrame(() => modal.classList.add('open'));
}

/**
 * @returns {Promise<{tools: object[], live: boolean, error: Error|null}>}
 * `live` is false only when the read failed or Firebase is not configured —
 * that is the difference between "here are your tools" and "here are three
 * demos, sorry". An empty live list is passed through as an empty list.
 */
async function loadTools({ sort = 'latest', includeHidden = false } = {}) {
  if (!firebaseReady) return { tools: SAMPLE_TOOLS, live: false, error: null };
  const { tools, error } = await listCommunityTools({ sort, includeHidden });
  if (error || !tools) {
    announceProblem(error);
    return { tools: SAMPLE_TOOLS, live: false, error: error || new Error(friendlyErrorText()) };
  }
  return { tools: reconcilePending(tools, sort), live: true, error: null };
}

function friendlyErrorText() {
  return firebaseConfigProblem || 'Firestore request failed.';
}

export async function renderFeaturedCommunityGrid(host, limit = 3) {
  const { tools } = await loadTools({ sort: 'latest' });
  host.innerHTML = '';
  host.append(...tools.slice(0, limit).map((tool) => communityCard(tool, { compact: true, onRefresh: async () => renderFeaturedCommunityGrid(host, limit) })));
}

function inlineSignInCard() {
  if (!firebaseReady) {
    return el('div.note', {},
      el('div', { html: icon('info', 17) }),
      el('span', {},
        el('strong', { text: 'Publishing is disabled. ' }),
        el('span', { text: `${firebaseConfigProblem} The page still works without an account — see DEPLOYMENT.md, or set window.PSDKIT_FIREBASE_CONFIG in index.html to switch it on without a redeploy.` }),
      ),
    );
  }
  return el('div.card.signin-inline',
    el('div',
      el('div', { style: { fontWeight: 800, fontSize: '15px' } }, 'Sign in to publish'),
      el('div.field-hint', { text: 'Use Google so your tools stay credited to you.' }),
    ),
    el('div.row', { style: { gap: '10px', flexWrap: 'wrap' } },
      el('button.btn.btn-primary.btn-sm', { html: `${googleIcon()} ${t('continueWithGoogle')}`, onclick: async () => {
        try { await signInWithGoogle({ returnTo: '#/community/add' }); } catch (error) {
          toast(error.message || 'Sign-in failed', 'x');
        }
      } }),
      el('a.btn.btn-soft.btn-sm', { href: '#/signin', text: t('signIn') }),
    ),
  );
}

/* ── #/community — browse ── */
export function renderCommunityPage(root) {
  let sort = 'latest';
  const grid = el('div.grid.grid-3');
  const status = el('div.field-hint', { text: 'Loading community tools…' });
  const problemSlot = el('div');
  const sortToggle = el('div.locale-toggle',
    el('button', { class: 'active', text: t('latest'), onclick: () => { sort = 'latest'; sync(); } }),
    el('button', { text: t('trending'), onclick: () => { sort = 'trending'; sync(); } }),
  );

  const sync = async () => {
    sortToggle.querySelectorAll('button').forEach((btn, index) => btn.classList.toggle('active', (index === 0 && sort === 'latest') || (index === 1 && sort === 'trending')));
    status.textContent = 'Loading community tools…';
    const { tools, live, error } = await loadTools({ sort });
    const plural = tools.length === 1 ? '' : 's';
    status.textContent = live
      ? `${tools.length} community tool${plural} · ${sort === 'trending' ? 'sorted by runs' : 'newest first'}`
      : `Showing ${tools.length} built-in sample${plural} · ${firebaseReady ? 'live tools unavailable' : 'Firebase not connected'}`;
    problemSlot.innerHTML = '';
    if (error) problemSlot.append(dataProblemNote(error));
    grid.innerHTML = '';
    if (!tools.length) {
      grid.append(el('div.empty-state', { style: { gridColumn: '1 / -1' } },
        el('div', { html: icon('sparkles', 24) }),
        el('div', { style: { marginTop: '10px', fontWeight: 800 }, text: 'No community tools yet' }),
        el('div', { style: { marginTop: '8px' }, text: 'Be the first — publish a tool and it appears here for everyone.' }),
        el('a.btn.btn-accent', { style: { marginTop: '16px' }, href: '#/community/add', text: t('publishATool') }),
      ));
      return;
    }
    grid.append(...tools.map((tool) => communityCard(tool, { onRefresh: sync })));
  };

  root.append(el('div.page-top', { style: { paddingBottom: '70px' } },
    el('div.page-head',
      el('div.wrap',
        el('div.breadcrumb', el('a', { href: '#/', text: 'Home' }), el('span.sep', { text: '/' }), el('span', { text: 'Community' })),
        el('div.row-between', { style: { marginTop: '14px', alignItems: 'flex-end' } },
          el('div',
            el('h1.display', { style: { fontSize: 'clamp(32px,5vw,48px)', marginBottom: '10px' }, html: 'Community <em>Toolbox</em>' }),
            el('p.lede', { text: 'Tools made by people like you — rate what helps, report what feels wrong, and publish your own in minutes.' }),
          ),
          el('a.btn.btn-primary', { href: '#/community/add', html: `${icon('plus', 17)} ${t('publishATool')}` }),
        ),
      ),
    ),
    el('div.wrap',
      el('div.note', { style: { marginBottom: '22px' } },
        el('div', { html: `${icon('shield', 17)}` }),
        el('span', { html: firebaseReady ? 'Community tools run inside a locked sandbox. Read the code before using anything — just like open-source software. Yours show up here on the Community page and on your profile — the main Tools catalogue is a fixed built-in set.' : 'Showing built-in sample tools. Connect Firebase to enable live publishing, ratings and moderation.' }),
      ),
      problemSlot,
      el('div.row-between', { style: { marginBottom: '16px', alignItems: 'center' } }, status, sortToggle),
      grid,
    ),
  ));
  sync();
}

/* ── #/community/add and #/community/edit/:id — publish ── */
export function renderSubmitPage(root, user, editId = null) {
  const nameIn = el('input.input', { placeholder: 'e.g. QR Code for Wi-Fi', maxlength: 60 });
  const descIn = el('textarea.textarea', { rows: 3, placeholder: 'One or two sentences — what does your tool do?', maxlength: 300 });
  const catIn = el('select.select');
  ['Daily', 'Internet', 'Essentials', 'Coding', 'Learning', 'Fun', 'Wellness', 'Productivity'].forEach((c) => catIn.append(el('option', { text: c })));
  const codeIn = el('textarea.textarea.code-area', { rows: 12, placeholder: 'Paste HTML / CSS / JavaScript here. Everything runs in a sandboxed iframe.' });
  const preview = el('iframe.preview-frame', {
    sandbox: 'allow-scripts',
    style: { height: '300px', background: '#fff', border: '1.5px solid var(--cream-line)', borderRadius: '14px', width: '100%' },
  });
  const formTitle = el('h1.display', { style: { fontSize: 'clamp(30px,4.5vw,44px)', marginBottom: '10px' }, html: `${editId ? 'Edit your <em>tool</em>' : 'Publish a <em>tool</em>'}` });
  const authBar = el('div');
  /* Held until the edit form proves it loaded the real document. Saving a
     form that hydrated from a failed read would overwrite the author's code
     with the placeholder that ships in the textarea. */
  let editReady = !editId;

  codeIn.value = `<div style="text-align:center;padding:20px;font-family:sans-serif"><h2>Hello from my tool</h2><p>Edit this code and preview it live.</p><button onclick="alert('It works!')">Click me</button></div><script>console.log('My tool is alive');<\/script>`;
  const refreshPreview = debounce(() => {
    preview.srcdoc = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:8px}</style></head><body>${codeIn.value}</body></html>`;
  }, 250);
  codeIn.addEventListener('input', refreshPreview);

  const renderAuth = (account) => {
    authBar.innerHTML = '';
    if (account) {
      authBar.append(el('div.card', { style: { padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' } },
        el('div.author-chip', createAvatar(account, 36), el('div', { html: `Publishing as <strong>${account.displayName || account.email}</strong>` })),
        el('button.btn.btn-soft.btn-sm', { html: `${icon('user', 14)} ${t('signOut')}`, onclick: async () => { await signOutUser(); renderAuth(null); } }),
      ));
    } else {
      authBar.append(inlineSignInCard());
    }
  };
  renderAuth(user);

  const blockEdit = (message) => {
    editReady = false;
    [nameIn, descIn, catIn, codeIn].forEach((field) => { field.disabled = true; });
    authBar.append(el('div.note', {},
      el('div', { html: icon('info', 17) }),
      el('span', { text: message }),
    ));
  };

  const hydrateEdit = async () => {
    if (!editId || !firebaseReady) return;
    const { tool, error } = await getCommunityTool(editId);
    if (error) return blockEdit(`This tool could not be loaded, so editing is locked to protect your code. ${error.message}`);
    if (!tool) return blockEdit('That tool no longer exists — it may have been deleted.');
    const me = currentSessionUser();
    const admin = await isAdmin(me?.uid);
    if (!(me && (me.uid === tool.authorUid || admin))) {
      return blockEdit('You can only edit tools you published yourself.');
    }
    nameIn.value = tool.name || '';
    descIn.value = tool.description || '';
    catIn.value = tool.category || catIn.value;
    codeIn.value = tool.code || '';
    refreshPreview();
    editReady = true;
  };

  const publish = async () => {
    const activeUser = currentSessionUser();
    const name = nameIn.value.trim();
    const description = descIn.value.trim();
    const code = codeIn.value.trim();
    if (editId && !editReady) return toast('This tool could not be loaded, so saving is disabled', 'x');
    if (!name || !description || !code) return toast('Fill in name, description and code', 'info');
    if (!activeUser) return toast('Sign in with Google first', 'info');
    if (!firebaseReady) return toast(firebaseConfigProblem || 'Firebase is not configured yet', 'x');
    try {
      if (editId) {
        await updateCommunityTool(editId, { name, description, code, category: catIn.value });
        toast('Tool updated');
      } else {
        const id = await submitCommunityTool({
          name, description, code, category: catIn.value,
          authorName: activeUser.displayName || activeUser.email?.split('@')[0] || 'Anonymous',
          authorUid: activeUser.uid,
          authorEmail: activeUser.email || '',
          authorPhotoURL: activeUser.photoURL || '',
        });
        /* Show the new card straight away instead of after the next read. */
        notePublishedTool({
          id, name, description, code, category: catIn.value,
          authorName: activeUser.displayName || activeUser.email?.split('@')[0] || 'Anonymous',
          authorUid: activeUser.uid, authorPhotoURL: activeUser.photoURL || '',
          createdAt: Date.now(), runs: 0, featured: false, hidden: false,
          ratingAvg: 0, ratingCount: 0, myRating: 0, reportCount: 0, reportedByMe: false,
        });
        toast('Tool published for everyone');
      }
      location.hash = '#/community';
    } catch (error) {
      toast(`Could not save: ${error.message}`, 'x');
    }
  };

  root.append(el('div.page-top', { style: { paddingBottom: '70px' } },
    el('div.wrap',
      el('div.breadcrumb', { style: { marginBottom: '18px' } },
        el('a', { href: '#/', text: 'Home' }), el('span.sep', { text: '/' }),
        el('a', { href: '#/community', text: 'Community' }), el('span.sep', { text: '/' }),
        el('span', { text: editId ? 'Edit tool' : 'Publish a tool' }),
      ),
      formTitle,
      el('p.lede', { style: { marginBottom: '26px' }, text: editId ? 'Update the name, description, category or code, then save when it looks right.' : 'Name it, describe it, paste the code — that is the whole process. Your tool runs in a secure sandbox with your name on it.' }),
      authBar,
      el('div.tool-layout', { style: { marginTop: '20px' } },
        el('div',
          el('div.tool-panel', el('div.col', { style: { gap: '18px' } },
            el('div.field', el('label.field-label', { text: 'Tool name' }), nameIn),
            el('div.field', el('label.field-label', { text: 'What does it do?' }), descIn),
            el('div.field', el('label.field-label', { text: 'Category' }), catIn),
            el('div.field', el('label.field-label', { text: 'Code (HTML / CSS / JS)' }), codeIn, el('div.field-hint', { text: 'Runs in a sandboxed iframe — no access to PSDKIT or your data' })),
            el('div.tool-actions',
              el('button.btn.btn-primary', { html: `${icon('send', 16)} ${editId ? 'Save changes' : 'Publish tool'}`, onclick: publish }),
              el('a.btn.btn-soft', { href: '#/community', text: t('cancel') }),
            ),
          )),
        ),
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '18px' } },
          el('div.tool-panel', { style: { position: 'sticky', top: 'calc(var(--nav-h) + 16px)' } },
            el('div.help-block',
              el('div.h-title', { text: 'live preview' }),
              preview,
              el('div.h-title', { style: { marginTop: '16px' }, text: 'tips for a great tool' }),
              el('ol.help-steps',
                el('li', { text: 'Keep it focused — one job, done well.' }),
                el('li', { text: 'Use clear labels and visible action buttons.' }),
                el('li', { text: 'Bundle styles inline or in a single style block so the preview matches the final result.' }),
                el('li', { text: 'Check your tool on mobile-sized layouts too.' }),
              ),
            ),
          ),
        ),
      ),
    ),
  ));
  refreshPreview();
  hydrateEdit();
}

export function renderAuthorTools(host, tools, onRefresh) {
  if (!tools.length) {
    host.append(el('div.empty-state', { html: `${icon('sparkles', 24)}<div style="margin-top:10px;font-weight:800">${t('profileEmpty')}</div><a class="btn btn-accent" style="margin-top:16px" href="#/community/add">${t('publishATool')}</a>` }));
    return;
  }
  host.append(...tools.map((tool) => el('div.profile-tool-card',
    communityCard(tool, { onRefresh }),
    el('div.tool-actions',
      el('button.btn.btn-soft.btn-sm', { text: t('open'), onclick: () => openToolModal(tool, { onRefresh }) }),
      el('a.btn.btn-soft.btn-sm', { href: `#/community/edit/${tool.id}`, text: t('edit') }),
      el('button.btn.btn-soft.btn-sm', { text: t('delete'), onclick: async () => {
        if (!confirm(`Delete “${tool.name}”?`)) return;
        try {
          await deleteCommunityTool(tool.id);
          toast('Tool deleted');
          onRefresh?.();
        } catch (error) {
          /* Unhandled before: a denied delete left the card sitting there with
             no explanation at all. */
          toast(error.message || 'Delete failed', 'x');
        }
      } }),
    ),
  )));
}

export async function renderAdminPanel(host) {
  host.innerHTML = '';
  const me = currentSessionUser();
  const admin = await isAdmin(me?.uid);
  if (!me || !admin) {
    host.append(el('div.empty-state', { html: `${icon('shield', 24)}<div style="margin-top:10px;font-weight:800">Admin access only</div><div style="margin-top:8px">Ask the project owner to add your UID in Firestore.</div>` }));
    return;
  }
  const { tools: reported } = await listReportedTools();
  const { tools: all, error } = await listCommunityTools({ limit: 200, includeHidden: true });
  if (error) {
    host.append(dataProblemNote(error));
  }
  /* Feature/delete used to be fire-and-forget: a denied write re-rendered the
     same unchanged panel and the admin never learned why. */
  const moderate = async (fn, done) => {
    try {
      await fn();
      toast(done, 'check');
    } catch (error) {
      toast(error.message || 'Moderation action failed', 'x');
    }
    renderAdminPanel(host);
  };

  host.append(
    el('div.section-head',
      el('div.eyebrow', { text: 'moderation' }),
      el('h1.display.h-section', { html: 'Admin <em>moderation</em>' }),
      el('p.lede', { text: 'Review reports, feature strong tools and remove anything unsafe or broken.' }),
    ),
    el('div.grid.grid-2',
      el('div.tool-panel',
        el('div.h-title', { text: 'Reported tools' }),
        ...(reported.length
          ? reported.map((tool) => el('div.card',
            el('div.row-between',
              el('div', el('div', { style: { fontWeight: 800 }, text: tool.name }), el('div.field-hint', { text: `${tool.reportCount || 0} report(s)` })),
              el('div.row',
                el('button.btn.btn-soft.btn-sm', { text: tool.featured ? 'Unfeature' : 'Feature', onclick: () => moderate(() => featureCommunityTool(tool.id, !tool.featured), tool.featured ? 'Tool unfeatured' : 'Tool featured') }),
                el('button.btn.btn-soft.btn-sm', { text: 'Delete', onclick: () => { if (!confirm(`Delete ${tool.name}?`)) return; moderate(() => adminDeleteCommunityTool(tool.id), 'Tool deleted'); } }),
              ),
            ),
            el('div.mt-2', { html: (tool.reports || []).map((report) => `<div class="field-hint">• ${report.reason}</div>`).join('') || '<div class="field-hint">No reasons</div>' }),
          ))

          : [el('div.note', { html: `${icon('check', 16)}<span>No reports waiting right now.</span>` })]),
      ),
      el('div.tool-panel',
        el('div.h-title', { text: 'All community tools' }),
        ...(all || []).map((tool) => el('div.card',
          el('div.row-between',
            el('div', el('div', { style: { fontWeight: 800 }, text: tool.name }), el('div.field-hint', { text: `${tool.authorName || 'Anonymous'} · ${tool.runs || 0} runs` })),
            el('div.row',
              el('button.btn.btn-soft.btn-sm', { text: tool.featured ? 'Unfeature' : 'Feature', onclick: () => moderate(() => featureCommunityTool(tool.id, !tool.featured), tool.featured ? 'Tool unfeatured' : 'Tool featured') }),
              el('button.btn.btn-soft.btn-sm', { text: 'Delete', onclick: () => { if (!confirm(`Delete ${tool.name}?`)) return; moderate(() => adminDeleteCommunityTool(tool.id), 'Tool deleted'); } }),
            ),
          ),
        )),
      ),
    ),
  );
}
