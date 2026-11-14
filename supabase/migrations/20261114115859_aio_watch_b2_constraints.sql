-- Permit owner-managed B2 episodes and all shows currently listed in Watch.
-- Keep the original provider restrictions and owner-only write policies.
alter table public.anime_episode_watch_links
  drop constraint anime_episode_watch_links_series_id_check,
  drop constraint anime_episode_watch_links_provider_check,
  drop constraint anime_episode_watch_links_watch_url_check;

alter table public.anime_episode_watch_links
  add constraint anime_episode_watch_links_series_id_check check (
    series_id in ('pokemon','quint','dressup','demon','haikyu','drstone','spyfamily','frieren','myhero','bluelock','pokemon-tv-official','bluey','pocoyo','bing')
  ),
  add constraint anime_episode_watch_links_provider_check check (
    provider in ('Crunchyroll','Netflix','Prime Video','Disney+','HIDIVE','BBC iPlayer','ITVX','Channel 4','My5','JustWatch','Self-hosted video','XBT Storage','B2 Storage')
  ),
  add constraint anime_episode_watch_links_watch_url_check check (
    char_length(watch_url) between 12 and 2048 and (
      (provider = 'B2 Storage' and watch_url ~ '^https://all-in-one-edition-media[.]plsgivemediscord981[.]workers[.]dev/media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
      or (provider = 'Self-hosted video' and watch_url ~* '^https://allinoneedition[.]vercel[.]app/videos/.+[.](mp4|webm)([?].*)?$')
      or (provider = 'XBT Storage' and watch_url ~* '^https://btnbuchsrfllpzlypjtn[.]supabase[.]co/storage/v1/object/public/anime-episodes/.+[.](mp4|webm)([?].*)?$')
      or (provider in ('Crunchyroll','Netflix','Prime Video','Disney+','HIDIVE','BBC iPlayer','ITVX','Channel 4','My5','JustWatch')
          and watch_url ~* '^https://([a-z0-9-]+[.])*(crunchyroll[.]com|netflix[.]com|primevideo[.]com|amazon[.]co[.]uk|amazon[.]com|disneyplus[.]com|hidive[.]com|bbc[.]co[.]uk|itv[.]com|channel4[.]com|my5[.]tv|justwatch[.]com)(/|[?#])'
          and watch_url !~* '[.](mp4|m3u8|mpd|webm|mkv)([?#]|$)')
    )
  );
