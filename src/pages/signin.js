import { el, createAvatar } from '../ui.js';
import { icon } from '../icons.js';
import { firebaseReady, signInWithGoogle } from '../firebase.js';
import { t } from '../data/i18n.js';

function googleIcon() {
  return `<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path fill="#EA4335" d="M9 7.364v3.545h4.929c-.218 1.14-.873 2.104-1.855 2.75l3 2.327C16.823 14.387 18 11.95 18 9c0-.61-.055-1.197-.155-1.773H9Z"/><path fill="#4285F4" d="M9 18c2.43 0 4.47-.805 5.96-2.186l-3-2.327c-.833.559-1.9.891-2.96.891-2.276 0-4.204-1.536-4.893-3.6H1.005v2.391A9 9 0 0 0 9 18Z"/><path fill="#FBBC05" d="M4.107 10.778A5.407 5.407 0 0 1 3.833 9c0-.616.1-1.214.274-1.778V4.831H1.005A9.001 9.001 0 0 0 0 9c0 1.45.346 2.824 1.005 4.169l3.102-2.391Z"/><path fill="#34A853" d="M9 3.622c1.322 0 2.509.455 3.443 1.35l2.582-2.582C13.464.949 11.425 0 9 0A9 9 0 0 0 1.005 4.831l3.102 2.391C4.796 5.158 6.724 3.622 9 3.622Z"/></svg>`;
}

export function renderSignInPage(root, user) {
  const previous = (() => {
    try { return sessionStorage.getItem('psdkit_last_route') || '#/tools'; } catch { return '#/tools'; }
  })();

  const card = el('div.auth-card',
    el('img', { src: '/logo.png', alt: 'PSDKIT Pro logo', width: 66, height: 66, style: { margin: '0 auto 16px', borderRadius: '18px' } }),
    el('div.eyebrow.no-dots', { style: { justifyContent: 'center', marginBottom: '10px' }, text: 'Account' }),
    el('h1.display', { style: { fontSize: 'clamp(32px,5vw,48px)', textAlign: 'center' }, html: 'Welcome to <em>PSDKIT Pro.</em>' }),
    el('p.lede', { style: { textAlign: 'center', margin: '14px auto 0' }, text: 'Sign in once to publish community tools, collect favourites across devices later, and manage what you share.' }),
    user ? el('div.card', { style: { marginTop: '24px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' } },
      createAvatar(user, 56),
      el('div', el('div', { style: { fontWeight: 800 }, text: user.displayName || 'Signed in' }), el('div.field-hint', { text: user.email || '' })),
    ) : null,
    firebaseReady
      ? el('button.btn.btn-primary.btn-block.btn-lg', {
        style: { marginTop: '24px' },
        html: `${googleIcon()} ${t('continueWithGoogle')}`,
        onclick: async () => signInWithGoogle({ returnTo: previous }),
      })
      : el('div.note', { style: { marginTop: '24px' }, html: `${icon('info', 17)}<span>Google sign-in is ready in the code, but Firebase is not configured yet. Add the Vercel environment variables from DEPLOYMENT.md and redeploy.</span>` }),
    el('ul.benefits-list',
      el('li', { html: `${icon('check', 16)} ${t('benefitsPublish')}` }),
      el('li', { html: `${icon('check', 16)} ${t('benefitsCredit')}` }),
      el('li', { html: `${icon('check', 16)} ${t('benefitsManage')}` }),
    ),
    el('a.btn.btn-soft.btn-block', { href: '#/tools', text: t('continueWithoutAccount') }),
    el('p.field-hint', { style: { textAlign: 'center', marginTop: '16px' }, text: t('privacyNote') }),
  );

  root.append(el('div.page-top.signin-page',
    el('div.wrap',
      el('div.auth-shell', card),
    ),
  ));
}
