# LearnThenScroll website

The marketing site for the LearnThenScroll app, plus a private admin panel.

| URL | What it is |
| --- | --- |
| `/` | Homepage with the interactive app demo (`index.html`) |
| `/blog/` | SEO blog. Each post is a static page built from the database |
| `/admin/` | Admin panel: write posts, see download clicks, manage settings and team |

**Stack:** static HTML on **Vercel**. **Supabase** stores posts and settings, handles logins, and records clicks on the download buttons.

## How it works

1. You or an editor write a post in `/admin` and click **Publish**.
2. The admin calls `/api/deploy`, which triggers a Vercel rebuild.
3. `npm run build` (`scripts/build.mjs`) pulls the published posts and settings from Supabase and writes plain HTML into `dist/`. This includes the blog pages, sitemap, RSS feed and robots.txt.
4. About a minute later the new post is live. Google sees fast, fully rendered pages.

Clicks on the App Store / Google Play buttons anywhere on the site are recorded (page + store, nothing personal) and shown on the admin Overview.

### Roles
- **Admin:** everything, including Settings, Team, and deleting posts.
- **Editor:** for a hired writer. They can write, edit and publish posts, and see the Overview, but can't change settings or the team, or delete posts.

## How it appears on learnthenscroll.com
The main site is the `learnthenscroll` Vercel project (repo `nickzedw/Learnthenscroll`, production branch `website`). Its `vercel.json` rewrites `/blog/*`, `/admin/*`, `/api/*`, `/sitemap.xml` and `/robots.txt` to this project's custom domain `https://app.learnthenscroll.com`. Use the custom domain rather than `learnthenscroll-app.vercel.app`, because `.vercel.app` addresses sit behind Vercel's deployment protection and refuse proxied requests. This project's own `vercel.json` serves `/blog/<slug>` both with and without the trailing slash, because the proxy drops it. Visitors and Google see everything on learnthenscroll.com, while the blog code stays out of the app repo.

The homepage's App Store buttons post to `/api/click`, so their clicks also show on the admin Overview.

## One-time setup

### 1. Supabase (free tier)
1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor:** paste and run `supabase/schema.sql`, then `supabase/seed.sql` (the three starter posts).
3. **Authentication → Sign In / Providers → Email:** turn **off** "Allow new users to sign up". Only people you invite should get accounts.
4. **Authentication → URL Configuration:** set Site URL to `https://learnthenscroll.com` and add `https://learnthenscroll.com/admin/` to the Redirect URLs.
5. **Authentication → Users → Add user:** create your own login (email + password, tick "Auto confirm").
6. Make yourself the admin. In the SQL Editor run:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
7. **Project Settings → API:** copy the Project URL, the `anon` key and the `service_role` key for the next step.

### 2. Vercel
1. **Add New → Project:** import this GitHub repo. The settings in `vercel.json` are picked up automatically.
2. **Settings → Environment Variables:** add:
   | Name | Value |
   | --- | --- |
   | `SUPABASE_URL` | Supabase Project URL |
   | `SUPABASE_ANON_KEY` | Supabase `anon` key (public) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase `service_role` key (**secret**: only ever put it in Vercel) |
3. **Settings → Git → Deploy Hooks:** create a hook for the `main` branch, then add its URL as the env var `VERCEL_DEPLOY_HOOK_URL`.
4. Redeploy so the variables take effect.
5. **Settings → Domains:** add `learnthenscroll.com` and update the DNS records at your domain registrar as Vercel shows.

### 3. Finish in the admin
1. Go to `https://learnthenscroll.com/admin/` and sign in.
2. **Settings:** paste your App Store and Google Play links. Saving rebuilds the site.
3. **Team:** invite a writer as **Editor** when you hire one.

### 4. Google
Add the site in [Google Search Console](https://search.google.com/search-console) and submit `https://learnthenscroll.com/sitemap.xml`.

## Local development
```bash
npm install
SUPABASE_URL=… SUPABASE_ANON_KEY=… npm run build   # without these it builds with no posts
npx serve dist
```
The `/api` functions only run on Vercel (or `vercel dev`).

## Files
- `index.html`: homepage. The build fills in `<!-- head-extra -->` and the `<!-- site-links -->` block (store buttons).
- `admin/`: admin panel (`admin.js` is the whole app; `config.js` is generated at build time).
- `api/deploy.js`, `api/team.js`: server functions (rebuild the site; invite or remove team members).
- `scripts/build.mjs`: the site build.
- `supabase/schema.sql`: tables, roles and security rules. Safe to re-run.
- `supabase/seed.sql`: starter posts.
