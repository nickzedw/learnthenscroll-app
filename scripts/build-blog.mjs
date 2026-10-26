// Builds the blog from posts/*.md into static HTML.
//   posts/my-post.md  ->  blog/my-post/index.html  (URL: /blog/my-post/)
// Also writes blog/index.html, sitemap.xml and robots.txt.
// Run: npm run build
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'site.config.json'), 'utf8'));
const siteUrl = config.siteUrl.replace(/\/+$/, '');
const postsDir = path.join(root, 'posts');
const blogDir = path.join(root, 'blog');

if (!siteUrl) {
  console.warn('⚠ site.config.json has no siteUrl — canonical tags and sitemap.xml are skipped. Set it before going live.');
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const abs = (p) => (siteUrl ? siteUrl + p : p);

// Front matter: simple "key: value" lines between --- fences.
function parsePost(file) {
  const raw = fs.readFileSync(path.join(postsDir, file), 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing front matter (--- title/description/date ---)`);
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  for (const key of ['title', 'description', 'date']) {
    if (!meta[key]) throw new Error(`${file}: front matter needs "${key}"`);
  }
  if (meta.draft === 'true') return null;
  const slug = meta.slug || file.replace(/\.md$/, '');
  const body = m[2];
  const words = body.split(/\s+/).filter(Boolean).length;
  return {
    ...meta,
    slug,
    url: `/blog/${slug}/`,
    html: marked.parse(body),
    readMins: Math.max(1, Math.round(words / 220)),
    updated: meta.updated || meta.date,
  };
}

const fmtDate = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

const CSS = `
:root{--brand:#FF4D00;--brand-light:#FFF0EB;--brand-dark:#CC3D00;--text:#0E0E0E;--text-sec:#6B6B6B;--border:#E8E5E0;--bg:#FAFAF8;--bg-sec:#F5F3F0;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7;font-size:18px;}
a{color:var(--brand-dark);}
.wrap{max-width:720px;margin:0 auto;padding:0 20px;}
header.site{border-bottom:1px solid var(--border);background:var(--bg);}
header.site .wrap{display:flex;align-items:center;justify-content:space-between;height:64px;}
.wordmark{font-size:20px;font-weight:600;letter-spacing:-0.3px;color:var(--text);text-decoration:none;}
.wordmark span{color:var(--brand);}
nav a{color:var(--text-sec);text-decoration:none;font-size:15px;margin-left:20px;}
nav a:hover{color:var(--text);}
main{padding:48px 0 64px;}
.eyebrow{font-size:13px;font-weight:600;color:var(--brand);letter-spacing:0.08em;text-transform:uppercase;}
h1{font-size:clamp(30px,5vw,42px);line-height:1.15;letter-spacing:-0.5px;margin:10px 0 14px;}
.meta{color:var(--text-sec);font-size:15px;margin-bottom:36px;}
article h2{font-size:26px;line-height:1.3;margin:40px 0 12px;letter-spacing:-0.3px;}
article h3{font-size:20px;margin:28px 0 8px;}
article p,article ul,article ol{margin-bottom:18px;}
article ul,article ol{padding-left:24px;}
article li{margin-bottom:6px;}
article blockquote{border-left:4px solid var(--brand);background:var(--brand-light);padding:14px 18px;border-radius:0 10px 10px 0;margin:24px 0;}
article blockquote p:last-child{margin-bottom:0;}
article img{max-width:100%;height:auto;border-radius:12px;}
.cta{background:var(--text);color:#fff;border-radius:20px;padding:32px 28px;margin:48px 0 0;text-align:center;}
.cta h2{color:#fff;font-size:24px;line-height:1.3;margin:0 0 8px;}
.cta p{color:#CFCFCF;font-size:16px;margin-bottom:20px;}
.cta .btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}
.cta a,.cta span.soon{display:inline-block;background:var(--brand);color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 22px;border-radius:12px;}
.cta a:hover{background:var(--brand-dark);}
.cta span.soon{background:#333;}
.related{margin-top:48px;border-top:1px solid var(--border);padding-top:28px;}
.related h2{font-size:18px;margin-bottom:12px;}
.post-list{list-style:none;padding:0;}
.post-list li{border-bottom:1px solid var(--border);padding:22px 0;}
.post-list a{text-decoration:none;color:var(--text);}
.post-list h2,.post-list h3{font-size:22px;line-height:1.3;margin-bottom:6px;}
.post-list a:hover h2,.post-list a:hover h3{color:var(--brand-dark);}
.post-list p{color:var(--text-sec);font-size:16px;margin:0;}
.post-list .meta{margin:6px 0 0;font-size:14px;}
footer{border-top:1px solid var(--border);color:var(--text-sec);font-size:14px;padding:28px 0;}
`;

function ctaBlock() {
  const btns = [];
  if (config.appStoreUrl) btns.push(`<a href="${esc(config.appStoreUrl)}" rel="noopener">Download on the App Store</a>`);
  if (config.playStoreUrl) btns.push(`<a href="${esc(config.playStoreUrl)}" rel="noopener">Get it on Google Play</a>`);
  if (!btns.length) btns.push('<span class="soon">Coming soon to iOS &amp; Android</span>', '<a href="/">Try the demo</a>');
  return `<aside class="cta">
  <h2>Learn first. Then scroll guilt-free.</h2>
  <p>Pick a topic, read a 3-minute lesson, pass a quick quiz — then your feed unlocks.</p>
  <div class="btns">${btns.join('')}</div>
</aside>`;
}

function page({ title, description, urlPath, ogType = 'website', jsonLd, body }) {
  const canonical = siteUrl ? `<link rel="canonical" href="${esc(abs(urlPath))}">\n<meta property="og:url" content="${esc(abs(urlPath))}">` : '';
  const appBanner = config.appStoreId ? `\n<meta name="apple-itunes-app" content="app-id=${esc(config.appStoreId)}">` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${canonical}
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${esc(config.siteName)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta name="twitter:card" content="summary_large_image">${appBanner}
${siteUrl ? `<link rel="alternate" type="application/rss+xml" title="${esc(config.siteName)} Blog" href="/blog/rss.xml">` : ''}
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : ''}
<style>${CSS}</style>
</head>
<body>
<header class="site"><div class="wrap">
  <a class="wordmark" href="/">learn<span>then</span>scroll</a>
  <nav><a href="/blog/">Blog</a><a href="/">Try the demo</a></nav>
</div></header>
<main><div class="wrap">
${body}
</div></main>
<footer><div class="wrap">© ${new Date().getFullYear()} ${esc(config.siteName)} · <a href="/blog/">Blog</a></div></footer>
</body>
</html>
`;
}

function listItem(p, tag = 'h2') {
  return `<li><a href="${p.url}"><${tag}>${esc(p.title)}</${tag}><p>${esc(p.description)}</p><p class="meta">${fmtDate(p.date)} · ${p.readMins} min read</p></a></li>`;
}

// ---- build ----
const posts = fs.readdirSync(postsDir)
  .filter((f) => f.endsWith('.md'))
  .map(parsePost)
  .filter(Boolean)
  .sort((a, b) => b.date.localeCompare(a.date));

const slugs = new Set();
for (const p of posts) {
  if (slugs.has(p.slug)) throw new Error(`Duplicate slug: ${p.slug}`);
  slugs.add(p.slug);
}

fs.rmSync(blogDir, { recursive: true, force: true });
fs.mkdirSync(blogDir, { recursive: true });

for (const p of posts) {
  const related = posts.filter((o) => o !== p).slice(0, 3);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.title,
    description: p.description,
    datePublished: p.date,
    dateModified: p.updated,
    author: { '@type': 'Organization', name: config.author },
    publisher: { '@type': 'Organization', name: config.siteName },
    ...(siteUrl && { mainEntityOfPage: abs(p.url) }),
  };
  const body = `<article>
<div class="eyebrow">${esc(p.category || 'Blog')}</div>
<h1>${esc(p.title)}</h1>
<p class="meta">${fmtDate(p.date)} · ${p.readMins} min read</p>
${p.html}
</article>
${ctaBlock()}
${related.length ? `<section class="related"><h2>Keep reading</h2><ul class="post-list">${related.map((r) => listItem(r, 'h3')).join('')}</ul></section>` : ''}`;
  const dir = path.join(blogDir, p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page({
    title: p.seoTitle || `${p.title} | ${config.siteName}`,
    description: p.description,
    urlPath: p.url,
    ogType: 'article',
    jsonLd,
    body,
  }));
}

fs.writeFileSync(path.join(blogDir, 'index.html'), page({
  title: `Blog | ${config.siteName}`,
  description: 'Practical ideas on beating doomscrolling, building better screen habits and learning something every day.',
  urlPath: '/blog/',
  body: `<div class="eyebrow">Blog</div>
<h1>Scroll less. Learn more.</h1>
<p class="meta">Ideas for building better screen habits and getting smarter in a few minutes a day.</p>
<ul class="post-list">${posts.map((p) => listItem(p)).join('')}</ul>
${ctaBlock()}`,
}));

if (siteUrl) {
  const urls = [{ loc: '/', lastmod: null }, { loc: '/blog/', lastmod: posts[0]?.updated }, ...posts.map((p) => ({ loc: p.url, lastmod: p.updated }))];
  fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(abs(u.loc))}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`);
  fs.writeFileSync(path.join(blogDir, 'rss.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${esc(config.siteName)} Blog</title><link>${esc(abs('/blog/'))}</link>
<description>Scroll less. Learn more.</description>
${posts.map((p) => `<item><title>${esc(p.title)}</title><link>${esc(abs(p.url))}</link><guid>${esc(abs(p.url))}</guid><pubDate>${new Date(p.date + 'T00:00:00Z').toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`).join('\n')}
</channel></rss>
`);
}
fs.writeFileSync(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ''}`);

console.log(`Built ${posts.length} post(s) into blog/`);
