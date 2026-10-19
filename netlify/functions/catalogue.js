/**
 * CBE Catalogue admin API (Netlify Function).
 *
 * The simple admin at /admin talks to this. It verifies a passcode, hands out a
 * signed session token, and writes catalogue changes to the GitHub repository as
 * single commits (JSON entry + optional photo). Netlify then rebuilds the site.
 *
 * Environment variables (Netlify > Site configuration > Environment variables):
 *   GITHUB_TOKEN     fine-grained PAT for the repo, "Contents: Read and write"
 *   GITHUB_REPO      owner/repo            (default iCamv1/cbe-website)
 *   GITHUB_BRANCH    branch                (default main)
 *   ADMIN_PASSCODE   the passcode CBE staff type in
 *   SESSION_SECRET   optional; random string used to sign sessions
 *
 * Routes (all under /api/, see netlify.toml):
 *   GET    /api/config            -> { configured }
 *   POST   /api/login             { passcode } -> { token }
 *   GET    /api/session           (Bearer token) -> { ok }
 *   POST   /api/product           (Bearer) create/update a bull bar
 *   DELETE /api/product           (Bearer) { slug, image }
 *   POST   /api/model             (Bearer) { make, label }
 */
const crypto = require('crypto');

const REPO = process.env.GITHUB_REPO || 'iCamv1/cbe-website';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN || '';
const PASSCODE = process.env.ADMIN_PASSCODE || '';
const SECRET = process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(PASSCODE + '|' + TOKEN + '|cbe').digest('hex');
const SESSION_DAYS = 30;
const UPLOAD_DIR = 'images/bull-bars/uploads';
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ── sessions ─────────────────────────────────────────────── */
const sign = exp => crypto.createHmac('sha256', SECRET).update(String(exp)).digest('hex');
const issueToken = () => { const exp = Date.now() + SESSION_DAYS * 864e5; return exp + '.' + sign(exp); };
function verifyToken(t) {
  if (!t) return false;
  const [exp, sig] = String(t).split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = sign(exp);
  return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good));
}
function safeEqual(a, b) {
  const A = Buffer.from(String(a)), B = Buffer.from(String(b));
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

/* ── GitHub ───────────────────────────────────────────────── */
async function gh(path, opts = {}) {
  const res = await fetch('https://api.github.com' + path, {
    method: opts.method || 'GET',
    headers: {
      Authorization: 'Bearer ' + TOKEN,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'cbe-catalogue-admin',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 404 && opts.allow404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub ${res.status} on ${path}: ${text.slice(0, 200)}`);
  }
  return res.status === 204 ? null : res.json();
}

/** One commit containing several file changes. files: [{ path, content | base64 | delete }] */
async function commitFiles(files, message) {
  const ref = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
  const headSha = ref.object.sha;
  const head = await gh(`/repos/${REPO}/git/commits/${headSha}`);
  const tree = [];
  for (const f of files) {
    if (f.delete) { tree.push({ path: f.path, mode: '100644', type: 'blob', sha: null }); continue; }
    const blob = await gh(`/repos/${REPO}/git/blobs`, {
      method: 'POST',
      body: f.base64 ? { content: f.base64, encoding: 'base64' } : { content: f.content, encoding: 'utf-8' },
    });
    tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const newTree = await gh(`/repos/${REPO}/git/trees`, { method: 'POST', body: { base_tree: head.tree.sha, tree } });
  const commit = await gh(`/repos/${REPO}/git/commits`, { method: 'POST', body: { message, tree: newTree.sha, parents: [headSha] } });
  await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: { sha: commit.sha } });
  return commit.sha;
}

async function readJsonFile(path) {
  const file = await gh(`/repos/${REPO}/contents/${path}?ref=${BRANCH}`, { allow404: true });
  if (!file) return null;
  return JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
}

/* ── validation ───────────────────────────────────────────── */
const slugify = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '')
  .trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const SLUG_RE = /^[a-z0-9-]+$/;
const MODEL_RE = /^[a-z0-9-]+--[a-z0-9-]+$/;
const PRODUCT_RE = /^[a-z0-9-]+--[a-z0-9-]+--[a-z0-9-]+$/;
const text = (v, max) => String(v == null ? '' : v).replace(/\r\n/g, '\n').trim().slice(0, max);

/* ── handler ──────────────────────────────────────────────── */
exports.handler = async (event) => {
  const route = event.path.split('/').filter(Boolean).pop();
  const method = event.httpMethod;
  let body = {};
  if (event.body) { try { body = JSON.parse(event.body); } catch { return json(400, { error: 'Bad JSON' }); } }

  if (route === 'config' && method === 'GET') {
    return json(200, { configured: Boolean(TOKEN && PASSCODE), repo: REPO, branch: BRANCH });
  }

  if (route === 'login' && method === 'POST') {
    if (!PASSCODE) return json(503, { error: 'The admin passcode has not been set up yet.' });
    if (!safeEqual(body.passcode || '', PASSCODE)) { await sleep(600); return json(401, { error: 'That passcode is not right.' }); }
    return json(200, { token: issueToken(), expiresInDays: SESSION_DAYS });
  }

  const auth = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '');
  if (!verifyToken(auth)) return json(401, { error: 'Please sign in again.' });
  if (!TOKEN) return json(503, { error: 'GITHUB_TOKEN is not set on Netlify, so changes cannot be saved yet.' });

  try {
    if (route === 'session' && method === 'GET') return json(200, { ok: true });

    if (route === 'product' && method === 'POST') {
      const title = text(body.title, 160);
      const model = text(body.model, 120);
      const description = text(body.description, 4000);
      const order = body.order === '' || body.order == null ? undefined : Number(body.order);
      if (!title) return json(400, { error: 'Please give the bull bar a title.' });
      if (!MODEL_RE.test(model)) return json(400, { error: 'Please choose a truck model.' });
      if (order !== undefined && !Number.isInteger(order)) return json(400, { error: 'Position must be a whole number.' });

      let slug = text(body.slug, 200);
      const isNew = !slug;
      if (isNew) slug = `${model}--${slugify(title) || 'bull-bar'}-${crypto.randomBytes(4).toString('hex')}`;
      if (!PRODUCT_RE.test(slug)) return json(400, { error: 'Invalid entry id.' });

      let image = text(body.image, 300).replace(/^\/+/, '');
      const files = [];
      if (body.upload && body.upload.data) {
        const data = String(body.upload.data);
        const bytes = Math.floor(data.length * 3 / 4);
        if (bytes > MAX_UPLOAD_BYTES) return json(413, { error: 'That photo is too large after resizing. Try a smaller one.' });
        const type = String(body.upload.type || '');
        const ext = type === 'image/webp' ? 'webp' : type === 'image/png' ? 'png' : 'jpg';
        image = `${UPLOAD_DIR}/${slug}-${Date.now().toString(36)}.${ext}`;
        files.push({ path: image, base64: data });
      }
      if (image && !/^images\/[\w./-]+$/.test(image)) return json(400, { error: 'Invalid image path.' });

      const updated = new Date().toISOString();
      const entry = { title, model, image: image ? '/' + image : '', description };
      if (order !== undefined) entry.order = order;
      entry.updated = updated;
      files.push({ path: `content/products/${slug}.json`, content: JSON.stringify(entry, null, 2) + '\n' });

      // tidy up a replaced upload
      const old = text(body.replacedImage, 300).replace(/^\/+/, '');
      if (old && old.startsWith(UPLOAD_DIR + '/') && old !== image) files.push({ path: old, delete: true });

      const sha = await commitFiles(files, `${isNew ? 'Add' : 'Update'} bull bar: ${title}`);
      return json(200, { slug, image: entry.image, updated, commit: sha, created: isNew });
    }

    if (route === 'product' && method === 'DELETE') {
      const slug = text(body.slug, 200);
      if (!PRODUCT_RE.test(slug)) return json(400, { error: 'Invalid entry id.' });
      const files = [{ path: `content/products/${slug}.json`, delete: true }];
      const image = text(body.image, 300).replace(/^\/+/, '');
      if (image.startsWith(UPLOAD_DIR + '/')) files.push({ path: image, delete: true });
      const sha = await commitFiles(files, `Delete bull bar: ${text(body.title, 120) || slug}`);
      return json(200, { deleted: slug, commit: sha });
    }

    if (route === 'model' && method === 'POST') {
      const make = text(body.make, 60);
      const label = text(body.label, 60);
      if (!SLUG_RE.test(make)) return json(400, { error: 'Please choose a make.' });
      if (!label) return json(400, { error: 'Please type the model name.' });
      const makeFile = await readJsonFile(`content/makes/${make}.json`);
      if (!makeFile) return json(400, { error: 'That make does not exist.' });
      const slug = `${make}--${slugify(label)}`;
      if (!MODEL_RE.test(slug)) return json(400, { error: 'Model name needs letters or numbers.' });
      if (await readJsonFile(`content/models/${slug}.json`)) return json(409, { error: 'That model already exists.' });
      const entry = { make, label, name: `${makeFile.label} ${label}` };
      await commitFiles([{ path: `content/models/${slug}.json`, content: JSON.stringify(entry, null, 2) + '\n' }], `Add truck model: ${entry.name}`);
      return json(200, { slug, ...entry });
    }

    return json(404, { error: 'Unknown route' });
  } catch (err) {
    console.error(err);
    return json(500, { error: 'Could not save to GitHub: ' + err.message });
  }
};
