#!/usr/bin/env node
/**
 * Full site build (what Netlify runs on every commit):
 *   1. regenerate data.js from /content
 *   2. assemble the publishable site into /dist
 *
 * Only Node built-ins are used, so there is no npm install step.
 *   node scripts/build.js
 */
const fs = require('fs');
const path = require('path');
const { writeDataJs } = require('./build-data');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const PUBLISH = [
  'index.html', 'bull-bars.html', 'about.html', 'contact.html', 'quality.html', '404.html',
  'style.css', 'main.js', 'data.js',
  'robots.txt', 'sitemap.xml', '_headers', '_redirects',
  'favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'site.webmanifest',
  'images', 'admin',
];

const { warnings } = writeDataJs();

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

let copied = 0;
for (const item of PUBLISH) {
  const src = path.join(ROOT, item);
  if (!fs.existsSync(src)) continue;
  fs.cpSync(src, path.join(DIST, item), { recursive: true });
  copied++;
}

console.log(`dist/ assembled (${copied} items)`);
if (warnings.length) {
  console.warn(`${warnings.length} content warning(s) above - those entries were left out of the site.`);
}
