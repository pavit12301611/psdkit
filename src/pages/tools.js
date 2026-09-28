/* Tools browser & tool detail pages */
import { el, debounce, toast, copyText } from '../ui.js';
import { icon } from '../icons.js';
import { CATEGORIES, TOOLS, toolsByCat, searchTools, TOOL_MAP, getTool } from '../tools/index.js';
import { getFavourites, toggleFavourite, isFavourite, pushRecentTool, getRecentTools, pushRecentSearch, getRecentSearches } from '../prefs.js';
import { fetchCommunityTools, communityCatalogueCard, matchesCommunityQuery, dataProblemNote } from './community.js';
import { t } from '../data/i18n.js';

/* The catalogue is a fixed set of built-in tools, but the community publishes
   into the same place. It gets its own chip so nobody has to guess where a
   published tool went. */
const COMMUNITY_CAT = 'community';

function favouriteButton(toolId, { large = false, onChange } = {}) {
  const btn = el('button.fav-btn', {
    class: isFavourite(toolId) ? 'active' : '',
    'aria-label': isFavourite(toolId) ? 'Remove from favourites' : 'Add to favourites',
    html: `${icon('star', large ? 18 : 16)}`,
    onclick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      const active = toggleFavourite(toolId);
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-label', active ? 'Remove from favourites' : 'Add to favourites');
      toast(active ? 'Saved to favourites' : 'Removed from favourites');
      onChange?.();
    },
  });
  return btn;
}

function toolCard(t, { onFavouriteChange } = {}) {
  const cat = CATEGORIES.find((c) => c.id === t.cat);
  return el('a.card.card-hover.tool-card', {
    href: `#/tool/${t.id}`,
  },
  favouriteButton(t.id, { onChange: onFavouriteChange }),
  el('div', { class: `t-icon ${cat.tile}`, html: icon(t.icon, 21) }),
  el('div.t-name', { text: t.name }),
  el('div.t-desc', { text: t.desc }),
  el('div.t-go', { html: `Open ${icon('arrowRight', 13)}` }),
  el('div.t-arrow', { html: icon('arrowUpRight', 17) }));
}

function miniToolRow(tools) {
  return el('div.wrap-gap-sm', ...tools.map((tool) => el('a.related-item', {
    href: `#/tool/${tool.id}`,
    html: `<div class="r-ico tile-sand">${icon(tool.icon, 15)}</div><span>${tool.name}</span>`,
  })));
}

function shareRow(tool) {
  const shareText = `${tool.name} — ${tool.desc}`;
  const hashUrl = `${location.origin}${location.pathname}#/tool/${tool.id}`;
  const buttons = [
    ['Copy link', async () => copyText(hashUrl)],
    ['WhatsApp', () => window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${hashUrl}`)}`, '_blank', 'noopener')],
    ['X', () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(hashUrl)}`, '_blank', 'noopener')],
    ['Facebook', () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(hashUrl)}`, '_blank', 'noopener')],
    ['LinkedIn', () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(hashUrl)}`, '_blank', 'noopener')],
  ];
  const row = el('div.share-row', el('div.field-hint', { text: 'Share this tool' }));
  if (navigator.share) {
    row.append(el('button.btn.btn-soft.btn-sm', { text: 'Share', onclick: () => navigator.share({ title: tool.name, text: shareText, url: hashUrl }).catch(() => null) }));
  }
  buttons.forEach(([label, handler]) => row.append(el('button.btn.btn-soft.btn-sm', { text: label, onclick: handler })));
  return row;
}

function contextualAiChips(tool) {
  const prompts = [`How do I use ${tool.name}?`, `Alternatives to ${tool.name}?`, `Tips for ${tool.name}`];
  return el('div.ai-chips', ...prompts.map((prompt) => el('button.ai-chip', { text: prompt, onclick: () => window.PSDKIT_AI?.open(prompt) })));
}

/* ───────── Browser page: #/tools and #/tools/:cat ───────── */
export function renderToolsPage(root, catId = null) {
  const isKnownCat = (id) => id === COMMUNITY_CAT || CATEGORIES.some((c) => c.id === id);
  let activeCat = isKnownCat(catId) ? catId : 'all';
  let query = '';

  const grid = el('div.grid.grid-3');
  const countEl = el('div.field-hint');
  const favoritesHost = el('div');
  const recentHost = el('div');
  const chipsHost = el('div.wrap-gap-sm', { style: { marginTop: '12px' } });
  const searchInput = el('input', {
    type: 'search',
    placeholder: t('smartSearchHint'),
    'data-search-input': '1',
  });

  /* Live community data, fetched once per visit and re-rendered on arrival. */
  let community = { tools: [], live: false, error: null, configured: true, loaded: false };
  let communityPromise = null;
  const loadCommunity = (force = false) => {
    if (communityPromise && !force) return communityPromise;
    communityPromise = fetchCommunityTools({ sort: 'latest' }).then((result) => {
      community = { ...result, loaded: true };
      renderChips();
      renderGrid();
      return result;
    });
    return communityPromise;
  };

  const renderRecentSearches = () => {
    const history = getRecentSearches();
    chipsHost.innerHTML = '';
    if (!history.length) return;
    chipsHost.append(el('div.field-hint', { text: `${t('recentSearches')}:` }), ...history.map((term) => el('button.chip', {
      text: term,
      onclick: () => {
        searchInput.value = term;
        query = term;
        renderGrid();
      },
    })));
  };

  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  const renderCommunityOnly = () => {
    grid.innerHTML = '';
    if (!community.loaded) {
      countEl.textContent = 'Loading community tools…';
      grid.append(el('div.skeleton', { style: { gridColumn: '1 / -1', height: '120px' } }));
      return;
    }
    if (community.error) {
      countEl.textContent = 'Community tools unavailable';
      grid.append(el('div', { style: { gridColumn: '1 / -1' } }, dataProblemNote(community.error)));
      return;
    }
    if (!community.configured) {
      countEl.textContent = 'Community publishing is not connected';
      grid.append(el('div.empty-state', { style: { gridColumn: '1 / -1' } },
        el('div', { html: icon('users', 26) }),
        el('div', { style: { marginTop: '10px', fontWeight: 700 }, text: 'No community tools here yet' }),
        el('div', { style: { fontSize: '13.5px', marginTop: '6px' }, text: 'Community tools appear here once Firebase is connected — see DEPLOYMENT.md.' }),
        el('a.btn.btn-accent', { style: { marginTop: '16px' }, href: '#/community', text: t('community') }),
      ));
      return;
    }
    countEl.textContent = `${plural(community.tools.length, 'community tool')} · newest first`;
    if (!community.tools.length) {
      grid.append(el('div.empty-state', { style: { gridColumn: '1 / -1' } },
        el('div', { html: icon('sparkles', 26) }),
        el('div', { style: { marginTop: '10px', fontWeight: 700 }, text: 'Nobody has published a tool yet' }),
        el('div', { style: { fontSize: '13.5px', marginTop: '6px' }, text: 'Be the first — your tool shows up here with your name on it.' }),
        el('a.btn.btn-accent', { style: { marginTop: '16px' }, href: '#/community/add', text: t('publishATool') }),
      ));
      return;
    }
    grid.append(...community.tools.map((tool) => communityCatalogueCard(tool, { onRefresh: () => loadCommunity(true) })));
  };

  const renderGrid = () => {
    if (activeCat === COMMUNITY_CAT && !query) return renderCommunityOnly();
    let list = query ? searchTools(query) : activeCat === 'all' ? TOOLS : toolsByCat(activeCat);
    if (query && activeCat !== 'all') list = list.filter((tool) => tool.cat === activeCat);
    /* Searching also looks at the community, so a published tool is findable
       by its own name instead of being hidden behind a chip. */
    const extra = query ? community.tools.filter((tool) => matchesCommunityQuery(tool, query)) : [];
    grid.innerHTML = '';
    countEl.textContent = `${plural(list.length + extra.length, 'tool')}${query ? ` matching “${query}”` : ''}`;
    if (!list.length && !extra.length) {
      const empty = el('div.empty-state', { style: { gridColumn: '1 / -1' } },
        el('div', { html: icon('search', 28) }),
        el('div', { style: { marginTop: '10px', fontWeight: 700 }, text: t('noResults') }),
        el('div', { style: { fontSize: '13.5px', marginTop: '6px' }, text: 'Try a shorter query, browse a category, or ask the assistant to recommend a tool.' }),
        el('button.btn.btn-accent', { style: { marginTop: '16px' }, text: `${t('askAI')}: ${query || 'find a tool'}`, onclick: () => window.PSDKIT_AI?.open(`Find me a PSDKIT tool for ${query}`) }),
      );
      grid.append(empty);
      return;
    }
    if (list.length) grid.append(...list.map((tool) => toolCard(tool, { onFavouriteChange: () => { renderFavourites(); renderRecent(); } })));
    if (extra.length) {
      grid.append(el('div', { style: { gridColumn: '1 / -1', marginTop: list.length ? '18px' : '0' } },
        el('div.field-hint', { text: `From the ${t('community').toLowerCase()} — published by members` })));
      grid.append(...extra.map((tool) => communityCatalogueCard(tool, { onRefresh: () => loadCommunity(true) })));
    }
  };

  const renderFavourites = () => {
    const list = getFavourites().map((id) => TOOL_MAP[id]).filter(Boolean);
    favoritesHost.innerHTML = '';
    if (!list.length) return;
    favoritesHost.append(
      el('div.section-head', { style: { marginBottom: '16px' } },
        el('div.eyebrow', { text: t('myFavourites') }),
        el('h2.display', { style: { fontSize: 'clamp(22px,4vw,30px)' }, html: 'Starred <em>tools</em>' }),
      ),
      el('div.grid.grid-3', ...list.slice(0, 6).map((tool) => toolCard(tool, { onFavouriteChange: renderFavourites }))),
    );
  };

  const renderRecent = () => {
    const list = getRecentTools().map((id) => TOOL_MAP[id]).filter(Boolean);
    recentHost.innerHTML = '';
    if (!list.length) return;
    recentHost.append(
      el('div.section-head', { style: { marginBottom: '16px', marginTop: '28px' } },
        el('div.eyebrow', { text: t('jumpBackIn') }),
        el('h2.display', { style: { fontSize: 'clamp(22px,4vw,30px)' }, html: 'Recently <em>opened</em>' }),
      ),
      miniToolRow(list),
    );
  };

  const chips = el('div.cat-chips');
  const selectCat = (id) => {
    activeCat = id;
    chips.querySelectorAll('.chip').forEach((item) => item.classList.toggle('active', item.dataset.cat === id));
    renderGrid();
    history.replaceState(null, '', id === 'all' ? '#/tools' : `#/tools/${id}`);
  };

  function renderChips() {
    chips.innerHTML = '';
    const entries = [
      ['all', t('allTools'), 'grid'],
      ...CATEGORIES.map((c) => [c.id, `${c.short} (${toolsByCat(c.id).length})`, c.icon]),
      /* The count is whatever Firestore holds right now, so it is re-rendered
         when the read lands rather than baked in. */
      [COMMUNITY_CAT, `${t('community')}${community.loaded ? ` (${community.tools.length})` : ''}`, 'users'],
    ];
    for (const [id, label, ic] of entries) {
      chips.append(el('button.chip', {
        class: id === activeCat ? 'active' : '',
        dataset: { cat: id },
        html: `${icon(ic, 14)} ${label}`,
        onclick: () => selectCat(id),
      }));
    }
  }

  searchInput.addEventListener('input', debounce(() => {
    query = searchInput.value.trim();
    if (query.length >= 2) pushRecentSearch(query);
    renderRecentSearches();
    renderGrid();
  }, 180));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && searchInput.value.trim()) pushRecentSearch(searchInput.value.trim());
  });

  root.append(
    el('div.page-top',
      el('div.page-head',
        el('div.wrap',
          el('div.breadcrumb', el('a', { href: '#/', text: 'Home' }), el('span.sep', { text: '/' }), el('span', { text: 'Tools' })),
          el('h1.display', { style: { fontSize: 'clamp(32px,5vw,48px)', margin: '14px 0 10px' }, html: 'The <em>Toolkit</em>' }),
          el('p.lede', { text: `${TOOLS.length} free tools — with favourites, recent history, typo-tolerant search and an assistant that can point you to the right one. The ${t('community').toLowerCase()} chip lists tools members have published.` }),
        ),
      ),
      el('div.browser-bar', el('div.wrap',
        favoritesHost,
        recentHost,
        el('div.browser-row', el('div.search-box', el('span.s-ico', { html: icon('search', 19) }), searchInput)),
        chipsHost,
        chips,
      )),
      el('div.section', { style: { paddingTop: '34px', paddingBottom: '70px' } },
        el('div.wrap', el('div.row-between', { style: { marginBottom: '18px' } }, countEl), grid),
      ),
    ),
  );

  renderChips();
  renderFavourites();
  renderRecent();
  renderRecentSearches();
  renderGrid();
  /* After renderChips/renderGrid exist, so the first arrival can re-draw. */
  loadCommunity();
  try {
    if (sessionStorage.getItem('psdkit_focus_search') === '1') {
      sessionStorage.removeItem('psdkit_focus_search');
      setTimeout(() => searchInput.focus({ preventScroll: false }), 40);
    }
  } catch {
    /* ignore */
  }
}

/* ───────── Tool detail page: #/tool/:id ───────── */
export function renderToolPage(root, id) {
  const tool = getTool(id);
  const meta = TOOL_MAP[id];
  if (!tool || !meta) {
    root.append(el('div.page-top', el('div.wrap.section.center-x', el('div.empty-state', {
      html: `${icon('search', 30)}<div style="font-weight:800;margin-top:10px">Tool not found</div><div style="margin-top:8px">It may have been renamed. Browse the <a href="#/tools" class="text-accent" style="font-weight:700">full toolkit</a> instead.</div>`,
    }))));
    return;
  }
  pushRecentTool(id);
  window.PSDKIT_AI?.setContext?.(meta);

  const cat = CATEGORIES.find((c) => c.id === tool.cat);
  const related = TOOLS.filter((t) => t.cat === tool.cat && t.id !== tool.id).slice(0, 6);
  const runner = el('div.tool-panel');
  try { tool.mount(runner); } catch (e) { runner.append(el('div.note', { html: icon('info', 17) + `<span>This tool failed to load: ${e.message}. Try refreshing the page.</span>` })); }

  const helpSteps = tool.help || [
    'Open the tool — it works instantly, no login needed.',
    'Fill in the fields or drop your file — everything runs in your browser.',
    'Copy, download or save the result. Use Ask AI if anything is unclear.',
  ];

  root.append(
    el('div.page-top', { style: { paddingBottom: '70px' } },
      el('div.wrap',
        el('div.breadcrumb', { style: { marginBottom: '18px' } },
          el('a', { href: '#/', text: 'Home' }), el('span.sep', { text: '/' }),
          el('a', { href: '#/tools', text: 'Tools' }), el('span.sep', { text: '/' }),
          el('a', { href: `#/tools/${tool.cat}`, text: cat.short }), el('span.sep', { text: '/' }),
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
          favouriteButton(tool.id, { large: true }),
        ),
        shareRow(tool),
        el('div.tool-layout',
          el('div',
            runner,
            el('div.tool-panel', el('div.help-block', el('div.h-title', { text: 'how to use' }), el('ol.help-steps', ...helpSteps.map((step) => el('li', { text: step }))))),
            el('div.tool-panel',
              el('div.help-block',
                el('div.h-title', { text: 'ask the ai about this tool' }),
                el('p.text-muted', { style: { fontSize: '14px', lineHeight: 1.7 }, text: 'The assistant knows this tool, similar alternatives and step-by-step guidance.' }),
                contextualAiChips(tool),
              ),
            ),
          ),
          el('div', { style: { display: 'flex', flexDirection: 'column', gap: '18px' } },
            el('div.tool-panel', { style: { position: 'sticky', top: 'calc(var(--nav-h) + 16px)' } },
              el('div.help-block',
                el('div.h-title', { text: `more ${cat.short.toLowerCase()} tools` }),
                el('div.related-row', ...related.map((item) => el('a.related-item', {
                  href: `#/tool/${item.id}`,
                  html: `<div class="r-ico ${cat.tile}">${icon(item.icon, 15)}</div><span>${item.name}</span>`,
                }))),
                el('a.btn.btn-soft.btn-block', { href: `#/tools/${tool.cat}`, style: { marginTop: '6px' }, html: `All ${cat.short} tools ${icon('arrowRight', 15)}` }),
              ),
            ),
            el('div.tool-panel',
              el('div.help-block',
                el('div.h-title', { text: 'good to know' }),
                el('ul.help-steps',
                  el('li', { text: 'Everything runs locally in your browser — files and data stay on your device unless the tool clearly needs network data.' }),
                  el('li', { text: 'Works on phones and tablets as well as desktops.' }),
                  el('li', { text: 'Star this tool to find it faster next time.' }),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
