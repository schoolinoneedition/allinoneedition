-- Move staff authorization helpers to a non-exposed schema.
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
grant usage on schema private to authenticated;
create or replace function private.is_aio_site_owner()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.staff_roles where user_id=auth.uid() and role='owner');
$$;
revoke all on function private.is_aio_site_owner() from public,anon;
grant execute on function private.is_aio_site_owner() to authenticated;
create or replace function private.aio_owner_exists()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.staff_roles where role='owner');
$$;
revoke all on function private.aio_owner_exists() from public,anon;
grant execute on function private.aio_owner_exists() to authenticated;
drop policy if exists "site owner can view all staff roles" on public.staff_roles;
create policy "site owner can view all staff roles" on public.staff_roles for select to authenticated using((select private.is_aio_site_owner()));
drop policy if exists "site owner manages staff roles" on public.staff_roles;
create policy "site owner manages staff roles" on public.staff_roles for all to authenticated using((select private.is_aio_site_owner())) with check((select private.is_aio_site_owner()));
drop policy if exists "site owner can view staff audit" on public.staff_role_audit;
create policy "site owner can view staff audit" on public.staff_role_audit for select to authenticated using((select private.is_aio_site_owner()));
drop policy if exists "site owner can write staff audit" on public.staff_role_audit;
create policy "site owner can write staff audit" on public.staff_role_audit for insert to authenticated with check(actor_id=(select auth.uid()) and (select private.is_aio_site_owner()));
grant select,insert on public.staff_role_audit to authenticated;
grant select,insert,update,delete on public.staff_roles to authenticated;
create or replace function public.aio_owner_exists()
returns boolean language sql stable security invoker set search_path='' as $$
 select private.aio_owner_exists();
$$;
revoke all on function public.aio_owner_exists() from public,anon;
grant execute on function public.aio_owner_exists() to authenticated;
create or replace function public.manage_aio_staff_role(p_target_user_id uuid,p_role text,p_revoke boolean default false)
returns void language plpgsql security invoker set search_path='' as $$
declare v_actor uuid := auth.uid();
begin
 if v_actor is null then raise exception 'Sign in is required.' using errcode='42501'; end if;
 if not exists(select 1 from public.staff_roles where user_id=v_actor and role='owner') then raise exception 'Only the site owner can manage staff.' using errcode='42501'; end if;
 if p_target_user_id is null or p_target_user_id=v_actor then raise exception 'Choose another account.' using errcode='22023'; end if;
 if not exists(select 1 from auth.users where id=p_target_user_id) then raise exception 'That account was not found.' using errcode='P0002'; end if;
 if exists(select 1 from public.staff_roles where user_id=p_target_user_id and role='owner') then raise exception 'The site owner role cannot be changed here.' using errcode='42501'; end if;
 if p_revoke then
   delete from public.staff_roles where user_id=p_target_user_id and role in ('staff','admin');
   if not found then raise exception 'That account does not currently have a staff role.' using errcode='P0002'; end if;
   insert into public.staff_role_audit(actor_id,target_user_id,action,role) values(v_actor,p_target_user_id,'revoked',null);
 else
   if p_role is null or p_role not in ('staff','admin') then raise exception 'Role must be staff or admin.' using errcode='22023'; end if;
   insert into public.staff_roles(user_id,role) values(p_target_user_id,p_role)
   on conflict(user_id) do update set role=excluded.role where public.staff_roles.role in ('staff','admin');
   if not found then raise exception 'That account cannot be assigned this role.' using errcode='42501'; end if;
   insert into public.staff_role_audit(actor_id,target_user_id,action,role) values(v_actor,p_target_user_id,'assigned',p_role);
 end if;
end; $$;
revoke all on function public.manage_aio_staff_role(uuid,text,boolean) from public,anon;
grant execute on function public.manage_aio_staff_role(uuid,text,boolean) to authenticated;
drop function if exists public.is_aio_site_owner();
