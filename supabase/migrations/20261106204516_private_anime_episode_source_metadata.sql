-- Episode source URLs and provider metadata are private administration data.
drop policy if exists "Public can read anime episode watch links"
  on public.anime_episode_watch_links;

revoke all on public.anime_episode_watch_links from public, anon;
grant select, insert, update, delete on public.anime_episode_watch_links to authenticated;

drop policy if exists "Canonical owner can read anime episode watch links"
  on public.anime_episode_watch_links;

create policy "Canonical owner can read anime episode watch links"
  on public.anime_episode_watch_links
  for select
  to authenticated
  using ((select private.is_aio_site_owner()));
