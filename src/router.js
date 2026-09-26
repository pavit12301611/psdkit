/* Hash router */
import { renderHome } from './pages/home.js';
import { renderToolsPage, renderToolPage } from './pages/tools.js';
import { renderLearnPage, renderGuidePage } from './pages/learn.js';
import { renderCommunityPage, renderSubmitPage } from './pages/community.js';
import { renderHelpPage } from './pages/help.js';
import { el } from './ui.js';

let cleanup = null;

export function parseRoute() {
  const raw = (location.hash || '#/').replace(/^#\/?/, '');
  return raw.split('/').filter(Boolean).map(decodeURIComponent);
}

export function renderRoute(app, authUser) {
  const parts = parseRoute();
  const [a, b] = parts;

  if (typeof cleanup === 'function') { try { cleanup(); } catch { /* ignore */ } cleanup = null; }

  /* Scroll to top on nav (but keep for #/glossary anchor jumps) */
  if (!location.hash.includes('glossary')) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });

  const page = el('div#page');
  app.innerHTML = '';
  app.append(page);

  try {
    if (!a || a === 'home') {
      renderHome(page);
    } else if (a === 'tools') {
      renderToolsPage(page, b || null);
    } else if (a === 'tool' && b) {
      renderToolPage(page, b);
    } else if (a === 'learn' && b) {
      renderGuidePage(page, b);
    } else if (a === 'learn') {
      renderLearnPage(page);
      if (location.hash.includes('glossary')) {
        setTimeout(() => page.querySelector('#glossary')?.scrollIntoView({ behavior: 'smooth' }), 120);
      }
    } else if (a === 'glossary') {
      renderLearnPage(page);
      setTimeout(() => page.querySelector('#glossary')?.scrollIntoView({ behavior: 'smooth' }), 120);
    } else if (a === 'community' && b === 'add') {
      renderSubmitPage(page, authUser);
    } else if (a === 'community') {
      renderCommunityPage(page);
    } else if (a === 'help') {
      renderHelpPage(page);
    } else {
      renderHome(page);
    }
  } catch (e) {
    console.error(e);
    page.append(el('div.page-top', el('div.wrap.section',
      el('div.empty-state', {
        html: `<div style="font-weight:800">Something went wrong on this page</div>
               <div style="margin-top:8px;font-size:14px">${String(e.message || e)}</div>
               <a class="btn btn-accent" style="margin-top:18px" href="#/">Back to home</a>`,
      }),
    )));
  }

  /* Update active nav state */
  const section = a || 'home';
  document.querySelectorAll('[data-nav]').forEach((n) => {
    const key = n.dataset.nav;
    const active =
      (key === 'home' && (!a || a === 'home')) ||
      (key === 'tools' && (a === 'tools' || a === 'tool')) ||
      (key === 'learn' && (a === 'learn' || a === 'glossary')) ||
      (key === 'community' && a === 'community') ||
      (key === 'help' && a === 'help');
    n.classList.toggle('active', active);
  });
}

export function navigate(hash) {
  location.hash = hash;
}
