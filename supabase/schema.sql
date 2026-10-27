-- LearnThenScroll admin — Supabase schema.
-- Run once in Supabase → SQL Editor, then run seed.sql.
-- Roles: 'admin' (everything), 'editor' (write/publish posts), 'pending' (no access).

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'pending' check (role in ('admin', 'editor', 'pending')),
  created_at timestamptz not null default now()
);

-- New auth users always start as 'pending'. Roles are granted by an admin
-- (Team page / api/invite) or, for the first admin, by hand in SQL.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean language sql stable as $$
  select coalesce(public.my_role() in ('admin', 'editor'), false);
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce(public.my_role() = 'admin', false);
$$;

-- Users may edit their own display name, but never their own role.
-- (auth.uid() is null for the SQL editor and the service-role key, which may.)
create or replace function public.protect_role()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_role();

alter table public.profiles enable row level security;
drop policy if exists "read own or admin" on public.profiles;
create policy "read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists "update own or admin" on public.profiles;
create policy "update own or admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());
drop policy if exists "admin delete" on public.profiles;
create policy "admin delete" on public.profiles
  for delete using (public.is_admin() and id <> auth.uid());

-- ---------- Posts ----------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  description text not null default '',
  seo_title text,
  category text,
  body_md text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  author_id uuid references public.profiles (id) on delete set null
);

create or replace function public.touch_post()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if new.status = 'published' and new.published_at is null then
    new.published_at = current_date;
  end if;
  return new;
end;
$$;

drop trigger if exists posts_touch on public.posts;
create trigger posts_touch
  before insert or update on public.posts
  for each row execute function public.touch_post();

alter table public.posts enable row level security;
drop policy if exists "public reads published" on public.posts;
create policy "public reads published" on public.posts
  for select using (status = 'published' or public.is_staff());
drop policy if exists "staff insert" on public.posts;
create policy "staff insert" on public.posts
  for insert with check (public.is_staff());
drop policy if exists "staff update" on public.posts;
create policy "staff update" on public.posts
  for update using (public.is_staff()) with check (public.is_staff());
drop policy if exists "admin delete" on public.posts;
create policy "admin delete" on public.posts
  for delete using (public.is_admin());

-- ---------- Settings (public, non-secret site settings) ----------
create table if not exists public.settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;
drop policy if exists "anyone reads" on public.settings;
create policy "anyone reads" on public.settings for select using (true);
drop policy if exists "admin writes" on public.settings;
create policy "admin writes" on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.settings (key, value) values
  ('site_url', 'https://learnthenscroll.com'),
  ('app_store_url', ''),
  ('play_store_url', ''),
  ('app_store_id', ''),
  ('last_deploy_at', '')
on conflict (key) do nothing;

-- ---------- Store clicks (download-button analytics) ----------
create table if not exists public.store_clicks (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  store text not null check (store in ('ios', 'android')),
  page_path text not null check (char_length(page_path) <= 300)
);
create index if not exists store_clicks_created_at on public.store_clicks (created_at desc);

alter table public.store_clicks enable row level security;
drop policy if exists "anyone logs a click" on public.store_clicks;
create policy "anyone logs a click" on public.store_clicks
  for insert with check (true);
drop policy if exists "staff reads clicks" on public.store_clicks;
create policy "staff reads clicks" on public.store_clicks
  for select using (public.is_staff());

-- Click totals for the admin Overview (runs with the caller's permissions, so staff only).
create or replace function public.click_stats(days int default 30)
returns table (store text, page_path text, clicks bigint)
language sql stable as $$
  select c.store, c.page_path, count(*)
  from public.store_clicks c
  where c.created_at > now() - make_interval(days => days)
  group by 1, 2
  order by 3 desc;
$$;
revoke execute on function public.click_stats(int) from public, anon;
grant execute on function public.click_stats(int) to authenticated;

-- ---------- Table grants ----------
grant select on public.posts, public.settings to anon, authenticated;
grant insert on public.store_clicks to anon, authenticated;
grant select on public.store_clicks to authenticated;
grant insert, update, delete on public.posts to authenticated;
grant insert, update, delete on public.settings to authenticated;
grant select, update, delete on public.profiles to authenticated;

-- ---------- Image uploads for posts ----------
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

drop policy if exists "staff upload blog images" on storage.objects;
create policy "staff upload blog images" on storage.objects
  for insert to authenticated with check (bucket_id = 'blog-images' and public.is_staff());
drop policy if exists "admin delete blog images" on storage.objects;
create policy "admin delete blog images" on storage.objects
  for delete to authenticated using (bucket_id = 'blog-images' and public.is_admin());
