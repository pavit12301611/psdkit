/* Help / About page — FAQ, getting started, contact info */
import { el } from '../ui.js';
import { icon } from '../icons.js';

const FAQS = [
  ['Do I need an account to use the tools?', 'No. All 150 tools work instantly without any login. You only sign in with Google if you want to publish a tool to the Community Toolbox — and even that is optional.'],
  ['Are my files and data safe?', 'Yes — nearly everything runs locally in your browser. Your PDFs, images, passwords and notes never touch a server. Tools that need network data (IP lookup, dictionary, currency rates) only fetch that specific public information.'],
  ['Does it work on mobile phones?', 'Absolutely. Every tool is designed mobile-first: big touch targets, responsive layouts and lightweight code so it stays smooth on slower connections.'],
  ['How does the AI assistant work?', 'The assistant (bottom-right button) knows every tool and page on PSDKIT Pro. Ask it things like “how do I compress a PDF” or “what does API mean” and it will explain and link you to the exact page. When an AI API key is configured, it becomes even smarter.'],
  ['How can I add a new tool?', 'Head to Community → Publish a tool. Give it a name, short description and the HTML/CSS/JavaScript code — it gets published for everyone to use, like open source.'],
  ['Is it really free?', 'Yes — free, no ads, no limits. The tools run in your browser, which keeps our costs near zero.'],
  ['Can I use PSDKIT offline?', 'Most tools work offline once the page has loaded. Internet tools, the dictionary, translator and currency converter need a connection.'],
  ['Something is broken — what do I do?', 'Refresh first. If it persists, use the AI assistant to troubleshoot, or open an issue on our GitHub repository with the tool name and what you expected to happen.'],
];

export function renderHelpPage(root) {
  root.append(el('div.page-top', { style: { paddingBottom: '70px' } },
    el('div.page-head',
      el('div.wrap',
        el('div.breadcrumb',
          el('a', { href: '#/', text: 'Home' }),
          el('span.sep', { text: '/' }),
          el('span', { text: 'Help & About' }),
        ),
        el('h1.display', { style: { fontSize: 'clamp(32px,5vw,48px)', margin: '14px 0 10px' }, html: 'Help & <em>About</em>' }),
        el('p.lede', {
          text: 'PSDKIT Pro is a free toolkit made for everyone — students, developers, designers, teachers and anyone who just needs one small thing done right now.',
        }),
      ),
    ),
    el('div.wrap',
      el('div.grid.grid-3',
        ...[
          ['zap', 'tile-peach', 'Instant & private', 'Tools run in your browser. Files stay on your device, results appear in milliseconds, and there is nothing to install.'],
          ['users', 'tile-sage', 'Made for every skill level', 'Every tool has a plain-English guide. Beginners get steps, pros get shortcuts — and the AI assistant helps both.'],
          ['sparkles', 'tile-lavender', 'Always growing', 'Community submissions and regular additions keep the toolbox fresh. Have an idea? Publish it in minutes.'],
        ].map(([ic, tile, t, d]) => el('div.card.learn-card',
          el('div.l-ico', { class: tile, html: icon(ic, 23) }),
          el('div.l-title', { text: t }),
          el('div.l-desc', { text: d }),
        )),
      ),

      el('div.section-head', { style: { marginTop: '64px' } },
        el('div.eyebrow', { text: 'getting started' }),
        el('h2.display.h-section', { html: 'Up and running in <em>30 seconds</em>' }),
      ),
      el('div.grid.grid-3',
        ...[
          ['1.', 'Find your tool', 'Search at the top of the Tools page, or browse the four shelves: Daily, Internet, Essentials and Coding.'],
          ['2.', 'Use it right away', 'Type, drop a file or press a button. Copy or download your result — that is it.'],
          ['3.', 'Ask if stuck', 'The orange button at the bottom-right is your guide. It can recommend tools, explain terms and walk you through steps.'],
        ].map(([n, t, d]) => el('div.step-card',
          el('div.serif-num', { text: n }),
          el('div.s-title', { text: t }),
          el('div.s-body', { text: d }),
        )),
      ),

      el('div.section-head', { style: { marginTop: '64px' } },
        el('div.eyebrow', { text: 'faq' }),
        el('h2.display.h-section', { html: 'Questions, <em>answered.</em>' }),
      ),
      el('div.faq-grid', ...FAQS.map(([q, a], i) => el('details.acc', {
        ...(i === 0 ? { open: true } : {}),
      },
        el('summary', { html: `<span>${q}</span>${icon('plus', 17, 'acc-ico')}` }),
        el('div.acc-body', { text: a }),
      ))),

      el('div.hero-mini', { style: { marginTop: '64px' } },
        el('div.hm-deco'),
        el('div', { style: { position: 'relative', textAlign: 'center' } },
          el('div.eyebrow', { text: 'still need help?' }),
          el('h2.display.h-section', { style: { margin: '14px 0' }, html: 'Talk to the <em>PSDKIT AI</em>' }),
          el('p.lede', { style: { margin: '0 auto 22px' }, text: 'It knows every tool, every guide and every page on this site — and it answers like a human, not a manual.' }),
          el('button.btn.btn-primary', {
            html: `${icon('sparkles', 17)} Open the assistant`,
            onclick: () => window.PSDKIT_AI?.open(),
          }),
        ),
      ),
    ),
  ));
}
