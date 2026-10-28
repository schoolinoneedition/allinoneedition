create table if not exists public.aio_game_reward_rules (
 game_id text primary key check(length(game_id) between 1 and 120),
 reward integer not null default 0 check(reward between 0 and 50),
 quest_eligible boolean not null default false,
 category text not null default 'Other',
 source text not null default '',
 enabled boolean not null default true,
 updated_at timestamptz not null default now()
);
alter table public.aio_game_reward_rules enable row level security;
revoke all on public.aio_game_reward_rules from anon,authenticated;
insert into public.aio_game_reward_rules(game_id,reward,quest_eligible,category,source) values
('slime-keyboard-escape',10,true,'Platformer','Pizza Edition'),
('ant-flap',10,true,'Arcade','mashukui/web-games'),
('ant-jump',10,true,'Arcade','mashukui/web-games'),
('block-drop',10,true,'Arcade','mashukui/web-games'),
('breakout',10,true,'Arcade','mashukui/web-games'),
('paddle-duel',10,true,'Arcade','mashukui/web-games'),
('stack-tower',10,true,'Arcade','mashukui/web-games'),
('whack-a-mole',10,true,'Arcade','mashukui/web-games'),
('snake',10,true,'Classic','mashukui/web-games'),
('tic-tac-toe',10,true,'Classic','mashukui/web-games'),
('connect-four',10,true,'Classic','mashukui/web-games'),
('2048',10,true,'Puzzle','mashukui/web-games'),
('minesweeper',10,true,'Puzzle','mashukui/web-games'),
('memory-match',10,true,'Puzzle','mashukui/web-games'),
('dino-run',10,true,'Action','mashukui/web-games'),
('piano-tap',10,true,'Arcade','mashukui/web-games'),
('cross-road',10,true,'Arcade','mashukui/web-games'),
('slide-puzzle',10,true,'Puzzle','mashukui/web-games'),
('bubble-shooter',10,true,'Arcade','mashukui/web-games'),
('sudoku',10,true,'Puzzle','mashukui/web-games'),
('merge-drop',10,true,'Puzzle','mashukui/web-games'),
('water-sort',10,true,'Puzzle','mashukui/web-games'),
('helix-drop',10,true,'Action','mashukui/web-games'),
('gem-match',10,true,'Puzzle','mashukui/web-games'),
('maze-muncher',10,true,'Arcade','mashukui/web-games'),
('air-hockey',10,true,'Action','mashukui/web-games'),
('reversi',10,true,'Classic','mashukui/web-games'),
('sokoban',10,true,'Puzzle','mashukui/web-games'),
('lights-out',10,true,'Puzzle','mashukui/web-games'),
('hanoi',10,true,'Puzzle','mashukui/web-games'),
('pipe-connect',10,true,'Puzzle','mashukui/web-games'),
('rush-hour',10,true,'Puzzle','mashukui/web-games'),
('mahjong-link',10,true,'Puzzle','mashukui/web-games'),
('nonogram',10,true,'Puzzle','mashukui/web-games'),
('checkers',10,true,'Classic','mashukui/web-games'),
('snakes-ladders',10,true,'Classic','mashukui/web-games'),
('hoop-shot',10,true,'Action','mashukui/web-games'),
('mini-golf',10,true,'Action','mashukui/web-games'),
('helicopter',10,true,'Arcade','mashukui/web-games'),
('balloon-pop',10,true,'Arcade','mashukui/web-games'),
('simon-says',10,true,'Arcade','mashukui/web-games'),
('gomoku',10,true,'Classic','mashukui/web-games'),
('mancala',10,true,'Classic','mashukui/web-games'),
('bowling',10,true,'Action','mashukui/web-games'),
('penalty-kick',10,true,'Action','mashukui/web-games')
on conflict(game_id) do update set reward=excluded.reward,quest_eligible=excluded.quest_eligible,category=excluded.category,source=excluded.source,enabled=true,updated_at=now();
create or replace function public.aio_start_game_session(p_game_id text) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); sid uuid; rule public.aio_game_reward_rules%rowtype;
begin
 if uid is null then raise exception 'Sign in to earn A-Coins.'; end if;
 if p_game_id is null or length(p_game_id) not between 1 and 120 then raise exception 'Invalid game ID.'; end if;
 select * into rule from public.aio_game_reward_rules where game_id=p_game_id and enabled=true and reward>0;
 if not found then raise exception 'This game is not configured for A-Coin rewards.'; end if;
 insert into public.aio_coin_wallets(user_id) values(uid) on conflict(user_id) do nothing;
 insert into public.aio_game_sessions(user_id,game_id) values(uid,p_game_id) returning id into sid; return sid;
end $$;
create or replace function public.aio_finish_game_session(p_session_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); s public.aio_game_sessions%rowtype; rule public.aio_game_reward_rules%rowtype; seconds integer; paid integer:=0; daily_rewards integer;
begin
 if uid is null then raise exception 'Sign in to earn A-Coins.'; end if;
 select * into s from public.aio_game_sessions where id=p_session_id and user_id=uid for update;
 if not found then raise exception 'Game session not found.'; end if;
 if s.finished_at is not null then return jsonb_build_object('ok',true,'reward',s.reward_paid,'duplicate',true); end if;
 select * into rule from public.aio_game_reward_rules where game_id=s.game_id and enabled=true and reward>0;
 if not found then raise exception 'This game is not configured for A-Coin rewards.'; end if;
 seconds:=floor(extract(epoch from(now()-s.started_at)))::integer;
 if seconds<90 then raise exception 'Play for at least 90 seconds before ending a rewarded session.'; end if;
 if seconds>14400 then seconds:=14400; end if;
 if rule.quest_eligible then insert into public.aio_game_activity(user_id,session_id,game_id,active_seconds) values(uid,s.id,s.game_id,seconds) on conflict(session_id) do nothing; end if;
 select count(*) into daily_rewards from public.aio_game_activity a join public.aio_game_sessions ss on ss.id=a.session_id where a.user_id=uid and a.day_key=(now() at time zone 'utc')::date and ss.reward_paid>0;
 if daily_rewards<5 then paid:=rule.reward;update public.aio_coin_wallets set balance=balance+paid,updated_at=now() where user_id=uid;insert into public.aio_coin_transactions(user_id,amount,kind,reference_id,description) values(uid,paid,'session_reward',s.id::text,'Game session reward');end if;
 update public.aio_game_sessions set finished_at=now(),reward_paid=paid where id=s.id;
 return jsonb_build_object('ok',true,'reward',paid,'seconds',seconds,'dailyCapReached',paid=0);
end $$;
revoke all on function public.aio_start_game_session(text) from public,anon;
revoke all on function public.aio_finish_game_session(uuid) from public,anon;
grant execute on function public.aio_start_game_session(text) to authenticated;
grant execute on function public.aio_finish_game_session(uuid) to authenticated;