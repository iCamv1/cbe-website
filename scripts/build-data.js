#!/usr/bin/env node
/**
 * Builds data.js (window.CBE_BULL_BARS) from the CMS content files in /content.
 *
 *   content/makes/<make>.json              { label, order }
 *   content/models/<make>--<model>.json    { make, label, name, order }
 *   content/products/<anything>.json       { title, model, image, description, order }
 *
 * The file name (minus .json) is the key/slug Sveltia CMS writes, and it is what the
 * website uses in URLs (?make=volvo&model=fh). Nothing here needs npm packages.
 *
 * Run directly:  node scripts/build-data.js
 * Or require():  const { buildData, writeDataJs } = require('./build-data');
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');

function readJsonDir(dir) {
  const full = path.join(CONTENT, dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const slug = f.replace(/\.json$/, '');
      try {
        return { slug, ...JSON.parse(fs.readFileSync(path.join(full, f), 'utf8')) };
      } catch (e) {
        console.warn(`! Skipping ${dir}/${f}: ${e.message}`);
        return null;
      }
    })
    .filter(Boolean);
}

const byOrder = (a, b) =>
  (a.order ?? 9999) - (b.order ?? 9999) ||
  String(a.label || a.title || '').localeCompare(String(b.label || b.title || ''), 'en', { numeric: true });

// Site HTML lives at the root, so paths are stored relative ("images/...") to work
// both on Netlify and when the HTML files are opened straight from disk.
const relImage = p => String(p || '').replace(/^\/+/, '');

function buildData() {
  const makes = readJsonDir('makes');
  const models = readJsonDir('models');
  const products = readJsonDir('products');
  const warnings = [];

  const makeMap = new Map();
  for (const m of makes) {
    makeMap.set(m.slug, { key: m.slug, label: m.label || m.slug, order: m.order, models: [], _modelMap: new Map() });
  }

  for (const m of models) {
    const make = makeMap.get(m.make);
    if (!make) { warnings.push(`model "${m.slug}" points at unknown make "${m.make}"`); continue; }
    const key = m.slug.startsWith(m.make + '--') ? m.slug.slice(m.make.length + 2) : m.slug;
    const model = { key, label: m.label || key, order: m.order, products: [] };
    make.models.push(model);
    make._modelMap.set(m.slug, model);
  }

  const modelLookup = new Map();
  for (const make of makeMap.values()) for (const [slug, model] of make._modelMap) modelLookup.set(slug, model);

  for (const p of products) {
    const model = modelLookup.get(p.model);
    if (!model) { warnings.push(`product "${p.slug}" points at unknown model "${p.model}"`); continue; }
    if (!p.title) { warnings.push(`product "${p.slug}" has no title`); continue; }
    model.products.push({
      title: String(p.title).trim(),
      img: relImage(p.image),
      desc: String(p.description || '').trim(),
      order: p.order,
    });
  }

  const out = [...makeMap.values()].sort(byOrder).map(make => ({
    key: make.key,
    label: make.label,
    models: make.models.sort(byOrder).map(model => ({
      key: model.key,
      label: model.label,
      products: model.products.sort(byOrder).map(({ title, img, desc }) => ({ title, img, desc })),
    })),
  }));

  return { data: out, warnings, counts: { makes: makes.length, models: models.length, products: products.length } };
}

function writeDataJs(dest = path.join(ROOT, 'data.js')) {
  const { data, warnings, counts } = buildData();
  const header = '// GENERATED FILE - do not edit by hand.\n' +
    '// Built by scripts/build-data.js from the JSON files in /content (edited via /admin).\n';
  fs.writeFileSync(dest, header + 'window.CBE_BULL_BARS = ' + JSON.stringify(data, null, 2) + ';\n');
  const productTotal = data.reduce((n, b) => n + b.models.reduce((m, x) => m + x.products.length, 0), 0);
  console.log(`data.js written: ${data.length} makes, ${counts.models} models, ${productTotal} products`);
  for (const w of warnings) console.warn('! ' + w);
  return { data, warnings };
}

/**
 * Snapshot for the /admin page: the same content, but keyed by file slug so the
 * admin can edit/delete the right file. Written to dist/admin/catalogue.json.
 */
function writeCatalogueJson(dest) {
  const makes = readJsonDir('makes').map(m => ({ slug: m.slug, label: m.label || m.slug, order: m.order ?? null }));
  const models = readJsonDir('models').map(m => ({ slug: m.slug, make: m.make, label: m.label || '', name: m.name || m.label || m.slug, order: m.order ?? null }));
  const products = readJsonDir('products').map(p => ({
    slug: p.slug, title: p.title || '', model: p.model || '', image: p.image || '',
    description: p.description || '', order: p.order ?? null, updated: p.updated || null,
  }));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify({ generated: new Date().toISOString(), makes, models, products }));
  console.log(`catalogue.json written (${products.length} products)`);
}

module.exports = { buildData, writeDataJs, writeCatalogueJson };

if (require.main === module) writeDataJs();
