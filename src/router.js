/* Hash router */
import { renderHome } from './pages/home.js';
import { renderToolsPage, renderToolPage } from './pages/tools.js';
import { renderLearnPage, renderGuidePage } from './pages/learn.js';
import { renderCommunityPage, renderSubmitPage } from './pages/community.js';
import { renderHelpPage, FAQS } from './pages/help.js';
import { renderSignInPage } from './pages/signin.js';
import { renderProfilePage } from './pages/profile.js';
import { renderAdminPage } from './pages/admin.js';
import { renderNotFoundPage } from './pages/notfound.js';
import { el } from './ui.js';
import { TOOL_MAP, TOOLS, CATEGORIES, TOOL_COUNT } from './data/catalog.js';
import { LANGUAGE_GUIDES } from './data/guides.js';
import { applyMeta, breadcrumbLd, faqLd, homeLd } from './seo.js';

let cleanup = null;

export function parseRoute() {
  const raw = (location.hash || '#/').replace(/^#\/?/, '');
  return raw.split('/').filter(Boolean).map(decodeURIComponent);
}

function rememberRoute() {
  try {
    if (location.hash && location.hash !== '#/signin') sessionStorage.setItem('psdkit_last_route', location.hash);
  } catch {
    /* ignore */
  }
}

function routeMeta(parts) {
  const [a, b] = parts;
  if (!a || a === 'home') return {
    title: `PSDKIT Pro — ${TOOL_COUNT} Free Online Tools for Daily Life, Internet & Coding`,
    description: 'Free browser-based tools for everyday tasks, the web, PDFs, images, coding, learning and more — plus an AI assistant and community toolbox.',
    ld: homeLd(),
  };
  if (a === 'tools' && b && CATEGORIES.some((c) => c.id === b)) {
    const cat = CATEGORIES.find((c) => c.id === b);
    return {
      title: `${cat.name} — PSDKIT Pro`,
      description: cat.blurb,
    };
  }
  if (a === 'tools' && b === 'community') {
    return {
      title: 'Community Tools — PSDKIT Pro',
      description: 'Tools published by PSDKIT Pro community members, each shown with the name of the person who made it.',
    };
  }
  if (a === 'tools') return {
    title: 'All Tools — PSDKIT Pro',
    description: `Browse all ${TOOL_COUNT} PSDKIT Pro tools with smart search, favourites and recent history.`,
  };
  if (a === 'tool' && b && TOOL_MAP[b]) {
    const tool = TOOL_MAP[b];
    const cat = CATEGORIES.find((c) => c.id === tool.cat);
    return {
      title: `${tool.name} — PSDKIT Pro`,
      description: tool.desc,
      ld: breadcrumbLd([
        { name: 'Home', item: '#/' },
        { name: 'Tools', item: '#/tools' },
        { name: cat?.name || 'Category', item: `#/tools/${tool.cat}` },
        { name: tool.name, item: `#/tool/${tool.id}` },
      ]),
    };
  }
  if (a === 'learn' && b) {
    const guide = LANGUAGE_GUIDES.find((g) => g.id === b);
    return {
      title: guide ? `${guide.name} Guide — PSDKIT Pro` : 'Learn — PSDKIT Pro',
      description: guide?.intro || 'Learn coding languages and concepts in plain English.',
    };
  }
  if (a === 'learn' || a === 'glossary') return {
    title: a === 'glossary' ? 'Tech Glossary — PSDKIT Pro' : 'Learn Coding — PSDKIT Pro',
    description: a === 'glossary' ? 'Browse the PSDKIT Pro tech glossary with plain-English definitions.' : 'Coding guides, starter examples and a glossary that explain concepts clearly.',
  };
  if (a === 'community') return {
    title: (b === 'add' || b === 'edit') ? `${b === 'edit' ? 'Edit' : 'Publish'} a Tool — PSDKIT Pro` : 'Community Toolbox — PSDKIT Pro',
    description: (b === 'add' || b === 'edit') ? 'Publish or update a community tool on PSDKIT Pro with Google sign-in and a live sandbox preview.' : 'Discover, rate and manage tools built by the PSDKIT Pro community.',
  };
  if (a === 'signin') return {
    title: 'Sign in — PSDKIT Pro',
    description: 'Sign in with Google to publish tools, get credit and manage your work on PSDKIT Pro.',
  };
  if (a === 'profile') return {
    title: 'My Profile — PSDKIT Pro',
    description: 'Manage your community tools, favourites and activity on PSDKIT Pro.',
  };
  if (a === 'admin') return {
    title: 'Admin Control Center — PSDKIT Pro',
    description: 'Full moderation control for the community toolbox: live stats, report queue, tool manager with bulk actions, inline editing and exports.',
  };
  if (a === 'help') return {
    title: 'Help & FAQ — PSDKIT Pro',
    description: 'Get help using PSDKIT Pro, learn how privacy works and find answers to common questions.',
    ld: faqLd(FAQS),
  };
  return {
    title: '404 — PSDKIT Pro',
    description: 'The page you requested could not be found on PSDKIT Pro.',
  };
}

export function renderRoute(app, authUser) {
  const parts = parseRoute();
  const [a, b, c] = parts;

  rememberRoute();
  applyMeta(routeMeta(parts));

  if (typeof cleanup === 'function') { try { cleanup(); } catch { /* ignore */ } cleanup = null; }
  if (!location.hash.includes('glossary')) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });

  const page = el('div#page');
  app.innerHTML = '';
  app.append(page);
  window.PSDKIT_AI?.setContext?.(null);

  try {
    if (!a || a === 'home') renderHome(page, authUser);
    else if (a === 'tools') renderToolsPage(page, b || null);
    else if (a === 'tool' && b) renderToolPage(page, b);
    else if (a === 'learn' && b) renderGuidePage(page, b);
    else if (a === 'learn') {
      renderLearnPage(page);
      if (location.hash.includes('glossary')) setTimeout(() => page.querySelector('#glossary')?.scrollIntoView({ behavior: 'smooth' }), 120);
    } else if (a === 'glossary') {
      renderLearnPage(page);
      setTimeout(() => page.querySelector('#glossary')?.scrollIntoView({ behavior: 'smooth' }), 120);
    } else if (a === 'community' && b === 'add') renderSubmitPage(page, authUser);
    else if (a === 'community' && b === 'edit' && c) renderSubmitPage(page, authUser, c);
    else if (a === 'community') renderCommunityPage(page);
    else if (a === 'signin') renderSignInPage(page, authUser);
    else if (a === 'profile') renderProfilePage(page, authUser);
    else if (a === 'admin') renderAdminPage(page, authUser);
    else if (a === 'help') renderHelpPage(page);
    else renderNotFoundPage(page);
  } catch (e) {
    console.error(e);
    page.append(el('div.page-top', el('div.wrap.section',
      el('div.empty-state', {
        html: `<div style="font-weight:800">Something went wrong on this page</div><div style="margin-top:8px;font-size:14px">${String(e.message || e)}</div><a class="btn btn-accent" style="margin-top:18px" href="#/">Back to home</a>`,
      }),
    )));
  }

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
