-- Lock down A-Coins RPC execution to signed-in users and grant own-row read access.
grant select on public.aio_coin_wallets, public.aio_coin_transactions, public.aio_game_purchases, public.aio_game_sessions, public.aio_game_activity, public.aio_quest_claims to authenticated;
grant select on public.aio_game_prices to anon, authenticated;
revoke all on function public.aio_get_economy_state() from public, anon;
revoke all on function public.aio_start_game_session(text) from public, anon;
revoke all on function public.aio_finish_game_session(uuid) from public, anon;
revoke all on function public.aio_claim_quest(text) from public, anon;
revoke all on function public.aio_set_game_price(text,integer) from public, anon;
revoke all on function public.aio_buy_game(text) from public, anon;
revoke all on function public.aio_refund_game_purchase(uuid) from public, anon;
revoke all on function public.aio_owner_economy_admin() from public, anon;
grant execute on function public.aio_get_economy_state() to authenticated;
grant execute on function public.aio_start_game_session(text) to authenticated;
grant execute on function public.aio_finish_game_session(uuid) to authenticated;
grant execute on function public.aio_claim_quest(text) to authenticated;
grant execute on function public.aio_set_game_price(text,integer) to authenticated;
grant execute on function public.aio_buy_game(text) to authenticated;
grant execute on function public.aio_refund_game_purchase(uuid) to authenticated;
grant execute on function public.aio_owner_economy_admin() to authenticated;