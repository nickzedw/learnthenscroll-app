# LearnThenScroll website

Static marketing site: `index.html` is the homepage (interactive app demo) and `/blog/` holds SEO blog posts.

## Adding a blog post

1. Create a Markdown file in `posts/`, e.g. `posts/best-habit-apps.md`. The filename becomes the URL (`/blog/best-habit-apps/`).
2. Start it with front matter:

   ```markdown
   ---
   title: The Post Title Shown on the Page
   description: 150–160 character summary used by Google and social previews.
   date: 2026-11-01
   category: Screen habits
   seoTitle: Optional different <title> tag
   updated: 2026-11-15   # optional, for edits to an existing post
   draft: true           # optional, skips the post
   ---
   ```
3. Write the post in Markdown below it (`##` for section headings, `>` for a callout).
4. Run `npm install` (first time only), then `npm run build`.
5. Commit the post **and** the regenerated `blog/`, `sitemap.xml` and `robots.txt`.

Every post automatically gets meta/Open Graph tags, `BlogPosting` structured data, a download call-to-action and "Keep reading" links to other posts.

## Site settings — `site.config.json`

| Key | Purpose |
| --- | --- |
| `siteUrl` | Live domain, e.g. `https://learnthenscroll.com`. **Required before launch** — canonical tags, `sitemap.xml` and the RSS feed are only generated when it's set. |
| `appStoreUrl` / `playStoreUrl` | Store links for the download buttons. Until set, posts show "Coming soon" + "Try the demo". |
| `appStoreId` | Optional numeric App Store ID; adds Safari's Smart App Banner. |

After launch, submit `https://<your-domain>/sitemap.xml` in Google Search Console.
