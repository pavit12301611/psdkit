import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TOOLS, CATEGORIES } from '../src/data/catalog.js';
import { LANGUAGE_GUIDES } from '../src/data/guides.js';

/* The deployment this site actually answers on. It used to point at
   psdkit-pro.vercel.app, which 404s (DEPLOYMENT_NOT_FOUND) and told every
   crawler the whole toolkit was gone. Keep this in step with the Vercel
   project and public/robots.txt. */
const SITE = 'https://psdkit.vercel.app';
const publicDir = resolve(process.cwd(), 'public');
const today = new Date().toISOString().slice(0, 10);

const routes = new Set([
  '#/',
  '#/tools',
  '#/tools/community',
  '#/learn',
  '#/glossary',
  '#/community',
  '#/community/add',
  '#/signin',
  '#/profile',
  '#/admin',
  '#/help',
]);

CATEGORIES.forEach((category) => routes.add(`#/tools/${category.id}`));
TOOLS.forEach((tool) => routes.add(`#/tool/${tool.id}`));
LANGUAGE_GUIDES.forEach((guide) => routes.add(`#/learn/${guide.id}`));

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...routes].map((route) => `  <url><loc>${SITE}/${route}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>`;

writeFileSync(resolve(publicDir, 'sitemap.xml'), xml);
writeFileSync(resolve(publicDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`Generated sitemap with ${routes.size} URLs`);
