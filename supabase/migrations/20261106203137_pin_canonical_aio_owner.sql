-- Pin owner authority to the single verified account that already holds the owner role.
create table if not exists private.aio_platform_owner (
  singleton boolean primary key default true check (singleton),
  owner_user_id uuid not null unique references auth.users(id),
  created_at timestamptz not null default now()
);

revoke all on table private.aio_platform_owner from public, anon, authenticated, service_role;

do $$
declare
  current_owner uuid;
  owner_count integer;
  pinned_owner uuid;
begin
  select count(*), min(user_id::text)::uuid
    into owner_count, current_owner
  from public.staff_roles
  where role = 'owner';

  if owner_count <> 1 or current_owner is null then
    raise exception 'Expected exactly one existing owner account; refusing to change owner authority.';
  end if;

  insert into private.aio_platform_owner(singleton, owner_user_id)
  values (true, current_owner)
  on conflict (singleton) do nothing;

  select owner_user_id into pinned_owner
  from private.aio_platform_owner
  where singleton = true;

  if pinned_owner is distinct from current_owner then
    raise exception 'Pinned owner does not match the existing owner role; refusing to continue.';
  end if;
end
$$;

create or replace function private.aio_is_owner()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from private.aio_platform_owner o
    where o.singleton = true
      and o.owner_user_id = auth.uid()
  );
$function$;

create or replace function private.is_aio_site_owner()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select private.aio_is_owner();
$function$;

revoke all on function private.aio_is_owner() from public, anon, authenticated;
revoke all on function private.is_aio_site_owner() from public, anon;
grant execute on function private.is_aio_site_owner() to authenticated;

create or replace function private.guard_aio_owner_role()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  canonical_owner uuid;
begin
  select owner_user_id into canonical_owner
  from private.aio_platform_owner
  where singleton = true;

  if tg_op = 'DELETE' then
    if old.user_id = canonical_owner or old.role = 'owner' then
      raise exception 'The canonical owner role cannot be deleted.';
    end if;
    return old;
  end if;

  if new.role = 'owner' and new.user_id is distinct from canonical_owner then
    raise exception 'Only the canonical owner account may hold the owner role.';
  end if;

  if tg_op = 'UPDATE'
     and old.user_id = canonical_owner
     and (new.user_id is distinct from canonical_owner or new.role <> 'owner') then
    raise exception 'The canonical owner account cannot be reassigned or demoted.';
  end if;

  return new;
end;
$function$;

revoke all on function private.guard_aio_owner_role() from public, anon, authenticated, service_role;

drop trigger if exists staff_roles_guard_canonical_owner on public.staff_roles;
create trigger staff_roles_guard_canonical_owner
before insert or update or delete on public.staff_roles
for each row execute function private.guard_aio_owner_role();

drop policy if exists "Users can view their own staff role" on public.staff_roles;
drop policy if exists "site owner can view all staff roles" on public.staff_roles;
drop policy if exists "site owner manages staff roles" on public.staff_roles;

create policy "Users can view own role or site owner can view all"
on public.staff_roles
for select
to authenticated
using (user_id = (select auth.uid()) or (select private.is_aio_site_owner()));

create policy "Site owner can insert staff roles"
on public.staff_roles
for insert
to authenticated
with check ((select private.is_aio_site_owner()));

create policy "Site owner can update staff roles"
on public.staff_roles
for update
to authenticated
using ((select private.is_aio_site_owner()))
with check ((select private.is_aio_site_owner()));

create policy "Site owner can delete staff roles"
on public.staff_roles
for delete
to authenticated
using ((select private.is_aio_site_owner()));
