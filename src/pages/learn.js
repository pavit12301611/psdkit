/* Learn hub, language guide detail, and tech glossary pages */
import { el, debounce, copyText, toast } from '../ui.js';
import { icon } from '../icons.js';
import { LANGUAGE_GUIDES, GLOSSARY } from '../data/guides.js';
import { TOOL_MAP, getTool } from '../tools/index.js';

/* ── #/learn — hub ── */
export function renderLearnPage(root) {
  root.append(el('div.page-top', { style: { paddingBottom: '70px' } },
    el('div.page-head',
      el('div.wrap',
        el('div.breadcrumb',
          el('a', { href: '#/', text: 'Home' }),
          el('span.sep', { text: '/' }),
          el('span', { text: 'Learn' }),
        ),
        el('h1.display', { style: { fontSize: 'clamp(32px,5vw,48px)', margin: '14px 0 10px' }, html: 'Learn coding.<br>Understand <em>every word.</em>' }),
        el('p.lede', {
          text: 'Plain-English guides for the languages people actually use, plus a glossary that demystifies tech jargon — written for humans, not textbooks.',
        }),
      ),
    ),
    el('div.wrap',
      el('div.section-head', { style: { marginTop: '10px' } },
        el('div.eyebrow', { text: 'coding languages' }),
        el('h2.display.h-section', { html: 'Pick a language,<br><em>start today.</em>' }),
      ),
      el('div.grid.grid-3', ...LANGUAGE_GUIDES.map((g) => el('a.card.card-hover.learn-card', {
        href: `#/learn/${g.id}`,
        html: `
          <div class="row-between">
            <div class="l-ico ${g.color}">${icon(g.icon, 23)}</div>
            <span class="badge badge-free">${g.level}</span>
          </div>
          <div class="l-title">${g.name}</div>
          <div style="font-family:var(--serif);font-style:italic;font-size:17px;color:var(--accent-deep)">${g.tagline}</div>
          <div class="l-desc">${g.intro.slice(0, 120)}…</div>
          <div class="t-go" style="opacity:1;transform:none">Read the guide ${icon('arrowRight', 13)}</div>
        `,
      }))),
      el('div.section-head', { style: { marginTop: '60px' } },
        el('div.eyebrow', { text: 'understand meanings' }),
        el('h2.display.h-section', { html: 'The <em>tech glossary</em>' }),
        el('p.lede', { text: `${GLOSSAGE_COUNT()} tech words explained in plain language — searchable in a second.` }),
      ),
      el('div.hero-mini', { style: { padding: '30px' } },
        el('div.hm-deco'),
        el('div', { style: { position: 'relative' } },
          el('div.search-box', { style: { maxWidth: '560px' } },
            el('span.s-ico', { html: icon('search', 19) }),
            (() => {
              const input = el('input', { type: 'search', placeholder: 'Search the glossary… try “API”, “cache”, “token”' });
              const results = el('div.mt-3');
              const renderRes = debounce(() => {
                const q = input.value.trim().toLowerCase();
                const list = q
                  ? GLOSSARY.filter(([t, d]) => (t + ' ' + d).toLowerCase().includes(q))
                  : GLOSSARY.slice(0, 12);
                results.innerHTML = '';
                results.append(el('div', {
                  html: list.slice(0, 24).map(([t, d]) => `<div class="term-row"><div class="term-name">${t}</div><div class="term-mean">${d}</div></div>`).join('')
                    || '<div class="text-muted" style="padding:14px 0">No matches — try a shorter word.</div>',
                }));
                if (q) {
                  results.append(el('div.tool-actions', { style: { marginTop: '14px' } },
                    el('button.btn.btn-soft', {
                      html: `${icon('bookOpen', 15)} See the full glossary`,
                      onclick: () => { location.hash = '#/glossary'; },
                    })));
                }
              }, 180);
              input.addEventListener('input', renderRes);
              renderRes();
              return el('div', input, results);
            })(),
          ),
        ),
      ),
      el('div.grid.grid-3', { style: { marginTop: '48px' } },
        ...[
          ['bookOpen', 'tile-peach', 'Dictionary — Word Meaning', 'Look up any English word with meanings, pronunciation and example sentences.', '#/tool/word-meaning'],
          ['languages', 'tile-sky', 'Translator', 'Translate text between 30+ languages — Hindi, Spanish, Arabic, Japanese and more.', '#/tool/translator'],
          ['sparkles', 'tile-sage', 'Ask the AI assistant', 'Confused by something? The assistant explains concepts and links you to the right guide.', '#ai'],
        ].map(([ic, tile, t, d, href]) => el('a.card.card-hover.learn-card', {
          href,
          html: `<div class="l-ico ${tile}">${icon(ic, 23)}</div><div class="l-title">${t}</div><div class="l-desc">${d}</div>
                 <div class="t-go" style="opacity:1;transform:none">Open ${icon('arrowRight', 13)}</div>`,
        })),
      ),
    ),
    /* Full glossary anchor section */
    el('div.wrap', { id: 'glossary', style: { paddingTop: '60px' } },
      el('div.section-head',
        el('div.eyebrow', { text: 'reference' }),
        el('h2.display.h-section', { html: 'All <em>glossary words</em>' }),
      ),
      el('div.card', { style: { padding: '10px 26px' } },
        el('div', { html: GLOSSARY.map(([t, d]) => `<div class="term-row"><div class="term-name">${t}</div><div class="term-mean">${d}</div></div>`).join('') }),
      ),
    ),
  ));
}

const GLOSSAGE_COUNT = () => GLOSSARY.length;

/* ── #/learn/:id — guide detail ── */
export function renderGuidePage(root, id) {
  const g = LANGUAGE_GUIDES.find((x) => x.id === id);
  if (!g) {
    root.append(el('div.page-top', el('div.wrap.section.center-x',
      el('div.empty-state', {
        html: `${icon('book', 28)}<div style="font-weight:800;margin-top:10px">Guide not found</div>
        <div style="margin-top:8px"><a href="#/learn" class="text-accent" style="font-weight:700">Back to all guides</a></div>`,
      }),
    )));
    return;
  }
  const others = LANGUAGE_GUIDES.filter((x) => x.id !== id);

  root.append(el('div.page-top', { style: { paddingBottom: '70px' } },
    el('div.wrap',
      el('div.breadcrumb', { style: { marginBottom: '18px' } },
        el('a', { href: '#/', text: 'Home' }),
        el('span.sep', { text: '/' }),
        el('a', { href: '#/learn', text: 'Learn' }),
        el('span.sep', { text: '/' }),
        el('span', { text: g.name }),
      ),
      el('div.guide-layout',
        el('nav.guide-nav',
          el('div.h-title', { style: { fontSize: '11px', fontWeight: 800, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--muted-light)', padding: '6px 14px 10px' }, text: 'Guides' }),
          ...LANGUAGE_GUIDES.map((x) => el('a', {
            href: `#/learn/${x.id}`,
            class: x.id === id ? 'active' : '',
            text: x.name,
          })),
          el('a', { href: '#/glossary', text: 'Tech glossary' }),
        ),
        el('article.guide-content',
          el('div.hero-mini', { style: { padding: 'clamp(24px,4vw,42px)' } },
            el('div.hm-deco'),
            el('div', { style: { position: 'relative' } },
              el('div.row', { style: { gap: '12px', marginBottom: '14px', flexWrap: 'wrap' } },
                el('div.l-ico', { class: g.color, style: { width: '46px', height: '46px', borderRadius: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }, html: icon(g.icon, 22) }),
                el('span.badge.badge-free', { text: g.level }),
              ),
              el('h1.display', { style: { fontSize: 'clamp(30px,4.5vw,44px)' }, html: `${g.name} — <em>${g.tagline}</em>` }),
              el('p.lede', { style: { marginTop: '14px' }, text: g.intro }),
            ),
          ),

          el('h2', { text: 'What is it used for?' }),
          el('ul.list', ...g.used.map((u) => el('li', { text: u }))),

          el('h2', { text: 'Key concepts — the meaning of things' }),
          ...g.concepts.map((c) => el('div', { style: { marginBottom: '18px' } },
            el('h3', { text: c.t }),
            el('p', { text: c.d }),
          )),

          el('h2', { text: 'Try it — starter code' }),
          el('pre.code', { text: g.example }),
          el('div.tool-actions', { style: { margin: '12px 0 8px' } },
            el('button.btn.btn-soft', { html: `${icon('copy', 15)} Copy code`, onclick: () => copyText(g.example) }),
            el('a.btn.btn-soft', { href: '#/tool/code-playground', html: `${icon('code', 15)} Open in playground` }),
          ),

          el('h2', { text: 'Words you will hear (meanings)' }),
          el('div.card', { style: { padding: '8px 22px' } },
            el('div', { html: g.words.map(([w, d]) => `<div class="term-row"><div class="term-name">${w}</div><div class="term-mean">${d}</div></div>`).join('') }),
          ),

          el('h2', { text: 'Practice with these tools' }),
          el('div.wrap-gap-sm', ...g.tools.map((tid) => {
            const t = TOOL_MAP[tid];
            if (!t) return null;
            return el('a.related-item', {
              href: tid === 'github' ? 'https://github.com' : `#/tool/${tid}`,
              ...(tid === 'github' ? { target: '_blank', rel: 'noopener' } : {}),
              style: { maxWidth: '260px' },
              html: `<div class="r-ico tile-sand">${icon(t.icon, 15)}</div><span>${t.name}</span>`,
            });
          }).filter(Boolean)),

          el('h2', { text: 'Keep learning' }),
          el('div.grid.grid-2', ...others.slice(0, 4).map((x) => el('a.card.card-hover.learn-card', {
            href: `#/learn/${x.id}`,
            style: { padding: '20px' },
            html: `<div class="l-title" style="font-size:16px">${x.name}</div><div class="l-desc">${x.tagline}</div>`,
          }))),
        ),
      ),
    ),
  ));
}
