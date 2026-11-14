-- Public playback exposes only the episode key and an opaque, already-public
-- media id. Owner-only source metadata remains in anime_episode_watch_links.
create table if not exists public.aio_watch_public_episodes (
  series_id text not null,
  season_index smallint not null,
  episode_number smallint not null,
  media_id uuid not null references public.aio_media_objects(id) on delete cascade,
  primary key (series_id, season_index, episode_number)
);
alter table public.aio_watch_public_episodes enable row level security;
revoke all on public.aio_watch_public_episodes from public, anon, authenticated;
grant select on public.aio_watch_public_episodes to anon, authenticated;
create policy "Public can see hosted episode availability"
 on public.aio_watch_public_episodes for select to anon, authenticated using (true);
create index if not exists aio_watch_public_episodes_media_id_idx on public.aio_watch_public_episodes(media_id);

create function private.aio_sync_public_watch_episode()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
 media_text text;
 media_uuid uuid;
begin
 if (select auth.uid()) is null or not (select private.is_aio_site_owner()) then
  raise exception 'Only the site owner may publish episodes';
 end if;
 if tg_op in ('UPDATE','DELETE') then
  delete from public.aio_watch_public_episodes
   where series_id=old.series_id and season_index=old.season_index and episode_number=old.episode_number;
 end if;
 if tg_op='DELETE' then return old; end if;
 if new.provider='B2 Storage' then
  media_text := substring(new.watch_url from '^https://all-in-one-edition-media[.]plsgivemediscord981[.]workers[.]dev/media/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$');
  if media_text is not null then
   media_uuid := media_text::uuid;
   if exists (select 1 from public.aio_media_objects m where m.id=media_uuid and m.status='ready' and m.visibility='public') then
    insert into public.aio_watch_public_episodes(series_id,season_index,episode_number,media_id)
    values(new.series_id,new.season_index,new.episode_number,media_uuid)
    on conflict(series_id,season_index,episode_number) do update set media_id=excluded.media_id;
   end if;
  end if;
 end if;
 return new;
end;
$$;
revoke all on function private.aio_sync_public_watch_episode() from public, anon, authenticated;
create trigger aio_sync_public_watch_episode after insert or update or delete on public.anime_episode_watch_links
 for each row execute function private.aio_sync_public_watch_episode();

-- Retain existing public B2 episodes if the project already contains any.
insert into public.aio_watch_public_episodes(series_id,season_index,episode_number,media_id)
select w.series_id,w.season_index,w.episode_number,m.id
from public.anime_episode_watch_links w
join public.aio_media_objects m on m.id = case
 when w.provider='B2 Storage' and w.watch_url ~ '^https://all-in-one-edition-media[.]plsgivemediscord981[.]workers[.]dev/media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 then split_part(w.watch_url,'/',5)::uuid else null end
where m.status='ready' and m.visibility='public'
on conflict(series_id,season_index,episode_number) do update set media_id=excluded.media_id;
