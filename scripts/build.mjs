// Builds the whole site into dist/ (Vercel serves that folder).
//   - Blog posts + settings come from Supabase (edited in /admin).
//   - index.html and admin/ are copied over, with store links/config injected.
// Env: SUPABASE_URL, SUPABASE_ANON_KEY (both public values).
// Run: npm run build
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SITE_NAME = 'LearnThenScroll';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Posts are Markdown only: raw HTML is shown as text and unsafe links are dropped,
// so nobody with editor access can inject scripts into the public site.
marked.use({
  renderer: { html: (t) => esc(t.text) },
  walkTokens: (t) => {
    if ((t.type === 'link' || t.type === 'image') && /^\s*(javascript|vbscript|data):/i.test(t.href)) t.href = '#';
  },
});

async function rest(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${query}: ${res.status} ${await res.text()}`);
  return res.json();
}

let settings = {};
let rows = [];
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  for (const s of await rest('settings?select=key,value')) settings[s.key] = s.value;
  rows = await rest('posts?select=slug,title,description,seo_title,category,body_md,published_at,updated_at&status=eq.published&order=published_at.desc');
} else if (process.env.VERCEL_ENV === 'production') {
  // Never replace the live site with an empty blog.
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in Vercel → Settings → Environment Variables.');
} else {
  console.warn('⚠ SUPABASE_URL / SUPABASE_ANON_KEY not set — building with no posts (preview only).');
}

const siteUrl = (settings.site_url || '').replace(/\/+$/, '');
const abs = (p) => (siteUrl ? siteUrl + p : p);
const DEFAULT_APP_STORE_URL = 'https://apps.apple.com/app/id6801362684';
const stores = { ios: settings.app_store_url || DEFAULT_APP_STORE_URL, android: settings.play_store_url || '' };

const posts = rows.map((r) => {
  const words = r.body_md.split(/\s+/).filter(Boolean).length;
  return {
    ...r,
    url: `/blog/${r.slug}/`,
    html: marked.parse(r.body_md),
    readMins: Math.max(1, Math.round(words / 220)),
    date: r.published_at,
    updated: (r.updated_at || r.published_at).slice(0, 10),
  };
});

const fmtDate = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

// Logs App Store / Play button clicks via /api/click (anonymous: store + page only).
const TRACKING = `<script>
document.addEventListener('click',function(e){var a=e.target.closest('a[data-store]');if(!a)return;
try{fetch('/api/click',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({store:a.dataset.store,page_path:location.pathname})});}catch(_){}});
</script>`;

const storeLinks = () => [
  stores.ios && `<a href="${esc(stores.ios)}" data-store="ios" target="_blank" rel="noopener">Download on the App Store ↗</a>`,
  stores.android && `<a href="${esc(stores.android)}" data-store="android" target="_blank" rel="noopener">Get it on Google Play ↗</a>`,
].filter(Boolean);

const headExtra = (urlPath) => [
  siteUrl && `<link rel="canonical" href="${esc(abs(urlPath))}">`,
  siteUrl && `<meta property="og:url" content="${esc(abs(urlPath))}">`,
  settings.app_store_id && `<meta name="apple-itunes-app" content="app-id=${esc(settings.app_store_id)}">`,
  siteUrl && `<link rel="alternate" type="application/rss+xml" title="${SITE_NAME} Blog" href="/blog/rss.xml">`,
].filter(Boolean).join('\n');

const CSS = `
:root{--brand:#FF4D00;--brand-light:#FFF0EB;--brand-dark:#CC3D00;--text:#0E0E0E;--text-sec:#6B6B6B;--border:#E8E5E0;--bg:#FAFAF8;--bg-sec:#F5F3F0;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7;font-size:18px;}
.serif,h1,article h2,.cta h2{font-family:'Instrument Serif',Georgia,serif;font-weight:400;}
h1 em,.serif em{color:var(--brand);}
a{color:var(--brand-dark);}
.wrap{max-width:720px;margin:0 auto;padding:0 20px;}
header.site{border-bottom:1px solid var(--border);background:var(--bg);}
header.site .wrap{display:flex;align-items:center;justify-content:space-between;height:64px;}
.wordmark{font-size:20px;font-weight:600;letter-spacing:-0.3px;color:var(--text);text-decoration:none;}
.wordmark span{color:var(--brand);}
nav{display:flex;align-items:center;gap:22px;}
nav a{color:var(--text-sec);text-decoration:none;font-size:15px;font-weight:500;}
nav a.get{background:var(--brand);color:#fff;padding:10px 18px;border-radius:999px;font-weight:600;}
nav a.get:hover{background:var(--brand-dark);color:#fff;}
nav a:hover{color:var(--text);}
main{padding:48px 0 64px;}
.eyebrow{font-size:13px;font-weight:600;color:var(--brand);letter-spacing:0.08em;text-transform:uppercase;}
h1{font-size:clamp(38px,6vw,56px);line-height:1.05;letter-spacing:-0.5px;margin:10px 0 16px;}
.meta{color:var(--text-sec);font-size:15px;margin-bottom:36px;}
article h2{font-size:34px;line-height:1.15;margin:44px 0 12px;}
article h3{font-size:20px;margin:28px 0 8px;}
article p,article ul,article ol{margin-bottom:18px;}
article ul,article ol{padding-left:24px;}
article li{margin-bottom:6px;}
article blockquote{border-left:4px solid var(--brand);background:var(--brand-light);padding:14px 18px;border-radius:0 10px 10px 0;margin:24px 0;}
article blockquote p:last-child{margin-bottom:0;}
article img{max-width:100%;height:auto;border-radius:12px;}
.cta{background:var(--text);color:#fff;border-radius:20px;padding:32px 28px;margin:48px 0 0;text-align:center;}
.cta h2{color:#fff;font-size:34px;line-height:1.15;margin:0 0 8px;}
.cta h2 em{color:var(--brand);}
.cta p{color:#CFCFCF;font-size:16px;margin-bottom:20px;}
.cta .btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}
.cta a{display:inline-block;background:var(--brand);color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 24px;border-radius:999px;}
.cta a:hover{background:var(--brand-dark);}
.related{margin-top:48px;border-top:1px solid var(--border);padding-top:28px;}
.related h2{font-size:18px;margin-bottom:12px;}
.post-list{list-style:none;padding:0;}
.post-list li{border-bottom:1px solid var(--border);padding:22px 0;}
.post-list a{text-decoration:none;color:var(--text);}
.post-list h2,.post-list h3{font-size:22px;line-height:1.3;margin-bottom:6px;}
.post-list a:hover h2,.post-list a:hover h3{color:var(--brand-dark);}
.post-list p{color:var(--text-sec);font-size:16px;margin:0;}
.post-list .meta{margin:6px 0 0;font-size:14px;}
.empty{color:var(--text-sec);padding:24px 0;}
footer{border-top:1px solid var(--border);color:var(--text-sec);font-size:14px;padding:28px 0;}
footer a{color:var(--text-sec);}
@media (max-width:560px){nav .hide-sm{display:none;}}
`;

function ctaBlock() {
  const btns = storeLinks();

  return `<aside class="cta">
  <h2>Learn first. Then scroll <em>guilt-free.</em></h2>
  <p>Pick a topic, read a 3-minute lesson, pass a quick quiz — then your feed unlocks.</p>
  <div class="btns">${btns.join('')}</div>
</aside>`;
}

function page({ title, description, urlPath, ogType = 'website', jsonLd, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${headExtra(urlPath)}
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta name="twitter:card" content="summary_large_image">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<header class="site"><div class="wrap">
  <a class="wordmark" href="/">learn<span>then</span>scroll</a>
  <nav><a class="hide-sm" href="/#how">How it works</a><a href="/blog/">Blog</a><a class="get" href="${esc(stores.ios)}" data-store="ios" target="_blank" rel="noopener">Get the app ↗</a></nav>
</div></header>
<main><div class="wrap">
${body}
</div></main>
<footer><div class="wrap">© ${new Date().getFullYear()} ${SITE_NAME} · <a href="/">Home</a> · <a href="/blog/">Blog</a> · <a href="https://learnthenscroll-legal.vercel.app/privacy" target="_blank" rel="noopener">Privacy Policy</a> · <a href="mailto:support@learnthenscroll.com">Contact</a></div></footer>
${TRACKING}
</body>
</html>
`;
}

function listItem(p, tag = 'h2') {
  return `<li><a href="${p.url}"><${tag}>${esc(p.title)}</${tag}><p>${esc(p.description)}</p><p class="meta">${fmtDate(p.date)} · ${p.readMins} min read</p></a></li>`;
}

function write(rel, content) {
  const file = path.join(dist, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

// ---- build ----
fs.rmSync(dist, { recursive: true, force: true });

for (const p of posts) {
  const related = posts.filter((o) => o !== p).slice(0, 3);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.title,
    description: p.description,
    datePublished: p.date,
    dateModified: p.updated,
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME },
    ...(siteUrl && { mainEntityOfPage: abs(p.url) }),
  };
  write(`blog/${p.slug}/index.html`, page({
    title: p.seo_title || `${p.title} | ${SITE_NAME}`,
    description: p.description,
    urlPath: p.url,
    ogType: 'article',
    jsonLd,
    body: `<article>
<div class="eyebrow">${esc(p.category || 'Blog')}</div>
<h1>${esc(p.title)}</h1>
<p class="meta">${fmtDate(p.date)} · ${p.readMins} min read</p>
${p.html}
</article>
${ctaBlock()}
${related.length ? `<section class="related"><h2>Keep reading</h2><ul class="post-list">${related.map((r) => listItem(r, 'h3')).join('')}</ul></section>` : ''}`,
  }));
}

write('blog/index.html', page({
  title: `Blog | ${SITE_NAME}`,
  description: 'Practical ideas on beating doomscrolling, building better screen habits and learning something every day.',
  urlPath: '/blog/',
  body: `<div class="eyebrow">Blog</div>
<h1>Scroll less. Learn more.</h1>
<p class="meta">Ideas for building better screen habits and getting smarter in a few minutes a day.</p>
${posts.length ? `<ul class="post-list">${posts.map((p) => listItem(p)).join('')}</ul>` : '<p class="empty">New posts are on the way.</p>'}
${ctaBlock()}`,
}));

// Homepage: inject head tags, store links and click tracking.
const homeLinks = storeLinks();
let home = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  .replace('<!-- head-extra -->', headExtra('/'))
  .replace(/<!-- site-links -->[\s\S]*?<!-- \/site-links -->/, `<nav class="site-links">${
    homeLinks.length ? `<span class="store-btns">${homeLinks.join('')}</span>` : ''
  }<a href="/blog/">Read the blog</a> — tips on beating doomscrolling and learning in 3 minutes a day</nav>`)
  .replace('</body>', `${TRACKING}\n</body>`);
write('index.html', home);

// Admin panel: copy as-is plus generated config.
fs.cpSync(path.join(root, 'admin'), path.join(dist, 'admin'), { recursive: true });
write('admin/config.js', `window.LTS_CONFIG=${JSON.stringify({ supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_ANON_KEY })};\n`);

write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /admin/\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ''}`);

if (siteUrl) {
  const urls = [{ loc: '/' }, { loc: '/blog/', lastmod: posts[0]?.updated }, ...posts.map((p) => ({ loc: p.url, lastmod: p.updated }))];
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(abs(u.loc))}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`);
  write('blog/rss.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${SITE_NAME} Blog</title><link>${esc(abs('/blog/'))}</link>
<description>Scroll less. Learn more.</description>
${posts.map((p) => `<item><title>${esc(p.title)}</title><link>${esc(abs(p.url))}</link><guid>${esc(abs(p.url))}</guid><pubDate>${new Date(p.date + 'T00:00:00Z').toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`).join('\n')}
</channel></rss>
`);
}

console.log(`Built ${posts.length} post(s) into dist/`);
