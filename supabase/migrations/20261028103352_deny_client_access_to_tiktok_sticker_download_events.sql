drop policy if exists "no client access to sticker download events" on public.tiktok_sticker_download_events;
create policy "no client access to sticker download events"
on public.tiktok_sticker_download_events
for all to anon, authenticated
using (false)
with check (false);
