/* ============================================================
   INTERNET TOOLS (25) — network lookups, site inspection, link tools
   ============================================================ */
import { el, fmt, copyText, toast, debounce, loadScript } from '../ui.js';
import { icon } from '../icons.js';
import { mountFormTool, num } from './formkit.js';

/* Fetch through a CORS-friendly relay when direct fetch fails */
const PROXY = 'https://api.allorigins.win/raw?url=';
async function fetchText(url, { allowProxy = true, timeout = 12000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const text = await res.text();
    clearTimeout(t);
    return { ok: res.ok, status: res.status, text, headers: res.headers, url: res.url };
  } catch (err) {
    if (allowProxy) {
      try {
        const res = await fetch(PROXY + encodeURIComponent(url), { signal: ctrl.signal });
        const text = await res.text();
        clearTimeout(t);
        return { ok: res.ok, status: res.status, text, headers: res.headers, url, viaProxy: true };
      } catch (err2) {
        clearTimeout(t);
        throw new Error('Could not reach that address. It may be offline, blocked by CORS, or refusing our relay.');
      }
    }
    clearTimeout(t);
    throw err;
  }
}

function normalizeUrl(raw) {
  let u = (raw || '').trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try { return new URL(u).href; } catch { return null; }
}

function jsonView(obj) {
  return el('pre.code', { text: JSON.stringify(obj, null, 2) });
}

export const INTERNET_IMPLS = {

  /* 1 ── IP lookup */
  'ip-lookup': {
    mount(container) {
      const out = el('div');
      const load = async () => {
        out.innerHTML = '<div class="skeleton" style="height:120px"></div>';
        try {
          const res = await fetch('https://ipwho.is/');
          const d = await res.json();
          if (!d.success) throw new Error('Lookup failed');
          out.innerHTML = '';
          out.append(
            el('div.stat-grid', ...[
              ['Public IP', d.ip], ['City', `${d.city || '—'}, ${d.region || ''}`],
              ['Country', `${d.country || '—'} (${d.country_code || ''})`], ['ISP / Org', d.connection?.isp || d.type || '—'],
              ['Timezone', d.timezone?.id || '—'], ['Postal code', d.postal || '—'],
              ['Coordinates', d.latitude != null ? `${d.latitude}, ${d.longitude}` : '—'], ['Calling code', d.calling_code || '—'],
            ].map(([k, v]) => el('div.stat', el('div.k', { text: k }), el('div.v', { text: String(v), style: { fontSize: '15px' } })))),
            el('div.note.mt-3', { html: icon('shield', 17) + '<span>Lookups run in your browser via ipwho.is. We never store your IP.</span>' }),
          );
        } catch {
          out.innerHTML = '';
          out.append(el('div.note', { html: icon('info', 17) + '<span>Could not fetch IP info — check your connection and try again.</span>' }));
        }
      };
      container.append(el('div.tool-actions', el('button.btn.btn-accent', { html: `${icon('search', 16)} Look up my IP`, onclick: load })), el('div.mt-3', out));
      load();
    },
  },

  /* 2 ── DNS lookup */
  'dns-lookup': {
    fields: [
      { id: 'domain', label: 'Domain name', type: 'text', default: 'google.com', placeholder: 'example.com' },
      { id: 'type', label: 'Record type', type: 'select', options: ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'SRV', 'CAA'], default: 'A' },
    ],
    live: false,
    buttonLabel: 'Query DNS',
    async compute(v) {
      const domain = (v.domain || '').trim().replace(/^https?:\/\//, '').split('/')[0];
      if (!domain) return 'Enter a domain name.';
      try {
        const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${v.type}`);
        const d = await res.json();
        const answers = d.Answer || [];
        if (!answers.length) return { title: 'DNS result', text: `No ${v.type} records found for ${domain} (Status: ${d.Status})` };
        const rows = answers.map((a) => ({
          name: a.name, type: a.type, ttl: a.TTL,
          data: a.data,
        }));
        return {
          title: `${v.type} records for ${domain}`,
          html: `<div class="result-out">${rows.map((r) => `• ${r.data}  (TTL ${r.ttl})`).join('\n')}</div>`,
          copy: rows.map((r) => r.data).join('\n'),
          text: '',
          note: 'Queried live against Google Public DNS (dns.google).',
        };
      } catch {
        return 'DNS query failed — check the domain name and your connection.';
      }
    },
  },

  /* 3 ── HTTP headers */
  'http-headers': {
    fields: [{ id: 'url', label: 'Website URL', type: 'text', default: 'https://example.com' }],
    live: false,
    buttonLabel: 'Fetch headers',
    async compute(v) {
      const url = normalizeUrl(v.url);
      if (!url) return 'Enter a valid URL.';
      try {
        const r = await fetchText(url);
        const entries = [];
        r.headers.forEach((val, key) => entries.push(`${key}: ${val}`));
        return {
          title: `Response headers — status ${r.status}`,
          html: `<div class="result-out">${(entries.join('\n') || '(no headers exposed through relay)').replace(/</g, '&lt;')}</div>`,
          copy: entries.join('\n'),
          text: '',
          note: r.viaProxy ? 'Fetched through a CORS relay — some security headers may not be shown.' : undefined,
        };
      } catch (e) {
        return e.message;
      }
    },
  },

  /* 4 ── Site status */
  'site-status': {
    fields: [{ id: 'url', label: 'Website URL', type: 'text', default: 'https://example.com' }],
    live: false,
    buttonLabel: 'Check status',
    async compute(v) {
      const url = normalizeUrl(v.url);
      if (!url) return 'Enter a valid URL.';
      const t0 = performance.now();
      try {
        const r = await fetchText(url, { timeout: 15000 });
        const ms = Math.round(performance.now() - t0);
        const up = r.status < 400;
        return {
          title: up ? '✅ Site is up' : '⚠️ Site responded with an error',
          stats: [
            { label: 'Status code', value: r.status },
            { label: 'Response time', value: `${ms} ms` },
            { label: 'Final URL', value: (r.url || url).replace(/^https?:\/\//, '').slice(0, 26) },
            { label: 'Via relay', value: r.viaProxy ? 'Yes' : 'No' },
          ],
          text: `Status: ${r.status}\nTime: ${ms} ms\nURL: ${r.url || url}`,
        };
      } catch {
        return {
          title: '❌ Could not reach the site',
          text: `No response within the timeout.\n\nPossible reasons:\n• The site is down or blocking bots\n• DNS cannot resolve the domain\n• A firewall is rejecting our relay`,
          note: 'Try again in a moment or check the URL spelling.',
        };
      }
    },
  },

  /* 5 ── Speed test */
  'speed-test': {
    mount(container) {
      const barWrap = el('div', { style: { background: 'var(--cream-deep)', borderRadius: '999px', height: '12px', overflow: 'hidden' } },
        el('div', { id: 'speed-bar', style: { height: '100%', width: '0%', background: 'var(--accent)', borderRadius: '999px', transition: 'width .25s ease' } }));
      const readout = el('div.big-timer', { text: '—', style: { fontSize: 'clamp(38px,7vw,56px)' } });
      const detail = el('div.center-x.text-muted', { style: { fontSize: '13.5px' }, text: 'Press start — we download a test file and measure the speed.' });

      const run = async () => {
        readout.textContent = '…';
        detail.textContent = 'Downloading test data…';
        const bar = container.querySelector('#speed-bar');
        const sizes = [1_000_000, 5_000_000, 10_000_000];
        try {
          let best = 0;
          for (const bytes of sizes) {
            const t0 = performance.now();
            const res = await fetch(`https://speed.cloudflare.com/__down?bytes=${bytes}`, { cache: 'no-store' });
            await res.arrayBuffer();
            const secs = (performance.now() - t0) / 1000;
            const mbps = (bytes * 8) / secs / 1e6;
            best = Math.max(best, mbps);
            readout.textContent = mbps.toFixed(1);
            bar.style.width = Math.min(100, (mbps / 200) * 100) + '%';
            detail.textContent = `Testing… (${(bytes / 1e6).toFixed(0)} MB sample)`;
          }
          detail.textContent = `Download speed ≈ ${best.toFixed(1)} Mbps · tested with Cloudflare’s speed endpoint. Result is a good real-world estimate.`;
        } catch {
          readout.textContent = '—';
          detail.textContent = 'Could not run the test — the network may be blocking the test endpoint.';
        }
      };

      container.append(
        el('div.canvas-stage', { style: { flexDirection: 'column', gap: '16px', padding: '30px' } },
          readout, barWrap, detail,
        ),
        el('div.tool-row-btns', { style: { marginTop: '16px' } },
          el('button.btn.btn-accent', { html: `${icon('speed', 16)} Start speed test`, onclick: run })),
      );
    },
  },

  /* 6 ── Latency */
  'latency-test': {
    mount(container) {
      const endpoints = [
        ['Cloudflare', 'https://speed.cloudflare.com/__down?bytes=1000'],
        ['Google DNS', 'https://dns.google/resolve?name=example.com&type=A'],
        ['GitHub', 'https://api.github.com'],
        ['ipwho.is', 'https://ipwho.is/'],
      ];
      const out = el('div.col');
      const run = async () => {
        out.innerHTML = '<div class="skeleton" style="height:120px"></div>';
        const results = [];
        for (const [name, url] of endpoints) {
          const times = [];
          for (let i = 0; i < 3; i++) {
            const t0 = performance.now();
            try {
              await fetch(url, { cache: 'no-store', mode: 'cors' });
              times.push(performance.now() - t0);
            } catch {
              try {
                await fetch(PROXY + encodeURIComponent(url), { cache: 'no-store' });
                times.push(performance.now() - t0);
              } catch { times.push(null); }
            }
          }
          const good = times.filter((t) => t != null);
          results.push({
            name,
            avg: good.length ? Math.round(good.reduce((a, b) => a + b, 0) / good.length) : null,
            min: good.length ? Math.round(Math.min(...good)) : null,
            max: good.length ? Math.round(Math.max(...good)) : null,
            jitter: good.length > 1 ? Math.round(Math.max(...good) - Math.min(...good)) : null,
          });
        }
        out.innerHTML = '';
        for (const r of results) {
          out.append(el('div.card', { style: { padding: '16px 18px' } },
            el('div.row-between',
              el('div', { style: { fontWeight: 700, fontSize: '14.5px' } }, r.name),
              el('div', {
                class: 'badge',
                style: { background: r.avg == null ? 'var(--blush)' : r.avg < 120 ? 'var(--sage)' : 'var(--butter)', color: 'var(--ink-soft)' },
                text: r.avg == null ? 'unreachable' : `${r.avg} ms avg`,
              }),
            ),
            r.avg != null
              ? el('div.field-hint.mt-1', { text: `min ${r.min} ms · max ${r.max} ms · jitter ${r.jitter} ms` })
              : null,
          ));
        }
      };
      container.append(
        el('div.note', { html: icon('info', 17) + '<span>Latency is measured from your browser with 3 samples per endpoint — this is round-trip time, not ICMP ping.</span>' }),
        el('div.tool-actions', { style: { marginTop: '12px' } }, el('button.btn.btn-accent', { html: `${icon('activity', 16)} Measure latency`, onclick: run })),
        el('div.mt-3', out),
      );
    },
  },

  /* 7 ── Browser info */
  'browser-info': {
    mount(container) {
      const ua = navigator.userAgent;
      const detect = () => {
        const get = (re) => (ua.match(re) || [])[1];
        const browser =
          get(/Edg\/([\d.]+)/) ? `Edge ${get(/Edg\/([\d.]+)/)}`
            : get(/Chrome\/([\d.]+)/) ? `Chrome ${get(/Chrome\/([\d.]+)/)}`
              : get(/Firefox\/([\d.]+)/) ? `Firefox ${get(/Firefox\/([\d.]+)/)}`
                : get(/Version\/([\d.]+).*Safari/) ? `Safari ${get(/Version\/([\d.]+).*Safari/)}`
                  : 'Unknown browser';
        const os =
          /Windows/.test(ua) ? 'Windows'
            : /Mac OS/.test(ua) ? 'macOS'
              : /Android/.test(ua) ? 'Android'
                : /iPhone|iPad/.test(ua) ? 'iOS'
                  : /Linux/.test(ua) ? 'Linux' : 'Unknown';
        return { browser, os };
      };
      const d = detect();
      const conn = navigator.connection || {};
      const rows = [
        ['Browser', d.browser], ['Operating system', d.os],
        ['Language', navigator.language], ['Languages', (navigator.languages || []).join(', ')],
        ['Platform', navigator.platform || '—'], ['Cookies enabled', navigator.cookieEnabled ? 'Yes' : 'No'],
        ['Online', navigator.onLine ? 'Yes' : 'No'], ['Screen', `${screen.width}×${screen.height} px`],
        ['Viewport', `${window.innerWidth}×${window.innerHeight} px`], ['Device pixel ratio', window.devicePixelRatio],
        ['Touch support', 'ontouchstart' in window ? 'Yes' : 'No'], ['CPU cores', navigator.hardwareConcurrency || '—'],
        ['Device memory', navigator.deviceMemory ? `${navigator.deviceMemory} GB (approx)` : '—'],
        ['Connection', conn.effectiveType ? `${conn.effectiveType} · ${conn.downlink ?? '?'} Mbps` : '—'],
        ['Timezone', Intl.DateTimeFormat().resolvedOptions().timeZone],
        ['Local time', new Date().toString()],
      ];
      container.append(
        el('div.stat-grid', ...rows.map(([k, v]) => el('div.stat', el('div.k', { text: k }), el('div.v', { text: String(v), style: { fontSize: '13.5px', wordBreak: 'break-word' } })))),
        el('div.tool-actions', { style: { marginTop: '16px' } },
          el('button.btn.btn-soft', { html: `${icon('copy', 15)} Copy full report`, onclick: () => copyText(rows.map(([k, v]) => `${k}: ${v}`).join('\n')) })),
        el('div.note.mt-3', { html: icon('shield', 17) + `<span>Your raw user-agent string:\n<code>${ua}</code></span>` }),
      );
    },
  },

  /* 8 ── Screen info */
  'screen-info': {
    mount(container) {
      const rows = [
        ['Screen resolution', `${screen.width} × ${screen.height} px`],
        ['Available screen', `${screen.availWidth} × ${screen.availHeight} px`],
        ['Viewport size', `${window.innerWidth} × ${window.innerHeight} px`],
        ['Colour depth', `${screen.colorDepth}-bit`],
        ['Pixel ratio', window.devicePixelRatio],
        ['CSS zoom estimate', `${Math.round(window.devicePixelRatio * 100)}%`],
        ['Orientation', screen.orientation?.type || (innerWidth > innerHeight ? 'landscape' : 'portrait')],
        ['Physical estimate', `${(screen.width / (96 * window.devicePixelRatio)).toFixed(1)} × ${(screen.height / (96 * window.devicePixelRatio)).toFixed(1)} in @96dpi`],
      ];
      container.append(
        el('div.stat-grid', ...rows.map(([k, v]) => el('div.stat', el('div.k', { text: k }), el('div.v', { text: String(v), style: { fontSize: '14px' } })))),
        el('div.note.mt-3', { html: icon('monitor', 17) + '<span>Resize the window and click the button below to refresh the live numbers.</span>' }),
        el('div.tool-actions', { style: { marginTop: '12px' } },
          el('button.btn.btn-soft', { html: `${icon('refresh', 15)} Refresh`, onclick: () => location.reload() })),
      );
    },
  },

  /* 9 ── UA parser */
  'ua-parser': {
    fields: [
      { id: 'ua', label: 'User agent string', type: 'textarea', rows: 4, default: navigator.userAgent },
    ],
    compute(v) {
      const ua = v.ua || '';
      if (!ua.trim()) return 'Paste a user agent string.';
      const get = (re) => (ua.match(re) || [])[1];
      const browser = get(/Edg\/([\d.]+)/) ? `Edge ${get(/Edg\/([\d.]+)/)}`
        : get(/OPR\/([\d.]+)/) ? `Opera ${get(/OPR\/([\d.]+)/)}`
          : get(/Chrome\/([\d.]+)/) ? `Chrome ${get(/Chrome\/([\d.]+)/)}`
            : get(/Firefox\/([\d.]+)/) ? `Firefox ${get(/Firefox\/([\d.]+)/)}`
              : get(/Version\/([\d.]+).*Safari/) ? `Safari ${get(/Version\/([\d.]+).*Safari/)}` : 'Unknown';
      const os = /Windows NT 10/.test(ua) ? 'Windows 10/11'
        : /Windows/.test(ua) ? 'Windows'
          : /Mac OS X/.test(ua) ? 'macOS'
            : /Android ([\d.]+)/.test(ua) ? `Android ${get(/Android ([\d.]+)/)}`
              : /iPhone OS ([\d_]+)/.test(ua) ? `iOS ${get(/iPhone OS ([\d_]+)/)?.replace(/_/g, '.')}`
                : /Linux/.test(ua) ? 'Linux' : 'Unknown';
      return {
        title: 'Parsed user agent',
        stats: [
          { label: 'Browser', value: browser },
          { label: 'OS', value: os },
          { label: 'Engine', value: /AppleWebKit/.test(ua) ? 'WebKit/Blink' : /Gecko/.test(ua) ? 'Gecko' : '—' },
          { label: 'Mobile', value: /Mobile|Android|iPhone/.test(ua) ? 'Yes' : 'No' },
        ],
        text: `Browser: ${browser}\nOS: ${os}\nEngine: ${/AppleWebKit/.test(ua) ? 'WebKit/Blink' : /Gecko/.test(ua) ? 'Gecko' : 'Unknown'}\nMobile: ${/Mobile|Android|iPhone/.test(ua) ? 'Yes' : 'No'}\n\nRaw: ${ua}`,
      };
    },
  },

  /* 10 ── URL parser */
  'url-parser': {
    fields: [{ id: 'url', label: 'URL', type: 'text', default: 'https://www.example.com:443/path/page?utm_source=x&q=hello%20world#section' }],
    compute(v) {
      const url = normalizeUrl(v.url);
      if (!url) return 'Enter a valid URL.';
      const u = new URL(url);
      const params = [...u.searchParams.entries()];
      return {
        title: 'URL breakdown',
        html: `<div class="stat-grid">
          <div class="stat"><div class="k">Protocol</div><div class="v" style="font-size:14px">${u.protocol.replace(':', '')}</div></div>
          <div class="stat"><div class="k">Host</div><div class="v" style="font-size:14px;word-break:break-all">${u.host}</div></div>
          <div class="stat"><div class="k">Hostname</div><div class="v" style="font-size:14px;word-break:break-all">${u.hostname}</div></div>
          <div class="stat"><div class="k">Port</div><div class="v" style="font-size:14px">${u.port || 'default'}</div></div>
          <div class="stat"><div class="k">Path</div><div class="v" style="font-size:14px;word-break:break-all">${u.pathname}</div></div>
          <div class="stat"><div class="k">Hash</div><div class="v" style="font-size:14px;word-break:break-all">${u.hash || '—'}</div></div>
        </div>
        <div class="mt-2"><div class="field-label" style="margin-bottom:8px">Query parameters (${params.length})</div>
        <div class="result-out">${params.length ? params.map(([k, val]) => `${k} = ${val}`).join('\n') : 'No query parameters.'}</div></div>`,
        text: `Protocol: ${u.protocol}\nHost: ${u.host}\nPath: ${u.pathname}\nParams:\n${params.map(([k, val]) => `  ${k} = ${val}`).join('\n') || '  (none)'}\nHash: ${u.hash || '(none)'}`,
      };
    },
  },

  /* 11 ── UTM builder */
  'utm-builder': {
    fields: [
      { id: 'url', label: 'Destination URL', type: 'text', default: 'https://example.com/landing' },
      { id: 'source', label: 'Campaign source (utm_source)', type: 'text', default: 'newsletter', half: true },
      { id: 'medium', label: 'Campaign medium (utm_medium)', type: 'text', default: 'email', half: true },
      { id: 'campaign', label: 'Campaign name (utm_campaign)', type: 'text', default: 'spring_sale', half: true },
      { id: 'term', label: 'Term (utm_term)', type: 'text', default: '', half: true },
      { id: 'content', label: 'Content (utm_content)', type: 'text', default: '', half: true },
    ],
    compute(v) {
      const url = normalizeUrl(v.url);
      if (!url) return 'Enter a destination URL.';
      const u = new URL(url);
      if (v.source) u.searchParams.set('utm_source', v.source);
      if (v.medium) u.searchParams.set('utm_medium', v.medium);
      if (v.campaign) u.searchParams.set('utm_campaign', v.campaign);
      if (v.term) u.searchParams.set('utm_term', v.term);
      if (v.content) u.searchParams.set('utm_content', v.content);
      return {
        title: 'Campaign link',
        html: `<div class="result-out" style="word-break:break-all">${u.href}</div>`,
        copy: u.href,
        text: u.href,
        note: 'Test your link in the Site → Social Share Preview tool to see how it looks when shared.',
      };
    },
  },

  /* 12 ── Meta generator */
  'meta-generator': {
    fields: [
      { id: 'title', label: 'Page title', type: 'text', default: 'PSDKIT Pro — 175 Free Online Tools' },
      { id: 'desc', label: 'Meta description', type: 'textarea', rows: 3, default: 'Free daily, internet, essential and coding tools that run in your browser.' },
      { id: 'url', label: 'Canonical URL', type: 'text', default: 'https://psdkit.vercel.app' },
      { id: 'img', label: 'Social image URL', type: 'text', default: 'https://psdkit.vercel.app/logo.png' },
      { id: 'author', label: 'Author / site name', type: 'text', default: 'PSDKIT Pro', half: true },
      { id: 'twitter', label: 'Twitter / X handle', type: 'text', default: '', half: true },
    ],
    compute(v) {
      const html = `<!-- Primary meta tags -->
<title>${v.title}</title>
<meta name="title" content="${v.title}">
<meta name="description" content="${v.desc}">
<link rel="canonical" href="${v.url}">
<meta name="author" content="${v.author}">

<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:url" content="${v.url}">
<meta property="og:title" content="${v.title}">
<meta property="og:description" content="${v.desc}">
<meta property="og:image" content="${v.img}">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:url" content="${v.url}">
<meta property="twitter:title" content="${v.title}">
<meta property="twitter:description" content="${v.desc}">
<meta property="twitter:image" content="${v.img}">${v.twitter ? `\n<meta property="twitter:site" content="@${v.twitter.replace('@', '')}">` : ''}`;
      return { title: 'Meta tags', html: `<pre class="code">${html.replace(/</g, '&lt;')}</pre>`, copy: html, text: '' };
    },
  },

  /* 13 ── OG preview */
  'og-preview': {
    fields: [
      { id: 'url', label: 'Page URL', type: 'text', default: 'https://psdkit.vercel.app' },
      { id: 'title', label: 'Title (auto-fetched if empty)', type: 'text', default: '' },
      { id: 'desc', label: 'Description (auto if empty)', type: 'text', default: '' },
      { id: 'img', label: 'Image URL (auto if empty)', type: 'text', default: '' },
    ],
    live: false,
    buttonLabel: 'Generate preview',
    async compute(v) {
      const url = normalizeUrl(v.url);
      if (!url) return 'Enter a valid URL.';
      let title = v.title, desc = v.desc, img = v.img;
      if (!title || !desc || !img) {
        try {
          const r = await fetchText(url);
          const doc = new DOMParser().parseFromString(r.text, 'text/html');
          title = title || doc.querySelector('meta[property="og:title"]')?.content || doc.title || url;
          desc = desc || doc.querySelector('meta[property="og:description"]')?.content || doc.querySelector('meta[name="description"]')?.content || '';
          img = img || doc.querySelector('meta[property="og:image"]')?.content || '';
          if (img) img = new URL(img, url).href;
        } catch {
          title = title || url; desc = desc || '(could not fetch description)';
        }
      }
      const html = `<div style="border:1px solid var(--cream-line);border-radius:16px;overflow:hidden;background:#fff;max-width:480px">
        ${img ? `<div style="height:210px;background:url('${img.replace(/'/g, '')}') center/cover, var(--cream-deep)"></div>` : '<div style="height:110px;background:var(--cream-deep)"></div>'}
        <div style="padding:16px">
          <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted-light)">${new URL(url).hostname}</div>
          <div style="font-size:17px;font-weight:800;margin:6px 0;letter-spacing:-.01em">${(title || '').slice(0, 80)}</div>
          <div style="font-size:13px;color:var(--muted);line-height:1.6">${(desc || '').slice(0, 140)}</div>
        </div>
      </div>`;
      return { title: 'Share preview', html, text: `${title}\n${desc}`, copy: `${title} — ${url}` };
    },
  },

  /* 14 ── robots.txt */
  'robots-viewer': {
    fields: [{ id: 'url', label: 'Website URL', type: 'text', default: 'https://www.google.com' }],
    live: false,
    buttonLabel: 'Fetch robots.txt',
    async compute(v) {
      const url = normalizeUrl(v.url);
      if (!url) return 'Enter a valid URL.';
      const origin = new URL(url).origin;
      try {
        const r = await fetchText(origin + '/robots.txt');
        if (r.status === 404) return { title: 'robots.txt', text: 'This site has no robots.txt — all pages are considered crawlable by default.' };
        const lines = r.text.split('\n').filter((l) => l.trim());
        const disallows = lines.filter((l) => /^\s*disallow:/i.test(l)).length;
        const allows = lines.filter((l) => /^\s*allow:/i.test(l)).length;
        const sitemaps = lines.filter((l) => /^\s*sitemap:/i.test(l));
        return {
          title: `robots.txt — ${origin}`,
          stats: [
            { label: 'Lines', value: lines.length },
            { label: 'Allow rules', value: allows },
            { label: 'Disallow rules', value: disallows },
            { label: 'Sitemaps', value: sitemaps.length },
          ],
          html: `<pre class="code" style="max-height:340px;overflow:auto">${r.text.replace(/</g, '&lt;').slice(0, 6000)}</pre>`,
          copy: r.text,
          text: '',
        };
      } catch (e) {
        return e.message;
      }
    },
  },

  /* 15 ── Sitemap viewer */
  'sitemap-viewer': {
    fields: [{ id: 'url', label: 'Sitemap URL (or site root)', type: 'text', default: 'https://www.google.com' }],
    live: false,
    buttonLabel: 'Load sitemap',
    async compute(v) {
      let url = normalizeUrl(v.url);
      if (!url) return 'Enter a valid URL.';
      if (!/sitemap.*\.xml/i.test(url)) url = url.replace(/\/$/, '') + '/sitemap.xml';
      try {
        const r = await fetchText(url);
        const doc = new DOMParser().parseFromString(r.text, 'text/xml');
        const locs = [...doc.querySelectorAll('loc')].map((n) => n.textContent.trim());
        if (!locs.length) return { title: 'Sitemap', text: 'No <loc> entries found — the sitemap may be an index that points elsewhere, or empty.' };
        return {
          title: `Found ${locs.length} URL${locs.length > 1 ? 's' : ''}`,
          html: `<div class="result-out" style="max-height:360px;overflow:auto">${locs.slice(0, 400).map((u) => `• ${u.replace(/</g, '&lt;')}`).join('\n')}${locs.length > 400 ? `\n… and ${locs.length - 400} more` : ''}</div>`,
          copy: locs.join('\n'),
          text: '',
        };
      } catch (e) {
        return e.message;
      }
    },
  },

  /* 16 ── Favicon grabber */
  'favicon-grabber': {
    fields: [{ id: 'url', label: 'Website URL', type: 'text', default: 'https://github.com' }],
    live: true,
    async compute(v) {
      const url = normalizeUrl(v.url);
      if (!url) return 'Enter a valid URL.';
      const host = new URL(url).hostname;
      const sources = [
        ['Standard 64px', `https://icons.duckduckgo.com/ip3/${host}.ico`],
        ['Google 128px', `https://www.google.com/s2/favicons?domain=${host}&sz=128`],
        ['Google 64px', `https://www.google.com/s2/favicons?domain=${host}&sz=64`],
        ['Larger 256px', `https://www.google.com/s2/favicons?domain=${host}&sz=256`],
      ];
      return {
        title: `Icons for ${host}`,
        html: `<div class="grid grid-2" style="gap:12px">${sources.map(([label, src]) => `
          <div class="card" style="padding:16px;display:flex;flex-direction:column;align-items:center;gap:10px">
            <img src="${src}" alt="${label}" style="width:64px;height:64px;object-fit:contain" onerror="this.style.opacity=.25">
            <div style="font-size:12px;font-weight:700;color:var(--muted)">${label}</div>
            <a class="copy-btn" href="${src}" target="_blank" rel="noopener" download>${icon('download', 13)} Download</a>
          </div>`).join('')}</div>`,
        text: sources.map(([l, s]) => `${l}: ${s}`).join('\n'),
      };
    },
  },

  /* 17 ── Email validator */
  'email-validator': {
    fields: [{ id: 'email', label: 'Email address', type: 'text', default: 'someone@gmail.com' }],
    compute(v) {
      const email = (v.email || '').trim();
      if (!email) return 'Enter an email address.';
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      const syntax = re.test(email);
      const [local, domain] = email.split('@');
      const disposable = ['mailinator', 'tempmail', 'temp-mail', 'guerrillamail', '10minutemail', 'trashmail', 'yopmail', 'sharklasers'].some((d) => (domain || '').includes(d));
      const free = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'proton.me', 'protonmail.com', 'aol.com', 'mail.com', 'zoho.com'].includes((domain || '').toLowerCase());
      const business = syntax && !free && !disposable;
      return {
        title: syntax ? '✅ Valid syntax' : '❌ Invalid syntax',
        stats: [
          { label: 'Syntax', value: syntax ? 'Valid' : 'Invalid' },
          { label: 'Provider type', value: disposable ? 'Disposable' : free ? 'Free provider' : business ? 'Custom / business' : '—' },
          { label: 'Local part', value: local || '—' },
          { label: 'Domain', value: domain || '—' },
        ],
        text: [
          `Syntax: ${syntax ? 'valid' : 'invalid'}`,
          `Disposable: ${disposable ? 'yes — avoid for real signups' : 'no'}`,
          `Free provider: ${free ? 'yes' : 'no'}`,
        ].join('\n'),
        note: 'Syntax checks are instant. Actual delivery can only be confirmed with a mail server (MX) handshake — treat this as a strong first filter.',
      };
    },
  },

  /* 18 ── RDAP / WHOIS */
  'domain-lookup': {
    fields: [{ id: 'domain', label: 'Domain name', type: 'text', default: 'example.com' }],
    live: false,
    buttonLabel: 'Look up domain',
    async compute(v) {
      const domain = (v.domain || '').trim().replace(/^https?:\/\//, '').split('/')[0];
      if (!domain) return 'Enter a domain name.';
      try {
        const r = await fetchText(`https://rdap.org/domain/${encodeURIComponent(domain)}`, { timeout: 15000 });
        if (r.status === 404) return { title: 'Not found', text: `No registration data found for ${domain}. It may be unregistered or a special-use domain.` };
        const d = JSON.parse(r.text);
        const events = Object.fromEntries((d.events || []).map((e) => [e.eventAction, e.eventDate]));
        const nameservers = (d.nameservers || []).map((n) => n.ldhName).join('\n');
        return {
          title: `Registration — ${d.ldhName || domain}`,
          stats: [
            { label: 'Registrar', value: (d.registrations?.[0]?.entities?.[0]?.vcardArray?.[1]?.find((x) => x[0] === 'fn')?.[3]) || (d.entities?.[0]?.vcardArray?.[1]?.find((x) => x[0] === 'fn')?.[3]) || '—' },
            { label: 'Registered', value: events.registration ? fmt.date(events.registration) : '—' },
            { label: 'Last changed', value: events['last changed'] ? fmt.date(events['last changed']) : '—' },
            { label: 'Expires', value: events.expiration ? fmt.date(events.expiration) : '—' },
          ],
          html: `<div class="field-label" style="margin:14px 0 8px">Nameservers</div><pre class="code">${(nameservers || '(none listed)').replace(/</g, '&lt;')}</pre>
                 <div class="field-label" style="margin:14px 0 8px">Status</div><pre class="code">${(d.status || []).join('\n') || '—'}</pre>`,
          text: `Domain: ${d.ldhName || domain}\nRegistrar: ${'see above'}\nNameservers:\n${nameservers}`,
        };
      } catch (e) {
        return e.message;
      }
    },
  },

  /* 19 ── CORS checker */
  'cors-checker': {
    fields: [
      { id: 'url', label: 'API / resource URL', type: 'text', default: 'https://api.github.com' },
      { id: 'method', label: 'Method', type: 'select', options: ['GET', 'HEAD', 'OPTIONS'], half: true },
    ],
    live: false,
    buttonLabel: 'Test CORS',
    async compute(v) {
      const url = normalizeUrl(v.url);
      if (!url) return 'Enter a valid URL.';
      const t0 = performance.now();
      try {
        const res = await fetch(url, { method: v.method === 'OPTIONS' ? 'GET' : v.method, mode: 'cors', cache: 'no-store' });
        const ms = Math.round(performance.now() - t0);
        const acao = res.headers.get('access-control-allow-origin');
        return {
          title: '✅ CORS is allowed',
          stats: [
            { label: 'Status', value: res.status },
            { label: 'Allow-Origin', value: acao || 'not sent (but request succeeded)' },
            { label: 'Time', value: `${ms} ms` },
            { label: 'Credentials', value: res.headers.get('access-control-allow-credentials') || '—' },
          ],
          text: `Your browser successfully fetched ${url}.\nAccess-Control-Allow-Origin: ${acao || '(absent — same-origin style response)'}`,
        };
      } catch (e) {
        return {
          title: '❌ Blocked (CORS or network)',
          text: `The browser refused this request.\n\nThat usually means:\n• The server does not send Access-Control-Allow-Origin\n• The request preflight failed (custom headers/method)\n• The host is unreachable\n\nBrowser error: ${e.message}`,
          note: 'A request that fails here can still work from server-side code (cURL, backend) — CORS only protects browsers.',
        };
      }
    },
  },

  /* 20 ── API tester */
  'api-tester': {
    mount(container) {
      const urlIn = el('input.input', { value: 'https://api.github.com/repos/vitejs/vite' });
      const methodIn = el('select.select');
      for (const m of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) methodIn.append(el('option', { value: m, text: m }));
      const headersIn = el('textarea.textarea', { rows: 3, placeholder: 'Headers as JSON, e.g.\n{"Accept": "application/json"}' });
      const bodyIn = el('textarea.textarea', { rows: 4, placeholder: 'Request body (JSON) — used for POST/PUT/PATCH' });
      const out = el('div');
      const send = async () => {
        out.innerHTML = '<div class="skeleton" style="height:140px"></div>';
        const t0 = performance.now();
        try {
          let headers = {};
          if (headersIn.value.trim()) headers = JSON.parse(headersIn.value);
          const opt = { method: methodIn.value, headers, cache: 'no-store' };
          if (['POST', 'PUT', 'PATCH'].includes(methodIn.value) && bodyIn.value.trim()) opt.body = bodyIn.value;
          const res = await fetch(urlIn.value, opt);
          const ms = Math.round(performance.now() - t0);
          const text = await res.text();
          let pretty = text;
          try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch { /* not json */ }
          out.innerHTML = '';
          out.append(
            el('div.stat-grid', ...[
              ['Status', res.status], ['Time', `${ms} ms`], ['Type', res.headers.get('content-type') || '—'], ['Size', `${(text.length / 1024).toFixed(1)} KB`],
            ].map(([k, v]) => el('div.stat', el('div.k', { text: k }), el('div.v', { text: String(v), style: { fontSize: '15px' } })))),
            el('div.field-label', { style: { margin: '14px 0 8px' }, text: 'Response body' }),
            el('pre.code', { style: { maxHeight: '340px', overflow: 'auto' }, text: pretty.slice(0, 20000) }),
          );
        } catch (e) {
          out.innerHTML = '';
          out.append(el('div.note', { html: icon('info', 17) + `<span>Request failed: ${e.message}. If the API works in cURL but not here, it is blocking browser (CORS) requests.</span>` }));
        }
      };
      container.append(
        el('div.field', el('label.field-label', { text: 'Request URL' }), urlIn),
        el('div.grid.grid-2', { style: { gap: '12px', marginTop: '12px' } },
          el('div.field', el('label.field-label', { text: 'Method' }), methodIn),
          el('div.field', el('label.field-label', { text: 'Headers (JSON)' }), headersIn),
        ),
        el('div.field.mt-2', el('label.field-label', { text: 'Body' }), bodyIn),
        el('div.tool-actions', { style: { marginTop: '12px' } },
          el('button.btn.btn-accent', { html: `${icon('send', 16)} Send request`, onclick: send })),
        el('div.mt-3', out),
      );
    },
  },

  /* 21 ── HTML source viewer */
  'html-source': {
    fields: [{ id: 'url', label: 'Page URL', type: 'text', default: 'https://example.com' }],
    live: false,
    buttonLabel: 'View source',
    async compute(v) {
      const url = normalizeUrl(v.url);
      if (!url) return 'Enter a valid URL.';
      try {
        const r = await fetchText(url);
        return {
          title: `Source — ${url}`,
          html: `<pre class="code" style="max-height:420px;overflow:auto">${r.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').slice(0, 30000)}</pre>`,
          copy: r.text,
          text: '',
          note: 'Only public pages reachable by our relay can be viewed.',
        };
      } catch (e) { return e.message; }
    },
  },

  /* 22 ── Link extractor */
  'link-extractor': {
    fields: [
      { id: 'url', label: 'Page URL', type: 'text', default: 'https://example.com' },
      { id: 'filter', label: 'Show', type: 'select', options: [['all', 'All links'], ['in', 'Internal only'], ['out', 'External only']] },
    ],
    live: false,
    buttonLabel: 'Extract links',
    async compute(v) {
      const url = normalizeUrl(v.url);
      if (!url) return 'Enter a valid URL.';
      try {
        const r = await fetchText(url);
        const doc = new DOMParser().parseFromString(r.text, 'text/html');
        const baseHost = new URL(url).hostname;
        const links = [...doc.querySelectorAll('a[href]')]
          .map((a) => {
            try { return { href: new URL(a.getAttribute('href'), url).href, text: (a.textContent || '').trim().slice(0, 60) }; }
            catch { return null; }
          })
          .filter(Boolean);
        const seen = new Set();
        let list = links.filter((l) => {
          if (seen.has(l.href)) return false;
          seen.add(l.href);
          return true;
        });
        if (v.filter === 'in') list = list.filter((l) => new URL(l.href).hostname === baseHost);
        if (v.filter === 'out') list = list.filter((l) => new URL(l.href).hostname !== baseHost);
        return {
          title: `${list.length} links found`,
          html: `<div class="result-out" style="max-height:380px;overflow:auto">${list.slice(0, 300).map((l) => `• ${l.href.replace(/</g, '&lt;')}${l.text ? ` — ${l.text.replace(/</g, '&lt;')}` : ''}`).join('\n') || '(none)'}</div>`,
          copy: list.map((l) => l.href).join('\n'),
          text: '',
        };
      } catch (e) { return e.message; }
    },
  },

  /* 23 ── Tech detector */
  'tech-detector': {
    fields: [{ id: 'url', label: 'Website URL', type: 'text', default: 'https://example.com' }],
    live: false,
    buttonLabel: 'Detect technology',
    async compute(v) {
      const url = normalizeUrl(v.url);
      if (!url) return 'Enter a valid URL.';
      try {
        const r = await fetchText(url);
        const html = r.text.toLowerCase();
        const found = [];
        const test = (name, re) => { if (re.test(html)) found.push(name); };
        test('WordPress', /wp-content|wp-includes/);
        test('Shopify', /cdn\.shopify|shopify\.com/);
        test('Wix', /wix\.com|wixstatic/);
        test('Squarespace', /squarespace/);
        test('React', /react|data-reactroot|_next\/static/);
        test('Next.js', /_next\/static|__next/);
        test('Nuxt / Vue', /__nuxt|vue\.js|vue\.runtime/);
        test('Angular', /ng-version|angular/);
        test('Svelte / SvelteKit', /svelte|__sveltekit/);
        test('jQuery', /jquery/);
        test('Bootstrap', /bootstrap/);
        test('Tailwind CSS', /tailwind/);
        test('Google Analytics', /google-analytics|gtag|googletagmanager/);
        test('Google Tag Manager', /googletagmanager/);
        test('Cloudflare', /cloudflare/);
        test('Vercel', /vercel|x-vercel/);
        test('Netlify', /netlify/);
        test('Font Awesome', /fontawesome|font-awesome/);
        test('Google Fonts', /fonts\.googleapis/);
        test('HubSpot', /hubspot/);
        test('Intercom', /intercom/);
        test('Zendesk', /zendesk/);
        test('Hotjar', /hotjar/);
        test('Stripe', /stripe/);
        return {
          title: found.length ? `Detected ${found.length} technologies` : 'No known signatures found',
          html: `<div class="wrap-gap-sm">${found.map((f) => `<span class="chip" style="cursor:default">${f}</span>`).join('') || '<span class="chip" style="cursor:default">Plain / custom stack</span>'}</div>`,
          copy: found.join(', '),
          text: found.join('\n') || 'No known technology signatures matched.',
          note: 'This is heuristic detection from the page HTML — good for a quick read, not a guarantee.',
        };
      } catch (e) { return e.message; }
    },
  },

  /* 24 ── Wi-Fi QR */
  'wifi-qr': {
    fields: [
      { id: 'ssid', label: 'Network name (SSID)', type: 'text', default: 'HomeWiFi' },
      { id: 'pass', label: 'Password', type: 'text', default: 'mypassword123', half: true },
      { id: 'enc', label: 'Security', type: 'select', options: [['WPA', 'WPA/WPA2/WPA3'], ['WEP', 'WEP'], ['nopass', 'Open (no password)']], half: true },
      { id: 'hidden', label: 'Hidden network', type: 'checkbox', default: false, checkLabel: 'SSID is hidden' },
    ],
    live: true,
    async compute(v) {
      const esc = (s) => String(s || '').replace(/([\\;,:"])/g, '\\$1');
      const payload = `WIFI:T:${v.enc};S:${esc(v.ssid)};${v.enc !== 'nopass' ? `P:${esc(v.pass)};` : ''}${v.hidden ? 'H:true;' : ''};`;
      await loadScript('https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js');
      const dataUrl = await new Promise((resolve, reject) => {
        window.QRCode.toDataURL(payload, { width: 320, margin: 2, color: { dark: '#161514', light: '#FAF7F2' } }, (err, url) => err ? reject(err) : resolve(url));
      });
      return {
        title: 'Wi-Fi QR code',
        html: `<div style="display:flex;flex-direction:column;align-items:center;gap:12px">
          <img src="${dataUrl}" alt="Wi-Fi QR code" style="width:260px;border-radius:16px;border:1px solid var(--cream-line)">
          <a class="copy-btn" href="${dataUrl}" download="wifi-${(v.ssid || 'network').replace(/\W+/g, '_')}.png">${icon('download', 13)} Download PNG</a>
        </div>`,
        copy: payload,
        text: `Wi-Fi payload:\n${payload}`,
        note: 'Point any phone camera at the code to join the network instantly.',
      };
    },
  },

  /* 25 ── Page weight */
  'page-weight': {
    fields: [{ id: 'url', label: 'Page URL', type: 'text', default: 'https://example.com' }],
    live: false,
    buttonLabel: 'Analyze weight',
    async compute(v) {
      const url = normalizeUrl(v.url);
      if (!url) return 'Enter a valid URL.';
      try {
        const t0 = performance.now();
        const r = await fetchText(url, { timeout: 20000 });
        const ms = Math.round(performance.now() - t0);
        const htmlSize = new Blob([r.text]).size;
        const doc = new DOMParser().parseFromString(r.text, 'text/html');
        const imgs = doc.querySelectorAll('img').length;
        const scripts = doc.querySelectorAll('script[src]').length;
        const styles = doc.querySelectorAll('link[rel="stylesheet"]').length;
        const iframes = doc.querySelectorAll('iframe').length;
        return {
          title: `Weight analysis — ${new URL(url).hostname}`,
          stats: [
            { label: 'HTML size', value: fmt.bytes(htmlSize) },
            { label: 'Fetch time', value: `${ms} ms` },
            { label: 'Images', value: imgs },
            { label: 'Script files', value: scripts },
          ],
          text: `HTML document: ${fmt.bytes(htmlSize)}\nImages: ${imgs}\nExternal scripts: ${scripts}\nStylesheets: ${styles}\nIframes: ${iframes}\nFetch time (via ${r.viaProxy ? 'relay' : 'direct'}): ${ms} ms\n\nTip: images and scripts usually dominate — compress images and defer non-critical scripts.`,
          note: 'Only the HTML shell is measured here. Browser dev tools (Network tab) shows the full page weight with all assets.',
        };
      } catch (e) { return e.message; }
    },
  },

  'seo-mini-audit': {
    fields: [{ id: 'url', label: 'URL', type: 'text', default: 'https://example.com' }],
    live: false,
    buttonLabel: 'Run audit',
    async compute(v) {
      const url = normalizeUrl(v.url);
      if (!url) return 'Enter a valid URL.';
      try {
        const res = await fetchText(url, { timeout: 20000 });
        const doc = new DOMParser().parseFromString(res.text, 'text/html');
        const title = doc.querySelector('title')?.textContent?.trim() || '';
        const desc = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';
        const h1 = doc.querySelector('h1')?.textContent?.trim() || '';
        const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() || '';
        const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() || '';
        let score = 0;
        if (title.length >= 20 && title.length <= 65) score += 30;
        if (desc.length >= 70 && desc.length <= 160) score += 30;
        if (h1) score += 20;
        if (ogTitle && ogDesc) score += 20;
        return {
          title: `SEO mini-audit — ${new URL(url).hostname}`,
          stats: [
            { label: 'Score', value: `${score}/100` },
            { label: 'Title', value: title ? `${title.length} chars` : 'Missing' },
            { label: 'Meta description', value: desc ? `${desc.length} chars` : 'Missing' },
            { label: 'H1', value: h1 ? 'Present' : 'Missing' },
          ],
          html: `<div class="term-row"><div class="term-name">Title</div><div class="term-mean">${title || 'Missing'}</div></div>
                 <div class="term-row"><div class="term-name">Meta description</div><div class="term-mean">${desc || 'Missing'}</div></div>
                 <div class="term-row"><div class="term-name">H1</div><div class="term-mean">${h1 || 'Missing'}</div></div>
                 <div class="term-row"><div class="term-name">OG title</div><div class="term-mean">${ogTitle || 'Missing'}</div></div>
                 <div class="term-row"><div class="term-name">OG description</div><div class="term-mean">${ogDesc || 'Missing'}</div></div>`,
          text: `Score: ${score}/100\nTitle: ${title || 'Missing'}\nMeta description: ${desc || 'Missing'}\nH1: ${h1 || 'Missing'}\nOG title: ${ogTitle || 'Missing'}\nOG description: ${ogDesc || 'Missing'}`,
        };
      } catch (e) { return e.message; }
    },
  },
};
