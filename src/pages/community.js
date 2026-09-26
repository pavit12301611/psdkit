/* Community tools — browse, open in sandbox, and publish new tools */
import { el, toast, copyText, readFileAs, debounce } from '../ui.js';
import { icon } from '../icons.js';
import {
  firebaseReady, signInWithGoogle, signOutUser, onAuth,
  submitCommunityTool, listCommunityTools, incrementRuns,
} from '../firebase.js';

/* Built-in samples shown until Firestore has content (also demo the format) */
const SAMPLE_TOOLS = [
  {
    id: 'sample-lorem', name: 'Word of the Day', authorName: 'PSDKIT Team', featured: true, runs: 1204,
    description: 'Shows a fresh English word with its meaning every time you open it — a tiny vocabulary habit.',
    category: 'Learning',
    code: `<div style="font-family:Georgia,serif;text-align:center;padding:28px">
  <div style="font-size:11px;letter-spacing:.22em;color:#DE5D35;text-transform:uppercase">word of the day</div>
  <h1 id="w" style="font-size:38px;margin:12px 0 6px;color:#161514"></h1>
  <div id="p" style="color:#8A8178;font-size:14px"></div>
  <p id="d" style="max-width:420px;margin:14px auto;line-height:1.7;color:#635E59"></p>
  <button onclick="pick()" style="background:#DE5D35;color:#fff;border:none;padding:11px 22px;border-radius:999px;font-size:14px;cursor:pointer">Another word</button>
</div>
<script>
const words = [
  ["Serendipity","/ˌsɛrənˈdɪpɪti/","Finding something good without looking for it."],
  ["Ephemeral","/ɪˈfɛm(ə)rəl/","Lasting for a very short time."],
  ["Luminous","/ˈluːmɪnəs/","Giving off light; bright or shining."],
  ["Resilient","/rɪˈzɪlɪənt/","Able to recover quickly from difficulties."],
  ["Eloquent","/ˈɛləkwənt/","Fluent and persuasive in speaking or writing."]
];
function pick(){
  const [w,p,d] = words[Math.floor(Math.random()*words.length)];
  document.getElementById('w').textContent = w;
  document.getElementById('p').textContent = p;
  document.getElementById('d').textContent = d;
}
pick();
<\/script>`,
  },
  {
    id: 'sample-timer', name: 'Breathing Exercise', authorName: 'PSDKIT Team', featured: true, runs: 862,
    description: 'A calm 4-7-8 breathing circle to reset your focus in one minute.',
    category: 'Wellness',
    code: `<div style="text-align:center;padding:24px;font-family:sans-serif">
  <div id="circle" style="width:150px;height:150px;border-radius:50%;background:#F2CDBD;margin:10px auto;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#8A4227;transition:transform 4s ease-in-out">Ready</div>
  <p id="t" style="color:#635E59;min-height:24px">Press start for the 4-7-8 breathing cycle</p>
  <button onclick="start()" style="background:#161514;color:#F5EFE6;border:none;padding:11px 22px;border-radius:999px;font-size:14px;cursor:pointer">Start</button>
</div>
<script>
function start(){
  const c = document.getElementById('circle'), t = document.getElementById('t');
  const phase = () => {
    c.style.transform = 'scale(1.25)'; c.textContent = 'Breathe in'; t.textContent = 'Inhale through your nose — 4 seconds';
    setTimeout(() => { c.textContent = 'Hold'; t.textContent = 'Hold — 7 seconds'; }, 4000);
    setTimeout(() => { c.style.transform = 'scale(1)'; c.textContent = 'Breathe out'; t.textContent = 'Exhale slowly — 8 seconds'; }, 11000);
    setTimeout(phase, 19000);
  };
  phase();
}
<\/script>`,
  },
  {
    id: 'sample-focus', name: 'Focus Quote Spinner', authorName: 'PSDKIT Team', featured: false, runs: 531,
    description: 'Spin for a motivational quote when you need a little push to keep going.',
    category: 'Motivation',
    code: `<div style="text-align:center;padding:30px;font-family:sans-serif">
  <p id="q" style="font-size:20px;line-height:1.6;color:#161514;max-width:420px;margin:0 auto 8px"></p>
  <div id="a" style="color:#DE5D35;font-weight:700;margin-bottom:18px"></div>
  <button onclick="spin()" style="background:#DE5D35;color:#fff;border:none;padding:11px 22px;border-radius:999px;font-size:14px;cursor:pointer">New quote</button>
</div>
<script>
const qs = [
  ["The secret of getting ahead is getting started.","Mark Twain"],
  ["Focus is deciding what you are not going to do.","John Carmack"],
  ["Simplicity is the ultimate sophistication.","Leonardo da Vinci"],
  ["First, solve the problem. Then, write the code.","John Johnson"]
];
function spin(){
  const [q,a] = qs[Math.floor(Math.random()*qs.length)];
  document.getElementById('q').textContent = '"' + q + '"';
  document.getElementById('a').textContent = '— ' + a;
}
spin();
<\/script>`,
  },
];

function communityCard(t) {
  return el('div.card.card-hover', {
    style: { cursor: 'default', display: 'flex', flexDirection: 'column', gap: '11px' },
    html: `
      <div class="row-between">
        <div class="t-icon tile-sand" style="width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center">${icon('sparkles', 19)}</div>
        ${t.featured ? '<span class="badge badge-free">Featured</span>' : ''}
      </div>
      <div class="t-name">${t.name}</div>
      <div class="t-desc">${t.description}</div>
      <div class="row-between" style="margin-top:auto">
        <div class="author-chip"><div class="a-av">${(t.authorName || '?').slice(0, 2).toUpperCase()}</div>${t.authorName || 'Anonymous'}</div>
        <span class="field-hint">${t.runs || 0} runs</span>
      </div>
    `,
    onclick: () => openToolModal(t),
  });
}

function openToolModal(t) {
  incrementRuns(t.id);
  const frame = el('iframe.preview-frame', {
    sandbox: 'allow-scripts',
    srcdoc: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:8px;background:#FAF7F2;font-family:'Plus Jakarta Sans',sans-serif}</style></head><body>${t.code}</body></html>`,
    style: { height: '380px' },
  });
  const backdrop = el('div.modal-backdrop', { style: { zIndex: 300 } },
    el('div.modal', { style: { width: 'min(760px,100%)' } },
      el('div.modal-head',
        el('div',
          el('div.modal-title', { text: t.name }),
          el('div.author-chip.mt-1', { html: `<div class="a-av">${(t.authorName || '?').slice(0, 2).toUpperCase()}</div>${t.authorName || 'Anonymous'} · ${t.category || 'General'}` }),
        ),
        el('button.modal-close', { html: icon('x', 18) }),
      ),
      el('div.modal-body',
        el('p.text-muted', { style: { fontSize: '14px', lineHeight: 1.7, marginBottom: '14px' }, text: t.description }),
        frame,
        el('div.tool-actions', { style: { marginTop: '14px' } },
          el('button.btn.btn-soft', {
            html: `${icon('code', 15)} View source code`,
            onclick: () => {
              const pre = backdrop.querySelector('#src-area');
              if (pre) pre.style.display = pre.style.display === 'none' ? 'block' : 'none';
            },
          }),
          el('button.btn.btn-soft', { html: `${icon('copy', 15)} Copy code`, onclick: () => copyText(t.code) }),
        ),
        el('pre.code#src-area', {
          style: { display: 'none', marginTop: '14px', maxHeight: '280px', overflow: 'auto' },
          text: t.code,
        }),
      ),
    ),
  );
  const close = () => {
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => backdrop.remove(), 300);
  };
  backdrop.querySelector('.modal-close').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.body.append(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('open'));
}

/* ── #/community — browse ── */
export function renderCommunityPage(root) {
  const grid = el('div.grid.grid-3');
  const status = el('div.field-hint', { text: 'Loading community tools…' });

  root.append(el('div.page-top', { style: { paddingBottom: '70px' } },
    el('div.page-head',
      el('div.wrap',
        el('div.breadcrumb',
          el('a', { href: '#/', text: 'Home' }),
          el('span.sep', { text: '/' }),
          el('span', { text: 'Community' }),
        ),
        el('div.row-between', { style: { marginTop: '14px', alignItems: 'flex-end' } },
          el('div',
            el('h1.display', { style: { fontSize: 'clamp(32px,5vw,48px)', marginBottom: '10px' }, html: 'Community <em>Toolbox</em>' }),
            el('p.lede', {
              text: 'Tools made by people like you — describe a tool, paste the code, and it goes live for everyone. An open-source toolbox that never stops growing.',
            }),
          ),
          el('a.btn.btn-primary', { href: '#/community/add', html: `${icon('plus', 17)} Publish a tool` }),
        ),
      ),
    ),
    el('div.wrap',
      el('div.note', { style: { marginBottom: '22px' } },
        el('div', { html: `${icon('shield', 17)}` }),
        el('span', { html: firebaseReady
          ? 'Community tools run in a locked-down sandbox (no access to your PSDKIT page or data). Read the code before you use anything — like any open-source software.'
          : 'Showing built-in sample tools. <strong>Connect Firebase</strong> (see README) to enable live community submissions for everyone.' }),
      ),
      el('div.row-between', { style: { marginBottom: '16px' } }, status),
      grid,
    ),
  ));

  (async () => {
    const live = await listCommunityTools();
    const tools = live && live.length ? [...live, ...SAMPLE_TOOLS] : SAMPLE_TOOLS;
    status.textContent = `${tools.length} tool${tools.length === 1 ? '' : 's'} published${live ? '' : ' (samples)'} · everyone can open and run them`;
    grid.innerHTML = '';
    grid.append(...tools.map(communityCard));
  })();
}

/* ── #/community/add — publish ── */
export function renderSubmitPage(root, user) {
  const nameIn = el('input.input', { placeholder: 'e.g. QR Code for Wi-Fi', maxlength: 60 });
  const descIn = el('textarea.textarea', { rows: 3, placeholder: 'One or two sentences — what does your tool do?', maxlength: 300 });
  const catIn = el('select.select');
  for (const c of ['Daily', 'Internet', 'Essentials', 'Coding', 'Learning', 'Fun', 'Wellness', 'Productivity']) catIn.append(el('option', { text: c }));
  const codeIn = el('textarea.textarea.code-area', { rows: 12, placeholder: 'Paste HTML / CSS / JavaScript here. Everything runs in a sandboxed iframe.' });
  codeIn.value = `<div style="text-align:center;padding:20px;font-family:sans-serif">
  <h2>Hello from my tool 👋</h2>
  <p>Edit this code and preview it live.</p>
  <button onclick="alert('It works!')">Click me</button>
</div>
<script>
  // JavaScript runs here
  console.log('My tool is alive');
<\/script>`;
  const preview = el('iframe.preview-frame', {
    sandbox: 'allow-scripts',
    style: { height: '300px', background: '#fff', border: '1.5px solid var(--cream-line)', borderRadius: '14px', width: '100%' },
  });
  const refreshPreview = debounce(() => {
    preview.srcdoc = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:8px}</style></head><body>${codeIn.value}</body></html>`;
  }, 600);
  codeIn.addEventListener('input', refreshPreview);

  const authBar = el('div');
  const renderAuth = (u) => {
    authBar.innerHTML = '';
    if (u) {
      authBar.append(el('div.card', { style: { padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' } },
        el('div.author-chip', {
          html: `<div class="a-av">${(u.displayName || 'U').slice(0, 2).toUpperCase()}</div>Publishing as <strong style="margin-left:4px">${u.displayName || u.email}</strong>`,
        }),
        el('button.btn.btn-soft.btn-sm', {
          html: `${icon('user', 14)} Sign out`,
          onclick: async () => { await signOutUser(); renderAuth(null); },
        }),
      ));
    } else {
      authBar.append(el('div.card', { style: { padding: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' } },
        el('div',
          el('div', { style: { fontWeight: 800, fontSize: '15px' } }, 'Sign in to publish'),
          el('div.field-hint', { text: 'Google sign-in keeps the toolbox spam-free and credits your work.' }),
        ),
        el('button.btn.btn-primary.btn-sm', {
          html: `${icon('user', 15)} Continue with Google`,
          onclick: async () => {
            try {
              const u = await signInWithGoogle();
              toast(`Welcome, ${u.displayName || 'maker'}!`);
              renderAuth(u);
            } catch (e) {
              toast('Sign-in failed — check Firebase config', 'x');
            }
          },
        }),
      ));
    }
  };
  onAuth((u) => { user = u; renderAuth(u); });

  const publish = async () => {
    const name = nameIn.value.trim();
    const description = descIn.value.trim();
    const code = codeIn.value.trim();
    if (!name || !description || !code) return toast('Fill in name, description and code', 'info');
    if (!user) return toast('Sign in with Google first', 'info');
    if (!firebaseReady) return toast('Firebase is not configured yet — see README to enable', 'x');
    try {
      await submitCommunityTool({
        name, description, code,
        category: catIn.value,
        authorName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        authorUid: user.uid,
      });
      toast('🎉 Tool published for everyone!');
      location.hash = '#/community';
    } catch (e) {
      toast(`Publish failed: ${e.message}`, 'x');
    }
  };

  root.append(el('div.page-top', { style: { paddingBottom: '70px' } },
    el('div.wrap',
      el('div.breadcrumb', { style: { marginBottom: '18px' } },
        el('a', { href: '#/', text: 'Home' }),
        el('span.sep', { text: '/' }),
        el('a', { href: '#/community', text: 'Community' }),
        el('span.sep', { text: '/' }),
        el('span', { text: 'Publish a tool' }),
      ),
      el('h1.display', { style: { fontSize: 'clamp(30px,4.5vw,44px)', marginBottom: '10px' }, html: 'Publish a <em>tool</em>' }),
      el('p.lede', {
        style: { marginBottom: '26px' },
        text: 'Name it, describe it, paste the code — that is the whole process. Your tool will run for everyone in a secure sandbox, with your name on it.',
      }),
      authBar,
      el('div.tool-layout', { style: { marginTop: '20px' } },
        el('div',
          el('div.tool-panel',
            el('div.col', { style: { gap: '18px' } },
              el('div.field', el('label.field-label', { text: 'Tool name' }), nameIn,
                el('div.field-hint', { text: 'Short and clear — this is what people will see' })),
              el('div.field', el('label.field-label', { text: 'What does it do?' }), descIn),
              el('div.field', el('label.field-label', { text: 'Category' }), catIn),
              el('div.field', el('label.field-label', { text: 'Code (HTML / CSS / JS)' }), codeIn,
                el('div.field-hint', { text: 'Runs in a sandboxed iframe — no external access to PSDKIT or your data' })),
              el('div.tool-actions',
                el('button.btn.btn-primary', { html: `${icon('send', 16)} Publish tool`, onclick: publish }),
                el('a.btn.btn-soft', { href: '#/community', html: 'Cancel' }),
              ),
            ),
          ),
        ),
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '18px' } },
          el('div.tool-panel', { style: { position: 'sticky', top: 'calc(var(--nav-h) + 16px)' } },
            el('div.help-block',
              el('div.h-title', { text: 'live preview' }),
              preview,
              el('div.h-title', { style: { marginTop: '16px' }, text: 'tips for a great tool' }),
              el('ol.help-steps',
                el('li', { text: 'Keep it focused — one job, done well.' }),
                el('li', { text: 'Use clear labels and a visible action button.' }),
                el('li', { text: 'Style inline or with a <style> block so it looks good everywhere.' }),
                el('li', { text: 'Test the preview before publishing — it is exactly what users get.' }),
              ),
            ),
          ),
        ),
      ),
    ),
  ));
  refreshPreview();
}
