-- Owner-only staff roster visibility and missing FK indexes.
create or replace function public.is_aio_site_owner()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.staff_roles where user_id=auth.uid() and role='owner');
$$;
revoke all on function public.is_aio_site_owner() from public,anon;
grant execute on function public.is_aio_site_owner() to authenticated;
drop policy if exists "site owner can view all staff roles" on public.staff_roles;
create policy "site owner can view all staff roles" on public.staff_roles for select to authenticated using((select public.is_aio_site_owner()));
drop policy if exists "site owner can view staff audit" on public.staff_role_audit;
create policy "site owner can view staff audit" on public.staff_role_audit for select to authenticated using((select public.is_aio_site_owner()));
create index if not exists direct_messages_recipient_time_idx on public.direct_messages(recipient_id,created_at desc);
create index if not exists friend_requests_addressee_status_idx on public.friend_requests(addressee,status);
create index if not exists meeting_rooms_party_idx on public.meeting_rooms(party_id);
create index if not exists meeting_rooms_created_by_idx on public.meeting_rooms(created_by);
create index if not exists parties_owner_idx on public.parties(owner_id);
create index if not exists party_members_user_idx on public.party_members(user_id);
