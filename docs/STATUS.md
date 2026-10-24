# Project status - where things are up to

Last updated: 24 October 2026 (audit, Netlify domains, revised domain handover). Keep this file current: update it whenever a
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
- **Master folder on this PC**: `C:\Users\User\Desktop\The WebShed\CBE Master\` (since 20 Oct 2026;
  the old `Desktop\CBE Master\` copy is a stale archive) - `README - PROJECT NOTES.md`
  (numbered change log, items 1-19), `guides\` (admin guide, domain handover, audit, Lighthouse
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
   network floor. Reports: the four "Lighthouse BEFORE / AFTER speed pass - Home / Finder (phone).html"
   files in `CBE Master\guides\`.
   Finder photos go through Netlify Image CDN (`cdnImg()`), heroes are WebP with 1280/768 variants.
7. Footer: brands are one compact strip (`.footer-makes`) instead of a tall column.
8. Admin rebrand: TheWebShed "Site Manager" shell (login + slim top bar) around the CBE catalogue.
   No functional change; Heather's guide still applies.
9. WhatsApp removed everywhere (floating bubble on home/about, card on contact). Phone and mobile remain.

## Open items (nothing in progress right now)

Needs the user / client, roughly in priority order:

- **Quote form**: the Netlify side was checked 24 Oct 2026 (form `quote-request` detected, email
  notification for any form -> admin@chrisbarronengineering.com.au, no submissions yet). Still to do: a
  live test submission on /contact confirming the email arrives; add spam protection (honeypot is in place,
  consider Netlify reCAPTCHA if junk arrives).
- **Admin dry run**: James does a live add -> edit -> delete in /admin, then gives Heather the
  passcode *by phone* (never written down in the repo or chat).
- **Domain cutover** (updated 24 Oct 2026):
  - Netlify side is done: all four hostnames (both domains, bare and www) are on the site, all
    "Pending DNS verification". Netlify DNS deliberately not set up.
  - **Mail trap**: on both domains the MX record is the bare domain itself (and
    `mail.chrisbarronengineering.com.au` is a CNAME to it), so moving the apex A record alone would
    break CBE's email. The handover was revised 24 Oct 2026: the IT contact first points MX at
    `mail.<domain>` (an A record to the old server), tests mail, and only then moves www/apex. The
    19 Oct version, which said to leave MX alone, went to Heather to forward. On 24 Oct James
    emailed Heather ("Quick one about the website domains") to ignore it and send the contact of
    whoever looks after the domains/hosting; James will ask them for manager access (SiteGround
    collaborator etc.) and do the cutover himself, using the revised handover as the checklist.
  - After DNS moves: set `www.custombullbars.com.au` as primary in Netlify (blocked until then by a
    certificate-provisioning lock), confirm HTTPS on all four, re-check MX still resolves to the old
    servers, curl the old-URL redirects on the real domain.
  - Details: `docs/SETUP.md` section 6 and `CBE Domain Handover` in `CBE Master\guides\`.
- **Contact page accessibility/speed** (audit 24 Oct 2026, Lighthouse phone): Contact scores
  perf 64 / a11y 91. Fix: contact-card `<strong>` labels #5a6070 on #161a23 (contrast 2.77), Google
  Maps iframe has no `title`, an `h3` skips a heading level; hero is a CSS background without
  priority and the Maps embed is ~600 KB (a click-to-load static map would fix most of it).
  Home 99/100/100/100, Finder (Volvo FH) 88/100/100/100.
- **Smaller audit notes (24 Oct 2026)**: `/api/login` has only a 600 ms delay, no lockout, so the
  passcode must be long; `.reveal` content and the stat counters are invisible / "0+" with JS off;
  no Content-Security-Policy header.
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
