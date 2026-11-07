-- Server-only per-part state for resumable Backblaze B2 uploads.
create table if not exists public.aio_media_upload_parts (
  upload_id uuid not null references public.aio_media_objects(id) on delete cascade,
  part_number integer not null check (part_number between 1 and 10000),
  etag text not null check (char_length(etag) between 1 and 255),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 33554432),
  created_at timestamptz not null default now(),
  primary key (upload_id, part_number)
);

alter table public.aio_media_upload_parts enable row level security;
revoke all on public.aio_media_upload_parts from public, anon, authenticated;
grant all on public.aio_media_upload_parts to service_role;

comment on table public.aio_media_upload_parts is
  'Private multipart upload state. Only the media Worker service role may read or write part ETags and sizes.';
