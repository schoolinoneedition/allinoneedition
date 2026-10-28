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


## A-Coins and game economy

Migrations `20261028093212_aio_coin_quests_pricing_security.sql` and `20261028093734_aio_economy_rpc_privileges.sql` add server-authoritative wallets, immutable transaction entries, game sessions/activity, one-time quest claims, game prices and purchases, and restrict economy RPC execution to authenticated users. Wallet changes occur only through authenticated RPCs; owner pricing and refunds check `staff_roles.role = 'owner'` server-side. Game-session rewards require at least 90 seconds and are capped at five session rewards per UTC day. The browser UI cannot write balances or transaction rows directly.


## Community game submissions

Migration `20261028094117_aio_community_game_submissions_moderation.sql` adds an authenticated HTTPS-only submission RPC, public visibility only after approval, and owner-only review/feature/price/removal RPCs. Community games are launched in a sandboxed iframe without same-origin access. External links remain hosted by their original creators; submitted rights are not independently verified, so approve only content that is authorised for public linking.


Migration `20261028094514_aio_economy_policy_performance.sql` adds covering indexes for moderation/pricing foreign keys and uses init-plan-friendly auth checks in the new economy/submission read policies.


Migration `20261028094634_aio_game_reward_rules.sql` makes rewards opt-in by game ID on the server. Only seeded games can start a rewarded session; each reward is configured server-side, session time is validated in Postgres, and daily reward limits are enforced there too.


Migration `20261028094752_aio_purchase_rebuy_after_refund.sql` allows a refunded purchase to be bought again while keeping a unique constraint on active ownership, so a normal repeat purchase still cannot double-charge an owner.


Migration `20261028094834_aio_reward_rules_deny_client_reads.sql` explicitly denies direct client reads of the private game reward allowlist; authenticated users can only interact with it through the server-validated session RPCs.
