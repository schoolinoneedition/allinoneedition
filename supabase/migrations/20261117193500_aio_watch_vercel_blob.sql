-- Optional Vercel Blob Watch episode index. Existing Backblaze B2 episode
-- records and public B2 metadata remain unchanged.
create table if not exists public.aio_watch_blob_episodes (
  series_id text not null check (series_id in
    ('pokemon','quint','dressup','demon','haikyu','drstone','spyfamily','frieren','myhero','bluelock','pokemon-tv-official','bluey','pocoyo','bing')),
  season_index smallint not null check (season_index between 0 and 49),
  episode_number smallint not null check (episode_number between 1 and 5000),
  blob_url text not null check (
    length(blob_url) between 50 and 2048 and
    blob_url ~* '^https://[a-z0-9-]+[.]public[.]blob[.]vercel-storage[.]com/watch/[a-z0-9-]+/[0-9]{1,2}/[0-9]{1,4}/[a-z0-9-]+[.](mp4|webm)([?][a-z0-9=&_-]+)?$'
  ),
  updated_by uuid not null default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key(series_id,season_index,episode_number)
);
alter table public.aio_watch_blob_episodes enable row level security;
revoke all on public.aio_watch_blob_episodes from public, anon, authenticated;
grant select on public.aio_watch_blob_episodes to anon, authenticated;
grant insert, update, delete on public.aio_watch_blob_episodes to authenticated;
drop policy if exists "Anyone can read published Vercel Watch episodes" on public.aio_watch_blob_episodes;
create policy "Anyone can read published Vercel Watch episodes"
  on public.aio_watch_blob_episodes for select to anon,authenticated using (true);
drop policy if exists "Only AIO owner can publish Vercel Watch episodes" on public.aio_watch_blob_episodes;
create policy "Only AIO owner can publish Vercel Watch episodes"
  on public.aio_watch_blob_episodes for insert to authenticated
  with check ((select private.is_aio_site_owner()) and updated_by=(select auth.uid()));
drop policy if exists "Only AIO owner can update Vercel Watch episodes" on public.aio_watch_blob_episodes;
create policy "Only AIO owner can update Vercel Watch episodes"
  on public.aio_watch_blob_episodes for update to authenticated
  using ((select private.is_aio_site_owner()))
  with check ((select private.is_aio_site_owner()) and updated_by=(select auth.uid()));
drop policy if exists "Only AIO owner can remove Vercel Watch episodes" on public.aio_watch_blob_episodes;
create policy "Only AIO owner can remove Vercel Watch episodes"
  on public.aio_watch_blob_episodes for delete to authenticated
  using ((select private.is_aio_site_owner()));
