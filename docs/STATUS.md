# Project status - where things are up to

Last updated: 20 October 2026 (commit 74aad0e). Keep this file current: update it whenever a
piece of work ships or a decision is made, so a new session (or a new developer) can pick up
without the chat history. CLAUDE.md explains *how the code works*; this file says *what state
the project is in*.

## People and places

- **Developer**: James Davey, TheWebShed (www.thewebshed.net), Adelaide. Git author "James Davey".
- **Client**: Chris Barron Engineering (CBE), Adelaide truck bull bar maker. **Heather** is the
  office admin and the only person at CBE who will touch the website (non-technical; everything
  for her is written in plain words). A previous IT contact holds the registrar/DNS/hosting logins.
- **Live site (Netlify)**: https://chris-barron-engineering.netlify.app (site id
  0097b08c-08ac-4470-856b-a1d44c525b51). Production domain will be **www.custombullbars.com.au**
  with chrisbarronengineering.com.au as a redirect alias - *not cut over yet*, both still point at
  the old hosts.
- **Repo**: https://github.com/iCamv1/cbe-website (public, branch `main`). Every push deploys.
- **Catalogue admin**: https://chris-barron-engineering.netlify.app/admin (passcode, branded as
  TheWebShed "Site Manager"); developer editor at /admin/advanced (Sveltia, GitHub login).
- **Master folder on this PC**: `C:\Users\User\Desktop\CBE Master\` - `README - PROJECT NOTES.md`
  (numbered change log, items 1-17), `guides\` (admin guide, domain handover, audit, Lighthouse
  before/after, setup, notes for Heather), `website-source (snapshot 2026-10-19)\` (a clone of the
  repo; `git pull` it after each push), `original-images-backup\`.

## What is done (all live)

1. Full rebuild of the old Joomla site as a static site: home, bull-bar finder, about, quality,
   contact, 404. 15 makes / 86 models / 595 products in `content/` JSON.
2. Catalogue CMS: passcode-protected `/admin` that commits to GitHub through a Netlify function;
   Sveltia at `/admin/advanced`. Add/edit/delete and photo upload (resized to WebP in-browser).
3. Design pass: Archivo + Source Sans 3, SVG icons, WebGL hero sheen (`fx.js`, deferred to
   load+idle), cursor spotlight on cards, finder-first mobile hero, sticky mobile finder button.
4. Finder "premium" pass: staggered results, sticky results bar with brand logo and count-up,
   model-step nudge, skeleton images, lightbox with prev/next/keys/swipe, brand logo pills.
5. Redirects: `scripts/build-redirects.js` generates `_redirects` (238 rules) covering every old
   custombullbars.com.au URL found by crawling the old site (401 pages); old photo pages deep-link
   into the finder lightbox with `?p=<hash>`. Verified with curl (301 + correct Location).
6. Speed pass (Lighthouse 13.5, phone, simulated 4G): Home 76 -> 87, Finder -> 82 (the 121-bar
   Volvo grid 77); accessibility / best practices / SEO all 100. Remaining ~3s FCP is the simulated
   network floor. Report: `CBE Master\guides\Lighthouse BEFORE/AFTER speed pass - Home/Finder (phone).html`.
   Finder photos go through Netlify Image CDN (`cdnImg()`), heroes are WebP with 1280/768 variants.
7. Footer: brands are one compact strip (`.footer-makes`) instead of a tall column.
8. Admin rebrand: TheWebShed "Site Manager" shell (login + slim top bar) around the CBE catalogue.
   No functional change; Heather's guide still applies.
9. WhatsApp removed everywhere (floating bubble on home/about, card on contact). Phone and mobile remain.

## Open items (nothing in progress right now)

Needs the user / client, roughly in priority order:

- **Quote form**: do a live test submission on /contact and confirm the Netlify Forms email
  arrives at admin@chrisbarronengineering.com.au; add spam protection (honeypot is in place,
  consider Netlify reCAPTCHA if junk arrives).
- **Admin dry run**: James does a live add -> edit -> delete in /admin, then gives Heather the
  passcode *by phone* (never written down in the repo or chat).
- **Domain cutover**: add www.custombullbars.com.au as Netlify primary domain and
  chrisbarronengineering.com.au as alias (user types domains in Netlify UI; a certificate lock was
  blocking the alias last time). Then the IT contact changes only the www/apex records (never MX/TXT -
  email lives on those hosts). Handover brief: `docs/SETUP.md` step 6 and the guide in CBE Master.
  Verify HTTPS and the old-URL redirects on the real domain afterwards.
- **Old hosting**: confirm no mailboxes live on SiteGround before cancelling it.
- **Search Console**: verify the real domain, submit `sitemap.xml`.
- **Social**: update the website link on CBE's Facebook/Instagram; add social links to the footer
  once Heather supplies them.
- **Analytics** (Netlify Analytics or a lightweight script), Google Business Profile tidy-up,
  testimonials.
- **Legal/content**: privacy page, ABN in the footer, ownership note; content from Heather (a
  proper hero photo or video, brand logos, real numbers, testimonials).

Superseded: inviting Heather's GitHub account as a collaborator is no longer needed - the simple
`/admin` uses a passcode, not GitHub.

## Decisions worth remembering

- custombullbars.com.au is the production domain because Google has indexed it for years;
  canonicals, sitemap and og:image already point at it.
- Header/footer/nav markup is duplicated across the six pages on purpose (no templating); change
  all six together. A new make also needs the nav dropdown, footer strip and home brand strip.
- `_redirects` and `data.js` are generated; edit `scripts/build-redirects.js` / `content/`, not the output.
- Secrets (ADMIN_PASSCODE, GITHUB_TOKEN, OAuth client secret) exist only in Netlify env vars and
  are typed by James, never by Claude and never in the repo.
- After any change: `node scripts/build.js`, commit, push, confirm live with curl, then add a
  numbered item to `CBE Master\README - PROJECT NOTES.md` and `git pull` the snapshot folder.
