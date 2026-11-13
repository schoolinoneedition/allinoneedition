-- Owner-managed, single-file HTML games.
-- Uploaded source is always executed in a sandboxed, opaque-origin iframe;
-- it is never inserted into the main page's DOM or served as executable HTML.
create table if not exists public.aio_uploaded_html_games (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  title text not null check (char_length(btrim(title)) between 3 and 80),
  description text not null default '' check (char_length(description) <= 1000),
  category text not null default 'Arcade'
    check (category in ('Arcade','Classic','Puzzle','Action','Platformer','Racing','Sports','Casual','Idle','Other')),
  thumbnail_url text not null default ''
    check (char_length(thumbnail_url) <= 2048 and (thumbnail_url = '' or thumbnail_url ~* '^https://[^[:space:]]+$')),
  html_content text not null check (octet_length(html_content) between 64 and 524288),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists aio_uploaded_html_games_published_idx
  on public.aio_uploaded_html_games(published, created_at desc);
alter table public.aio_uploaded_html_games enable row level security;
revoke all on table public.aio_uploaded_html_games from public, anon, authenticated;
grant select on table public.aio_uploaded_html_games to anon, authenticated;
grant insert, update, delete on table public.aio_uploaded_html_games to authenticated;

drop policy if exists "Everyone can see published HTML games" on public.aio_uploaded_html_games;
create policy "Everyone can see published HTML games"
  on public.aio_uploaded_html_games for select to anon, authenticated
  using (published = true);

drop policy if exists "Owner can see unpublished HTML games" on public.aio_uploaded_html_games;
create policy "Owner can see unpublished HTML games"
  on public.aio_uploaded_html_games for select to authenticated
  using (owner_id = (select auth.uid()) and (select private.is_aio_site_owner()));

drop policy if exists "Only pinned owner can upload HTML games" on public.aio_uploaded_html_games;
create policy "Only pinned owner can upload HTML games"
  on public.aio_uploaded_html_games for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select private.is_aio_site_owner()));

drop policy if exists "Only pinned owner can change HTML games" on public.aio_uploaded_html_games;
create policy "Only pinned owner can change HTML games"
  on public.aio_uploaded_html_games for update to authenticated
  using (owner_id = (select auth.uid()) and (select private.is_aio_site_owner()))
  with check (owner_id = (select auth.uid()) and (select private.is_aio_site_owner()));

drop policy if exists "Only pinned owner can delete HTML games" on public.aio_uploaded_html_games;
create policy "Only pinned owner can delete HTML games"
  on public.aio_uploaded_html_games for delete to authenticated
  using (owner_id = (select auth.uid()) and (select private.is_aio_site_owner()));
