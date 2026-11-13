-- Public playback metadata is still private to the Worker service role.
-- This flag only allows the media Worker to issue short-lived signed playback URLs.
alter table public.aio_media_objects
  drop constraint if exists aio_media_objects_visibility_check;

alter table public.aio_media_objects
  add constraint aio_media_objects_visibility_check
  check (visibility in ('private', 'public'));

comment on column public.aio_media_objects.visibility is
  'Public media is accessible only through the media Worker signed playback URL; private objects require owner authentication.';
