drop policy if exists "Public can read Elementor announcements" on public.aio_elementor_site_settings;

create policy "Public can read Elementor announcements and releases"
  on public.aio_elementor_site_settings
  for select
  to anon, authenticated
  using (setting_key in ('announcement', 'release'));
