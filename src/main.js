/* ============================================================
   PSDKIT Pro — app shell, routing, nav, theme, locale, footer.
   ============================================================ */
import './styles/main.css';
import './styles/hero.css';
import './styles/redesign.css';
import { el, createAvatar, trapFocus } from './ui.js';
import { icon } from './icons.js';
import { renderRoute } from './router.js';
import { initChat } from './ai/chat.js';
import { onAuth, signOutUser, firebaseReady } from './firebase.js';
import { CATEGORIES, toolsByCat, TOOLS } from './data/catalog.js';
import { initTheme, getTheme, setTheme } from './prefs.js';
import { initLocale, getLocale, setLocale, t } from './data/i18n.js';

initTheme();
initLocale();

const app = document.getElementById('app');
app.id = 'app';
app.setAttribute('tabindex', '-1');

let authUser = null;
const state = {
  drawerOpen: false,
  accountOpen: false,
};
const refs = {};

function navItems() {
  return [
    ['home', '#/', t('home')],
    ['tools', '#/tools', t('tools')],
    ['learn', '#/learn', t('learn')],
    ['community', '#/community', t('community')],
    ['help', '#/help', t('help')],
  ];
}

function setSearchFocusIntent() {
  try { sessionStorage.setItem('psdkit_focus_search', '1'); } catch { /* ignore */ }
}

function focusSearch() {
  const target = document.querySelector('[data-search-input]');
  if (target) {
    target.focus({ preventScroll: false });
    target.select?.();
    return;
  }
  setSearchFocusIntent();
  if (!location.hash.startsWith('#/tools')) location.hash = '#/tools';
}

function openShortcuts() {
  refs.shortcuts?.classList.add('open');
  refs.shortcuts?.removeAttribute('hidden');
  refs.shortcutsStopTrap?.();
  refs.shortcutsStopTrap = trapFocus(refs.shortcuts.querySelector('.modal'), { onEscape: closeShortcuts });
  document.body.style.overflow = 'hidden';
}

function closeShortcuts() {
  refs.shortcuts?.classList.remove('open');
  refs.shortcuts?.setAttribute('hidden', '');
  refs.shortcutsStopTrap?.();
  document.body.style.overflow = state.drawerOpen ? 'hidden' : '';
}

function closeDrawer() {
  state.drawerOpen = false;
  refs.drawer?.classList.remove('open');
  refs.drawerBackdrop?.classList.remove('open');
  refs.drawerStopTrap?.();
  document.body.style.overflow = '';
}

function openDrawer() {
  state.drawerOpen = true;
  refs.drawer?.classList.add('open');
  refs.drawerBackdrop?.classList.add('open');
  refs.drawerStopTrap?.();
  refs.drawerStopTrap = trapFocus(refs.drawer, { onEscape: closeDrawer });
  document.body.style.overflow = 'hidden';
}

function closeAccount() {
  state.accountOpen = false;
  refs.accountMenu?.classList.remove('open');
}

function toggleAccount() {
  state.accountOpen = !state.accountOpen;
  refs.accountMenu?.classList.toggle('open', state.accountOpen);
}

function authControls(mobile = false) {
  if (!authUser) {
    return el('a', {
      class: mobile ? 'btn btn-primary btn-block' : 'btn btn-outline btn-sm',
      href: '#/signin',
      text: t('signIn'),
      onclick: mobile ? closeDrawer : null,
    });
  }
  const profileLink = el('a.account-item', { href: '#/profile', text: t('profile'), onclick: closeAccount });
  const publishLink = el('a.account-item', { href: '#/community/add', text: t('publishTool'), onclick: closeAccount });
  const signoutBtn = el('button.account-item', {
    text: t('signOut'),
    onclick: async () => { await signOutUser(); closeAccount(); closeDrawer(); },
  });

  if (mobile) {
    return el('div.card', { style: { padding: '14px', marginTop: '8px' } },
      el('div.author-chip', createAvatar(authUser, 36), el('div',
        el('div', { style: { fontWeight: 800, fontSize: '14px' }, text: authUser.displayName || authUser.email || 'Member' }),
        el('div.field-hint', { text: authUser.email || '' }),
      )),
      el('div.col.mt-2', profileLink, publishLink, signoutBtn),
    );
  }

  const trigger = el('button.account-trigger', {
    'aria-label': 'Open account menu',
    onclick: toggleAccount,
  }, createAvatar(authUser, 40), el('span', { class: 'account-name', text: authUser.displayName?.split(' ')[0] || 'Account' }), el('span', { html: icon('chevronDown', 15) }));

  refs.accountMenu = el('div.account-menu',
    trigger,
    el('div.account-dropdown',
      el('div.account-head',
        createAvatar(authUser, 46),
        el('div',
          el('div', { style: { fontWeight: 800 }, text: authUser.displayName || 'Member' }),
          el('div.field-hint', { text: authUser.email || '' }),
        ),
      ),
      profileLink,
      publishLink,
      el('button.account-item', {
        text: t('signOut'),
        onclick: async () => { await signOutUser(); closeAccount(); },
      }),
    ),
  );
  return refs.accountMenu;
}

function themeToggle() {
  const theme = getTheme();
  return el('button.icon-btn', {
    'aria-label': theme === 'dim' ? t('lightMode') : t('dimMode'),
    title: theme === 'dim' ? t('lightMode') : t('dimMode'),
    onclick: () => {
      setTheme(getTheme() === 'dim' ? 'warm' : 'dim');
      renderChrome();
    },
    html: getTheme() === 'dim' ? icon('sun', 18) : icon('moon', 18),
  });
}

function localeToggle() {
  const locale = getLocale();
  const wrap = el('div.locale-toggle',
    el('button', {
      class: locale === 'en' ? 'active' : '',
      text: 'EN',
      onclick: () => { setLocale('en'); renderChrome(); rerender(); },
    }),
    el('button', {
      class: locale === 'hi' ? 'active' : '',
      text: 'हिंदी',
      onclick: () => { setLocale('hi'); renderChrome(); rerender(); },
    }),
  );
  return wrap;
}

function buildFooter() {
  const topDaily = ['age-calc', 'gst-calculator', 'password-gen', 'word-counter', 'currency-conv', 'leap-year-zodiac'];
  const topCoding = ['code-playground', 'json-format', 'regex-library', 'gitignore-generator', 'word-meaning', 'markdown-cheatsheet'];
  return el('footer.footer',
    el('div.wrap',
      el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '34px' } },
        el('div',
          el('div.f-brand', { html: 'PSDKIT<span class="dot">.</span>Pro' }),
          el('p', {
            style: { color: 'rgba(245,239,230,0.6)', fontSize: '14.5px', lineHeight: 1.75, marginTop: '14px', maxWidth: '280px' },
            text: '175 free tools for daily life, the internet and coding — plus guides, a glossary, an AI assistant and a community toolbox.',
          }),
          el('div', { style: { marginTop: '18px' } },
            el('a', {
              href: '#/community/add',
              html: `${icon('plus', 14)} ${t('publishATool')}`,
              style: { display: 'inline-flex', gap: '7px', alignItems: 'center', color: 'var(--accent-soft)', fontWeight: 700 },
            }),
          ),
        ),
        el('div',
          el('div.f-title', { text: 'Daily tools' }),
          ...topDaily.map((id) => {
            const tool = TOOLS.find((x) => x.id === id);
            return tool ? el('div', el('a', { href: `#/tool/${id}`, text: tool.name })) : null;
          }),
          el('div', el('a', { href: '#/tools/daily', text: `All ${toolsByCat('daily').length} daily tools →` })),
        ),
        el('div',
          el('div.f-title', { text: 'Coding & learn' }),
          ...topCoding.map((id) => {
            const tool = TOOLS.find((x) => x.id === id);
            return tool ? el('div', el('a', { href: `#/tool/${id}`, text: tool.name })) : null;
          }),
          el('div', el('a', { href: '#/learn', text: 'Learning guides →' })),
          el('div', el('a', { href: '#/glossary', text: 'Tech glossary →' })),
        ),
        el('div',
          el('div.f-title', { text: 'Explore' }),
          ...CATEGORIES.map((c) => el('div', el('a', { href: `#/tools/${c.id}`, text: `${c.short} (${toolsByCat(c.id).length})` }))),
          el('div', el('a', { href: '#/community', text: 'Community toolbox' })),
          el('div', el('a', { href: '#/help', text: 'Help & FAQ' })),
          el('div', el('a', { href: '#/', onclick: (e) => { e.preventDefault(); openShortcuts(); }, text: t('footerShortcuts') })),
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

function buildShortcutsModal() {
  return el('div.modal-backdrop', { id: 'shortcuts-modal', hidden: true },
    el('div.modal', { style: { width: 'min(560px,100%)' } },
      el('div.modal-head',
        el('div.modal-title', { html: `${t('keyboardShortcuts')} <em style="font-family:var(--serif);font-style:italic;color:var(--accent)">guide</em>` }),
        el('button.modal-close', { 'aria-label': 'Close keyboard shortcuts', html: icon('x', 18), onclick: closeShortcuts }),
      ),
      el('div.modal-body',
        el('p.text-muted', { style: { marginBottom: '14px' }, text: t('shortcutsBody') }),
        el('div.col',
          ...[
            ['/', t('searchTools')],
            ['Ctrl + K', t('searchTools')],
            ['Esc', 'Close drawer, modal, chat or menu'],
            ['?', t('keyboardShortcuts')],
          ].map(([key, label]) => el('div.shortcut-row', el('kbd', { text: key }), el('span', { text: label }))),
        ),
      ),
    ),
  );
}

function renderChrome() {
  refs.navLinks.innerHTML = '';
  refs.drawerLinks.innerHTML = '';
  refs.topActions.innerHTML = '';
  refs.mobileMeta.innerHTML = '';
  refs.footer?.remove();

  navItems().forEach(([key, href, label]) => {
    refs.navLinks.append(el('a.nav-link', { href, 'data-nav': key, text: label }));
    refs.drawerLinks.append(el('a.d-link', {
      href, onclick: closeDrawer, 'data-nav': key,
      html: `<span style="display:flex;align-items:center;gap:12px">${icon({ home: 'home', tools: 'grid', learn: 'bookOpen', community: 'users', help: 'help' }[key], 19)} ${label}</span>${icon('chevronRight', 16)}`,
    }));
  });
  refs.topActions.append(themeToggle(), localeToggle(), authControls(false), el('a.btn.btn-outline.btn-sm.nav-cta-desktop', {
    href: '#/tools',
    html: `${t('openToolkit')} <span class="arr-x">${icon('arrowRight', 15)}</span>`,
  }));
  refs.mobileMeta.append(themeToggle(), localeToggle());
  refs.mobileMeta.append(authControls(true));

  const footer = buildFooter();
  document.body.append(footer);
  refs.footer = footer;
}

function buildShell() {
  const skipLink = el('a.skip-link', { href: '#app', text: 'Skip to content' });
  document.body.prepend(skipLink);

  const nav = el('header.nav-shell#nav',
    el('div.wrap.nav-inner',
      el('a.nav-logo', { href: '#/', 'data-nav': 'home' },
        el('img', { src: '/logo.png', alt: 'PSDKIT Pro logo', width: 40, height: 40 }),
        el('span', { html: 'PSDKIT<span class="dot">.</span>Pro' }),
      ),
      el('nav.nav-links', { 'aria-label': 'Main navigation' }),
      el('div.top-actions', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }),
      el('button.nav-burger#burger', { 'aria-label': 'Open menu' }, el('span'), el('span'), el('span')),
    ),
  );

  const drawer = el('div.drawer#drawer',
    el('div.drawer-head',
      el('a.nav-logo', { href: '#/', onclick: closeDrawer },
        el('img', { src: '/logo.png', alt: 'PSDKIT Pro', width: 36, height: 36 }),
        el('span', { html: 'PSDKIT<span class="dot">.</span>Pro' }),
      ),
      el('button.modal-close', { 'aria-label': 'Close menu', html: icon('x', 17), onclick: closeDrawer }),
    ),
    el('div.mobile-meta.col', { style: { gap: '12px', marginBottom: '12px' } }),
    el('div.drawer-links.col', { style: { gap: '8px' } }),
    el('div', { style: { marginTop: 'auto', paddingTop: '22px' } },
      el('a.btn.btn-primary.btn-block', { href: '#/community/add', onclick: closeDrawer, html: `${icon('plus', 16)} ${t('publishATool')}` }),
      el('div.field-hint', { style: { marginTop: '14px', textAlign: 'center' }, text: firebaseReady ? 'Community features are live' : 'Firebase is optional — browse without an account' }),
    ),
  );
  const drawerBackdrop = el('div.drawer-backdrop#drawer-backdrop', { onclick: closeDrawer });
  const shortcuts = buildShortcutsModal();
  const backTop = el('button.back-top', { 'aria-label': t('backToTop'), html: `${icon('arrowRight', 16)}` });
  const progress = el('div.scroll-progress', el('span'));

  refs.nav = nav;
  refs.drawer = drawer;
  refs.drawerBackdrop = drawerBackdrop;
  refs.shortcuts = shortcuts;
  refs.backTop = backTop;
  refs.progress = progress;
  refs.navLinks = nav.querySelector('.nav-links');
  refs.topActions = nav.querySelector('.top-actions');
  refs.drawerLinks = drawer.querySelector('.drawer-links');
  refs.mobileMeta = drawer.querySelector('.mobile-meta');

  document.body.prepend(progress);
  document.body.prepend(shortcuts);
  document.body.prepend(drawerBackdrop);
  document.body.prepend(drawer);
  document.body.prepend(nav);
  document.body.append(backTop);

  nav.querySelector('#burger').addEventListener('click', openDrawer);
  backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  document.addEventListener('click', (e) => {
    if (state.accountOpen && refs.accountMenu && !refs.accountMenu.contains(e.target)) closeAccount();
  });
  document.addEventListener('keydown', (e) => {
    const isTyping = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '') || document.activeElement?.isContentEditable;
    if (e.key === '?' && !e.metaKey && !e.ctrlKey && !isTyping) {
      e.preventDefault();
      openShortcuts();
    }
    if ((e.key === '/' && !isTyping) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
      e.preventDefault();
      focusSearch();
    }
    if (e.key === 'Escape') {
      closeAccount();
      if (state.drawerOpen) closeDrawer();
    }
  });
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 24);
    backTop.classList.toggle('show', window.scrollY > 700);
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    refs.progress.firstChild.style.transform = `scaleX(${ratio})`;
    const isGuide = location.hash.startsWith('#/learn/') && !location.hash.startsWith('#/learn');
    refs.progress.classList.toggle('show', location.hash.startsWith('#/learn/') && location.hash.split('/').length > 2);
  }, { passive: true });

  renderChrome();
}

function rerender() {
  renderRoute(app, authUser);
}

function setupPwa() {
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => null));
  window.addEventListener('beforeinstallprompt', (event) => event.preventDefault());
}

function boot() {
  buildShell();
  setupPwa();
  onAuth((user) => {
    authUser = user;
    renderChrome();
    rerender();
  });
  window.addEventListener('hashchange', () => {
    closeDrawer();
    closeAccount();
    rerender();
  });
  rerender();
  initChat();
  window.PSDKIT_APP = {
    focusSearch,
    rerender,
    openShortcuts,
    getAuthUser: () => authUser,
  };
}

boot();
