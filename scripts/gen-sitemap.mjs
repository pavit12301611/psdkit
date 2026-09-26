import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TOOLS, CATEGORIES } from '../src/data/catalog.js';
import { LANGUAGE_GUIDES } from '../src/data/guides.js';

const SITE = 'https://psdkit-pro.vercel.app';
const publicDir = resolve(process.cwd(), 'public');
const today = new Date().toISOString().slice(0, 10);

const routes = new Set([
  '#/',
  '#/tools',
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
