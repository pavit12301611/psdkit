/* Tools browser & tool detail/runner pages */
import { el, debounce, toast, copyText } from '../ui.js';
import { icon } from '../icons.js';
import { CATEGORIES, TOOLS, toolsByCat, searchTools, TOOL_MAP, getTool } from '../tools/index.js';

function toolCard(t) {
  const cat = CATEGORIES.find((c) => c.id === t.cat);
  return el('a.card.card-hover.tool-card', {
    href: `#/tool/${t.id}`,
    html: `
      <div class="t-icon ${cat.tile}">${icon(t.icon, 21)}</div>
      <div class="t-name">${t.name}</div>
      <div class="t-desc">${t.desc}</div>
      <div class="t-go">Open ${icon('arrowRight', 13)}</div>
      <div class="t-arrow">${icon('arrowUpRight', 17)}</div>
    `,
  });
}

/* ───────── Browser page: #/tools and #/tools/:cat ───────── */
export function renderToolsPage(root, catId = null) {
  let activeCat = catId && CATEGORIES.some((c) => c.id === catId) ? catId : 'all';
  let query = '';

  const grid = el('div.grid.grid-3');
  const countEl = el('div.field-hint');
  const searchInput = el('input', {
    type: 'search',
    placeholder: 'Search 150 tools… try “pdf”, “qr”, “convert”, “password”',
  });

  const renderGrid = () => {
    let list = query ? searchTools(query) : activeCat === 'all' ? TOOLS : toolsByCat(activeCat);
    if (query && activeCat !== 'all') list = list.filter((t) => t.cat === activeCat);
    grid.innerHTML = '';
    countEl.textContent = `${list.length} tool${list.length === 1 ? '' : 's'}${query ? ` matching “${query}”` : ''}`;
    if (!list.length) {
      grid.append(el('div.empty-state', {
        style: { gridColumn: '1 / -1' },
        html: `${icon('search', 28)}<div style="margin-top:10px;font-weight:700">No tools match that search</div>
               <div style="font-size:13.5px;margin-top:6px">Try a simpler word — or ask the AI assistant (bottom right) to find the right tool for you.</div>`,
      }));
      return;
    }
    grid.append(...list.map(toolCard));
  };

  const chips = el('div.cat-chips');
  const chipDefs = [['all', 'All tools', `grid`], ...CATEGORIES.map((c) => [c.id, `${c.short} (${toolsByCat(c.id).length})`, c.icon])];
  for (const [id, label, ic] of chipDefs) {
    const chip = el('button.chip', {
      class: id === activeCat ? 'chip active' : 'chip',
      dataset: { cat: id },
      html: `${icon(ic, 14)} ${label}`,
      onclick: () => {
        activeCat = id;
        chips.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.dataset.cat === id));
        renderGrid();
        history.replaceState(null, '', id === 'all' ? '#/tools' : `#/tools/${id}`);
      },
    });
    chips.append(chip);
  }

  searchInput.addEventListener('input', debounce(() => {
    query = searchInput.value.trim();
    renderGrid();
  }, 220));

  root.append(
    el('div.page-top',
      el('div.page-head',
        el('div.wrap',
          el('div.breadcrumb',
            el('a', { href: '#/', text: 'Home' }),
            el('span.sep', { text: '/' }),
            el('span', { text: 'Tools' }),
          ),
          el('h1.display', { style: { fontSize: 'clamp(32px,5vw,48px)', margin: '14px 0 10px' }, html: 'The <em>Toolkit</em>' }),
          el('p.lede', {
            text: '150 free tools — 50 for daily life, 25 for the internet, 25 essentials and 50 for coding & learning. Everything runs in your browser, no account needed.',
          }),
        ),
      ),
      el('div.browser-bar',
        el('div.wrap',
          el('div.browser-row',
            el('div.search-box',
              el('span.s-ico', { html: icon('search', 19) }),
              searchInput,
            ),
          ),
          chips,
        ),
      ),
      el('div.section', { style: { paddingTop: '34px', paddingBottom: '70px' } },
        el('div.wrap',
          el('div.row-between', { style: { marginBottom: '18px' } }, countEl),
          grid,
        ),
      ),
    ),
  );
  renderGrid();
}

/* ───────── Tool detail page: #/tool/:id ───────── */
export function renderToolPage(root, id) {
  const tool = getTool(id);
  const meta = TOOL_MAP[id];
  if (!tool || !meta) {
    root.append(el('div.page-top', el('div.wrap.section.center-x',
      el('div.empty-state', {
        html: `${icon('search', 30)}<div style="font-weight:800;margin-top:10px">Tool not found</div>
        <div style="margin-top:8px">It may have been renamed. Browse the <a href="#/tools" class="text-accent" style="font-weight:700">full toolkit</a> instead.</div>`,
      }),
    )));
    return;
  }
  const cat = CATEGORIES.find((c) => c.id === tool.cat);
  const related = TOOLS.filter((t) => t.cat === tool.cat && t.id !== tool.id).slice(0, 6);

  const runner = el('div.tool-panel');
  try {
    tool.mount(runner);
  } catch (e) {
    runner.append(el('div.note', { html: icon('info', 17) + `<span>This tool failed to load: ${e.message}. Try refreshing the page.</span>` }));
  }

  const helpSteps = [
    `Open the tool — it works instantly, no login needed.`,
    `Fill in the fields or drop your file — everything runs in your browser.`,
    `Copy, download or save the result. Use “Ask AI” if anything is unclear.`,
  ];

  root.append(
    el('div.page-top', { style: { paddingBottom: '70px' } },
      el('div.wrap',
        el('div.breadcrumb', { style: { marginBottom: '18px' } },
          el('a', { href: '#/', text: 'Home' }),
          el('span.sep', { text: '/' }),
          el('a', { href: '#/tools', text: 'Tools' }),
          el('span.sep', { text: '/' }),
          el('a', { href: `#/tools/${tool.cat}`, text: cat.short }),
          el('span.sep', { text: '/' }),
          el('span', { text: tool.name }),
        ),
        el('div.tool-head-row',
          el('div.t-icon', { class: cat.tile, html: icon(tool.icon, 28) }),
          el('div', { style: { flex: 1 } },
            el('div.row', { style: { gap: '10px', marginBottom: '8px', flexWrap: 'wrap' } },
              el('span.badge', { class: cat.badge, text: cat.name }),
              el('span.badge.badge-free', { text: 'Free · No login' }),
            ),
            el('h1.tool-title', { text: tool.name }),
            el('p.tool-desc', { text: tool.desc }),
          ),
        ),
        el('div.tool-layout',
          el('div',
            runner,
            el('div.tool-panel',
              el('div.help-block',
                el('div.h-title', { text: 'how to use' }),
                el('ol.help-steps', ...helpSteps.map((s) => el('li', { text: s }))),
              ),
            ),
            el('div.tool-panel',
              el('div.row-between',
                el('div.help-block', { style: { flex: 1 } },
                  el('div.h-title', { text: 'stuck? ask the ai' }),
                  el('p.text-muted', { style: { fontSize: '14px', lineHeight: 1.7 }, text: 'The PSDKIT assistant knows this tool and every other page on the site — ask it for steps, alternatives or definitions.' }),
                ),
                el('button.btn.btn-accent', {
                  style: { flex: 'none' },
                  html: `${icon('sparkles', 17)} Ask AI about ${tool.name.split(' ')[0]}`,
                  onclick: () => {
                    window.PSDKIT_AI?.open(`How do I use the ${tool.name}?`);
                  },
                }),
              ),
            ),
          ),
          el('div', { style: { display: 'flex', flexDirection: 'column', gap: '18px' } },
            el('div.tool-panel', { style: { position: 'sticky', top: 'calc(var(--nav-h) + 16px)' } },
              el('div.help-block',
                el('div.h-title', { text: `more ${cat.short.toLowerCase()} tools` }),
                el('div.related-row', ...related.map((t) => el('a.related-item', {
                  href: `#/tool/${t.id}`,
                  html: `<div class="r-ico ${cat.tile}">${icon(t.icon, 15)}</div><span>${t.name}</span>`,
                }))),
                el('a.btn.btn-soft.btn-block', {
                  href: `#/tools/${tool.cat}`,
                  style: { marginTop: '6px' },
                  html: `All ${cat.short} tools ${icon('arrowRight', 15)}`,
                }),
              ),
            ),
            el('div.tool-panel',
              el('div.help-block',
                el('div.h-title', { text: 'good to know' }),
                el('ul.help-steps',
                  el('li', { text: 'Everything runs locally in your browser — files and data stay on your device.' }),
                  el('li', { text: 'Works on phones and tablets as well as desktops.' }),
                  el('li', { text: 'No ads, no account, no usage limits.' }),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
