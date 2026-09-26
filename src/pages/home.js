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
  /* ── HERO ── */
  const video = el('video', {
    autoplay: '', loop: '', muted: '', playsinline: '',
    preload: 'metadata',
    poster: '',
    src: 'https://strvid.nyc3.cdn.digitaloceanspaces.com/motionsite/creative_studio_video.mp4',
  });
  video.addEventListener('loadedmetadata', () => {
    try { video.playbackRate = 0.7; } catch { /* some browsers */ }
  });
  video.addEventListener('error', () => {
    const wrap = video.closest('.hero-video-wrap');
    if (wrap) wrap.style.background = 'var(--cream-deep)';
  });

  const hero = el('section.hero',
    el('div.hero-video-wrap', video),
    el('div.hero-mask-left'),
    el('div.hero-mask-top'),
    el('div.hero-mask-bottom'),
    el('div.hero-content',
      el('div.hero-left',
        el('div.hero-tag',
          el('span', { text: '175 tools' }),
          el('span', { text: 'no login' }),
          el('span', { text: 'free forever' }),
        ),
        el('h1.display.hero-h1', { html: 'Every Tool You<br><em>Need.</em>' }),
        el('p.hero-p', {
          text: 'PSDKIT Pro packs 175 practical tools for daily life, the internet and coding — plus guides, word meanings, favourites and an AI assistant that knows the site inside out. Built for pros, friendly for beginners.',
        }),
        el('div.hero-ctas',
          el('a.btn.btn-primary.btn-lg', {
            href: '#/tools',
            html: `Explore The Toolkit <span class="arr">${icon('arrowUpRight', 18)}</span>`,
          }),
          el('button.btn.btn-outline.btn-lg', {
            id: 'watch-demo',
            html: `${icon('play', 16)} Watch Demo`,
          }),
        ),
        el('div.hero-proof',
          el('div.avatars',
            ...['AK', 'PR', 'RS', 'MV'].map((n, i) =>
              el('div.av', {
                text: n,
                style: { background: ['var(--peach)', 'var(--sage)', 'var(--sky)', 'var(--lavender)'][i] },
              })),
          ),
          el('div.p-txt', { html: '<strong>Trusted by 150,000+ makers</strong>students, developers & small teams' }),
        ),
      ),
    ),
    el('div.hero-scroll',
      el('div.mouse'),
      el('span', { text: 'scroll to explore' }),
    ),
  );

  /* Showreel modal */
  const modalVideo = el('video', {
    src: 'https://strvid.nyc3.cdn.digitaloceanspaces.com/motionsite/creative_studio_video.mp4',
    controls: '', playsinline: '', loop: '',
  });
  const modal = el('div.modal-backdrop#demo-modal',
    el('div.modal',
      el('div.modal-head',
        el('div.modal-title', { html: 'PSDKIT Pro — <em style="font-family:var(--serif);font-style:italic;color:var(--accent-deep)">the showreel</em>' }),
        el('button.modal-close#close-demo', { html: icon('x', 18) }),
      ),
      el('div.modal-body',
        el('div.modal-video', modalVideo),
        el('p.text-muted.mt-2', {
          style: { fontSize: '14px', lineHeight: 1.7 },
          text: '175 tools. Zero logins. Everything runs in your browser — calculators, PDF and image tools, internet lookups, coding playgrounds, dictionaries and an AI guide that points you to the right page.',
        }),
        el('div.tool-actions', { style: { marginTop: '14px' } },
          el('a.btn.btn-accent', { href: '#/tools', onclick: closeModal, html: `Open the toolkit ${icon('arrowRight', 16)}` }),
        ),
      ),
    ),
  );
  function openModal() {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    modalVideo.play().catch(() => { });
  }
  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    modalVideo.pause();
  }
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  const onEsc = (e) => { if (e.key === 'Escape') closeModal(); };
  document.addEventListener('keydown', onEsc);
  hero.querySelector('#watch-demo').addEventListener('click', openModal);
  modal.querySelector('#close-demo').addEventListener('click', closeModal);

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
        el('a.btn.btn-soft', { href: '#/tools', html: `View all 175 ${icon('arrowRight', 15)}` }),
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

  root.append(hero, recentSection, catSection, popularSection, stepsSection, learnSection, communitySection, modal);
  renderFeaturedCommunityGrid(communityGrid, 3);
}
