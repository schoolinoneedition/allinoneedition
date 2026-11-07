-- Remove Supabase's default API-role grants before adding the narrow read surface.
revoke all on public.aio_media_objects from public, anon, authenticated;
grant select (id, user_id, filename, content_type, size_bytes, status, created_at, completed_at)
  on public.aio_media_objects to authenticated;
grant all on public.aio_media_objects to service_role;

revoke all on public.aio_media_library from public, anon, authenticated, service_role;
grant select on public.aio_media_library to authenticated;

revoke all on public.aio_media_upload_parts from public, anon, authenticated;
grant all on public.aio_media_upload_parts to service_role;
