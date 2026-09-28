/* Home page — hero (CreativaX-inspired) + category showcase + popular tools + learn + community */
import { el } from '../ui.js';
import { icon } from '../icons.js';
import { CATEGORIES, TOOLS, toolsByCat, TOOL_MAP } from '../data/catalog.js';
import { getRecentTools } from '../prefs.js';
import { renderFeaturedCommunityGrid } from './community.js';

const POPULAR = [
  'qr-generator', 'pdf-merge', 'password-gen', 'image-compress', 'age-calc',
  'currency-conv', 'json-format', 'code-playground', 'word-meaning', 'speed-test',
  'word-counter', 'color-picker',
];

function toolCard(t) {
  const cat = CATEGORIES.find((c) => c.id === t.cat);
  return el('a.card.card-hover.tool-card', {
    href: `#/tool/${t.id}`,
    html: `
      <div class="t-icon ${cat.tile}">${icon(t.icon, 22)}</div>
      <div class="t-name">${t.name}</div>
      <div class="t-desc">${t.desc}</div>
      <div class="t-go">Open tool ${icon('arrowRight', 14)}</div>
      <div class="t-arrow">${icon('arrowUpRight', 18)}</div>
    `,
  });
}

export function renderHome(root) {
  const scrollToCategories = (event) => {
    event.preventDefault();
    document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ── HERO ── */
  const featured = ['qr-generator', 'json-format', 'password-gen'].map((id) => TOOL_MAP[id]).filter(Boolean);
  const sceneCanvas = el('canvas.hero-canvas3d', { 'aria-hidden': 'true' });
  const hero = el('section.home-hero',
    sceneCanvas,
    el('div.wrap.hero-grid',
      el('div.hero-copy',
        el('div.hero-kicker', el('span.hero-live-dot'), `${TOOLS.length} useful tools · Free to use`),
        el('h1.display.hero-h1', { html: 'Get things done.<br><em>Simply.</em>' }),
        el('p.hero-p', {
          text: 'A thoughtfully organised toolbox for everyday tasks, the web and your code. Everything you need, right when you need it — no account, no clutter.',
        }),
        el('div.hero-ctas',
          el('a.btn.btn-primary.btn-lg', {
            href: '#/tools',
            html: `Explore all tools <span class="arr">${icon('arrowRight', 18)}</span>`,
          }),
          el('a.btn.btn-soft.btn-lg', {
            href: '#categories',
            onclick: scrollToCategories,
            html: `Browse categories ${icon('grid', 17)}`,
          }),
        ),
        el('div.hero-trust',
          el('span', { html: `${icon('check', 15)} No sign-up` }),
          el('span', { html: `${icon('shield', 15)} Private by design` }),
          el('span', { html: `${icon('zap', 15)} Ready instantly` }),
        ),
      ),
      el('div.hero-showcase',
        el('div.hero-orbit.hero-orbit-one'),
        el('div.hero-orbit.hero-orbit-two'),
        el('div.hero-float.hero-float-top',
          el('span.float-icon.tile-sage', { html: icon('shield', 17) }),
          el('span', el('strong', { text: 'Private by design' }), el('small', { text: 'Your work stays yours' })),
        ),
        el('div.toolbox-window',
          el('div.toolbox-topbar',
            el('div.window-dots', el('i'), el('i'), el('i')),
            el('span.window-label', { text: 'PSDKIT TOOLBOX' }),
            el('span.window-status', el('i'), 'All systems ready'),
          ),
          el('div.toolbox-intro',
            el('div.toolbox-greeting', { text: 'Your toolkit' }),
            el('div.toolbox-subtitle', { text: 'A little help for a lot of things.' }),
            el('div.toolbox-search', el('span', { html: icon('search', 16) }), el('span', { text: 'Find the right tool…' }), el('kbd', { text: '/' })),
          ),
          el('div.toolbox-label-row', el('span', { text: 'QUICK PICKS' }), el('a', { href: '#/tools', text: 'View all →' })),
          el('div.toolbox-tools', ...featured.map((tool) => {
            const cat = CATEGORIES.find((c) => c.id === tool.cat);
            return el('a.toolbox-tool', { href: `#/tool/${tool.id}` },
              el('span', { class: `toolbox-tool-icon ${cat?.tile || 'tile-sky'}`, html: icon(tool.icon, 19) }),
              el('span.toolbox-tool-info', el('strong', { text: tool.name }), el('small', { text: tool.desc })),
              el('span.toolbox-tool-arrow', { html: icon('arrowUpRight', 16) }),
            );
          })),
          el('div.toolbox-bottom',
            el('span.toolbox-avatars', el('i', { text: 'D' }), el('i', { text: 'W' }), el('i', { text: 'C' })),
            el('span', { html: `<strong>${TOOLS.length}+</strong> tools across four categories` }),
            el('span.toolbox-bottom-spark', { html: icon('sparkles', 17) }),
          ),
        ),
        el('div.hero-float.hero-float-bottom',
          el('span.float-icon.tile-peach', { html: icon('zap', 17) }),
          el('span', el('strong', { text: 'Fast & free' }), el('small', { text: 'No downloads needed' })),
        ),
      ),
    ),
    el('a.hero-scroll-cue', { href: '#categories', onclick: scrollToCategories, 'aria-label': 'Scroll to categories' },
      /* icon() returns an HTML string, and el() turns a string child into a text
         node — passing it bare rendered the raw <svg> markup on screen as ~300
         characters of escaped source, which with width:max-content blew the cue
         out to 1761px and broke its auto-margin centering. */
      el('span', { text: 'Explore the toolkit' }), el('span', { html: icon('chevronDown', 15) }),
    ),
  );

  const recentIds = getRecentTools();
  const recentTools = recentIds.map((id) => TOOL_MAP[id]).filter(Boolean).slice(0, 8);
  const recentSection = recentTools.length
    ? el('section.section', { style: { paddingTop: '34px', paddingBottom: '10px' } },
      el('div.wrap',
        el('div.section-head', { style: { marginBottom: '18px' } },
          el('div.eyebrow', { text: 'jump back in' }),
          el('h2.display.h-section', { html: 'Pick up where you <em>left off</em>' }),
        ),
        el('div.wrap-gap-sm', ...recentTools.map((tool) => el('a.related-item', {
          href: `#/tool/${tool.id}`,
          html: `<div class="r-ico tile-sand">${icon(tool.icon, 15)}</div><span>${tool.name}</span>`,
        }))),
      ),
    )
    : null;

  /* ── CATEGORIES ── */
  const catSection = el('section.section#categories',
    el('div.wrap',
      el('div.section-head.center',
        el('div.eyebrow', { text: 'browse the kit' }),
        el('h2.display.h-section', { html: 'Four toolkits.<br><em>One calm place.</em>' }),
        el('p.lede', { text: 'Everything is grouped by what you are trying to do — pick a shelf and get straight to work.' }),
      ),
      el('div.grid.grid-4',
        ...CATEGORIES.map((c) => el('a.cat-card', {
          href: `#/tools/${c.id}`,
          style: {
            background: {
              daily: 'var(--peach)', internet: 'var(--sky)', essentials: 'var(--sage)', coding: 'var(--lavender)',
            }[c.id],
          },
          html: `
            <div class="c-deco"></div>
            <div class="c-count">${toolsByCat(c.id).length}</div>
            <div class="c-name">${c.name}</div>
            <div class="c-desc">${c.blurb}</div>
            <div class="c-go">Explore ${icon('arrowRight', 15)}</div>
          `,
        })),
      ),
    ),
  );

  /* ── POPULAR ── */
  const popularSection = el('section.section', { style: { paddingTop: 0 } },
    el('div.wrap',
      el('div.row-between', { style: { marginBottom: '34px' } },
        el('div.section-head', { style: { marginBottom: 0, gap: '12px' } },
          el('div.eyebrow', { text: 'most used this week' }),
          el('h2.display.h-section', { html: 'Popular <em>right now</em>' }),
        ),
        el('a.btn.btn-soft', { href: '#/tools', html: `View all ${TOOLS.length} ${icon('arrowRight', 15)}` }),
      ),
      el('div.grid.grid-3', ...POPULAR.map((id) => toolCard(TOOL_MAP[id])).filter(Boolean)),
    ),
  );

  /* ── HOW IT WORKS ── */
  const stepsSection = el('section.section', {
    style: { background: 'var(--cream-soft)', borderRadius: '42px', margin: '0 12px' },
  },
    el('div.wrap',
      el('div.section-head.center',
        el('div.eyebrow', { text: 'how psdkit works' }),
        el('h2.display.h-section', { html: 'Three steps.<br><em>Zero friction.</em>' }),
      ),
      el('div.grid.grid-3',
        ...[
          ['1.', 'Pick a tool', 'Search or browse four curated shelves. Every tool opens instantly — nothing to install, nothing to sign up for.'],
          ['2.', 'Get it done', 'Tools run in your browser: your files, passwords and data never leave your device unless you ask them to.'],
          ['3.', 'Learn as you go', 'Every tool ships with a plain-English guide, and the AI assistant can walk you through anything — with links to the right pages.'],
        ].map(([n, t, d]) => el('div.step-card',
          el('div.serif-num', { text: n }),
          el('div.s-title', { text: t }),
          el('div.s-body', { text: d }),
        )),
      ),
    ),
  );

  /* ── LEARN ── */
  const learnSection = el('section.section',
    el('div.wrap',
      el('div.section-head',
        el('div.eyebrow', { text: 'learn & understand' }),
        el('h2.display.h-section', { html: 'Guides that speak<br><em>human.</em>' }),
        el('p.lede', { text: 'Coding languages explained for humans, a searchable glossary of tech words, a dictionary and a translator — understanding beats memorising.' }),
      ),
      el('div.grid.grid-4',
        ...[
          ['graduation', 'tile-butter', 'Coding Language Guides', 'Python, JavaScript, TypeScript, SQL, React, Git and more — what they are, why they matter and real starter code.', '#/learn'],
          ['bookOpen', 'tile-peach', 'Tech Glossary', 'API? Cache? CORS? Look up 65+ tech words in plain English in seconds.', '#/glossary'],
          ['languages', 'tile-sky', 'Dictionary & Translator', 'Word meanings, pronunciation, synonyms and translations across 30+ languages.', '#/tool/word-meaning'],
          ['sparkles', 'tile-sage', 'PSDKIT AI Assistant', 'Ask anything — the assistant knows every tool and page on this site and points you to the right one.', '#ai'],
        ].map(([ic, tile, t, d, href]) => el('a.card.card-hover.learn-card', {
          href,
          html: `
            <div class="l-ico ${tile}">${icon(ic, 24)}</div>
            <div class="l-title">${t}</div>
            <div class="l-desc">${d}</div>
            <div class="t-go" style="opacity:1;transform:none">Learn more ${icon('arrowRight', 13)}</div>
          `,
        })),
      ),
    ),
  );

  /* ── COMMUNITY ── */
  const communityGrid = el('div.grid.grid-3', el('div.skeleton', { style: { height: '180px' } }), el('div.skeleton', { style: { height: '180px' } }), el('div.skeleton', { style: { height: '180px' } }));
  const communitySection = el('section.section', { style: { paddingTop: 0 } },
    el('div.wrap',
      el('div.hero-mini',
        el('div.hm-deco'),
        el('div', { style: { position: 'relative' } },
          el('div.row-between', { style: { gap: '26px', marginBottom: '24px' } },
            el('div', { style: { maxWidth: '560px' } },
              el('div.eyebrow', { text: 'open source spirit' }),
              el('h2.display.h-section', { style: { margin: '14px 0' }, html: 'Built by us.<br><em>Built by you.</em>' }),
              el('p.lede', { text: 'Anyone can publish a tool: describe it, paste the code, and it goes live for everyone — like an open-source toolbox that keeps growing. Sign in with Google when you submit.' }),
            ),
            el('a.btn.btn-primary', { href: '#/community', html: `View all ${icon('arrowRight', 16)}` }),
          ),
          el('div.section-head', { style: { marginBottom: '18px' } },
            el('div.eyebrow', { text: 'from the community' }),
            el('h2.display', { style: { fontSize: 'clamp(24px,4vw,34px)' }, html: 'Fresh community <em>tools</em>' }),
          ),
          communityGrid,
          el('div.hero-ctas', { style: { marginTop: '22px' } },
            el('a.btn.btn-primary', { href: '#/community', html: `Explore community tools ${icon('arrowRight', 16)}` }),
            el('a.btn.btn-outline', { href: '#/community/add', html: `${icon('plus', 16)} Publish a tool` }),
          ),
        ),
      ),
    ),
  );

  /* filter(Boolean): without recents `recentSection` is null, and appending
     null paints the literal string "null" on the page */
  root.append(...[hero, recentSection, catSection, popularSection, stepsSection, learnSection, communitySection].filter(Boolean));

  /* 3D hero backdrop — lazy-loaded behind first paint and scroll-tied
     (object rises / spins / fades as you scroll, in both themes).
     Removes itself silently if WebGL is unavailable. */
  import('../scene3d.js')
    .then((m) => m.mountHeroScene?.(sceneCanvas))
    .catch(() => { try { sceneCanvas.remove(); } catch { /* ignore */ } });

  renderFeaturedCommunityGrid(communityGrid, 3);
}
