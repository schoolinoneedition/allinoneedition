-- Keep auth.uid() evaluation outside the per-row RLS expression.
drop policy if exists "Users can read their own private media metadata"
  on public.aio_media_objects;

create policy "Users can read their own private media metadata"
  on public.aio_media_objects
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
