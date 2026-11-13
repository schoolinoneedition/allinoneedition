-- Retire the A-Coins game economy without deleting any historical user records.
-- Every game is free. Existing wallet/transaction data stays archived server-side.
-- Game submissions, game owner tools, Social, Watch and Auth are not affected.

begin;

update public.aio_game_prices set price=0 where price<>0;
update public.aio_game_submissions set coin_price=0 where coin_price<>0;

alter table public.aio_game_prices
  add constraint aio_game_prices_all_free check (price=0);
alter table public.aio_game_submissions
  add constraint aio_submissions_all_free check (coalesce(coin_price,0)=0);

-- Stop all new earning, quest claims, purchases, pricing changes and refunds.
revoke all on function public.aio_buy_game(text) from public, anon, authenticated;
revoke all on function public.aio_claim_quest(text) from public, anon, authenticated;
revoke all on function public.aio_finish_game_session(uuid) from public, anon, authenticated;
revoke all on function public.aio_get_economy_state() from public, anon, authenticated;
revoke all on function public.aio_owner_economy_admin() from public, anon, authenticated;
revoke all on function public.aio_refund_game_purchase(uuid) from public, anon, authenticated;
revoke all on function public.aio_set_game_price(text,integer) from public, anon, authenticated;
revoke all on function public.aio_start_game_session(text) from public, anon, authenticated;

-- Preserve account history privately, but do not expose the retired economy through REST.
revoke all on table
  public.aio_coin_transactions,
  public.aio_coin_wallets,
  public.aio_game_prices,
  public.aio_game_purchases,
  public.aio_game_reward_rules,
  public.aio_game_sessions,
  public.aio_quest_claims
from public, anon, authenticated;

commit;
