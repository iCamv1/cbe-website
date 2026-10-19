# CBE website - developer setup (one-time)

Everything in the repo is ready. These are the steps that can only be done in the
GitHub / Netlify dashboards. Allow about 30 minutes.

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
2. Choose GitHub -> authorise the Netlify GitHub app for the `thewebshed` account (grant it access to `cbe-website`).
3. Build settings are read from `netlify.toml` automatically. Confirm they show:
   - Build command: `node scripts/build.js`
   - Publish directory: `dist`
   - Branch: `main`
4. Trigger a deploy (**Deploys -> Trigger deploy**). The first build takes ~1-2 minutes. Check the site still looks right.

From now on `deploy.bat` is only a fallback. The old hard-coded Netlify token was already revoked (the API returned "Unauthorized") and has been removed from the file.

## 3. GitHub login for the admin (Netlify OAuth provider)

1. GitHub -> **Settings -> Developer settings -> OAuth Apps -> New OAuth App**
   (https://github.com/settings/developers). Create it under the `thewebshed` account (or an org).
   - Application name: `CBE Website Admin`
   - Homepage URL: `https://chris-barron-engineering.netlify.app`
   - Authorization callback URL: **`https://api.netlify.com/auth/done`**
2. Copy the **Client ID**, then **Generate a new client secret** and copy it (shown once).
3. Netlify -> site -> **Site configuration -> Security -> OAuth -> Authentication providers -> Install provider -> GitHub**. Paste the Client ID and secret. Save.
   (Do **not** use the "Identity" section - that is the deprecated path.)
4. Open https://chris-barron-engineering.netlify.app/admin/ -> **Sign in with GitHub**. You should land in the admin with "Bull Bars & Products", "Truck Models" and "Makes".

## 4. Give the CBE admin access

1. Have her create a free GitHub account (e.g. with `admin@chrisbarronengineering.com.au`). Two-factor via the GitHub mobile app or SMS is fine.
2. GitHub -> `iCamv1/cbe-website` -> **Settings -> Collaborators -> Add people** -> her username -> role **Write**. She accepts the email invitation.
3. Send her `docs/ADMIN-GUIDE.md` (also published as a web page - see the hand-over message) and the admin link.

That's the only account she needs. Her saves show up as commits authored by her, so there is a full history and any change can be reverted from GitHub.

## 5. Contact form (Netlify Forms)

The quote form on `/contact` is now a real Netlify form (`name="quote-request"`, honeypot `bot-field`).

1. Netlify -> site -> **Forms -> Enable form detection**, then trigger one more deploy so Netlify registers the form.
2. **Forms -> quote-request -> Settings & usage -> Form notifications -> Add notification -> Email notification** -> `admin@chrisbarronengineering.com.au` (add a second address for yourself while testing).
3. Submit a test from the live site. It appears under **Forms** and the email arrives within a minute.

Free tier: 100 submissions/month, which is plenty for a quote form.

## 6. Custom domain (when CBE is ready to switch from the old site)

Canonical URLs, sitemap and robots already point at `https://www.chrisbarronengineering.com.au`.
Netlify -> **Domain management -> Add a domain**, then update DNS at the registrar (CNAME `www` -> the Netlify site, A/ALIAS apex -> Netlify's load balancer as shown in the dashboard). HTTPS is automatic. Keep `www` as the primary.

## Day-to-day for you

- Code changes: edit, `node scripts/build.js`, preview with `npx serve dist`, commit, push. Netlify deploys.
- Pull before editing content locally - the admin's commits land on `main` too.
- If a build fails, the Netlify deploy log shows `! product "..." points at unknown model "..."` style warnings from `scripts/build-data.js`.
- To change CMS fields/labels: `admin/config.yml` (docs: https://sveltiacms.app/en/docs/). To update the CMS version: the pinned `@sveltia/cms@x.y.z` in `admin/index.html`.
