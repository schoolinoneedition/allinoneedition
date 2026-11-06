-- Private metadata for media objects stored in Cloudflare R2.
-- Binary content remains in R2; this table contains only ownership and lifecycle metadata.

create table if not exists public.aio_media_objects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  object_key text not null unique,
  multipart_upload_id text,
  filename text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 5497558138880),
  etag text,
  status text not null default 'uploading'
    check (status in ('uploading', 'ready', 'deleted')),
  visibility text not null default 'private'
    check (visibility in ('private')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists aio_media_objects_user_created_idx
  on public.aio_media_objects (user_id, created_at desc);

create index if not exists aio_media_objects_status_created_idx
  on public.aio_media_objects (status, created_at);

alter table public.aio_media_objects enable row level security;

revoke all on public.aio_media_objects from anon;
revoke insert, update, delete on public.aio_media_objects from authenticated;
grant select on public.aio_media_objects to authenticated;

drop policy if exists "Users can read their own private media metadata"
  on public.aio_media_objects;

create policy "Users can read their own private media metadata"
  on public.aio_media_objects
  for select
  to authenticated
  using (auth.uid() = user_id);

comment on table public.aio_media_objects is
  'Private Cloudflare R2 media metadata. Object keys and multipart IDs are server-side only; browser clients can read only their own rows.';
