alter table public.elementor_profiles
  add column if not exists avatar_media_id uuid;

comment on column public.elementor_profiles.avatar_media_id is
  'Private Backblaze media object ID for the signed-in user’s Elementor profile picture.';