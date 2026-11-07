-- Public posts and published episode videos use short-lived signed playback URLs.
-- The objects remain private in Backblaze B2; this flag controls Worker-mediated access only.

alter table public.aio_media_objects
  drop constraint if exists aio_media_objects_visibility_check;

alter table public.aio_media_objects
  add constraint aio_media_objects_visibility_check
  check (visibility in ('private', 'public'));

create index if not exists aio_media_objects_public_ready_idx
  on public.aio_media_objects (id)
  where status = 'ready' and visibility = 'public';

comment on column public.aio_media_objects.visibility is
  'Worker-enforced access mode. Public objects are served only through short-lived signed URLs; B2 remains private.';
