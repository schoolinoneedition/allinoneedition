
create table if not exists public.tiktok_sticker_download_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  sticker_id uuid not null references public.tiktok_stickers(id) on delete cascade,
  day_key date not null default ((now() at time zone 'utc')::date),
  created_at timestamptz not null default now(),
  primary key (user_id, sticker_id, day_key)
);
alter table public.tiktok_sticker_download_events enable row level security;
revoke all on table public.tiktok_sticker_download_events from public, anon, authenticated;

create or replace function public.increment_tiktok_sticker_downloads(sticker_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  uid uuid := auth.uid();
  current_downloads bigint;
  inserted_count integer;
begin
  if uid is null then
    raise exception 'Sign in to count sticker downloads.' using errcode = '42501';
  end if;
  if sticker_id is null then
    raise exception 'A valid sticker is required.' using errcode = '22023';
  end if;

  insert into public.tiktok_sticker_download_events(user_id, sticker_id, day_key)
  select uid, s.id, (now() at time zone 'utc')::date
  from public.tiktok_stickers s
  where s.id = sticker_id
  on conflict (user_id, sticker_id, day_key) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then
    select s.downloads into current_downloads
    from public.tiktok_stickers s
    where s.id = sticker_id;
    if not found then
      raise exception 'Sticker not found.' using errcode = 'P0002';
    end if;
    return current_downloads;
  end if;

  update public.tiktok_stickers
  set downloads = downloads + 1
  where id = sticker_id
  returning downloads into current_downloads;
  if not found then
    raise exception 'Sticker not found.' using errcode = 'P0002';
  end if;
  return current_downloads;
end;
$function$;

revoke all on function public.increment_tiktok_sticker_downloads(uuid) from public, anon, authenticated;
grant execute on function public.increment_tiktok_sticker_downloads(uuid) to authenticated;
