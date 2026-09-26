import { el } from '../ui.js';
import { icon } from '../icons.js';
import { TOOLS } from '../tools/index.js';
import { t } from '../data/i18n.js';

export function renderNotFoundPage(root) {
  const input = el('input', { class: 'input', type: 'search', placeholder: 'Search for a tool, guide or page…', 'data-search-input': '1' });
  input.addEventListener('focus', () => {
    if (window.PSDKIT_APP?.focusSearch) {
      setTimeout(() => window.PSDKIT_APP.focusSearch(), 40);
    }
  });
  root.append(el('div.page-top', { style: { paddingBottom: '70px' } },
    el('div.wrap',
      el('div.notfound-shell',
        el('div.serif-num', { style: { fontSize: '96px' }, text: '404' }),
        el('h1.display', { style: { fontSize: 'clamp(30px,4.5vw,44px)' }, html: 'Page not <em>found</em>' }),
        el('p.lede', { style: { margin: '0 auto' }, text: t('unknownRoute') }),
        el('div.search-box', { style: { maxWidth: '560px', margin: '18px auto 0' } }, el('span.s-ico', { html: icon('search', 19) }), input),
        el('div.wrap-gap-sm', { style: { justifyContent: 'center', marginTop: '18px' } },
          ...TOOLS.slice(0, 6).map((tool) => el('a.chip', { href: `#/tool/${tool.id}`, text: tool.name })),
        ),
        el('a.btn.btn-primary', { href: '#/', style: { marginTop: '18px' }, text: t('backHome') }),
      ),
    ),
  ));
}
