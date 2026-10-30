-- Anime Zone owner-managed episode video storage.
-- Public downloads are intentional: every file in this bucket must be cleared for public distribution.
-- Only the verified site owner may upload or delete objects.

create table if not exists public.anime_episode_watch_links (
  series_id text not null,
  season_index smallint not null,
  episode_number smallint not null,
  provider text not null,
  watch_url text not null,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (series_id, season_index, episode_number),
  constraint anime_episode_watch_links_series_id_check
    check (series_id in ('pokemon','quint','dressup','demon','haikyu','drstone','spyfamily','frieren','myhero','bluelock')),
  constraint anime_episode_watch_links_season_index_check
    check (season_index between 0 and 99),
  constraint anime_episode_watch_links_episode_number_check
    check (episode_number between 1 and 2000)
);

alter table public.anime_episode_watch_links enable row level security;

alter table public.anime_episode_watch_links
  drop constraint if exists anime_episode_watch_links_provider_check;
alter table public.anime_episode_watch_links
  add constraint anime_episode_watch_links_provider_check
  check (provider in (
    'Crunchyroll','Netflix','Prime Video','Disney+','HIDIVE',
    'BBC iPlayer','ITVX','Channel 4','My5','JustWatch',
    'Self-hosted video','XBT Storage'
  ));

alter table public.anime_episode_watch_links
  drop constraint if exists anime_episode_watch_links_watch_url_check;
alter table public.anime_episode_watch_links
  add constraint anime_episode_watch_links_watch_url_check
  check (
    char_length(watch_url) between 12 and 2048
    and (
      (
        provider = 'Self-hosted video'
        and watch_url ~* '^https://(allinoneedition\\.vercel\\.app/.+|schoolinoneedition\\.github\\.io/allinoneedition/.+)\\.(mp4|webm)(\\?.*)?$'
      )
      or
      (
        provider = 'XBT Storage'
        and watch_url ~* '^https://btnbuchsrfllpzlypjtn\\.supabase\\.co/storage/v1/object/public/anime-episodes/.+\\.(mp4|webm)(\\?.*)?$'
      )
      or
      (
        provider not in ('Self-hosted video','XBT Storage')
        and provider in (
          'Crunchyroll','Netflix','Prime Video','Disney+','HIDIVE',
          'BBC iPlayer','ITVX','Channel 4','My5','JustWatch'
        )
        and watch_url ~* '^https://([a-z0-9-]+\\.)*(crunchyroll\\.com|netflix\\.com|primevideo\\.com|amazon\\.co\\.uk|amazon\\.com|disneyplus\\.com|hidive\\.com|bbc\\.co\\.uk|itv\\.com|channel4\\.com|my5\\.tv|justwatch\\.com)(/|[?#])'
        and watch_url !~* '\\.(mp4|m3u8|mpd|webm|mkv)([?#]|$)'
      )
    )
  );

drop policy if exists "Public can read anime episode watch links" on public.anime_episode_watch_links;
create policy "Public can read anime episode watch links"
  on public.anime_episode_watch_links
  for select to anon, authenticated
  using (true);

drop policy if exists "Site owner can add anime episode watch links" on public.anime_episode_watch_links;
create policy "Site owner can add anime episode watch links"
  on public.anime_episode_watch_links
  for insert to authenticated
  with check (
    (select private.is_aio_site_owner())
    and updated_by = (select auth.uid())
  );

drop policy if exists "Site owner can update anime episode watch links" on public.anime_episode_watch_links;
create policy "Site owner can update anime episode watch links"
  on public.anime_episode_watch_links
  for update to authenticated
  using ((select private.is_aio_site_owner()))
  with check (
    (select private.is_aio_site_owner())
    and updated_by = (select auth.uid())
  );

drop policy if exists "Site owner can delete anime episode watch links" on public.anime_episode_watch_links;
create policy "Site owner can delete anime episode watch links"
  on public.anime_episode_watch_links
  for delete to authenticated
  using ((select private.is_aio_site_owner()));

revoke all privileges on table public.anime_episode_watch_links from anon, authenticated;
grant select on table public.anime_episode_watch_links to anon, authenticated;
grant insert, update, delete on table public.anime_episode_watch_links to authenticated;

create index if not exists anime_episode_watch_links_updated_by_idx
  on public.anime_episode_watch_links (updated_by);

-- The current XBT project is on Supabase Free, so its per-file cap is 50 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anime-episodes', 'anime-episodes', true, 52428800, array['video/mp4','video/webm'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = array['video/mp4','video/webm'];

-- Public buckets serve known object URLs without a SELECT policy, so clients cannot list the whole bucket.
drop policy if exists "Public can download anime episodes" on storage.objects;
drop policy if exists "Site owner can upload anime episodes" on storage.objects;
create policy "Site owner can upload anime episodes"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'anime-episodes'
    and (select private.is_aio_site_owner())
  );

drop policy if exists "Site owner can delete anime episodes" on storage.objects;
create policy "Site owner can delete anime episodes"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'anime-episodes'
    and (select private.is_aio_site_owner())
  );
