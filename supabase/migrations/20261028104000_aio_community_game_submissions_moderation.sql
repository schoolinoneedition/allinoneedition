create table if not exists public.aio_game_submissions (
 id uuid primary key default gen_random_uuid(),
 submitter_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(char_length(title) between 3 and 80),
 description text not null default '' check(char_length(description)<=1000),
 category text not null default 'Other' check(category in ('Arcade','Classic','Puzzle','Action','Platformer','Racing','Sports','Casual','Idle','Other')),
 thumbnail_url text not null default '' check(char_length(thumbnail_url)<=2048),
 game_url text not null check(char_length(game_url)<=2048),
 controls text not null default '' check(char_length(controls)<=500),
 creator_name text not null default '' check(char_length(creator_name)<=80),
 status text not null default 'pending' check(status in ('pending','approved','rejected','removed')),
 featured boolean not null default false,
 coin_price integer not null default 0 check(coin_price between 0 and 100000),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 review_note text not null default '' check(char_length(review_note)<=500),
 created_at timestamptz not null default now()
);
create index if not exists aio_game_submissions_status_created_idx on public.aio_game_submissions(status,created_at desc);
create index if not exists aio_game_submissions_submitter_idx on public.aio_game_submissions(submitter_id,created_at desc);
alter table public.aio_game_submissions enable row level security;
drop policy if exists aio_game_submissions_read_public_or_own on public.aio_game_submissions;
create policy aio_game_submissions_read_public_or_own on public.aio_game_submissions for select to anon,authenticated using(status='approved' or submitter_id=auth.uid());
revoke insert,update,delete on public.aio_game_submissions from anon,authenticated;
grant select on public.aio_game_submissions to anon,authenticated;

create or replace function public.aio_submit_game(p_title text,p_description text,p_category text,p_thumbnail_url text,p_game_url text,p_controls text,p_creator_name text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); new_id uuid; game_url_value text:=trim(coalesce(p_game_url,'')); thumb_value text:=trim(coalesce(p_thumbnail_url,''));
begin
 if uid is null then raise exception 'Sign in to submit a game.'; end if;
 if char_length(trim(coalesce(p_title,''))) not between 3 and 80 then raise exception 'Title must be 3–80 characters.'; end if;
 if char_length(coalesce(p_description,''))>1000 or char_length(coalesce(p_controls,''))>500 or char_length(coalesce(p_creator_name,''))>80 then raise exception 'One of the fields is too long.'; end if;
 if p_category not in ('Arcade','Classic','Puzzle','Action','Platformer','Racing','Sports','Casual','Idle','Other') then raise exception 'Choose a valid category.'; end if;
 if game_url_value !~* '^https://[^[:space:]]+$' then raise exception 'Game URL must be an HTTPS link.'; end if;
 if thumb_value<>'' and thumb_value !~* '^https://[^[:space:]]+$' then raise exception 'Thumbnail URL must be HTTPS.'; end if;
 insert into public.aio_game_submissions(submitter_id,title,description,category,thumbnail_url,game_url,controls,creator_name)
 values(uid,trim(p_title),trim(coalesce(p_description,'')),p_category,thumb_value,game_url_value,trim(coalesce(p_controls,'')),trim(coalesce(p_creator_name,'')))
 returning id into new_id;
 return new_id;
end $$;

create or replace function public.aio_owner_game_submissions()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if auth.uid() is null or not private.aio_is_owner() then raise exception 'Owner permission required.'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'title',s.title,'description',s.description,'category',s.category,'thumbnailUrl',s.thumbnail_url,'gameUrl',s.game_url,'controls',s.controls,'creatorName',s.creator_name,'status',s.status,'featured',s.featured,'coinPrice',s.coin_price,'reviewNote',s.review_note,'createdAt',s.created_at) order by case when s.status='pending' then 0 else 1 end,s.created_at desc),'[]'::jsonb)
 into result from public.aio_game_submissions s;
 return result;
end $$;

create or replace function public.aio_review_game_submission(p_submission_id uuid,p_status text,p_featured boolean,p_coin_price integer,p_review_note text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.aio_game_submissions%rowtype; game_key text;
begin
 if auth.uid() is null or not private.aio_is_owner() then raise exception 'Owner permission required.'; end if;
 if p_status not in ('approved','rejected','removed') then raise exception 'Invalid moderation status.'; end if;
 if p_coin_price is null or p_coin_price not between 0 and 100000 then raise exception 'Invalid A-Coin price.'; end if;
 select * into s from public.aio_game_submissions where id=p_submission_id for update;
 if not found then raise exception 'Submission not found.'; end if;
 update public.aio_game_submissions set status=p_status,featured=coalesce(p_featured,false),coin_price=p_coin_price,reviewed_by=auth.uid(),reviewed_at=now(),review_note=left(coalesce(p_review_note,''),500) where id=p_submission_id;
 game_key:='community-'||s.id::text;
 if p_status='approved' then
   insert into public.aio_game_prices(game_id,price,updated_by) values(game_key,p_coin_price,auth.uid())
   on conflict(game_id) do update set price=excluded.price,updated_by=excluded.updated_by,updated_at=now();
 else
   update public.aio_game_prices set price=0,updated_by=auth.uid(),updated_at=now() where game_id=game_key;
 end if;
 return jsonb_build_object('ok',true,'id',p_submission_id,'status',p_status);
end $$;

revoke all on function public.aio_submit_game(text,text,text,text,text,text,text) from public,anon;
revoke all on function public.aio_owner_game_submissions() from public,anon;
revoke all on function public.aio_review_game_submission(uuid,text,boolean,integer,text) from public,anon;
grant execute on function public.aio_submit_game(text,text,text,text,text,text,text) to authenticated;
grant execute on function public.aio_owner_game_submissions() to authenticated;
grant execute on function public.aio_review_game_submission(uuid,text,boolean,integer,text) to authenticated;