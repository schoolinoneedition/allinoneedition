
drop policy if exists "Staff can delete TikTok stickers" on public.tiktok_stickers;
create policy "Staff can delete TikTok stickers"
on public.tiktok_stickers for delete to authenticated
using (exists (
  select 1 from public.staff_roles sr
  where sr.user_id = (select auth.uid())
    and sr.role = any (array['staff'::text, 'admin'::text])
));

drop policy if exists "Staff can insert TikTok stickers" on public.tiktok_stickers;
create policy "Staff can insert TikTok stickers"
on public.tiktok_stickers for insert to authenticated
with check (exists (
  select 1 from public.staff_roles sr
  where sr.user_id = (select auth.uid())
    and sr.role = any (array['staff'::text, 'admin'::text])
));

drop policy if exists "Staff can update TikTok stickers" on public.tiktok_stickers;
create policy "Staff can update TikTok stickers"
on public.tiktok_stickers for update to authenticated
using (exists (
  select 1 from public.staff_roles sr
  where sr.user_id = (select auth.uid())
    and sr.role = any (array['staff'::text, 'admin'::text])
))
with check (exists (
  select 1 from public.staff_roles sr
  where sr.user_id = (select auth.uid())
    and sr.role = any (array['staff'::text, 'admin'::text])
));
