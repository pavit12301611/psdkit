/* ============================================================
   ESSENTIAL TOOLS (25) — QR/PDF/image/colour/hash/audio/camera
   Heavy libraries (qrcode, pdf-lib, pdf.js, jsqr) lazy-load on use.
   ============================================================ */
import { el, fmt, copyText, toast, downloadFile, readFileAs, dropZone, loadScript, debounce, copyButton } from '../ui.js';
import { icon } from '../icons.js';
import { mountFormTool, num, md5, shaDigest, renderResult } from './formkit.js';

const QR_LIB = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js';
const PDFLIB = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const JSQR = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';

async function ensurePdfjs() {
  await loadScript(PDFJS);
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  return window.pdfjsLib;
}

function canvasToBlob(canvas, type = 'image/png', quality = 0.85) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export const ESSENTIAL_IMPLS = {

  /* 1 ── QR generator */
  'qr-generator': {
    fields: [
      { id: 'text', label: 'Link or text', type: 'textarea', rows: 3, default: 'https://psdkit.vercel.app' },
      { id: 'size', label: 'Size (px)', type: 'range', min: 160, max: 640, default: 320, unit: 'px' },
      { id: 'dark', label: 'Code colour', type: 'color', default: '#161514', half: true },
      { id: 'light', label: 'Background', type: 'color', default: '#FAF7F2', half: true },
    ],
    live: true,
    async compute(v) {
      if (!v.text?.trim()) return 'Enter some text or a link.';
      await loadScript(QR_LIB);
      const dataUrl = await new Promise((resolve, reject) => {
        window.QRCode.toDataURL(v.text, {
          width: Number(v.size) || 320, margin: 2,
          color: { dark: v.dark, light: v.light },
        }, (err, url) => err ? reject(err) : resolve(url));
      });
      return {
        title: 'QR code',
        html: `<div style="display:flex;flex-direction:column;align-items:center;gap:12px">
          <img src="${dataUrl}" alt="QR code" style="width:min(${v.size}px,100%);border-radius:16px;border:1px solid var(--cream-line)">
          <a class="copy-btn" href="${dataUrl}" download="psdkit-qr.png">${icon('download', 13)} Download PNG</a>
        </div>`,
        text: `QR for: ${v.text}`,
      };
    },
  },

  /* 2 ── QR scanner */
  'qr-scanner': {
    mount(container) {
      const preview = el('div.canvas-stage', { style: { flexDirection: 'column', gap: '10px' }, html: `<div class="text-muted" style="font-size:13.5px">Camera or image — decoded results appear below.</div>` });
      const result = el('div.mt-2');
      const setResult = (data) => {
        result.innerHTML = '';
        result.append(
          el('div.result-card',
            el('div.result-head', el('span.result-title', { text: 'Decoded' }), copyButton(data)),
            el('div.result-body', el('div.result-out', { text: data })),
          ),
          /^https?:\/\//.test(data)
            ? el('div.tool-actions', { style: { marginTop: '10px' } },
              el('a.btn.btn-accent', { href: data, target: '_blank', rel: 'noopener', html: `${icon('externalLink', 15)} Open link` }))
            : null,
        );
      };

      const decodeFromImage = async (file) => {
        const img = await loadImage(file);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        await loadScript(JSQR);
        const code = window.jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
        if (code?.data) setResult(code.data);
        else toast('No QR code found in that image', 'x');
      };

      let stream = null;
      const startCamera = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          const video = el('video', { autoplay: true, playsinline: true, style: { width: '100%', borderRadius: '14px' } });
          video.srcObject = stream;
          preview.innerHTML = '';
          preview.append(video);
          await loadScript(JSQR);
          const scan = () => {
            if (!stream) return;
            const c = document.createElement('canvas');
            c.width = video.videoWidth; c.height = video.videoHeight;
            c.getContext('2d').drawImage(video, 0, 0);
            const code = window.jsQR(c.getContext('2d').getImageData(0, 0, c.width, c.height).data, c.width, c.height);
            if (code?.data) {
              setResult(code.data);
              stopCamera();
              return;
            }
            requestAnimationFrame(scan);
          };
          video.onloadeddata = () => setTimeout(scan, 300);
        } catch {
          toast('Camera permission denied or unavailable', 'x');
        }
      };
      const stopCamera = () => {
        if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
      };
      container._cleanup = stopCamera;

      container.append(
        el('div.tool-row-btns',
          el('button.btn.btn-accent', { html: `${icon('camera', 16)} Use camera`, onclick: startCamera }),
          el('button.btn.btn-soft', { html: `${icon('image', 16)} Scan from image`, onclick: () => fileInput.click() }),
          el('button.btn.btn-soft', { html: `${icon('pause', 15)} Stop camera`, onclick: stopCamera }),
        ),
        el('div.mt-3', preview),
        result,
      );
      const fileInput = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
      fileInput.addEventListener('change', () => { if (fileInput.files[0]) decodeFromImage(fileInput.files[0]); });
      container.append(fileInput);
    },
  },

  /* 3 ── PDF merge */
  'pdf-merge': {
    mount(container) {
      let files = [];
      const listEl = el('div.col');
      const render = () => {
        listEl.innerHTML = '';
        files.forEach((f, i) => {
          listEl.append(el('div.card', { style: { padding: '12px 16px' } },
            el('div.row-between',
              el('div', { style: { fontSize: '13.5px', fontWeight: 600 } }, `${i + 1}. ${f.name} (${fmt.bytes(f.size)})`),
              el('div.row', { style: { gap: '6px' } },
                el('button.copy-btn', { html: '↑', onclick: () => { if (i > 0) { [files[i - 1], files[i]] = [files[i], files[i - 1]]; render(); } } }),
                el('button.copy-btn', { html: icon('trash', 13), onclick: () => { files.splice(i, 1); render(); } }),
              ),
            ),
          ));
        });
      };
      const zone = dropZone({
        accept: '.pdf',
        onFiles: (fs) => { files.push(...fs.filter((f) => f.type === 'pdf' || f.name.endsWith('.pdf'))); render(); toast(`${fs.length} file(s) added`); },
        hint: 'Drop PDF files here (order matters — use ↑ to reorder)',
      });
      container.append(zone, el('div.mt-2', listEl),
        el('div.tool-actions', { style: { marginTop: '14px' } },
          el('button.btn.btn-accent', {
            html: `${icon('layers', 16)} Merge ${''}PDFs`,
            onclick: async () => {
              if (files.length < 2) { toast('Add at least 2 PDF files', 'info'); return; }
              toast('Merging…');
              try {
                await loadScript(PDFLIB);
                const { PDFDocument } = window.PDFLib;
                const merged = await PDFDocument.create();
                for (const f of files) {
                  const bytes = await readFileAs(f, 'buffer');
                  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
                  const pages = await merged.copyPages(src, src.getPageIndices());
                  pages.forEach((p) => merged.addPage(p));
                }
                const out = await merged.save();
                downloadFile('merged.pdf', new Blob([out], { type: 'application/pdf' }));
                toast('Merged PDF downloaded ✓');
              } catch (e) {
                toast(`Merge failed: ${e.message}`, 'x');
              }
            },
          }),
        ));
    },
  },

  /* 4 ── PDF split */
  'pdf-split': {
    mount(container) {
      let file = null;
      const info = el('div.field-hint', { text: 'No file chosen yet.' });
      const pagesIn = el('input.input', { placeholder: 'e.g. 1-3, 5, 8-10' });
      const zone = dropZone({
        accept: '.pdf',
        onFiles: async (fs) => {
          file = fs[0];
          try {
            const pdfjs = await ensurePdfjs();
            const doc = await pdfjs.getDocument({ data: await readFileAs(file, 'buffer') }).promise;
            info.textContent = `${file.name} — ${doc.numPages} pages`;
          } catch {
            info.textContent = `${file.name} (could not count pages)`;
          }
        },
        hint: 'Drop a PDF here',
      });
      const parseRanges = (spec, max) => {
        const out = new Set();
        for (const part of spec.split(',')) {
          const [a, b] = part.split('-').map((x) => parseInt(x.trim(), 10));
          if (!a || a > max) continue;
          const end = b && b <= max ? b : a;
          for (let i = Math.min(a, end); i <= Math.max(a, end); i++) out.add(i - 1);
        }
        return [...out].sort((x, y) => x - y);
      };
      container.append(zone, el('div.mt-2', info),
        el('div.field.mt-2', el('label.field-label', { text: 'Pages to extract' }), pagesIn,
          el('div.field-hint', { text: 'Leave empty to extract every page as its own file.' })),
        el('div.tool-actions', { style: { marginTop: '12px' } },
          el('button.btn.btn-accent', {
            html: `${icon('scissors', 16)} Split PDF`,
            onclick: async () => {
              if (!file) { toast('Choose a PDF first', 'info'); return; }
              try {
                await loadScript(PDFLIB);
                const { PDFDocument } = window.PDFLib;
                const src = await PDFDocument.load(await readFileAs(file, 'buffer'), { ignoreEncryption: true });
                const max = src.getPageCount();
                const idx = pagesIn.value.trim() ? parseRanges(pagesIn.value, max) : Array.from({ length: max }, (_, i) => i);
                for (const i of idx) {
                  const outDoc = await PDFDocument.create();
                  const [p] = await outDoc.copyPages(src, [i]);
                  outDoc.addPage(p);
                  const bytes = await outDoc.save();
                  downloadFile(`page-${i + 1}.pdf`, new Blob([bytes], { type: 'application/pdf' }));
                }
                toast(`Extracted ${idx.length} page(s) ✓`);
              } catch (e) {
                toast(`Split failed: ${e.message}`, 'x');
              }
            },
          }),
        ));
    },
  },

  /* 5 ── Images to PDF */
  'images-to-pdf': {
    mount(container) {
      let files = [];
      const listEl = el('div.field-hint', { text: 'No images added yet.' });
      const sizeIn = el('select.select');
      for (const [v, l] of [['a4', 'A4 portrait'], ['a4l', 'A4 landscape'], ['fit', 'Fit to image']]) sizeIn.append(el('option', { value: v, text: l }));
      const zone = dropZone({
        accept: 'image/*',
        onFiles: (fs) => {
          files.push(...fs);
          listEl.textContent = `${files.length} image(s) selected — ${files.map((f) => f.name).join(', ').slice(0, 80)}`;
        },
        hint: 'Drop JPG/PNG images here — order of adding is page order',
      });
      container.append(zone, el('div.mt-2', listEl),
        el('div.field.mt-2', el('label.field-label', { text: 'Page size' }), sizeIn),
        el('div.tool-actions', { style: { marginTop: '12px' } },
          el('button.btn.btn-accent', {
            html: `${icon('file', 16)} Build PDF`,
            onclick: async () => {
              if (!files.length) { toast('Add some images first', 'info'); return; }
              try {
                await loadScript(PDFLIB);
                const { PDFDocument } = window.PDFLib;
                const doc = await PDFDocument.create();
                for (const f of files) {
                  const bytes = await readFileAs(f, 'buffer');
                  const img = f.type.includes('png') ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
                  const { width, height } = img.scale(1);
                  let pageW = width, pageH = height;
                  if (sizeIn.value !== 'fit') {
                    pageW = 595.28; pageH = 841.89;
                    if (sizeIn.value === 'a4l') [pageW, pageH] = [pageH, pageW];
                  }
                  const page = doc.addPage([pageW, pageH]);
                  const scale = Math.min(pageW / width, pageH / height) * 0.94;
                  page.drawImage(img, {
                    x: (pageW - width * scale) / 2,
                    y: (pageH - height * scale) / 2,
                    width: width * scale, height: height * scale,
                  });
                }
                const out = await doc.save();
                downloadFile('images.pdf', new Blob([out], { type: 'application/pdf' }));
                toast('PDF created ✓');
              } catch (e) {
                toast(`Could not build PDF: ${e.message}`, 'x');
              }
            },
          }),
        ));
    },
  },

  /* 6 ── PDF to images */
  'pdf-to-images': {
    mount(container) {
      let file = null;
      const out = el('div.col');
      const zone = dropZone({
        accept: '.pdf',
        onFiles: (fs) => { file = fs[0]; toast('PDF loaded — click Render'); },
        hint: 'Drop a PDF here',
      });
      container.append(zone,
        el('div.tool-actions', { style: { marginTop: '12px' } },
          el('button.btn.btn-accent', {
            html: `${icon('image', 16)} Render pages as PNG`,
            onclick: async () => {
              if (!file) { toast('Choose a PDF first', 'info'); return; }
              out.innerHTML = '<div class="skeleton" style="height:120px"></div>';
              try {
                const pdfjs = await ensurePdfjs();
                const doc = await pdfjs.getDocument({ data: await readFileAs(file, 'buffer') }).promise;
                out.innerHTML = '';
                for (let i = 1; i <= doc.numPages; i++) {
                  const page = await doc.getPage(i);
                  const viewport = page.getViewport({ scale: 2 });
                  const canvas = document.createElement('canvas');
                  canvas.width = viewport.width;
                  canvas.height = viewport.height;
                  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                  const blob = await canvasToBlob(canvas, 'image/png');
                  const url = URL.createObjectURL(blob);
                  out.append(el('div.card', { style: { padding: '14px' } },
                    el('div.row-between',
                      el('img', { src: url, style: { maxHeight: '220px', borderRadius: '10px' } }),
                      el('a.copy-btn', { href: url, download: `page-${i}.png`, html: `${icon('download', 13)} Page ${i}` }),
                    )));
                }
                toast(`Rendered ${doc.numPages} page(s) ✓`);
              } catch (e) {
                out.innerHTML = '';
                out.append(el('div.note', { html: icon('info', 17) + `<span>Render failed: ${e.message}</span>` }));
              }
            },
          }),
        ),
        el('div.mt-3', out),
      );
    },
  },

  /* 7 ── Image compressor */
  'image-compress': {
    mount(container) {
      let file = null, img = null;
      const quality = el('input.range', { type: 'range', min: 10, max: 100, value: 75 });
      const qHint = el('div.field-hint', { text: 'Quality: 75%' });
      quality.addEventListener('input', () => (qHint.textContent = `Quality: ${quality.value}%`));
      const maxW = el('input.input', { type: 'number', value: 1920 });
      const out = el('div');
      const zone = dropZone({
        accept: 'image/*',
        onFiles: async (fs) => {
          file = fs[0];
          img = await loadImage(file);
          toast(`Loaded ${file.name}`);
        },
        hint: 'Drop an image (JPG/PNG/WebP)',
      });
      container.append(zone,
        el('div.grid.grid-2', { style: { gap: '12px', marginTop: '14px' } },
          el('div.field', el('label.field-label', { text: 'Quality' }), quality, qHint),
          el('div.field', el('label.field-label', { text: 'Max width (px)' }), maxW),
        ),
        el('div.tool-actions', { style: { marginTop: '12px' } },
          el('button.btn.btn-accent', {
            html: `${icon('image', 16)} Compress`,
            onclick: async () => {
              if (!file || !img) { toast('Choose an image first', 'info'); return; }
              const mw = +maxW.value || img.width;
              const scale = Math.min(1, mw / img.width);
              const canvas = document.createElement('canvas');
              canvas.width = Math.round(img.width * scale);
              canvas.height = Math.round(img.height * scale);
              canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
              const blob = await canvasToBlob(canvas, 'image/jpeg', quality.value / 100);
              const saved = Math.round((1 - blob.size / file.size) * 100);
              out.innerHTML = '';
              out.append(
                el('div.stat-grid', ...[
                  ['Original', fmt.bytes(file.size)], ['Compressed', fmt.bytes(blob.size)],
                  ['Saved', `${saved > 0 ? saved : 0}%`], ['Dimensions', `${canvas.width}×${canvas.height}`],
                ].map(([k, v]) => el('div.stat', el('div.k', { text: k }), el('div.v', { text: String(v), style: { fontSize: '16px' } })))),
                el('div.tool-actions', { style: { marginTop: '12px' } },
                  el('a.btn.btn-accent', {
                    href: URL.createObjectURL(blob),
                    download: `compressed-${file.name.replace(/\.\w+$/, '')}.jpg`,
                    html: `${icon('download', 16)} Download compressed`,
                  })),
              );
            },
          }),
        ),
        el('div.mt-3', out),
      );
    },
  },

  /* 8 ── Image resizer */
  'image-resize': {
    mount(container) {
      let file = null, img = null;
      const wIn = el('input.input', { type: 'number' });
      const hIn = el('input.input', { type: 'number' });
      const lock = el('input', { type: 'checkbox', checked: true });
      const out = el('div');
      const zone = dropZone({
        accept: 'image/*',
        onFiles: async (fs) => {
          file = fs[0];
          img = await loadImage(file);
          wIn.value = img.width;
          hIn.value = img.height;
          toast(`${img.width}×${img.height} loaded`);
        },
        hint: 'Drop an image to resize',
      });
      wIn.addEventListener('input', () => {
        if (lock.checked && img) hIn.value = Math.round((+wIn.value / img.width) * img.height);
      });
      hIn.addEventListener('input', () => {
        if (lock.checked && img) wIn.value = Math.round((+hIn.value / img.height) * img.width);
      });
      container.append(zone,
        el('div.grid.grid-2', { style: { gap: '12px', marginTop: '14px' } },
          el('div.field', el('label.field-label', { text: 'Width (px)' }), wIn),
          el('div.field', el('label.field-label', { text: 'Height (px)' }), hIn),
        ),
        el('label.checkline.mt-2', lock, 'Lock aspect ratio'),
        el('div.tool-actions', { style: { marginTop: '12px' } },
          el('button.btn.btn-accent', {
            html: `${icon('ruler', 16)} Resize & download`,
            onclick: async () => {
              if (!img) { toast('Choose an image first', 'info'); return; }
              const w = Math.max(1, +wIn.value || img.width);
              const h = Math.max(1, +hIn.value || img.height);
              const canvas = document.createElement('canvas');
              canvas.width = w; canvas.height = h;
              canvas.getContext('2d').drawImage(img, 0, 0, w, h);
              const blob = await canvasToBlob(canvas, 'image/png');
              downloadFile(`resized-${w}x${h}.png`, blob);
              out.innerHTML = '';
              out.append(el('div.stat-grid',
                el('div.stat', el('div.k', { text: 'New size' }), el('div.v', { text: `${w}×${h}`, style: { fontSize: '16px' } })),
                el('div.stat', el('div.k', { text: 'File size' }), el('div.v', { text: fmt.bytes(blob.size), style: { fontSize: '16px' } })),
              ));
              toast('Resized image downloaded ✓');
            },
          }),
        ),
        el('div.mt-3', out),
      );
    },
  },

  /* 9 ── Image format converter */
  'image-convert': {
    mount(container) {
      let file = null, img = null;
      const fmtIn = el('select.select');
      for (const [v, l] of [['image/png', 'PNG'], ['image/jpeg', 'JPG'], ['image/webp', 'WebP']]) fmtIn.append(el('option', { value: v, text: l }));
      const zone = dropZone({
        accept: 'image/*',
        onFiles: async (fs) => { file = fs[0]; img = await loadImage(file); toast(`${file.name} loaded`); },
        hint: 'Drop an image to convert',
      });
      container.append(zone,
        el('div.field.mt-2', el('label.field-label', { text: 'Convert to' }), fmtIn),
        el('div.tool-actions', { style: { marginTop: '12px' } },
          el('button.btn.btn-accent', {
            html: `${icon('repeat', 16)} Convert`,
            onclick: async () => {
              if (!img) { toast('Choose an image first', 'info'); return; }
              const canvas = document.createElement('canvas');
              canvas.width = img.width; canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              if (fmtIn.value === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
              ctx.drawImage(img, 0, 0);
              const blob = await canvasToBlob(canvas, fmtIn.value, 0.92);
              const ext = fmtIn.value.split('/')[1];
              downloadFile(`converted.${ext}`, blob);
              toast(`Converted to ${ext.toUpperCase()} ✓`);
            },
          }),
        ));
    },
  },

  /* 10 ── Colour picker */
  'color-picker': {
    fields: [
      { id: 'color', label: 'Pick a colour', type: 'color', default: '#DE5D35' },
      { id: 'custom', label: 'Or type HEX / RGB', type: 'text', default: '', placeholder: '#DE5D35 or rgb(222, 93, 53)' },
    ],
    compute(v) {
      let hex = (v.custom || '').trim() || v.color;
      const rgbMatch = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      const toHex = (n) => Number(n).toString(16).padStart(2, '0');
      if (rgbMatch) hex = '#' + toHex(rgbMatch[1]) + toHex(rgbMatch[2]) + toHex(rgbMatch[3]);
      hex = hex.replace(/^([0-9a-f]{6})$/i, '#$1');
      if (!/^#[0-9a-f]{6}$/i.test(hex)) return 'Enter a valid HEX (#RRGGBB) or RGB (r, g, b) colour.';
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255;
      let h = 0, s = 0;
      const l = (max + min) / 2;
      const d = max - min;
      if (d) {
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        const rr = r / 255, gg = g / 255, bb = b / 255;
        if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) * 60;
        else if (max === gg) h = ((bb - rr) / d + 2) * 60;
        else h = ((rr - gg) / d + 4) * 60;
      }
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      return {
        title: 'Colour values',
        html: `<div style="height:120px;border-radius:16px;background:${hex};border:1px solid var(--cream-line)"></div>
               <div class="stat-grid" style="margin-top:14px">
                 <div class="stat"><div class="k">HEX</div><div class="v" style="font-size:15px">${hex.toUpperCase()}</div></div>
                 <div class="stat"><div class="k">RGB</div><div class="v" style="font-size:15px">rgb(${r}, ${g}, ${b})</div></div>
                 <div class="stat"><div class="k">HSL</div><div class="v" style="font-size:15px">hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)</div></div>
                 <div class="stat"><div class="k">Best text</div><div class="v" style="font-size:15px">${luminance > 0.55 ? 'Dark text' : 'Light text'}</div></div>
               </div>`,
        copy: `HEX: ${hex.toUpperCase()}\nRGB: rgb(${r}, ${g}, ${b})\nHSL: hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`,
        text: `HEX: ${hex.toUpperCase()} · RGB: ${r}, ${g}, ${b} · HSL: ${Math.round(h)}°, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`,
      };
    },
  },

  /* 11 ── Contrast checker */
  'contrast-check': {
    fields: [
      { id: 'fg', label: 'Text colour', type: 'color', default: '#161514', half: true },
      { id: 'bg', label: 'Background colour', type: 'color', default: '#F5EFE6', half: true },
    ],
    compute(v) {
      const lum = (hex) => {
        const [r, g, b] = [1, 3, 5].map((i) => {
          const c = parseInt(hex.slice(i, i + 2), 16) / 255;
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const l1 = lum(v.fg), l2 = lum(v.bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const aa = ratio >= 4.5, aaLarge = ratio >= 3, aaa = ratio >= 7;
      return {
        title: 'WCAG contrast report',
        html: `<div style="background:${v.bg};color:${v.fg};padding:34px 28px;border-radius:16px;border:1px solid var(--cream-line)">
                 <div style="font-family:var(--serif);font-style:italic;font-size:30px">Large display text</div>
                 <div style="margin-top:8px;font-size:15px">Normal body text sample — can everyone read this comfortably?</div>
               </div>
               <div class="stat-grid" style="margin-top:14px">
                 <div class="stat"><div class="k">Contrast ratio</div><div class="v" style="font-size:18px">${ratio.toFixed(2)}:1</div></div>
                 <div class="stat"><div class="k">AA normal</div><div class="v" style="font-size:15px">${aa ? '✅ Pass' : '❌ Fail'}</div></div>
                 <div class="stat"><div class="k">AA large</div><div class="v" style="font-size:15px">${aaLarge ? '✅ Pass' : '❌ Fail'}</div></div>
                 <div class="stat"><div class="k">AAA</div><div class="v" style="font-size:15px">${aaa ? '✅ Pass' : '❌ Fail'}</div></div>
               </div>`,
        text: `Contrast ratio: ${ratio.toFixed(2)}:1\nAA (normal text ≥ 4.5): ${aa ? 'PASS' : 'FAIL'}\nAA (large text ≥ 3): ${aaLarge ? 'PASS' : 'FAIL'}\nAAA (≥ 7): ${aaa ? 'PASS' : 'FAIL'}`,
        note: 'WCAG 2.1 requires ≥ 4.5:1 for normal text and ≥ 3:1 for large text.',
      };
    },
  },

  /* 12 ── Palette generator */
  'palette-gen': {
    fields: [
      { id: 'base', label: 'Base colour', type: 'color', default: '#DE5D35' },
      { id: 'mode', label: 'Harmony', type: 'select', options: [['analogous', 'Analogous'], ['complement', 'Complementary'], ['triad', 'Triadic'], ['mono', 'Monochromatic']] },
    ],
    live: true,
    compute(v) {
      const hex = v.base;
      const toHsl = (h) => {
        const r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let hh = 0; const l = (max + min) / 2, d = max - min;
        const s = d ? (l > 0.5 ? d / (2 - max - min) : d / (max + min)) : 0;
        if (d) {
          if (max === r) hh = ((g - b) / d + (g < b ? 6 : 0)) * 60;
          else if (max === g) hh = ((b - r) / d + 2) * 60;
          else hh = ((r - g) / d + 4) * 60;
        }
        return [hh, s, l];
      };
      const toHex = (h, s, l) => {
        const a = s * Math.min(l, 1 - l);
        const f = (n) => {
          const k = (n + h / 30) % 12;
          const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
          return Math.round(255 * c).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
      };
      const [h, s, l] = toHsl(hex);
      let angles;
      switch (v.mode) {
        case 'complement': angles = [0, 180, 15, 165, 345]; break;
        case 'triad': angles = [0, 120, 240, 30, 210]; break;
        case 'mono': angles = [0, 0, 0, 0, 0]; break;
        default: angles = [0, 30, -30, 60, -60];
      }
      const shades = v.mode === 'mono'
        ? angles.map((_, i) => toHex(h, s, 0.25 + i * 0.125))
        : angles.map((a) => toHex((h + a + 360) % 360, Math.min(1, s + (v.mode === 'mono' ? 0 : 0.02)), Math.min(0.82, Math.max(0.28, l + (Math.abs(a) > 90 ? 0.08 : 0)))));
      return {
        title: `${v.mode} palette`,
        html: `<div style="display:grid;grid-template-columns:repeat(${shades.length},1fr);height:130px;border-radius:16px;overflow:hidden;border:1px solid var(--cream-line)">
          ${shades.map((c) => `<div style="background:${c}"></div>`).join('')}
        </div>
        <div class="stat-grid" style="margin-top:12px">
          ${shades.map((c) => `<div class="stat"><div class="k">HEX</div><div class="v" style="font-size:14px">${c.toUpperCase()}</div></div>`).join('')}
        </div>`,
        copy: shades.join('\n'),
        text: shades.map((c) => c.toUpperCase()).join('\n'),
      };
    },
  },

  /* 13 ── Hash generator */
  'hash-gen': {
    fields: [
      { id: 'text', label: 'Text to hash', type: 'textarea', rows: 4, default: 'Hello, PSDKIT!' },
    ],
    live: true,
    async compute(v) {
      const t = v.text || '';
      if (!t) return 'Type some text to hash.';
      const [md5h, sha1, sha256, sha512] = await Promise.all([
        Promise.resolve(md5(t)),
        shaDigest(t, 'SHA-1'),
        shaDigest(t, 'SHA-256'),
        shaDigest(t, 'SHA-512'),
      ]);
      return {
        title: 'Hash digests',
        text: `MD5:    ${md5h}\nSHA-1:  ${sha1}\nSHA-256:${sha256}\nSHA-512:${sha512}`,
        copy: `MD5: ${md5h}\nSHA-1: ${sha1}\nSHA-256: ${sha256}\nSHA-512: ${sha512}`,
        note: 'MD5 and SHA-1 are legacy — use SHA-256 or above for security purposes.',
      };
    },
  },

  /* 14 ── File checksum */
  'file-hash': {
    mount(container) {
      const out = el('div');
      const zone = dropZone({
        onFiles: async (fs) => {
          const f = fs[0];
          out.innerHTML = '<div class="skeleton" style="height:90px"></div>';
          const buf = await readFileAs(f, 'buffer');
          const digests = await Promise.all(['SHA-1', 'SHA-256', 'SHA-512'].map((a) => shaDigest(buf, a)));
          out.innerHTML = '';
          out.append(el('div.result-card',
            el('div.result-head', el('span.result-title', { text: f.name }), copyButton(`SHA-256: ${digests[1]}`)),
            el('div.result-body', el('div.result-out', {
              text: `Size: ${fmt.bytes(f.size)}\nSHA-1:   ${digests[0]}\nSHA-256: ${digests[1]}\nSHA-512: ${digests[2]}`,
            })),
          ));
        },
        hint: 'Drop any file to compute its checksums (stays on your device)',
      });
      container.append(zone, el('div.mt-3', out));
    },
  },

  /* 15 ── Text to speech */
  'text-speech': {
    mount(container) {
      const ta = el('textarea.textarea', { rows: 5, text: 'Hello! This is PSDKIT Pro reading text aloud for you.' });
      const voicesIn = el('select.select');
      const rateIn = el('input.range', { type: 'range', min: 50, max: 200, value: 100 });
      const loadVoices = () => {
        voicesIn.innerHTML = '';
        speechSynthesis.getVoices().forEach((v, i) => {
          voicesIn.append(el('option', { value: i, text: `${v.name} (${v.lang})` }));
        });
      };
      loadVoices();
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.onvoiceschanged = loadVoices;
      container.append(
        el('div.field', el('label.field-label', { text: 'Text to speak' }), ta),
        el('div.grid.grid-2', { style: { gap: '12px', marginTop: '12px' } },
          el('div.field', el('label.field-label', { text: 'Voice' }), voicesIn),
          el('div.field', el('label.field-label', { text: 'Speed' }), rateIn),
        ),
        el('div.tool-row-btns', { style: { marginTop: '14px' } },
          el('button.btn.btn-accent', {
            html: `${icon('volume', 16)} Speak`,
            onclick: () => {
              if (!('speechSynthesis' in window)) return toast('Speech is not supported in this browser', 'x');
              speechSynthesis.cancel();
              const u = new SpeechSynthesisUtterance(ta.value);
              const v = speechSynthesis.getVoices()[+voicesIn.value];
              if (v) u.voice = v;
              u.rate = rateIn.value / 100;
              speechSynthesis.speak(u);
            },
          }),
          el('button.btn.btn-soft', {
            html: `${icon('pause', 16)} Stop`,
            onclick: () => speechSynthesis.cancel(),
          }),
        ),
        el('div.note.mt-3', { html: icon('info', 17) + '<span>Voices come from your operating system — on mobile, download language voices in settings for more options.</span>' }),
      );
    },
  },

  /* 16 ── Speech to text */
  'speech-text': {
    mount(container) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const out = el('textarea.textarea', { rows: 7, placeholder: 'Your transcription appears here…' });
      const status = el('div.field-hint', { text: 'Press Start and speak clearly.' });
      if (!SR) {
        container.append(el('div.note', { html: icon('info', 17) + '<span>Speech recognition needs a Chromium-based browser (Chrome, Edge) on desktop or Android. You can still type in the box below.</span>' }), el('div.mt-2', out));
        return;
      }
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      let listening = false;
      rec.onresult = (e) => {
        let final = '', interim = '';
        for (const r of e.results) {
          if (r.isFinal) final += r[0].transcript + ' ';
          else interim += r[0].transcript;
        }
        if (final) out.value = (out.value + final).trimStart();
        status.textContent = interim ? `Hearing: “${interim}”` : 'Listening…';
      };
      rec.onerror = () => { status.textContent = 'Microphone error — check permissions.'; listening = false; };
      container.append(
        el('div.tool-row-btns',
          el('button.btn.btn-accent', {
            html: `${icon('mic', 16)} Start listening`,
            onclick: () => {
              if (listening) return;
              rec.start(); listening = true;
              status.textContent = 'Listening…';
            },
          }),
          el('button.btn.btn-soft', {
            html: `${icon('pause', 16)} Stop`,
            onclick: () => { rec.stop(); listening = false; status.textContent = 'Stopped.'; },
          }),
          el('button.btn.btn-soft', { html: `${icon('copy', 15)} Copy text`, onclick: () => copyText(out.value) }),
        ),
        el('div.mt-2', status),
        el('div.mt-2', out),
      );
    },
  },

  /* 17 ── Voice recorder */
  'voice-recorder': {
    mount(container) {
      let media = null, chunks = [], recorder = null, timer = null, secs = 0;
      const timeEl = el('div.big-timer', { text: '00:00', style: { fontSize: '44px' } });
      const out = el('div.col');
      container.append(
        el('div.canvas-stage', { style: { flexDirection: 'column', gap: '10px', padding: '28px' } }, timeEl),
        el('div.tool-row-btns', { style: { marginTop: '14px' } },
          el('button.btn.btn-accent', {
            html: `${icon('mic', 16)} Record`,
            onclick: async () => {
              if (recorder?.state === 'recording') return;
              try {
                media = await navigator.mediaDevices.getUserMedia({ audio: true });
                chunks = [];
                recorder = new MediaRecorder(media);
                recorder.ondataavailable = (e) => chunks.push(e.data);
                recorder.onstop = () => {
                  clearInterval(timer);
                  media?.getTracks().forEach((t) => t.stop());
                  const blob = new Blob(chunks, { type: 'audio/webm' });
                  out.prepend(el('div.card', { style: { padding: '14px 16px' } },
                    el('div.row-between',
                      el('div', { style: { flex: 1 } },
                        el('audio', { controls: true, src: URL.createObjectURL(blob), style: { width: '100%' } }),
                        el('div.field-hint.mt-1', { text: `${fmt.dur(secs)} · ${fmt.bytes(blob.size)}` }),
                      ),
                      el('a.copy-btn', { href: URL.createObjectURL(blob), download: `recording-${Date.now()}.webm`, html: `${icon('download', 13)} Save` }),
                    )));
                  toast('Recording ready');
                };
                recorder.start();
                secs = 0;
                timer = setInterval(() => {
                  secs++;
                  timeEl.textContent = fmt.dur(secs);
                }, 1000);
              } catch {
                toast('Microphone permission denied', 'x');
              }
            },
          }),
          el('button.btn.btn-soft', {
            html: `${icon('square', 15)} Stop`,
            onclick: () => recorder?.state === 'recording' && recorder.stop(),
          }),
        ),
        el('div.mt-3', out),
      );
    },
  },

  /* 18 ── Screen recorder */
  'screen-recorder': {
    mount(container) {
      let recorder = null, chunks = [], stream = null;
      const out = el('div');
      const status = el('div.field-hint', { text: 'Choose what to share — a tab, a window or the whole screen.' });
      container.append(
        status,
        el('div.tool-row-btns', { style: { marginTop: '12px' } },
          el('button.btn.btn-accent', {
            html: `${icon('video', 16)} Start recording`,
            onclick: async () => {
              try {
                stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true });
                chunks = [];
                recorder = new MediaRecorder(stream);
                recorder.ondataavailable = (e) => chunks.push(e.data);
                recorder.onstop = () => {
                  stream?.getTracks().forEach((t) => t.stop());
                  const blob = new Blob(chunks, { type: 'video/webm' });
                  out.innerHTML = '';
                  out.append(el('div.card', { style: { padding: '14px' } },
                    el('video', { controls: true, src: URL.createObjectURL(blob), style: { width: '100%', borderRadius: '10px' } }),
                    el('div.tool-actions', { style: { marginTop: '10px' } },
                      el('a.btn.btn-accent', { href: URL.createObjectURL(blob), download: `screen-${Date.now()}.webm`, html: `${icon('download', 15)} Download video` })),
                  ));
                  status.textContent = 'Recording finished.';
                  toast('Screen recording ready ✓');
                };
                recorder.start();
                status.textContent = 'Recording… press Stop when finished.';
                stream.getVideoTracks()[0].onended = () => recorder?.state === 'recording' && recorder.stop();
              } catch {
                toast('Screen capture cancelled or unavailable', 'x');
              }
            },
          }),
          el('button.btn.btn-soft', {
            html: `${icon('square', 15)} Stop`,
            onclick: () => recorder?.state === 'recording' && recorder.stop(),
          }),
        ),
        el('div.mt-3', out),
        el('div.note.mt-3', { html: icon('shield', 17) + '<span>Recordings never leave your device — everything happens in the browser.</span>' }),
      );
    },
  },

  /* 19 ── Whiteboard */
  'whiteboard': {
    mount(container) {
      const canvas = el('canvas', { class: 'stage-canvas', width: 800, height: 480 });
      const ctx = canvas.getContext('2d');
      const state = { drawing: false, color: '#161514', size: 4, last: null };
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 800, 480);
      ctx.lineCap = ctx.lineJoin = 'round';

      const pos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const p = e.touches ? e.touches[0] : e;
        return [(p.clientX - rect.left) * (canvas.width / rect.width), (p.clientY - rect.top) * (canvas.height / rect.height)];
      };
      const start = (e) => { state.drawing = true; state.last = pos(e); };
      const move = (e) => {
        if (!state.drawing) return;
        e.preventDefault();
        const [x, y] = pos(e);
        ctx.strokeStyle = state.color;
        ctx.lineWidth = state.size;
        ctx.beginPath();
        ctx.moveTo(...state.last);
        ctx.lineTo(x, y);
        ctx.stroke();
        state.last = [x, y];
      };
      const end = () => (state.drawing = false);
      canvas.addEventListener('pointerdown', start);
      canvas.addEventListener('pointermove', move);
      window.addEventListener('pointerup', end);
      canvas._cleanup = () => window.removeEventListener('pointerup', end);

      const colorIn = el('input', { type: 'color', value: '#161514', style: { width: '52px', height: '44px', padding: '4px', borderRadius: '12px', border: '1.5px solid var(--cream-line)', cursor: 'pointer' } });
      colorIn.addEventListener('input', () => (state.color = colorIn.value));
      const sizeIn = el('input.range', { type: 'range', min: 1, max: 28, value: 4, style: { maxWidth: '160px' } });
      sizeIn.addEventListener('input', () => (state.size = +sizeIn.value));

      container.append(
        el('div.row', { style: { gap: '10px', flexWrap: 'wrap', marginBottom: '12px' } },
          colorIn,
          el('div.field', { style: { flex: 1, minWidth: '140px' } }, el('label.field-label', { text: 'Brush size' }), sizeIn),
          el('button.btn.btn-soft', {
            html: `${icon('refresh', 15)} Clear`,
            onclick: () => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 800, 480); },
          }),
          el('button.btn.btn-accent', {
            html: `${icon('download', 15)} Save PNG`,
            onclick: () => {
              const a = el('a', { href: canvas.toDataURL('image/png'), download: 'whiteboard.png' });
              document.body.append(a);
              a.click();
              a.remove();
              toast('Whiteboard saved ✓');
            },
          }),
        ),
        canvas,
      );
    },
  },

  /* 20 ── Signature pad */
  'signature-pad': {
    mount(container) {
      const canvas = el('canvas', { class: 'stage-canvas', width: 800, height: 300, style: { background: '#fff', cursor: 'crosshair' } });
      const ctx = canvas.getContext('2d');
      let drawing = false, last = null;
      ctx.lineCap = ctx.lineJoin = 'round';
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = '#1a1a5e';
      const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        const p = e.touches ? e.touches[0] : e;
        return [(p.clientX - r.left) * (canvas.width / r.width), (p.clientY - r.top) * (canvas.height / r.height)];
      };
      canvas.addEventListener('pointerdown', (e) => { drawing = true; last = pos(e); });
      canvas.addEventListener('pointermove', (e) => {
        if (!drawing) return;
        e.preventDefault();
        const [x, y] = pos(e);
        ctx.beginPath();
        ctx.moveTo(...last);
        ctx.lineTo(x, y);
        ctx.stroke();
        last = [x, y];
      });
      window.addEventListener('pointerup', () => (drawing = false));
      container.append(
        el('div.canvas-stage', { style: { padding: '12px' } }, canvas),
        el('div.tool-row-btns', { style: { marginTop: '14px' } },
          el('button.btn.btn-soft', { html: `${icon('refresh', 15)} Clear`, onclick: () => ctx.clearRect(0, 0, 800, 300) }),
          el('button.btn.btn-accent', {
            html: `${icon('download', 15)} Download PNG (transparent)`,
            onclick: () => {
              const out = document.createElement('canvas');
              out.width = 800; out.height = 300;
              const octx = out.getContext('2d');
              octx.drawImage(canvas, 0, 0);
              const data = octx.getImageData(0, 0, 800, 300);
              for (let i = 0; i < data.data.length; i += 4) {
                if (data.data[i] > 245 && data.data[i + 1] > 245 && data.data[i + 2] > 245) data.data[i + 3] = 0;
              }
              octx.putImageData(data, 0, 0);
              const a = el('a', { href: out.toDataURL('image/png'), download: 'signature.png' });
              document.body.append(a); a.click(); a.remove();
              toast('Signature saved ✓');
            },
          }),
        ),
      );
    },
  },

  /* 21 ── Webcam mirror */
  'webcam-mirror': {
    mount(container) {
      let stream = null;
      const stage = el('div.canvas-stage', { style: { padding: '12px', minHeight: '260px' } });
      const video = el('video', { autoplay: true, playsinline: true, style: { width: '100%', borderRadius: '14px', transform: 'scaleX(-1)' } });
      stage.append(video);
      const zoom = el('input.range', { type: 'range', min: 100, max: 260, value: 100 });
      zoom.addEventListener('input', () => (video.style.transform = `scaleX(-1) scale(${zoom.value / 100})`));
      container.append(
        stage,
        el('div.field.mt-2', el('label.field-label', { text: 'Zoom' }), zoom),
        el('div.tool-row-btns', { style: { marginTop: '12px' } },
          el('button.btn.btn-accent', {
            html: `${icon('camera', 16)} Start camera`,
            onclick: async () => {
              try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = stream;
              } catch { toast('Camera permission denied', 'x'); }
            },
          }),
          el('button.btn.btn-soft', {
            html: `${icon('image', 15)} Snapshot`,
            onclick: () => {
              const c = document.createElement('canvas');
              c.width = video.videoWidth || 640;
              c.height = video.videoHeight || 480;
              c.getContext('2d').drawImage(video, 0, 0);
              const a = el('a', { href: c.toDataURL('image/png'), download: 'snapshot.png' });
              document.body.append(a); a.click(); a.remove();
            },
          }),
          el('button.btn.btn-soft', { html: `${icon('pause', 15)} Stop`, onclick: () => { stream?.getTracks().forEach((t) => t.stop()); stream = null; } }),
        ),
      );
      container._cleanup = () => stream?.getTracks().forEach((t) => t.stop());
    },
  },

  /* 22 ── On-screen ruler */
  'ruler-screen': {
    mount(container) {
      const unitIn = el('select.select');
      for (const [v, l] of [['mm', 'Millimetres'], ['in', 'Inches'], ['px', 'Pixels (96 dpi)']]) unitIn.append(el('option', { value: v, text: l }));
      const ppiIn = el('input.input', { type: 'number', value: 96 });
      const out = el('div');
      const render = () => {
        const unit = unitIn.value;
        const ppi = +ppiIn.value || 96;
        const length = unit === 'in' ? 12 : unit === 'mm' ? 300 : 600;
        const pxPer = unit === 'in' ? ppi : unit === 'mm' ? ppi / 25.4 : 1;
        let ticks = '';
        for (let i = 0; i <= length; i++) {
          const x = i * pxPer;
          const major = unit === 'in' ? i % 1 === 0 : i % 10 === 0;
          const mid = unit === 'in' ? i % 1 === 0.5 : i % 5 === 0;
          const h = major ? 26 : mid ? 16 : 9;
          ticks += `<div style="position:absolute;left:${x}px;bottom:0;width:1.5px;height:${h}px;background:var(--ink);opacity:${major ? 0.85 : 0.4}"></div>`;
          if (major) ticks += `<div style="position:absolute;left:${x + 4}px;bottom:30px;font-size:10px;font-weight:800;color:var(--muted)">${i}</div>`;
        }
        out.innerHTML = `<div style="position:relative;height:64px;background:linear-gradient(to bottom,var(--cream-soft),var(--cream));border:1.5px solid var(--cream-line);border-radius:14px;overflow-x:auto"><div style="position:relative;width:${length * pxPer + 20}px;height:100%">${ticks}</div></div>
        <div class="field-hint" style="margin-top:10px">Calibrate: measure a known length on screen and adjust PPI until it matches. Common laptop PPI ≈ 110–160.</div>`;
      };
      unitIn.addEventListener('change', render);
      ppiIn.addEventListener('input', debounce(render, 250));
      container.append(
        el('div.grid.grid-2', { style: { gap: '12px' } },
          el('div.field', el('label.field-label', { text: 'Unit' }), unitIn),
          el('div.field', el('label.field-label', { text: 'Screen PPI' }), ppiIn),
        ),
        el('div.mt-3', out),
      );
      render();
    },
  },

  /* 23 ── Magnifier / flashlight */
  'magnifier': {
    mount(container) {
      const screen = el('div', {
        style: {
          height: '320px', borderRadius: '18px', background: '#fff', border: '1.5px solid var(--cream-line)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--serif)', fontStyle: 'italic',
          /* a fixed 44px word is wider than a phone panel — scale it and let
             it break so the caption stays inside the rounded box */
          fontSize: 'clamp(20px, 6.5vw, 44px)', lineHeight: 1.15,
          color: 'var(--muted-light)',
          transition: 'background .35s ease, color .35s ease', cursor: 'pointer', textAlign: 'center', padding: '20px',
          maxWidth: '100%', overflowWrap: 'anywhere', wordBreak: 'break-word',
        },
        text: 'Tap to toggle flashlight',
      });
      const zoomIn = el('input.range', { type: 'range', min: 100, max: 400, value: 160 });
      const modeIn = el('select.select');
      for (const [v, l] of [['flash', 'Flashlight (bright white)'], ['read', 'Reading light (warm)'], ['black', 'Blackout test']]) modeIn.append(el('option', { value: v, text: l }));
      const apply = () => {
        const m = modeIn.value;
        if (m === 'flash') { screen.style.background = '#fff'; screen.style.color = 'var(--muted-light)'; screen.style.filter = `brightness(${zoomIn.value / 100})`; screen.textContent = 'FLASHLIGHT ON — tap to hide text'; }
        else if (m === 'read') { screen.style.background = '#F7EED9'; screen.style.color = 'var(--muted-light)'; screen.style.filter = `brightness(${zoomIn.value / 120})`; screen.textContent = 'Warm reading light'; }
        else { screen.style.background = '#000'; screen.style.color = '#333'; screen.style.filter = 'none'; screen.textContent = 'Pixel test — should be pure black'; }
      };
      modeIn.addEventListener('change', apply);
      zoomIn.addEventListener('input', apply);
      screen.addEventListener('click', () => {
        screen.textContent = screen.textContent ? '' : 'Tap to toggle flashlight';
      });
      container.append(
        el('div.field', el('label.field-label', { text: 'Mode' }), modeIn),
        el('div.field.mt-2', el('label.field-label', { text: 'Brightness' }), zoomIn),
        el('div.mt-3', screen),
      );
      apply();
    },
  },

  /* 24 ── Metronome */
  'metronome': {
    mount(container) {
      let running = false, next = 0, timer = null, beats = 0;
      const bpmIn = el('input.input', { type: 'number', value: 100, min: 20, max: 240 });
      const display = el('div.big-timer', { text: '100', style: { fontSize: '64px' } });
      const dot = el('div', { style: { width: '26px', height: '26px', borderRadius: '50%', background: 'var(--cream-deep)', transition: 'background .12s ease' } });
      let ctxAudio = null;
      const tick = (accent) => {
        ctxAudio = ctxAudio || new (window.AudioContext || window.webkitAudioContext)();
        const o = ctxAudio.createOscillator(), g = ctxAudio.createGain();
        o.connect(g); g.connect(ctxAudio.destination);
        o.frequency.value = accent ? 1200 : 800;
        g.gain.value = 0.14;
        o.start(); o.stop(ctxAudio.currentTime + 0.06);
        dot.style.background = 'var(--accent)';
        setTimeout(() => (dot.style.background = 'var(--cream-deep)'), 110);
      };
      const scheduler = () => {
        const interval = 60000 / (+bpmIn.value || 100);
        while (next < performance.now() + 100) {
          beats++;
          tick(beats % 4 === 1);
          next += interval;
        }
      };
      container.append(
        el('div.canvas-stage', { style: { flexDirection: 'column', gap: '16px', padding: '30px' } }, display, dot),
        el('div.field.mt-3', el('label.field-label', { text: 'Tempo (BPM)' }), bpmIn),
        el('div.tool-row-btns', { style: { marginTop: '14px' } },
          el('button.btn.btn-accent', {
            html: `${icon('play', 16)} Start`,
            onclick: () => {
              if (running) return;
              running = true;
              next = performance.now();
              timer = setInterval(scheduler, 40);
              display.textContent = bpmIn.value;
            },
          }),
          el('button.btn.btn-soft', {
            html: `${icon('pause', 16)} Stop`,
            onclick: () => { running = false; clearInterval(timer); },
          }),
          el('button.btn.btn-soft', { html: '60', onclick: () => { bpmIn.value = 60; display.textContent = '60'; } }),
          el('button.btn.btn-soft', { html: '120', onclick: () => { bpmIn.value = 120; display.textContent = '120'; } }),
        ),
        el('div.note.mt-3', { html: icon('music', 17) + '<span>Beat 1 of every 4 has a higher accent tone — like a conductor’s downbeat.</span>' }),
      );
      bpmIn.addEventListener('input', () => (display.textContent = bpmIn.value));
    },
  },

  /* 25 ── Alarm clock */
  'alarm-clock': {
    mount(container) {
      const nowEl = el('div.big-timer', { text: '00:00:00' });
      const alarmIn = el('input.input', { type: 'time' });
      const status = el('div.field-hint', { text: 'No alarm set.' });
      let alarmTime = null, ringing = false;
      const beep = () => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        for (let i = 0; i < 3; i++) {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value = 950;
          g.gain.value = 0.14;
          o.start(ctx.currentTime + i * 0.35);
          o.stop(ctx.currentTime + i * 0.35 + 0.25);
        }
      };
      const tickClock = () => {
        const now = new Date();
        nowEl.textContent = now.toLocaleTimeString('en-GB', { hour12: false });
        if (alarmTime && !ringing) {
          const [h, m] = alarmTime.split(':');
          if (now.getHours() === +h && now.getMinutes() === +m && now.getSeconds() < 2) {
            ringing = true;
            beep();
            status.textContent = '⏰ ALARM RINGING!';
            toast('⏰ Alarm!');
            setTimeout(() => (ringing = false), 60000);
          }
        }
      };
      const t = setInterval(tickClock, 500);
      container._cleanup = () => clearInterval(t);
      container.append(
        el('div.canvas-stage', { style: { flexDirection: 'column', gap: '12px', padding: '32px' } }, nowEl, status),
        el('div.row', { style: { marginTop: '16px', gap: '10px' } },
          alarmIn,
          el('button.btn.btn-accent', {
            html: `${icon('clock', 16)} Set alarm`,
            onclick: () => {
              if (!alarmIn.value) return toast('Pick a time first', 'info');
              alarmTime = alarmIn.value;
              status.textContent = `Alarm set for ${alarmTime}. Keep this tab open.`;
              toast(`Alarm set for ${alarmTime}`);
            },
          }),
          el('button.btn.btn-soft', {
            html: 'Clear',
            onclick: () => { alarmTime = null; status.textContent = 'No alarm set.'; },
          }),
        ),
      );
      tickClock();
    },
  },

  'pdf-watermark': {
    mount(container) {
      let file = null;
      const textIn = el('input.input', { value: 'CONFIDENTIAL' });
      const sizeIn = el('input.input', { type: 'number', value: 28 });
      const colorIn = el('input.input', { type: 'color', value: '#DE5D35', style: { padding: '6px', height: '50px' } });
      const opacityIn = el('input.range', { type: 'range', min: 10, max: 80, value: 28 });
      const zone = dropZone({ accept: '.pdf', hint: 'Drop a PDF to watermark', onFiles: (files) => { file = files[0]; toast(`${file.name} ready`); } });
      container.append(zone,
        el('div.grid.grid-2', { style: { gap: '12px', marginTop: '14px' } },
          el('div.field', el('label.field-label', { text: 'Watermark text' }), textIn),
          el('div.field', el('label.field-label', { text: 'Font size' }), sizeIn),
          el('div.field', el('label.field-label', { text: 'Colour' }), colorIn),
          el('div.field', el('label.field-label', { text: 'Opacity' }), opacityIn),
        ),
        el('div.tool-actions', { style: { marginTop: '12px' } },
          el('button.btn.btn-accent', { html: `${icon('file', 16)} Add watermark`, onclick: async () => {
            if (!file) return toast('Choose a PDF first', 'info');
            try {
              await loadScript(PDFLIB);
              const { PDFDocument, rgb, degrees, StandardFonts } = window.PDFLib;
              const pdf = await PDFDocument.load(await readFileAs(file, 'buffer'), { ignoreEncryption: true });
              const font = await pdf.embedFont(StandardFonts.HelveticaBold);
              const hex = colorIn.value.replace('#', '');
              const color = rgb(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255);
              pdf.getPages().forEach((page) => {
                const { width, height } = page.getSize();
                page.drawText(textIn.value || 'CONFIDENTIAL', {
                  x: width * 0.15,
                  y: height * 0.5,
                  size: Number(sizeIn.value || 28),
                  rotate: degrees(35),
                  opacity: Number(opacityIn.value || 28) / 100,
                  color,
                  font,
                });
              });
              downloadFile('watermarked.pdf', new Blob([await pdf.save()], { type: 'application/pdf' }));
              toast('Watermarked PDF downloaded');
            } catch (error) {
              toast(`Watermark failed: ${error.message}`, 'x');
            }
          } }),
        ));
    },
  },

  'pdf-page-numbers': {
    mount(container) {
      let file = null;
      const prefixIn = el('input.input', { value: 'Page ' });
      const sizeIn = el('input.input', { type: 'number', value: 12 });
      const posIn = el('select.select');
      [['bottom-right', 'Bottom right'], ['bottom-center', 'Bottom center'], ['top-right', 'Top right']].forEach(([value, label]) => posIn.append(el('option', { value, text: label })));
      const zone = dropZone({ accept: '.pdf', hint: 'Drop a PDF to number', onFiles: (files) => { file = files[0]; toast(`${file.name} ready`); } });
      container.append(zone,
        el('div.grid.grid-2', { style: { gap: '12px', marginTop: '14px' } },
          el('div.field', el('label.field-label', { text: 'Prefix' }), prefixIn),
          el('div.field', el('label.field-label', { text: 'Position' }), posIn),
          el('div.field', el('label.field-label', { text: 'Font size' }), sizeIn),
        ),
        el('div.tool-actions', { style: { marginTop: '12px' } },
          el('button.btn.btn-accent', { html: `${icon('hash', 16)} Add page numbers`, onclick: async () => {
            if (!file) return toast('Choose a PDF first', 'info');
            try {
              await loadScript(PDFLIB);
              const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
              const pdf = await PDFDocument.load(await readFileAs(file, 'buffer'), { ignoreEncryption: true });
              const font = await pdf.embedFont(StandardFonts.Helvetica);
              pdf.getPages().forEach((page, index, arr) => {
                const label = `${prefixIn.value || 'Page '}${index + 1} / ${arr.length}`;
                const size = Number(sizeIn.value || 12);
                const width = font.widthOfTextAtSize(label, size);
                const { width: pageW, height: pageH } = page.getSize();
                let x = pageW - width - 28; let y = 22;
                if (posIn.value === 'bottom-center') x = (pageW - width) / 2;
                if (posIn.value === 'top-right') y = pageH - 28;
                page.drawText(label, { x, y, size, font, color: rgb(0.25, 0.25, 0.25) });
              });
              downloadFile('page-numbers.pdf', new Blob([await pdf.save()], { type: 'application/pdf' }));
              toast('Page-numbered PDF downloaded');
            } catch (error) {
              toast(`Numbering failed: ${error.message}`, 'x');
            }
          } }),
        ));
    },
  },

  'qr-batch-generator': {
    mount(container) {
      const linesIn = el('textarea.textarea', { rows: 8, placeholder: 'One item per line', value: 'https://psdkit.pro\nHello from PSDKIT\nhttps://example.com/docs' });
      const sizeIn = el('input.input', { type: 'number', value: 180 });
      const sheetHost = el('div');
      container.append(
        el('div.field', el('label.field-label', { text: 'Items' }), linesIn, el('div.field-hint', { text: 'Each non-empty line becomes its own QR code.' })),
        el('div.field', el('label.field-label', { text: 'QR size (px)' }), sizeIn),
        el('div.tool-actions',
          el('button.btn.btn-accent', { html: `${icon('qr', 16)} Generate batch`, onclick: async () => {
            const items = linesIn.value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
            if (!items.length) return toast('Add at least one line', 'info');
            await loadScript(QR_LIB);
            sheetHost.innerHTML = '';
            const urls = await Promise.all(items.map((value) => new Promise((resolve, reject) => window.QRCode.toDataURL(value, { width: Number(sizeIn.value || 180), margin: 1 }, (err, url) => err ? reject(err) : resolve({ value, url })))));
            const canvas = document.createElement('canvas');
            const cols = 2;
            const card = Number(sizeIn.value || 180) + 40;
            const rows = Math.ceil(urls.length / cols);
            canvas.width = cols * card;
            canvas.height = rows * card;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FAF7F2';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            for (const [index, item] of urls.entries()) {
              const img = new Image();
              await new Promise((resolve) => { img.onload = resolve; img.src = item.url; });
              const x = (index % cols) * card + 14;
              const y = Math.floor(index / cols) * card + 14;
              ctx.drawImage(img, x, y, Number(sizeIn.value || 180), Number(sizeIn.value || 180));
              ctx.fillStyle = '#161514';
              ctx.font = '12px sans-serif';
              ctx.fillText(item.value.slice(0, 24), x, y + Number(sizeIn.value || 180) + 16);
            }
            const sheetUrl = canvas.toDataURL('image/png');
            sheetHost.append(el('div.card',
              el('img', { src: sheetUrl, alt: 'QR batch sheet', style: { borderRadius: '14px', border: '1px solid var(--cream-line)' } }),
              el('div.tool-actions.mt-2',
                el('a.btn.btn-accent', { href: sheetUrl, download: 'qr-batch-sheet.png', html: `${icon('download', 16)} Download sheet` }),
                ...urls.map((item, index) => el('a.btn.btn-soft.btn-sm', { href: item.url, download: `qr-${index + 1}.png`, text: `QR ${index + 1}` })),
              ),
            ));
          } }),
        ),
        el('div.mt-3', sheetHost),
      );
    },
  },

  'image-colour-extractor': {
    mount(container) {
      let file = null;
      const host = el('div.grid.grid-3');
      const zone = dropZone({ accept: 'image/*', hint: 'Drop a photo to extract colours', onFiles: async (files) => { file = files[0]; render(); } });
      async function render() {
        if (!file) return;
        const img = await loadImage(file);
        const canvas = document.createElement('canvas');
        canvas.width = 80; canvas.height = Math.max(1, Math.round((img.height / img.width) * 80));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const buckets = new Map();
        for (let i = 0; i < data.length; i += 4) {
          const r = Math.round(data[i] / 32) * 32;
          const g = Math.round(data[i + 1] / 32) * 32;
          const b = Math.round(data[i + 2] / 32) * 32;
          const hex = '#' + [r, g, b].map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')).join('');
          buckets.set(hex, (buckets.get(hex) || 0) + 1);
        }
        const palette = [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([hex]) => hex);
        host.innerHTML = '';
        palette.forEach((hex) => host.append(el('button.card.card-hover', { onclick: () => copyText(hex) },
          el('div', { style: { height: '72px', borderRadius: '14px', background: hex, marginBottom: '12px' } }),
          el('div', { style: { fontWeight: 800 }, text: hex }),
          el('div.field-hint', { text: 'Click to copy' }),
        )));
      }
      container.append(zone, el('div.mt-3', host));
    },
  },

  'vcard-qr-generator': {
    fields: [
      { id: 'name', label: 'Full name', type: 'text', default: 'Priya Sharma' },
      { id: 'org', label: 'Company', type: 'text', default: 'PSDKIT Pro', half: true },
      { id: 'phone', label: 'Phone', type: 'text', default: '+91 98765 43210', half: true },
      { id: 'email', label: 'Email', type: 'text', default: 'hello@example.com', half: true },
      { id: 'title', label: 'Job title', type: 'text', default: 'Product Designer', half: true },
      { id: 'url', label: 'Website', type: 'text', default: 'https://psdkit.pro' },
    ],
    live: false,
    buttonLabel: 'Generate contact QR',
    async compute(v) {
      await loadScript(QR_LIB);
      const card = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${v.name || ''}`, `ORG:${v.org || ''}`, `TITLE:${v.title || ''}`, `TEL:${v.phone || ''}`, `EMAIL:${v.email || ''}`, `URL:${v.url || ''}`, 'END:VCARD'].join('\n');
      const dataUrl = await new Promise((resolve, reject) => window.QRCode.toDataURL(card, { width: 320, margin: 2 }, (err, url) => err ? reject(err) : resolve(url)));
      return {
        title: 'vCard QR',
        html: `<div style="display:flex;flex-direction:column;align-items:center;gap:12px"><img src="${dataUrl}" alt="vCard QR" style="width:min(320px,100%);border-radius:16px;border:1px solid var(--cream-line)"><a class="copy-btn" href="${dataUrl}" download="vcard-qr.png">${icon('download', 13)} Download PNG</a></div>`,
        copy: card,
      };
    },
  },
};
