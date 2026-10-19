# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static marketing + product-catalogue website for Chris Barron Engineering (CBE), an Adelaide truck bull bar manufacturer. Plain HTML/CSS/vanilla JS with **one small Node build step** (built-ins only, no npm install, no package.json, no tests).

## Workflow

- **Build**: `node scripts/build.js` regenerates `data.js` from `/content` and assembles the publishable site into `dist/`. `data.js` and `dist/` are git-ignored build output - never hand-edit `data.js`.
- **Preview locally**: run the build, then `npx serve dist` (extensionless links like `/bull-bars` need a server; opening the root `.html` files straight from disk also works for quick checks).
- **Deploy**: Netlify builds from the GitHub repo on every push to `main` (`netlify.toml` -> `node scripts/build.js`, publish `dist`). The catalogue admin at `/admin` commits to the same repo, so every CMS save is a deploy. `deploy.bat` is a manual fallback that uses `netlify login` (no tokens in the repo).
- `.netlify/state.json` only pins the site id for the CLI.

## Content model (the CMS)

The catalogue lives as one JSON file per entry under `/content`. Two editors write to it:

- **`/admin`** (`admin/index.html`, what CBE staff use): a single-page, passcode-protected catalogue manager, no framework. It loads `/admin/catalogue.json` (built by `scripts/build-data.js`), resizes photos to WebP in the browser, and calls `/api/*` -> `netlify/functions/catalogue.js`, which makes one Git commit per save using `GITHUB_TOKEN` / `ADMIN_PASSCODE` env vars on Netlify (see docs/SETUP.md 3a). Unpublished saves are overlaid from localStorage until the next deploy.
- **`/admin/advanced`** (Sveltia CMS, `admin/advanced/config.yml`, GitHub backend repo iCamv1/cbe-website, Netlify OAuth login): full editor for the developer.

```
content/makes/<make>.json            { label, order }
content/models/<make>--<model>.json  { make, label, name, order }
content/products/<...>.json          { title, model: "<make>--<model>", image, description, order }
```

File names are the slugs. `scripts/build-data.js` turns this into the global the pages read:

```
window.CBE_BULL_BARS = [ { key, label, models: [ { key, label, products: [ { title, img, desc } ] } ] } ]
```

Brand/model keys are the URL slugs (`?make=volvo&model=fh`). Image paths in content are stored with a leading slash (`/images/bull-bars/...`); the build strips it so pages work from disk too. New uploads go to `images/bull-bars/uploads/` as WebP (Sveltia resizes in the browser). Entries that point at a missing make/model are reported as build warnings and left out of the site.

When adding a **make**, also update the hand-built nav dropdown, footer links and home-page brand strip (duplicated across pages - update all of them together).

## Pages

Six standalone pages, each with its own `<head>`, inlined page-specific `<style>`, header, mobile nav and footer (the header/footer markup is **duplicated** across pages - update all together):

- `index.html` - home. Inline make/model search script at the bottom redirects to `bull-bars.html?make=X&model=Y`.
- `bull-bars.html` - the product finder. Inline search + lightbox script; **does not load `main.js`**. Handles `?make=&model=`, back/forward, keyboard-accessible cards.
- `about.html`, `contact.html`, `quality.html` - content pages; load `main.js` only (not `data.js`).
- `404.html` - Netlify serves it for unknown paths.

`main.js` = header scroll state, mobile nav, reveal/counter animations, finish-card links, back-to-top, and the **contact form** (Netlify Forms, AJAX submit with `/contact?sent=1` no-JS fallback). Form detection must be enabled in the Netlify UI for submissions to be stored/emailed.

## Conventions

- Nav links use extensionless paths (`/bull-bars`, `/about`); `netlify.toml` rewrites them and Netlify pretty URLs do too. JS-driven navigations use explicit `.html` + query string.
- Styling goes through `style.css` CSS custom properties (`--accent`, `--accent2`, `--bg`, `--surface`, `--text-muted`, ...). Reuse them; page-specific CSS is inlined in that page's `<head>`. Fonts load via `<link>` in each head (no `@import`).
- Data strings rendered into HTML in the inline scripts go through the local `escHtml` / `escAttr` helpers.
- Canonical URLs, sitemap and `og:image` point at `https://www.custombullbars.com.au` (the production domain Google has indexed for years; `chrisbarronengineering.com.au` is a redirect alias to it). The Netlify site is `chris-barron-engineering.netlify.app`.
- Product photos were batch-optimised (max 1600px, JPEG q80). Originals are in `_images-original/` (git-ignored) and a sibling backup folder.
- The finder loads catalogue photos through **Netlify Image CDN** (`/.netlify/images?url=...&w=...`, see `cdnImg()` in `bull-bars.html`) when served from a Netlify or production hostname, falling back to the raw file locally or on error. Hero photos are WebP with 1280/768px variants.
- `_redirects` is **generated** by `scripts/build-redirects.js` (old Joomla URLs from custombullbars.com.au -> new pages; photo pages deep-link with `?p=<hash>`). Edit the script, not the file.
- `fx.js` starts the WebGL sheen only after `load` + idle; keep it that way (the shader compile was the biggest blocking task on phones).

## Security notes

- No secrets in the repo. The old `deploy.bat` token was found revoked and removed; deploy via Netlify's GitHub integration or `netlify login`.
- `/admin` is `noindex`; the simple admin needs the passcode, the advanced one a GitHub account with write access. The GitHub token used by the function exists only in Netlify env vars.
