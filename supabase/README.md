# All in One Edition backend

## Connected Supabase project

The website client is configured for the existing **XBT Website Builders** Supabase project:

- Project reference: `btnbuchsrfllpzlypjtn`
- Project URL: `https://btnbuchsrfllpzlypjtn.supabase.co`
- Browser client uses the project's publishable key. Never add a service-role key to this static website.

## Applied migrations

These migrations were applied to the live XBT project and their SQL is tracked here:

1. `20261027182254_allinone_community_video_staff_security.sql`
2. `20261027182825_staff_owner_read_policy_and_indexes.sql`
3. `20261027183344_aio_owner_bootstrap_status.sql`
4. `20261027183454_move_staff_privilege_checks_private.sql`

They create the missing profile, friends, messages, parties, social-post, comment, reaction, and follow tables; enable RLS; create the public `social-media` bucket with a 100 MiB limit for MP4 and supported image formats; and restrict file uploads/deletes to authenticated users' own storage folders. Public Social media is intentionally public. Do not put private videos in this bucket.

## Supabase Auth URL configuration

In the XBT Supabase Dashboard, open **Authentication → URL Configuration** and verify:

- Site URL: `https://allinoneedition.vercel.app/`
- Redirect URL allow-list includes `https://allinoneedition.vercel.app/**`

Add local or preview deployment URLs only if you use them. Email confirmation and password-reset redirects depend on this allow-list. The connected Supabase tool does not expose the project's Auth URL settings, so those dashboard values could not be verified or changed here.

## Assigning the site owner and staff

The app intentionally does not let a public visitor claim the owner role through a client-side button.

1. Sign in to All in One Edition with the account that should own the site.
2. Open Community → Staff management and choose **Copy owner setup SQL**.
3. In the XBT Supabase SQL Editor, run that SQL as a project administrator. It assigns the owner role to the currently signed-in account ID.
4. Refresh All in One Edition. The owner can now assign or revoke `staff` and `admin` roles by the exact username of an account that has signed in at least once.

The database RPC checks the owner role and records assignments/revocations in `staff_role_audit`. Ordinary users cannot grant themselves staff roles.

## Notes

- The previous frontend referenced a different Supabase project that is not available in the currently connected project list. Auth users are not automatically transferable between Supabase projects; credentials must exist in XBT to sign in here.
- Social uploads require sign-in. MP4 videos are capped at 100 MiB and images at 15 MiB by the UI.
- The Videos page reads saved `social_posts` records; it does not show demo placeholders.
- Vercel rewrites route refreshes (for example `/login` and `/videos`) to the existing `index.html`.
