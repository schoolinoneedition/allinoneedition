-- Return only whether the site has an owner; never expose owner identity to non-owners.
create or replace function public.aio_owner_exists()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.staff_roles where role='owner');
$$;
revoke all on function public.aio_owner_exists() from public,anon;
grant execute on function public.aio_owner_exists() to authenticated;
