-- All in One Edition A-Coins, quests, pricing and transaction security.
create schema if not exists private;

create table if not exists public.aio_coin_wallets (
 user_id uuid primary key references auth.users(id) on delete cascade,
 balance bigint not null default 0 check(balance>=0),
 updated_at timestamptz not null default now()
);
create table if not exists public.aio_coin_transactions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 amount integer not null check(amount<>0),
 kind text not null check(kind in ('session_reward','quest_reward','game_purchase','game_refund','admin_adjustment')),
 reference_id text, description text not null default '', created_at timestamptz not null default now()
);
create index if not exists aio_coin_transactions_user_created_idx on public.aio_coin_transactions(user_id,created_at desc);
create table if not exists public.aio_game_prices (
 game_id text primary key check(length(game_id) between 1 and 120),
 price integer not null default 0 check(price between 0 and 100000),
 updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
create table if not exists public.aio_game_purchases (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 game_id text not null check(length(game_id) between 1 and 120),
 price_paid integer not null check(price_paid>0), purchased_at timestamptz not null default now(),
 refunded_at timestamptz, unique(user_id,game_id)
);
create table if not exists public.aio_game_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 game_id text not null check(length(game_id) between 1 and 120),
 started_at timestamptz not null default now(), finished_at timestamptz,
 reward_paid integer not null default 0 check(reward_paid>=0)
);
create index if not exists aio_game_sessions_user_started_idx on public.aio_game_sessions(user_id,started_at desc);
create table if not exists public.aio_game_activity (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null unique references public.aio_game_sessions(id) on delete cascade,
 game_id text not null,
 day_key date not null default ((now() at time zone 'utc')::date),
 week_key date not null default (date_trunc('week',now() at time zone 'utc')::date),
 active_seconds integer not null check(active_seconds>=90), created_at timestamptz not null default now()
);
create index if not exists aio_game_activity_user_day_idx on public.aio_game_activity(user_id,day_key);
create index if not exists aio_game_activity_user_week_idx on public.aio_game_activity(user_id,week_key);
create table if not exists public.aio_quest_claims (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 quest_id text not null, period_key text not null, reward integer not null check(reward>0),
 claimed_at timestamptz not null default now(), unique(user_id,quest_id,period_key)
);

alter table public.aio_coin_wallets enable row level security;
alter table public.aio_coin_transactions enable row level security;
alter table public.aio_game_prices enable row level security;
alter table public.aio_game_purchases enable row level security;
alter table public.aio_game_sessions enable row level security;
alter table public.aio_game_activity enable row level security;
alter table public.aio_quest_claims enable row level security;

drop policy if exists aio_wallet_read_own on public.aio_coin_wallets;
create policy aio_wallet_read_own on public.aio_coin_wallets for select to authenticated using(user_id=auth.uid());
drop policy if exists aio_transactions_read_own on public.aio_coin_transactions;
create policy aio_transactions_read_own on public.aio_coin_transactions for select to authenticated using(user_id=auth.uid());
drop policy if exists aio_prices_read_all on public.aio_game_prices;
create policy aio_prices_read_all on public.aio_game_prices for select to anon,authenticated using(true);
drop policy if exists aio_purchases_read_own on public.aio_game_purchases;
create policy aio_purchases_read_own on public.aio_game_purchases for select to authenticated using(user_id=auth.uid());
drop policy if exists aio_sessions_read_own on public.aio_game_sessions;
create policy aio_sessions_read_own on public.aio_game_sessions for select to authenticated using(user_id=auth.uid());
drop policy if exists aio_activity_read_own on public.aio_game_activity;
create policy aio_activity_read_own on public.aio_game_activity for select to authenticated using(user_id=auth.uid());
drop policy if exists aio_claims_read_own on public.aio_quest_claims;
create policy aio_claims_read_own on public.aio_quest_claims for select to authenticated using(user_id=auth.uid());
revoke insert,update,delete on public.aio_coin_wallets,public.aio_coin_transactions,public.aio_game_prices,public.aio_game_purchases,public.aio_game_sessions,public.aio_game_activity,public.aio_quest_claims from anon,authenticated;
grant select on public.aio_game_prices to anon,authenticated;

create or replace function private.aio_is_owner() returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.staff_roles sr where sr.user_id=auth.uid() and sr.role='owner');
$$;
revoke all on function private.aio_is_owner() from public,anon,authenticated;

create or replace function public.aio_get_economy_state() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); today date:=(now() at time zone 'utc')::date; week_start date:=date_trunc('week',now() at time zone 'utc')::date; plays_today integer; unique_today integer; plays_week integer; bal bigint; quests jsonb;
begin
 if uid is null then raise exception 'Sign in to use A-Coins.'; end if;
 insert into public.aio_coin_wallets(user_id) values(uid) on conflict(user_id) do nothing;
 select balance into bal from public.aio_coin_wallets where user_id=uid;
 select count(*),count(distinct game_id) into plays_today,unique_today from public.aio_game_activity where user_id=uid and day_key=today;
 select count(*) into plays_week from public.aio_game_activity where user_id=uid and week_key=week_start;
 select jsonb_agg(jsonb_build_object('id',q.id,'title',q.title,'description',q.description,'target',q.target,'reward',q.reward,'period',q.period,
 'progress',least(q.target,case q.id when 'play_1_daily' then plays_today when 'play_3_daily' then plays_today when 'play_3_different_daily' then unique_today when 'play_10_weekly' then plays_week else 0 end),
 'claimed',exists(select 1 from public.aio_quest_claims c where c.user_id=uid and c.quest_id=q.id and c.period_key=case when q.period='daily' then today::text else week_start::text end)) order by q.period,q.target)
 into quests from (values
 ('play_1_daily','Warm up','Play one game for at least 90 seconds.',1,25,'daily'),
 ('play_3_daily','Triple play','Play three qualifying game sessions today.',3,75,'daily'),
 ('play_3_different_daily','Try something new','Play three different games today.',3,100,'daily'),
 ('play_10_weekly','Weekly player','Play ten qualifying sessions this week.',10,200,'weekly')
 ) as q(id,title,description,target,reward,period);
 return jsonb_build_object('balance',bal,'quests',coalesce(quests,'[]'::jsonb));
end $$;

create or replace function public.aio_start_game_session(p_game_id text) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); sid uuid;
begin
 if uid is null then raise exception 'Sign in to earn A-Coins.'; end if;
 if p_game_id is null or length(p_game_id) not between 1 and 120 then raise exception 'Invalid game ID.'; end if;
 insert into public.aio_coin_wallets(user_id) values(uid) on conflict(user_id) do nothing;
 insert into public.aio_game_sessions(user_id,game_id) values(uid,p_game_id) returning id into sid; return sid;
end $$;

create or replace function public.aio_finish_game_session(p_session_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); s public.aio_game_sessions%rowtype; seconds integer; paid integer:=0; daily_rewards integer;
begin
 if uid is null then raise exception 'Sign in to earn A-Coins.'; end if;
 select * into s from public.aio_game_sessions where id=p_session_id and user_id=uid for update;
 if not found then raise exception 'Game session not found.'; end if;
 if s.finished_at is not null then return jsonb_build_object('ok',true,'reward',s.reward_paid,'duplicate',true); end if;
 seconds:=floor(extract(epoch from(now()-s.started_at)))::integer;
 if seconds<90 then raise exception 'Play for at least 90 seconds before ending a rewarded session.'; end if;
 if seconds>14400 then seconds:=14400; end if;
 insert into public.aio_game_activity(user_id,session_id,game_id,active_seconds) values(uid,s.id,s.game_id,seconds) on conflict(session_id) do nothing;
 select count(*) into daily_rewards from public.aio_game_activity a join public.aio_game_sessions ss on ss.id=a.session_id where a.user_id=uid and a.day_key=(now() at time zone 'utc')::date and ss.reward_paid>0;
 if daily_rewards<5 then paid:=10;update public.aio_coin_wallets set balance=balance+paid,updated_at=now() where user_id=uid;insert into public.aio_coin_transactions(user_id,amount,kind,reference_id,description) values(uid,paid,'session_reward',s.id::text,'Game session reward');end if;
 update public.aio_game_sessions set finished_at=now(),reward_paid=paid where id=s.id;
 return jsonb_build_object('ok',true,'reward',paid,'seconds',seconds,'dailyCapReached',paid=0);
end $$;

create or replace function public.aio_claim_quest(p_quest_id text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); today date:=(now() at time zone 'utc')::date; week_start date:=date_trunc('week',now() at time zone 'utc')::date; target_count integer; reward_amount integer; period_name text; period_value text; actual integer;
begin
 if uid is null then raise exception 'Sign in to claim quests.'; end if;
 case p_quest_id when 'play_1_daily' then target_count:=1;reward_amount:=25;period_name:='daily';when 'play_3_daily' then target_count:=3;reward_amount:=75;period_name:='daily';when 'play_3_different_daily' then target_count:=3;reward_amount:=100;period_name:='daily';when 'play_10_weekly' then target_count:=10;reward_amount:=200;period_name:='weekly';else raise exception 'Unknown quest.';end case;
 period_value:=case when period_name='daily' then today::text else week_start::text end;
 if exists(select 1 from public.aio_quest_claims where user_id=uid and quest_id=p_quest_id and period_key=period_value) then raise exception 'This quest reward has already been claimed.';end if;
 if p_quest_id='play_3_different_daily' then select count(distinct game_id) into actual from public.aio_game_activity where user_id=uid and day_key=today;
 elsif period_name='daily' then select count(*) into actual from public.aio_game_activity where user_id=uid and day_key=today;
 else select count(*) into actual from public.aio_game_activity where user_id=uid and week_key=week_start;end if;
 if actual<target_count then raise exception 'Quest is not complete yet.';end if;
 insert into public.aio_coin_wallets(user_id) values(uid) on conflict(user_id) do nothing;
 insert into public.aio_quest_claims(user_id,quest_id,period_key,reward) values(uid,p_quest_id,period_value,reward_amount);
 update public.aio_coin_wallets set balance=balance+reward_amount,updated_at=now() where user_id=uid;
 insert into public.aio_coin_transactions(user_id,amount,kind,reference_id,description) values(uid,reward_amount,'quest_reward',p_quest_id||':'||period_value,'Quest reward: '||p_quest_id);
 return jsonb_build_object('ok',true,'reward',reward_amount);
end $$;

create or replace function public.aio_set_game_price(p_game_id text,p_price integer) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not private.aio_is_owner() then raise exception 'Owner permission required.';end if;
 if p_game_id is null or length(p_game_id) not between 1 and 120 or p_price is null or p_price not between 0 and 100000 then raise exception 'Invalid game price.';end if;
 insert into public.aio_game_prices(game_id,price,updated_by) values(p_game_id,p_price,auth.uid()) on conflict(game_id) do update set price=excluded.price,updated_by=excluded.updated_by,updated_at=now();
 return jsonb_build_object('ok',true,'gameId',p_game_id,'price',p_price);
end $$;

create or replace function public.aio_buy_game(p_game_id text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); p integer; bal bigint; purchase public.aio_game_purchases%rowtype;
begin
 if uid is null then raise exception 'Sign in to purchase games.';end if;
 if exists(select 1 from public.aio_game_purchases where user_id=uid and game_id=p_game_id and refunded_at is null) then return jsonb_build_object('ok',true,'alreadyOwned',true);end if;
 select price into p from public.aio_game_prices where game_id=p_game_id;
 if coalesce(p,0)<=0 then return jsonb_build_object('ok',true,'free',true);end if;
 insert into public.aio_coin_wallets(user_id) values(uid) on conflict(user_id) do nothing;
 select balance into bal from public.aio_coin_wallets where user_id=uid for update;
 if bal<p then raise exception 'Not enough A-Coins.';end if;
 update public.aio_coin_wallets set balance=balance-p,updated_at=now() where user_id=uid;
 insert into public.aio_game_purchases(user_id,game_id,price_paid) values(uid,p_game_id,p) returning * into purchase;
 insert into public.aio_coin_transactions(user_id,amount,kind,reference_id,description) values(uid,-p,'game_purchase',purchase.id::text,'Game purchase: '||p_game_id);
 return jsonb_build_object('ok',true,'purchaseId',purchase.id,'price',p);
end $$;

create or replace function public.aio_refund_game_purchase(p_purchase_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare purchase public.aio_game_purchases%rowtype;
begin
 if auth.uid() is null or not private.aio_is_owner() then raise exception 'Owner permission required.';end if;
 select * into purchase from public.aio_game_purchases where id=p_purchase_id for update;
 if not found then raise exception 'Purchase not found.';end if;
 if purchase.refunded_at is not null then raise exception 'Purchase has already been refunded.';end if;
 update public.aio_game_purchases set refunded_at=now() where id=p_purchase_id;
 update public.aio_coin_wallets set balance=balance+purchase.price_paid,updated_at=now() where user_id=purchase.user_id;
 insert into public.aio_coin_transactions(user_id,amount,kind,reference_id,description) values(purchase.user_id,purchase.price_paid,'game_refund',purchase.id::text,'Refund for game: '||purchase.game_id);
 return jsonb_build_object('ok',true,'refund',purchase.price_paid);
end $$;

create or replace function public.aio_owner_economy_admin() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare out_prices jsonb;out_purchases jsonb;
begin
 if auth.uid() is null or not private.aio_is_owner() then raise exception 'Owner permission required.';end if;
 select coalesce(jsonb_agg(jsonb_build_object('gameId',game_id,'price',price,'updatedAt',updated_at) order by updated_at desc),'[]'::jsonb) into out_prices from public.aio_game_prices;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'userId',p.user_id,'gameId',p.game_id,'price',p.price_paid,'purchasedAt',p.purchased_at,'refundedAt',p.refunded_at) order by p.purchased_at desc),'[]'::jsonb) into out_purchases from public.aio_game_purchases p;
 return jsonb_build_object('prices',out_prices,'purchases',out_purchases);
end $$;

revoke all on function public.aio_get_economy_state() from public,anon;
revoke all on function public.aio_start_game_session(text) from public,anon;
revoke all on function public.aio_finish_game_session(uuid) from public,anon;
revoke all on function public.aio_claim_quest(text) from public,anon;
revoke all on function public.aio_set_game_price(text,integer) from public,anon;
revoke all on function public.aio_buy_game(text) from public,anon;
revoke all on function public.aio_refund_game_purchase(uuid) from public,anon;
revoke all on function public.aio_owner_economy_admin() from public,anon;
grant execute on function public.aio_get_economy_state() to authenticated;
grant execute on function public.aio_start_game_session(text) to authenticated;
grant execute on function public.aio_finish_game_session(uuid) to authenticated;
grant execute on function public.aio_claim_quest(text) to authenticated;
grant execute on function public.aio_set_game_price(text,integer) to authenticated;
grant execute on function public.aio_buy_game(text) to authenticated;
grant execute on function public.aio_refund_game_purchase(uuid) to authenticated;
grant execute on function public.aio_owner_economy_admin() to authenticated;
