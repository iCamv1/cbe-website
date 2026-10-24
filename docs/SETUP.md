# CBE website - developer setup (one-time)

**Status 19 Oct 2026: steps 1-3 and 5 are DONE.** Repo lives at github.com/iCamv1/cbe-website
(transferred from thewebshed, whose recovery email is no longer accessible; thewebshed keeps push
access as a collaborator so this PC's GitHub CLI still works). Netlify deploys from it, the GitHub
OAuth app "CBE Website Admin" (owned by iCamv1) is installed on Netlify, form detection is on and
submissions email admin@chrisbarronengineering.com.au. The repo was made **public** on 19 Oct 2026 because Netlify's free plan blocks builds on private repos from any Git contributor it does not recognise (it kept rejecting commits even after linking iCamv1); it holds only the public website files and catalogue, never secrets. Commits from this PC are authored as the iCamv1 email (`git config --local user.email`). Only step 6 (custom domain) remains. The rest of this file is kept for reference / rebuilding.

## 0. What you end up with

```
Admin (/admin)  ->  commits JSON to GitHub  ->  Netlify builds  ->  live site
                    (iCamv1/cbe-website)    (node scripts/build.js)
```

- Site: https://chris-barron-engineering.netlify.app (Netlify site id `0097b08c-08ac-4470-856b-a1d44c525b51`)
- Admin: https://chris-barron-engineering.netlify.app/admin/
- CMS: Sveltia CMS (Decap/Netlify-CMS compatible), GitHub backend, login via Netlify's OAuth provider.
- Users sign in with a **GitHub account that has write access to the repo**. No Netlify Identity / Git Gateway (Git Gateway is deprecated by Netlify and Sveltia doesn't support it).

## 1. GitHub repository

If the repo was created for you (`iCamv1/cbe-website`, private) skip to step 2. Otherwise:

```
cd "cbe-website-v2"
git init -b main && git add -A && git commit -m "CBE website with Sveltia CMS"
gh repo create iCamv1/cbe-website --private --source . --push
```

If you use a different owner/name, change `backend.repo` in `admin/config.yml`.

## 2. Connect Netlify to the repo (continuous deployment)

1. Netlify dashboard -> the **chris-barron-engineering** site -> **Site configuration -> Build & deploy -> Continuous deployment -> Link repository**.
2. Choose GitHub -> authorise the Netlify GitHub app for the `iCamv1` account (grant it access to `cbe-website`).
3. Build settings are read from `netlify.toml` automatically. Confirm they show:
   - Build command: `node scripts/build.js`
   - Publish directory: `dist`
   - Branch: `main`
4. Trigger a deploy (**Deploys -> Trigger deploy**). The first build takes ~1-2 minutes. Check the site still looks right.

From now on `deploy.bat` is only a fallback. The old hard-coded Netlify token was already revoked (the API returned "Unauthorized") and has been removed from the file.

## 3a. The simple admin at /admin (what CBE staff use)

`admin/index.html` is a purpose-built, passcode-protected catalogue manager. It talks to the
Netlify Function in `netlify/functions/catalogue.js`, which commits to GitHub with a token that
only lives in Netlify's environment variables. Set these under **Site configuration -> Environment
variables** (scope: all, or Functions):

| Variable | Value |
|---|---|
| `GITHUB_TOKEN` | Fine-grained personal access token (GitHub -> Settings -> Developer settings -> Personal access tokens -> Fine-grained). Owner iCamv1, repository access **Only select repositories: cbe-website**, permission **Contents: Read and write**. Set the longest expiry you're comfortable with and diarise renewing it. |
| `GITHUB_REPO` | `iCamv1/cbe-website` |
| `GITHUB_BRANCH` | `main` |
| `ADMIN_PASSCODE` | The passcode CBE staff type in. Long and memorable (a short sentence works). Changing it signs everyone out within 30 days. |
| `SESSION_SECRET` | Optional random string; rotate it to sign everyone out immediately. |

After changing variables, trigger a deploy. `/api/config` reports `configured: true` when both the token and passcode are present; until then the admin shows a yellow "saving is not switched on" banner.

How it saves: one Git commit per save (photo + JSON together), photo resized to max 1600 px WebP in the browser, uploads land in `images/bull-bars/uploads/`. Deleting an entry also deletes its uploaded photo (never the original scraped photos). The admin reads `/admin/catalogue.json` (generated at build) and overlays unpublished saves from localStorage until the next deploy includes them.

## 3b. Advanced editor (/admin/advanced, Sveltia CMS, GitHub login)

1. GitHub -> **Settings -> Developer settings -> OAuth Apps -> New OAuth App**
   (https://github.com/settings/developers). Created under the `iCamv1` account.
   - Application name: `CBE Website Admin`
   - Homepage URL: `https://chris-barron-engineering.netlify.app`
   - Authorization callback URL: **`https://api.netlify.com/auth/done`**
2. Copy the **Client ID**, then **Generate a new client secret** and copy it (shown once).
3. Netlify -> site -> **Site configuration -> Security -> OAuth -> Authentication providers -> Install provider -> GitHub**. Paste the Client ID and secret. Save.
   (Do **not** use the "Identity" section - that is the deprecated path.)
4. Open https://chris-barron-engineering.netlify.app/admin/advanced/ -> **Sign in with GitHub**. You should land in Sveltia with "Bull Bars & Products", "Truck Models" and "Makes". (Done and verified 19 Oct 2026.)

## 4. Give the CBE admin access

She only needs the admin link and the passcode (see 3a). No GitHub account. Send her
`docs/ADMIN-GUIDE.md` (also published as a web page). If you ever want her in the advanced
editor instead, invite her GitHub account as a Write collaborator on iCamv1/cbe-website.

## 5. Contact form (Netlify Forms)

The quote form on `/contact` is now a real Netlify form (`name="quote-request"`, honeypot `bot-field`).

1. Netlify -> site -> **Forms -> Enable form detection**, then trigger one more deploy so Netlify registers the form.
2. **Forms -> quote-request -> Settings & usage -> Form notifications -> Add notification -> Email notification** -> `admin@chrisbarronengineering.com.au` (add a second address for yourself while testing).
3. Submit a test from the live site. It appears under **Forms** and the email arrives within a minute.

Free tier: 100 submissions/month, which is plenty for a quote form.

## 6. Custom domains (when CBE is ready to switch from the old site)

Two domains are involved. **Primary: www.custombullbars.com.au** (the old Joomla site on SiteGround, which Google has indexed for years; canonicals, sitemap and robots point here). **Alias: chrisbarronengineering.com.au** (today an 81-byte meta-refresh forwarder on a cPanel host at hostyourservices.net; its MX record points at that same host, so CBE's admin@ email lives there and that hosting must not be cancelled).

Netlify side (done 24 Oct 2026): `custombullbars.com.au`, `www.custombullbars.com.au`, `chrisbarronengineering.com.au` and `www.chrisbarronengineering.com.au` are all on the site; Netlify redirects every alias to the primary automatically. Netlify DNS was **not** set up and must not be (moving the nameservers would drop the mail records). The primary is still the bare `custombullbars.com.au`: switching it to `www.custombullbars.com.au` is blocked by a certificate-provisioning lock until DNS points at Netlify, so do it right after the cutover (Domain management -> www row -> Options -> Set as primary domain).

**Mail trap (found 24 Oct 2026):** on both domains the MX record is the bare domain itself, and `mail.chrisbarronengineering.com.au` is a CNAME to the bare domain. Repointing the apex A record alone would send CBE's email to Netlify. So the order at each DNS host is:

1. Mail first: MX -> `mail.<domain>`; on chrisbarronengineering make `mail` an A record to `110.232.143.37` (and any other CNAME to the apex an A record to that IP), add `ip4:110.232.143.37` to its SPF, and set cPanel Email Routing to Local Mail Exchanger. custombullbars' `mail.` is already an A record to 35.213.223.175 and its SPF already lists that IP. Wait out the TTL and test mail to admin@.
2. Then the website: `www` CNAME -> `chris-barron-engineering.netlify.app`, apex A -> `75.2.60.5`.

HTTPS is automatic once DNS points at Netlify. The full brief for the IT contact is the "CBE Domain Handover" page (revised 24 Oct 2026).

## Day-to-day for you

- Code changes: edit, `node scripts/build.js`, preview with `npx serve dist`, commit, push. Netlify deploys.
- Pull before editing content locally - the admin's commits land on `main` too.
- If a build fails, the Netlify deploy log shows `! product "..." points at unknown model "..."` style warnings from `scripts/build-data.js`.
- To change CMS fields/labels: `admin/config.yml` (docs: https://sveltiacms.app/en/docs/). To update the CMS version: the pinned `@sveltia/cms@x.y.z` in `admin/index.html`.
