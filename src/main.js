/* ============================================================
   PSDKIT Pro — app shell: nav, drawer, footer, router, AI chat.
   ============================================================ */
import './styles/main.css';
import './styles/hero.css';
import { el, toast } from './ui.js';
import { icon } from './icons.js';
import { renderRoute, parseRoute } from './router.js';
import { initChat } from './ai/chat.js';
import { onAuth, firebaseReady } from './firebase.js';
import { CATEGORIES, toolsByCat, TOOLS } from './data/catalog.js';

const app = document.getElementById('app');

let authUser = null;
onAuth((u) => {
  authUser = u;
});

/* ---------- NAV ---------- */
function buildNav() {
  const nav = el('header.nav-shell#nav',
    el('div.wrap.nav-inner',
      el('a.nav-logo', { href: '#/', 'data-nav': 'home' },
        el('img', { src: '/logo.png', alt: 'PSDKIT Pro logo', width: 40, height: 40 }),
        el('span', { html: 'PSDKIT<span class="dot">.</span>Pro' }),
      ),
      el('nav.nav-links', { 'aria-label': 'Main navigation' },
        el('a.nav-link', { href: '#/tools', 'data-nav': 'tools', text: 'Tools' }),
        el('a.nav-link', { href: '#/learn', 'data-nav': 'learn', text: 'Learn' }),
        el('a.nav-link', { href: '#/community', 'data-nav': 'community', text: 'Community' }),
        el('a.nav-link', { href: '#/help', 'data-nav': 'help', text: 'Help' }),
      ),
      el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
        el('a.btn.btn-outline.btn-sm.nav-cta-desktop', {
          href: '#/tools',
          html: `Open Toolkit <span class="arr-x">${icon('arrowRight', 15)}</span>`,
        }),
        el('button.nav-burger#burger', { 'aria-label': 'Open menu' },
          el('span'), el('span'), el('span'),
        ),
      ),
    ),
  );

  const drawer = el('div.drawer#drawer',
    el('div.drawer-head',
      el('a.nav-logo', { href: '#/', onclick: closeDrawer },
        el('img', { src: '/logo.png', alt: 'PSDKIT Pro', width: 36, height: 36 }),
        el('span', { html: 'PSDKIT<span class="dot">.</span>Pro' }),
      ),
      el('button.modal-close', { html: icon('x', 17), onclick: closeDrawer }),
    ),
    ...[
      ['home', '#/', 'Home', 'home'],
      ['tools', '#/tools', 'All Tools', 'grid'],
      ['daily', '#/tools/daily', 'Daily (50)', 'calculator'],
      ['internet', '#/tools/internet', 'Internet (25)', 'globe'],
      ['essentials', '#/tools/essentials', 'Essentials (25)', 'wrench'],
      ['coding', '#/tools/coding', 'Coding & Learn (50)', 'code'],
      ['learn', '#/learn', 'Learning Guides', 'bookOpen'],
      ['glossary', '#/glossary', 'Tech Glossary', 'type'],
      ['community', '#/community', 'Community Toolbox', 'users'],
      ['help', '#/help', 'Help & About', 'help'],
    ].map(([key, href, label, ic]) => el('a.d-link', {
      href, onclick: closeDrawer, 'data-nav': key,
      html: `<span style="display:flex;align-items:center;gap:12px">${icon(ic, 19)} ${label}</span>${icon('chevronRight', 16)}`,
    })),
    el('div', { style: { marginTop: 'auto', paddingTop: '22px' } },
      el('a.btn.btn-primary.btn-block', {
        href: '#/community/add', onclick: closeDrawer,
        html: `${icon('plus', 16)} Publish a tool`,
      }),
      el('div.field-hint', { style: { marginTop: '14px', textAlign: 'center' }, text: firebaseReady ? 'Community features are live' : 'Free · No login · Private' }),
    ),
  );
  const backdrop = el('div.drawer-backdrop#drawer-backdrop', { onclick: closeDrawer });

  function openDrawer() {
    drawer.classList.add('open');
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }
  nav.querySelector('#burger').addEventListener('click', openDrawer);

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 24);
  }, { passive: true });

  return [nav, drawer, backdrop];
}

/* ---------- FOOTER ---------- */
function buildFooter() {
  const topDaily = ['age-calc', 'bmi-calc', 'password-gen', 'word-counter', 'currency-conv', 'countdown-timer'];
  const topCoding = ['code-playground', 'json-format', 'regex-tester', 'git-cheatsheet', 'word-meaning', 'translator'];
  return el('footer.footer',
    el('div.wrap',
      el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '34px' } },
        el('div',
          el('div.f-brand', { html: 'PSDKIT<span class="dot">.</span>Pro' }),
          el('p', {
            style: { color: 'rgba(245,239,230,0.6)', fontSize: '14.5px', lineHeight: 1.75, marginTop: '14px', maxWidth: '280px' },
            text: '150+ free tools for daily life, the internet and coding — with guides and an AI assistant. No login, no ads, no limits.',
          }),
          el('div', { style: { marginTop: '18px' } },
            el('a', {
              href: '#/community/add',
              html: `${icon('plus', 14)} Publish a tool`,
              style: { display: 'inline-flex', gap: '7px', alignItems: 'center', color: 'var(--accent-soft)', fontWeight: 700 },
            }),
          ),
        ),
        el('div',
          el('div.f-title', { text: 'Daily tools' }),
          ...topDaily.map((id) => {
            const t = TOOLS.find((x) => x.id === id);
            return t ? el('div', el('a', { href: `#/tool/${id}`, text: t.name })) : null;
          }),
          el('div', el('a', { href: '#/tools/daily', text: 'All 50 daily tools →' })),
        ),
        el('div',
          el('div.f-title', { text: 'Coding & learn' }),
          ...topCoding.map((id) => {
            const t = TOOLS.find((x) => x.id === id);
            return t ? el('div', el('a', { href: `#/tool/${id}`, text: t.name })) : null;
          }),
          el('div', el('a', { href: '#/learn', text: 'Learning guides →' })),
          el('div', el('a', { href: '#/glossary', text: 'Tech glossary →' })),
        ),
        el('div',
          el('div.f-title', { text: 'Explore' }),
          ...CATEGORIES.map((c) => el('div', el('a', { href: `#/tools/${c.id}`, text: `${c.short} (${toolsByCat(c.id).length})` }))),
          el('div', el('a', { href: '#/community', text: 'Community toolbox' })),
          el('div', el('a', { href: '#/help', text: 'Help & FAQ' })),
        ),
      ),
      el('div.footer-bottom',
        el('div', { text: `© ${new Date().getFullYear()} PSDKIT Pro — built with care for everyone.` }),
        el('div.row', { style: { gap: '18px' } },
          el('a', { href: '#/help', text: 'Privacy' }),
          el('a', { href: '#/help', text: 'Terms' }),
          el('a', { href: '#/community/add', text: 'Contribute' }),
        ),
      ),
    ),
  );
}

/* ---------- BOOT ---------- */
function boot() {
  const [nav, drawer, backdrop] = buildNav();
  document.body.prepend(backdrop);
  document.body.prepend(drawer);
  document.body.prepend(nav);

  const render = () => renderRoute(app, authUser);
  window.addEventListener('hashchange', render);
  render();

  document.body.append(buildFooter());
  initChat();

  /* Re-render when auth state arrives (community forms) */
  window.addEventListener('psdkit:auth', render);
}

boot();
