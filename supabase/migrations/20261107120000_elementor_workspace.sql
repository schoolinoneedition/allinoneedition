-- Elementor AI workspace: private profile, chat history, and owner-only site settings.
create table if not exists public.elementor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Elementor' check (char_length(display_name) between 1 and 48),
  avatar text not null default '✦' check (char_length(avatar) between 1 and 12),
  instructions text not null default '' check (char_length(instructions) <= 1200),
  response_style text not null default 'balanced' check (response_style in ('balanced','concise','detailed','friendly')),
  updated_at timestamptz not null default now()
);
alter table public.elementor_profiles enable row level security;
revoke all on public.elementor_profiles from public, anon;
grant select, insert, update on public.elementor_profiles to authenticated;
drop policy if exists "Users manage their Elementor profile" on public.elementor_profiles;
create policy "Users manage their Elementor profile" on public.elementor_profiles for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table if not exists public.elementor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat' check (char_length(title) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists elementor_conversations_user_updated_idx on public.elementor_conversations(user_id, updated_at desc);
alter table public.elementor_conversations enable row level security;
revoke all on public.elementor_conversations from public, anon;
grant select, insert, update, delete on public.elementor_conversations to authenticated;
drop policy if exists "Users manage their Elementor conversations" on public.elementor_conversations;
create policy "Users manage their Elementor conversations" on public.elementor_conversations for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table if not exists public.elementor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.elementor_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null default '' check (char_length(content) <= 12000),
  image_media_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists elementor_messages_conversation_created_idx on public.elementor_messages(conversation_id, created_at);
alter table public.elementor_messages enable row level security;
revoke all on public.elementor_messages from public, anon;
grant select, insert, delete on public.elementor_messages to authenticated;
drop policy if exists "Users manage their Elementor messages" on public.elementor_messages;
create policy "Users manage their Elementor messages" on public.elementor_messages for all to authenticated
using ((select auth.uid()) = user_id and exists (select 1 from public.elementor_conversations c where c.id = conversation_id and c.user_id = (select auth.uid())))
with check ((select auth.uid()) = user_id and exists (select 1 from public.elementor_conversations c where c.id = conversation_id and c.user_id = (select auth.uid())));

create table if not exists public.aio_elementor_site_settings (
  setting_key text primary key check (setting_key in ('announcement')),
  setting_value jsonb not null default '{}'::jsonb,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.aio_elementor_site_settings enable row level security;
revoke all on public.aio_elementor_site_settings from public, anon;
grant select on public.aio_elementor_site_settings to anon, authenticated;
grant insert, update, delete on public.aio_elementor_site_settings to authenticated;
drop policy if exists "Public can read Elementor announcements" on public.aio_elementor_site_settings;
create policy "Public can read Elementor announcements" on public.aio_elementor_site_settings for select to anon, authenticated using (setting_key = 'announcement');
drop policy if exists "Owner manages Elementor site settings" on public.aio_elementor_site_settings;
create policy "Owner manages Elementor site settings" on public.aio_elementor_site_settings for all to authenticated
using (exists (select 1 from public.staff_roles s where s.user_id = (select auth.uid()) and s.role = 'owner'))
with check (exists (select 1 from public.staff_roles s where s.user_id = (select auth.uid()) and s.role = 'owner') and updated_by = (select auth.uid()));
