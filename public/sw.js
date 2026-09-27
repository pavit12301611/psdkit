/* PSDKIT Pro service worker.
 *
 * App shell is precached on install; everything else is network-first with a
 * cache fallback, so the toolkit keeps working offline once it has been used.
 *
 * The tool libraries (qrcode, jsQR, pdf-lib, pdf.js, marked, turndown,
 * js-beautify) are bundled as same-origin /assets/*.js chunks rather than
 * fetched from a CDN, which means they fall through the same-origin branch and
 * are cached for offline use like any other asset.
 */
const CACHE = 'psdkit-pro-v3';
const APP_SHELL = ['/', '/index.html', '/logo.png', '/manifest.webmanifest'];
/* Only webfonts are still cross-origin. Library CDNs were removed — a CDN that
   could not be reached used to break the QR, PDF and formatter tools outright. */
const CDN_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

/* Never store a failed or partial response: serving a cached 404 offline is
   worse than serving nothing. */
function cacheable(response) {
  return response && response.ok && response.type !== 'opaque' && response.type !== 'error';
}

function stash(request, response) {
  if (!cacheable(response)) return;
  const copy = response.clone();
  caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => { /* quota — ignore */ });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  /* Cross-origin (webfonts): cache-first, and never let a failed fetch reject
     out of respondWith — that surfaces to the page as a network error. */
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((response) => {
        stash(request, response);
        return response;
      }).catch(() => caches.match(request)).catch(() => new Response('', { status: 504, statusText: 'Offline' }))),
    );
    return;
  }

  if (url.origin !== location.origin) return;

  /* Same-origin: network-first so a deploy is picked up immediately, falling
     back to the cache and finally to the app shell for navigation requests. */
  event.respondWith(
    fetch(request).then((response) => {
      stash(request, response);
      return response;
    }).catch(() => caches.match(request).then((hit) => {
      if (hit) return hit;
      return request.mode === 'navigate' ? caches.match('/index.html') : new Response('', { status: 504, statusText: 'Offline' });
    })),
  );
});
