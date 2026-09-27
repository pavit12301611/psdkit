/**
 * Third-party libraries the toolkit depends on.
 *
 * Every one of these is vendored through npm and code-split by Vite, so the
 * browser loads it from our own origin as a lazily-fetched chunk. Nothing here
 * touches a CDN at runtime.
 *
 * Why this exists: the QR, PDF, formatter and markdown tools used to inject
 * a remote <script> tag on demand. When that request failed — blocked network,
 * CDN outage, offline PWA, corporate proxy — the tool died with "Failed to load
 * <url>" and there was no way to recover. Serving the libraries from our own
 * origin removes that whole failure class and makes the tools work offline once
 * the service worker has cached the chunk.
 *
 * Each loader is cached, so opening ten QR tools only parses the library once.
 */

const cache = new Map();

/** Run an async loader at most once and memoise its result (or its rejection). */
function once(key, load) {
  if (!cache.has(key)) {
    cache.set(
      key,
      Promise.resolve()
        .then(load)
        .catch((err) => {
          cache.delete(key); // let a retry actually retry instead of replaying the failure
          throw new Error(`${key} could not be loaded: ${err?.message || err}`);
        }),
    );
  }
  return cache.get(key);
}

/** Some UMD packages expose themselves as `default`, others as named exports. */
function unwrap(mod) {
  return mod?.default ?? mod;
}

/* ── QR codes ───────────────────────────────────────────── */

/** QR generation — `{ toDataURL, toCanvas, toString, create }` */
export const loadQr = () => once('QR library', async () => unwrap(await import('qrcode')));

/** QR decoding from an image — a single function `(data, width, height) => code` */
export const loadJsQr = () => once('QR scanner library', async () => unwrap(await import('jsqr')));

/* ── PDF ────────────────────────────────────────────────── */

/** PDF authoring & editing — `{ PDFDocument, rgb, degrees, StandardFonts }` */
export const loadPdfLib = () => once('PDF library', async () => {
  const mod = await import('pdf-lib');
  return mod.PDFDocument ? mod : unwrap(mod);
});

/**
 * PDF reading & rendering. The worker is emitted as a same-origin asset by the
 * `?url` import, so pdf.js never reaches out to a CDN for it either.
 */
export const loadPdfJs = () => once('PDF reader', async () => {
  const mod = await import('pdfjs-dist/build/pdf.js');
  const lib = mod.getDocument ? mod : unwrap(mod);
  if (!lib?.getDocument) throw new Error('unexpected pdf.js build');
  try {
    /* `?url` makes the bundler emit the worker as a same-origin asset. */
    lib.GlobalWorkerOptions.workerSrc = unwrap(await import('pdfjs-dist/build/pdf.worker.min.js?url'));
  } catch {
    /* Outside a bundler — the test runner, or an asset that failed to emit —
       there is no worker file to point at, so pdf.js decodes on the main
       thread. Slower, but the tool still works instead of breaking. */
  }
  return lib;
});

/* ── Code formatting & markup ───────────────────────────── */

/** HTML formatter — `html_beautify(code, opts)` */
export const loadHtmlBeautify = () => once('HTML formatter', async () => {
  const mod = unwrap(await import('js-beautify/js/lib/beautify-html.js'));
  return mod.html_beautify ?? mod;
});

/** CSS formatter — `css_beautify(code, opts)` */
export const loadCssBeautify = () => once('CSS formatter', async () => {
  const mod = unwrap(await import('js-beautify/js/lib/beautify-css.js'));
  return mod.css_beautify ?? mod;
});

/** JavaScript formatter — `js_beautify(code, opts)` */
export const loadJsBeautify = () => once('JavaScript formatter', async () => {
  const mod = unwrap(await import('js-beautify/js/lib/beautify.js'));
  return mod.js_beautify ?? mod;
});

/** Markdown → HTML — `marked.parse(md)` */
export const loadMarked = () => once('Markdown parser', async () => {
  const mod = await import('marked');
  return mod.marked ?? unwrap(mod);
});

/** HTML → Markdown — `new TurndownService(opts).turndown(html)` */
export const loadTurndown = () => once('HTML to Markdown converter', async () => unwrap(await import('turndown')));
