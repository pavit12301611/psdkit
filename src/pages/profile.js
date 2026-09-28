import { el, createAvatar, fmt } from '../ui.js';
import { icon } from '../icons.js';
import { getFavouriteTools } from '../prefs.js';
import { TOOL_MAP } from '../tools/index.js';
import { listToolsByAuthor, firebaseReady } from '../firebase.js';
import { communityCard, renderAuthorTools } from './community.js';
import { t } from '../data/i18n.js';

function toolLinkCard(tool) {
  return el('a.related-item', {
    href: `#/tool/${tool.id}`,
    style: { maxWidth: 'unset' },
    html: `<div class="r-ico tile-sand">${icon(tool.icon, 15)}</div><span>${tool.name}</span>`,
  });
}

export function renderProfilePage(root, user) {
  root.append(el('div.page-top', { style: { paddingBottom: '70px' } },
    el('div.wrap',
      el('div.breadcrumb', { style: { marginBottom: '18px' } },
        el('a', { href: '#/', text: 'Home' }), el('span.sep', { text: '/' }), el('span', { text: 'Profile' }),
      ),
    ),
  ));

  const host = root.querySelector('.wrap');
  if (!user) {
    host.append(el('div.empty-state', { html: `${icon('user', 26)}<div style="margin-top:10px;font-weight:800">${t('signInRequired')}</div><div style="margin-top:8px">Publish tools, see your stats and manage your work from one place.</div><a class="btn btn-accent" style="margin-top:16px" href="#/signin">${t('signIn')}</a>` }));
    return;
  }

  const stats = el('div.stat-grid');
  const favList = getFavouriteTools(TOOL_MAP);
  const yourTools = el('div.grid.grid-2');
  const toolsProblem = el('div');

  const renderLoaded = async () => {
    toolsProblem.innerHTML = '';
    /* `tools: null` means the read failed. Rendering that as "you have not
       published anything" is what told a successful author their publish had
       silently vanished. */
    const { tools, error } = firebaseReady
      ? await listToolsByAuthor(user.uid)
      : { tools: [], error: null };
    const authored = tools || [];
    const totalRuns = authored.reduce((sum, tool) => sum + Number(tool.runs || 0), 0);
    stats.innerHTML = '';
    stats.append(
      el('div.stat', el('div.k', { text: t('toolsPublished') }), el('div.v', { text: error ? '—' : String(authored.length) })),
      el('div.stat', el('div.k', { text: t('totalRuns') }), el('div.v', { text: error ? '—' : fmt.num(totalRuns, 0) })),
      el('div.stat', el('div.k', { text: 'Favourites' }), el('div.v', { text: String(favList.length) })),
    );
    if (error) {
      toolsProblem.append(el('div.note', {},
        el('div', { html: icon('info', 17) }),
        el('span', {},
          el('strong', { text: 'Your tools could not be loaded. ' }),
          el('span', { text: `${error.message} Nothing was lost — retry once Firestore answers.` }),
        ),
      ));
    }
    yourTools.innerHTML = '';
    renderAuthorTools(yourTools, authored, renderLoaded);
  };

  host.append(
    el('div.profile-hero',
      createAvatar(user, 96),
      el('div',
        el('h1.display', { style: { fontSize: 'clamp(30px,4.5vw,44px)' }, text: user.displayName || 'Member' }),
        el('p.lede', { text: user.email || '' }),
        el('div.field-hint', { text: `${t('memberSince')}: ${fmt.date(user.metadata?.creationTime || Date.now())}` }),
      ),
    ),
    stats,
    el('div.section-head', { style: { marginTop: '42px' } },
      el('div.eyebrow', { text: t('myFavourites') }),
      el('h2.display.h-section', { html: 'Saved <em>for later</em>' }),
    ),
    favList.length ? el('div.wrap-gap-sm', ...favList.map(toolLinkCard)) : el('div.note', { html: `${icon('star', 16)}<span>${t('favouritesEmpty')}</span>` }),
    el('div.section-head', { style: { marginTop: '42px' } },
      el('div.eyebrow', { text: t('yourPublishedTools') }),
      el('h2.display.h-section', { html: 'Your community <em>tools</em>' }),
    ),
    toolsProblem,
    yourTools,
  );
  renderLoaded();
}
