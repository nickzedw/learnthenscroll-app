// LearnThenScroll admin panel — a small single-page app on Supabase.
(function () {
  'use strict';

  const cfg = window.LTS_CONFIG || {};
  // Capture invite / password-reset links before Supabase consumes the URL hash.
  const authFlow = (/type=(invite|recovery)/.exec(location.hash) || [])[1] || null;
  const $app = document.getElementById('app');

  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fmtDate = (d) => (d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString() : '');
  const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : 'Never');
  const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  // Same Markdown rules as the site build: raw HTML is shown as text, unsafe links are dropped.
  marked.use({
    renderer: { html: (t) => esc(t.text) },
    walkTokens: (t) => {
      if ((t.type === 'link' || t.type === 'image') && /^\s*(javascript|vbscript|data):/i.test(t.href)) t.href = '#';
    },
  });
  const md = (src) => DOMPurify.sanitize(marked.parse(src || ''));

  let toastTimer;
  function toast(msg, bad) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show' + (bad ? ' bad' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.className = 'toast'), bad ? 6000 : 3500);
  }

  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    $app.innerHTML = '<div class="auth"><div class="card"><div class="card-b"><h2>Admin not configured</h2><p class="sub">Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel, then redeploy.</p></div></div></div>';
    return;
  }

  const sb = supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  let me = null;
  let settings = {};
  let dirty = false;
  let currentHash = '';

  const isAdmin = () => me && me.role === 'admin';

  async function api(path, method, body) {
    const { data } = await sb.auth.getSession();
    const res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (data.session ? data.session.access_token : '') },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Request failed (' + res.status + ')');
    return json;
  }

  async function deploy(quiet) {
    try {
      await api('/api/deploy', 'POST');
      toast(quiet ? 'Saved — site is rebuilding (live in about a minute)' : 'Rebuild started — live in about a minute');
      return true;
    } catch (e) {
      toast('Saved, but the site rebuild failed: ' + e.message, true);
      return false;
    }
  }

  async function loadSettings() {
    const { data } = await sb.from('settings').select('key,value');
    settings = {};
    (data || []).forEach((r) => (settings[r.key] = r.value));
  }

  // ---------- Icons ----------
  const I = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  const ICONS = {
    overview: I('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>'),
    posts: I('<path d="M4 4h12l4 4v12H4z"/><path d="M8 12h8M8 16h8M8 8h4"/>'),
    settings: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    team: I('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 20a6.5 6.5 0 0 0-2-4.7"/>'),
    profile: I('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    deploy: I('<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5"/>'),
  };

  // ---------- Auth screens ----------
  function renderLogin(msg) {
    $app.innerHTML = `<div class="auth">
      <div class="brand">LTS<span> · </span>Admin</div>
      <div class="card"><div class="card-b">
        <form id="login">
          <div class="field"><label for="em">Email</label><input id="em" type="email" autocomplete="username" required></div>
          <div class="field"><label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password" required></div>
          <button class="btn primary" style="width:100%">Sign in</button>
          <p class="err" id="lerr">${esc(msg || '')}</p>
        </form>
        <button class="linkbtn" id="forgot" type="button">Forgot password?</button>
      </div></div></div>`;
    const em = document.getElementById('em'), pw = document.getElementById('pw'), lerr = document.getElementById('lerr');
    document.getElementById('login').onsubmit = async (e) => {
      e.preventDefault();
      const { error } = await sb.auth.signInWithPassword({ email: em.value.trim(), password: pw.value });
      if (error) return (lerr.textContent = error.message);
      start();
    };
    document.getElementById('forgot').onclick = async () => {
      const email = em.value.trim();
      if (!email) return (lerr.textContent = 'Enter your email above first.');
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/admin/' });
      lerr.textContent = error ? error.message : '';
      if (!error) toast('Check your email for a reset link');
    };
  }

  function renderSetPassword(kind) {
    $app.innerHTML = `<div class="auth">
      <div class="brand">LTS<span> · </span>Admin</div>
      <div class="card"><div class="card-b">
        <h2 style="margin-bottom:6px">${kind === 'invite' ? 'Welcome! Choose a password' : 'Set a new password'}</h2>
        <p class="sub" style="margin-bottom:20px">At least 8 characters.</p>
        <form id="setpw">
          <div class="field"><label for="p1">New password</label><input id="p1" type="password" autocomplete="new-password" minlength="8" required></div>
          <div class="field"><label for="p2">Confirm password</label><input id="p2" type="password" autocomplete="new-password" minlength="8" required></div>
          <button class="btn primary" style="width:100%">Save password</button>
          <p class="err" id="serr"></p>
        </form>
      </div></div></div>`;
    const p1 = document.getElementById('p1'), p2 = document.getElementById('p2'), serr = document.getElementById('serr');
    document.getElementById('setpw').onsubmit = async (e) => {
      e.preventDefault();
      if (p1.value !== p2.value) return (serr.textContent = "Passwords don't match.");
      const { error } = await sb.auth.updateUser({ password: p1.value });
      if (error) return (serr.textContent = error.message);
      toast('Password saved');
      history.replaceState(null, '', location.pathname + '#/overview');
      start(true);
    };
  }

  // ---------- Shell ----------
  function renderShell() {
    const nav = [
      ['overview', 'Overview'],
      ['posts', 'Posts'],
      ...(isAdmin() ? [['settings', 'Settings'], ['team', 'Team']] : []),
      ['profile', 'My Profile'],
      ['deploy', 'Deploy'],
    ];
    $app.innerHTML = `<header class="topbar"><div class="in">
        <div class="brand">LTS<span> · </span>Admin</div>
        <div class="who">${esc(me.email)} · ${esc(me.role)}</div>
        <div class="right"><a href="/" target="_blank" rel="noopener">View site ↗</a><button id="signout">Sign out</button></div>
      </div></header>
      <div class="layout">
        <nav class="side">${nav.map(([k, l]) => `<a href="#/${k}" data-nav="${k}">${ICONS[k]}${l}</a>`).join('')}</nav>
        <main class="main" id="main"></main>
      </div>`;
    document.getElementById('signout').onclick = async () => {
      if (dirty && !confirm('You have unsaved changes. Sign out anyway?')) return;
      dirty = false;
      await sb.auth.signOut();
      renderLogin();
    };
  }

  function route() {
    const hash = location.hash || '#/overview';
    if (dirty && hash !== currentHash) {
      if (!confirm('You have unsaved changes. Leave without saving?')) {
        history.replaceState(null, '', currentHash);
        return;
      }
      dirty = false;
    }
    currentHash = hash;
    const [, page, id] = hash.split('/');
    document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === page));
    const $main = document.getElementById('main');
    if (!$main) return;
    $main.innerHTML = '<p class="sub">Loading…</p>';
    const pages = { overview, posts: id ? () => editor(id) : postList, settings: settingsPage, team, profile, deploy: deployPage };
    const fn = pages[page] || overview;
    if ((page === 'settings' || page === 'team') && !isAdmin()) return overview($main);
    Promise.resolve(fn($main)).catch((e) => ($main.innerHTML = `<p class="err">${esc(e.message)}</p>`));
  }

  // ---------- Overview ----------
  async function overview($m) {
    $m = $m || document.getElementById('main');
    const [pub, drafts, clicks, recent] = await Promise.all([
      sb.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      sb.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
      sb.rpc('click_stats', { days: 30 }),
      sb.from('posts').select('id,title,status,updated_at').order('updated_at', { ascending: false }).limit(5),
    ]);
    const rows = clicks.data || [];
    let ios = 0, android = 0;
    const byPage = {};
    rows.forEach((r) => {
      const n = Number(r.clicks);
      if (r.store === 'ios') ios += n; else android += n;
      byPage[r.page_path] = (byPage[r.page_path] || 0) + n;
    });
    const top = Object.entries(byPage).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const max = top.length ? top[0][1] : 1;

    $m.innerHTML = `<h1>Overview</h1><p class="sub">Blog activity and download clicks from the website.</p>
      <div class="stats">
        <div class="stat"><div class="lbl">Published posts</div><div class="num">${pub.count ?? 0}</div></div>
        <div class="stat"><div class="lbl">Drafts</div><div class="num">${drafts.count ?? 0}</div></div>
        <div class="stat"><div class="lbl">App Store clicks · 30d</div><div class="num">${ios}</div></div>
        <div class="stat"><div class="lbl">Google Play clicks · 30d</div><div class="num">${android}</div></div>
      </div>
      <div class="card"><div class="card-h"><h2>Pages driving downloads</h2><span class="who" style="color:var(--text-sec)">Last 30 days</span></div>
        ${top.length ? top.map(([p, n]) => `<div class="row" style="display:block"><div style="display:flex;justify-content:space-between;gap:12px"><span class="t" style="font-size:15px;overflow-wrap:anywhere">${esc(p)}</span><span class="r">${n} click${n === 1 ? '' : 's'}</span></div><div class="bar"><i style="width:${(n / max) * 100}%"></i></div></div>`).join('')
          : '<div class="empty">No download clicks yet. Once the site is live with store links set in Settings, clicks on the App Store / Google Play buttons show up here.</div>'}
      </div>
      <div class="card"><div class="card-h"><h2>Recently edited posts</h2><a href="#/posts">View all →</a></div>
        ${(recent.data || []).length ? recent.data.map((p) => `<a class="row" href="#/posts/${p.id}"><div><div class="t">${esc(p.title)}</div><div class="m"><span class="pill ${p.status}">${p.status}</span></div></div><div class="r">${fmtDate(p.updated_at)}</div></a>`).join('')
          : '<div class="empty">No posts yet. <a href="#/posts/new">Write your first one →</a></div>'}
      </div>`;
  }

  // ---------- Posts ----------
  let postFilter = 'all';
  async function postList($m) {
    const { data, error } = await sb.from('posts').select('id,title,slug,status,published_at,updated_at').order('updated_at', { ascending: false });
    if (error) throw error;
    const draw = () => {
      const list = data.filter((p) => postFilter === 'all' || p.status === postFilter);
      $m.querySelector('#plist').innerHTML = list.length
        ? list.map((p) => `<a class="row" href="#/posts/${p.id}"><div style="min-width:0"><div class="t">${esc(p.title)}</div><div class="m">/blog/${esc(p.slug)}/</div></div><div class="r"><span class="pill ${p.status}">${p.status}</span><div style="margin-top:4px">${p.status === 'published' ? 'Published ' + fmtDate(p.published_at) : 'Edited ' + fmtDate(p.updated_at)}</div></div></a>`).join('')
        : '<div class="empty">Nothing here yet.</div>';
      $m.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.f === postFilter));
    };
    $m.innerHTML = `<div class="head-row"><div><h1>Posts</h1><p class="sub">Blog posts on learnthenscroll.com/blog.</p></div><a class="btn primary" href="#/posts/new">+ New post</a></div>
      <div class="card"><div class="card-h"><h2>${data.length} post${data.length === 1 ? '' : 's'}</h2>
        <div class="tabs"><button data-f="all">All</button><button data-f="published">Published</button><button data-f="draft">Drafts</button></div></div>
        <div id="plist"></div></div>`;
    $m.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => { postFilter = b.dataset.f; draw(); }));
    draw();
  }

  async function editor(id) {
    const $m = document.getElementById('main');
    const isNew = id === 'new';
    let post = { title: '', slug: '', description: '', seo_title: '', category: '', body_md: '', status: 'draft' };
    if (!isNew) {
      const { data, error } = await sb.from('posts').select('*').eq('id', id).single();
      if (error) throw new Error('Post not found');
      post = data;
    }
    const savedSlug = post.slug;
    let slugTouched = !isNew;
    const siteUrl = (settings.site_url || 'https://learnthenscroll.com').replace(/\/+$/, '');

    $m.innerHTML = `<div class="head-row"><div><a href="#/posts" style="font-size:14px">← All posts</a><h1 style="margin-top:6px">${isNew ? 'New post' : 'Edit post'}</h1>
        <p class="sub">${isNew ? 'Saved as a draft until you publish.' : `<span class="pill ${post.status}">${post.status}</span>${post.status === 'published' ? ` · <a href="/blog/${esc(post.slug)}/" target="_blank" rel="noopener">View live ↗</a>` : ''}`}</p></div>
        <div class="btn-row" id="actions"></div></div>
      <div class="editor">
        <div>
          <div class="field"><label for="f-title">Title</label><input id="f-title" type="text" value="${esc(post.title)}" placeholder="How to Stop Doomscrolling: 7 Strategies That Work"></div>
          <div class="field">
            <div class="toolbar">
              <button type="button" data-md="h2">H2</button><button type="button" data-md="h3">H3</button><button type="button" data-md="b">B</button><button type="button" data-md="i"><em>I</em></button>
              <button type="button" data-md="link">Link</button><button type="button" data-md="quote">Quote</button><button type="button" data-md="ul">• List</button><button type="button" data-md="ol">1. List</button>
              <button type="button" data-md="img">Image ↑</button><span class="sp"></span>
              <div class="tabs"><button type="button" class="on" data-view="write">Write</button><button type="button" data-view="preview">Preview</button></div>
            </div>
            <textarea id="f-body" class="body" placeholder="Write in Markdown. ## for section headings, **bold**, > for a callout.">${esc(post.body_md)}</textarea>
            <div id="preview" class="preview" hidden></div>
            <input id="f-img" type="file" accept="image/*" hidden>
            <div class="hint" id="wc"></div>
          </div>
        </div>
        <div>
          <div class="card"><div class="card-h"><h2>SEO</h2></div><div class="card-b">
            <div class="field"><label for="f-slug">URL</label><input id="f-slug" type="text" value="${esc(post.slug)}"><div class="hint" id="slug-hint"></div></div>
            <div class="field"><label for="f-desc">Meta description</label><textarea id="f-desc" rows="4">${esc(post.description)}</textarea><div class="hint" id="desc-hint"></div></div>
            <div class="field"><label for="f-seo">Google title <span style="font-weight:400;color:var(--text-sec)">(optional)</span></label><input id="f-seo" type="text" value="${esc(post.seo_title || '')}"><div class="hint" id="seo-hint"></div></div>
            <div class="field"><label for="f-cat">Category</label><input id="f-cat" type="text" value="${esc(post.category || '')}" placeholder="Screen habits"></div>
            <label style="font-weight:600;display:block;margin-bottom:6px">Google preview</label>
            <div class="serp"><div class="u" id="serp-u"></div><div class="h" id="serp-h"></div><div class="d" id="serp-d"></div></div>
          </div></div>
        </div>
      </div>`;

    const $ = (s) => $m.querySelector(s);
    const f = { title: $('#f-title'), slug: $('#f-slug'), desc: $('#f-desc'), seo: $('#f-seo'), cat: $('#f-cat'), body: $('#f-body') };

    function refresh() {
      const title = f.title.value.trim();
      const gTitle = f.seo.value.trim() || (title ? title + ' | LearnThenScroll' : '');
      const desc = f.desc.value.trim();
      const slug = f.slug.value.trim();
      $('#serp-u').textContent = siteUrl.replace(/^https?:\/\//, '') + ' › blog › ' + (slug || 'your-post');
      $('#serp-h').textContent = gTitle.length > 60 ? gTitle.slice(0, 58) + '…' : gTitle || 'Your post title';
      $('#serp-d').textContent = desc.length > 160 ? desc.slice(0, 157) + '…' : desc || 'Your meta description appears here in Google results.';
      const dl = desc.length;
      $('#desc-hint').textContent = dl + ' characters — aim for 120–160.';
      $('#desc-hint').className = 'hint' + (dl && (dl < 120 || dl > 160) ? ' warn' : '');
      $('#seo-hint').textContent = gTitle.length + ' characters' + (gTitle.length > 60 ? ' — Google will cut this off; aim for under 60.' : '');
      $('#seo-hint').className = 'hint' + (gTitle.length > 60 ? ' warn' : '');
      const slugOk = SLUG_RE.test(slug);
      $('#slug-hint').textContent = slugOk ? '/blog/' + slug + '/' : 'Lowercase letters, numbers and dashes only.';
      $('#slug-hint').className = 'hint' + (slugOk ? '' : ' warn');
      const words = f.body.value.split(/\s+/).filter(Boolean).length;
      $('#wc').textContent = words + ' words · ' + Math.max(1, Math.round(words / 220)) + ' min read';
    }

    Object.values(f).forEach((el) => el.addEventListener('input', () => { dirty = true; refresh(); }));
    f.title.addEventListener('input', () => { if (!slugTouched) f.slug.value = slugify(f.title.value); refresh(); });
    f.slug.addEventListener('input', () => { slugTouched = true; });
    f.slug.addEventListener('blur', () => { f.slug.value = slugify(f.slug.value); refresh(); });

    // Write / preview tabs
    $m.querySelectorAll('[data-view]').forEach((b) => (b.onclick = () => {
      const preview = b.dataset.view === 'preview';
      $m.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('on', x === b));
      f.body.hidden = preview;
      $('#preview').hidden = !preview;
      if (preview) $('#preview').innerHTML = md(f.body.value);
    }));

    // Markdown toolbar
    function wrap(before, after, placeholder) {
      const t = f.body, s = t.selectionStart, e = t.selectionEnd;
      const sel = t.value.slice(s, e) || placeholder;
      t.setRangeText(before + sel + after, s, e, 'end');
      t.focus();
      t.dispatchEvent(new Event('input'));
    }
    function linePrefix(prefix) {
      const t = f.body, s = t.selectionStart, e = t.selectionEnd;
      const start = t.value.lastIndexOf('\n', s - 1) + 1;
      const lines = t.value.slice(start, e).split('\n').map((l, i) => (typeof prefix === 'function' ? prefix(i) : prefix) + l);
      t.setRangeText(lines.join('\n'), start, e, 'end');
      t.focus();
      t.dispatchEvent(new Event('input'));
    }
    const actions = {
      h2: () => linePrefix('## '), h3: () => linePrefix('### '),
      b: () => wrap('**', '**', 'bold text'), i: () => wrap('*', '*', 'italic text'),
      link: () => { const url = prompt('Link URL (e.g. /blog/other-post/ or https://…)'); if (url) wrap('[', '](' + url + ')', 'link text'); },
      quote: () => linePrefix('> '), ul: () => linePrefix('- '), ol: () => linePrefix((i) => i + 1 + '. '),
      img: () => $('#f-img').click(),
    };
    $m.querySelectorAll('[data-md]').forEach((b) => (b.onclick = () => actions[b.dataset.md]()));
    $('#f-img').onchange = async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) return toast('Images must be under 5 MB', true);
      toast('Uploading image…');
      const name = new Date().toISOString().slice(0, 7) + '/' + Math.random().toString(36).slice(2, 10) + '-' + slugify(file.name.replace(/\.[^.]+$/, '')) + (file.name.match(/\.[a-z0-9]+$/i) || [''])[0].toLowerCase();
      const { error } = await sb.storage.from('blog-images').upload(name, file, { contentType: file.type });
      if (error) return toast('Upload failed: ' + error.message, true);
      const { data } = sb.storage.from('blog-images').getPublicUrl(name);
      const alt = prompt('Describe the image (alt text — helps SEO and accessibility):', '') || '';
      wrap('\n![' + alt.replace(/[\[\]]/g, '') + '](' + data.publicUrl + ')\n', '', '');
      toast('Image added');
    };

    // Save / publish
    async function save(status) {
      const row = {
        title: f.title.value.trim(),
        slug: slugify(f.slug.value) || slugify(f.title.value),
        description: f.desc.value.trim(),
        seo_title: f.seo.value.trim() || null,
        category: f.cat.value.trim() || null,
        body_md: f.body.value,
        status,
      };
      if (!row.title) return toast('Add a title first', true);
      if (!SLUG_RE.test(row.slug)) return toast('The URL can only use lowercase letters, numbers and dashes', true);
      if (status === 'published' && !row.description) return toast('Add a meta description before publishing — Google shows it in results', true);
      if (post.status === 'published' && savedSlug && row.slug !== savedSlug &&
          !confirm('Changing the URL of a published post breaks existing links and resets its Google ranking. Continue?')) return;
      const wasPublic = post.status === 'published';
      $m.querySelectorAll('#actions button').forEach((b) => (b.disabled = true));
      let res;
      if (isNew) res = await sb.from('posts').insert({ ...row, author_id: me.id }).select().single();
      else res = await sb.from('posts').update(row).eq('id', post.id).select().single();
      $m.querySelectorAll('#actions button').forEach((b) => (b.disabled = false));
      if (res.error) return toast(res.error.code === '23505' ? 'Another post already uses that URL' : res.error.message, true);
      dirty = false;
      if (status === 'published' || wasPublic) await deploy(true);
      else toast('Draft saved');
      if (isNew) location.hash = '#/posts/' + res.data.id;
      else route();
    }

    async function remove() {
      if (!confirm('Delete "' + post.title + '" permanently?')) return;
      const { error } = await sb.from('posts').delete().eq('id', post.id);
      if (error) return toast(error.message, true);
      dirty = false;
      if (post.status === 'published') await deploy(true); else toast('Post deleted');
      location.hash = '#/posts';
    }

    const btns = [];
    if (post.status === 'published') {
      btns.push(['Update', 'primary', () => save('published')], ['Unpublish', 'ghost', () => save('draft')]);
    } else {
      btns.push(['Save draft', 'ghost', () => save('draft')], ['Publish', 'primary', () => save('published')]);
    }
    if (!isNew && isAdmin()) btns.push(['Delete', 'danger', remove]);
    const $act = $('#actions');
    btns.forEach(([label, cls, fn]) => {
      const b = document.createElement('button');
      b.className = 'btn ' + cls;
      b.textContent = label;
      b.onclick = fn;
      $act.appendChild(b);
    });
    refresh();
  }

  // ---------- Settings ----------
  async function settingsPage($m) {
    await loadSettings();
    const fields = [
      ['site_url', 'Website address', 'url', 'Your live domain, e.g. https://learnthenscroll.com — used for Google (canonical URLs) and the sitemap.'],
      ['app_store_url', 'App Store link', 'url', 'Paste the link to LearnThenScroll on the Apple App Store.'],
      ['play_store_url', 'Google Play link', 'url', 'Paste the link to LearnThenScroll on Google Play.'],
      ['app_store_id', 'App Store ID (optional)', 'text', 'The number in your App Store link after "id" (e.g. 1234567890). Shows the "Open in App Store" banner in Safari on iPhone.'],
    ];
    $m.innerHTML = `<h1>Settings</h1><p class="sub">Saving rebuilds the site so changes go live.</p>
      <div class="card"><div class="card-b"><form id="sf">
        ${fields.map(([k, l, t, h]) => `<div class="field"><label for="s-${k}">${l}</label><input id="s-${k}" type="${t}" value="${esc(settings[k] || '')}"><div class="hint">${h}</div></div>`).join('')}
        <button class="btn primary">Save settings</button>
      </form></div></div>`;
    $m.querySelector('#sf').onsubmit = async (e) => {
      e.preventDefault();
      const rows = fields.map(([k]) => ({ key: k, value: $m.querySelector('#s-' + k).value.trim(), updated_at: new Date().toISOString() }));
      const id = rows.find((r) => r.key === 'app_store_id');
      if (id.value && !/^\d+$/.test(id.value)) return toast('App Store ID should be numbers only', true);
      const { error } = await sb.from('settings').upsert(rows);
      if (error) return toast(error.message, true);
      await loadSettings();
      await deploy(true);
    };
  }

  // ---------- Team ----------
  async function team($m) {
    const { data, error } = await sb.from('profiles').select('id,email,display_name,role,created_at').order('created_at');
    if (error) throw error;
    $m.innerHTML = `<h1>Team</h1><p class="sub">Admins can do everything. Editors can write and publish posts, but can't change settings or the team.</p>
      <div class="card"><div class="card-h"><h2>Invite someone</h2></div><div class="card-b">
        <form id="inv" class="btn-row">
          <input id="inv-email" type="email" placeholder="writer@example.com" required style="flex:1;min-width:200px">
          <select id="inv-role" style="width:auto"><option value="editor">Editor</option><option value="admin">Admin</option></select>
          <button class="btn primary">Send invite</button>
        </form>
        <p class="hint" style="color:var(--text-sec);font-size:13px;margin-top:8px">They'll get an email with a link to set their password.</p>
      </div></div>
      <div class="card"><div class="card-h"><h2>Members</h2></div>
        ${data.map((u) => `<div class="row"><div style="min-width:0"><div class="t">${esc(u.display_name || u.email)}</div><div class="m">${esc(u.email)}${u.role === 'pending' ? ' · no access' : ''}</div></div>
          <div class="btn-row">${u.id === me.id ? '<span class="r">You · admin</span>' : `
            <select data-role="${u.id}" style="width:auto"><option value="admin"${u.role === 'admin' ? ' selected' : ''}>Admin</option><option value="editor"${u.role === 'editor' ? ' selected' : ''}>Editor</option><option value="pending"${u.role === 'pending' ? ' selected' : ''}>No access</option></select>
            <button class="btn danger" data-del="${u.id}" data-email="${esc(u.email)}">Remove</button>`}</div></div>`).join('')}
      </div>`;
    $m.querySelector('#inv').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api('/api/team', 'POST', { email: $m.querySelector('#inv-email').value, role: $m.querySelector('#inv-role').value });
        toast('Invite sent');
        team($m);
      } catch (err) { toast(err.message, true); }
    };
    $m.querySelectorAll('[data-role]').forEach((s) => (s.onchange = async () => {
      const { error } = await sb.from('profiles').update({ role: s.value }).eq('id', s.dataset.role);
      toast(error ? error.message : 'Role updated', !!error);
    }));
    $m.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
      if (!confirm('Remove ' + b.dataset.email + "? They'll lose access immediately.")) return;
      try { await api('/api/team', 'DELETE', { id: b.dataset.del }); toast('Removed'); team($m); } catch (err) { toast(err.message, true); }
    }));
  }

  // ---------- Profile ----------
  function profile($m) {
    $m.innerHTML = `<h1>My Profile</h1><p class="sub">${esc(me.email)} · ${esc(me.role)}</p>
      <div class="card"><div class="card-h"><h2>Display name</h2></div><div class="card-b">
        <form id="pf" class="btn-row"><input id="pf-name" type="text" value="${esc(me.display_name || '')}" style="flex:1;min-width:200px"><button class="btn">Save</button></form>
      </div></div>
      <div class="card"><div class="card-h"><h2>Change password</h2></div><div class="card-b">
        <form id="pw">
          <div class="field"><label for="np1">New password</label><input id="np1" type="password" minlength="8" autocomplete="new-password" required></div>
          <div class="field"><label for="np2">Confirm new password</label><input id="np2" type="password" minlength="8" autocomplete="new-password" required></div>
          <button class="btn">Update password</button>
        </form>
      </div></div>`;
    $m.querySelector('#pf').onsubmit = async (e) => {
      e.preventDefault();
      const display_name = $m.querySelector('#pf-name').value.trim() || null;
      const { error } = await sb.from('profiles').update({ display_name }).eq('id', me.id);
      if (!error) me.display_name = display_name;
      toast(error ? error.message : 'Saved', !!error);
    };
    $m.querySelector('#pw').onsubmit = async (e) => {
      e.preventDefault();
      const a = $m.querySelector('#np1').value, b = $m.querySelector('#np2').value;
      if (a !== b) return toast("Passwords don't match", true);
      const { error } = await sb.auth.updateUser({ password: a });
      toast(error ? error.message : 'Password updated', !!error);
      if (!error) e.target.reset();
    };
  }

  // ---------- Deploy ----------
  async function deployPage($m) {
    await loadSettings();
    $m.innerHTML = `<h1>Deploy</h1><p class="sub">The public site is rebuilt automatically whenever you publish, update or unpublish a post, or save settings.</p>
      <div class="card"><div class="card-b">
        <p style="margin-bottom:6px"><strong>Last rebuild requested:</strong> ${esc(fmtDateTime(settings.last_deploy_at))}</p>
        <p class="sub" style="margin:0 0 20px">A rebuild takes about a minute. Use the button if something on the live site looks out of date.</p>
        <button class="btn primary" id="dep">Rebuild site now</button>
      </div></div>`;
    $m.querySelector('#dep').onclick = async (e) => {
      e.target.disabled = true;
      if (await deploy(false)) deployPage($m);
      else e.target.disabled = false;
    };
  }

  // ---------- Boot ----------
  async function start(skipFlow) {
    const { data } = await sb.auth.getSession();
    if (!data.session) return renderLogin();
    if (authFlow && !skipFlow) return renderSetPassword(authFlow);
    const { data: prof } = await sb.from('profiles').select('id,email,display_name,role').eq('id', data.session.user.id).single();
    me = prof;
    if (!me || me.role === 'pending') {
      await sb.auth.signOut();
      return renderLogin("Your account doesn't have admin access yet. Ask an admin to invite you.");
    }
    await loadSettings();
    if (!/^#\/\w/.test(location.hash)) history.replaceState(null, '', location.pathname + '#/overview');
    renderShell();
    route();
  }

  window.addEventListener('hashchange', () => { if (me) route(); });
  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  sb.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') renderSetPassword('recovery');
    if (event === 'SIGNED_OUT') { me = null; renderLogin(); }
  });
  start();
})();
