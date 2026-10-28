'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

const appearance = read('appearance.js');
const ux = read('ultimate-experience.js');
const css = read('ultimate-experience.css');
const html = read('index.html');
const economy = read('supabase/migrations/20261028093212_aio_coin_quests_pricing_security.sql');
const rewardRules = read('supabase/migrations/20261028094634_aio_game_reward_rules.sql');
const counter = read('supabase/migrations/20261028102739_secure_tiktok_sticker_download_counter.sql');
const eventPolicy = read('supabase/migrations/20261028103352_deny_client_access_to_tiktok_sticker_download_events.sql');
const eventIndex = read('supabase/migrations/20261028103427_index_tiktok_sticker_download_events_sticker_id.sql');
const staffRls = read('supabase/migrations/20261028103528_optimize_tiktok_sticker_staff_rls_policies.sql');

// Appearance choices must change the real UI and persist, not just update previews.
assert.match(appearance, /function selectWallpaper\(id\)[\s\S]*?state\.wallpaper=id;delete state\.pendingWallpaper;save\(\);applyWallpaper\(\)/);
assert.match(appearance, /fs\.addEventListener\('change',[\s\S]*?state\.font=fs\.value;save\(\);applyFont\(\)/);
assert.match(appearance, /aioHeadingFontToggle/);
assert.match(appearance, /aioCursorStyleSelect/);
assert.match(css, /html\.aio-wallpaper-hidden::before\{opacity:0!important\}/);
assert.match(css, /html\[data-aio-theme="glass"\]/);
assert.match(css, /data-aio-font="cherry"/);
assert.match(css, /data-aio-cursor-style="minimal"/);
assert.match(css, /data-aio-cursor-style="chatgpt"/);
assert.match(css, /\.aio-wallpaper-gallery/);
assert.match(css, /\.aio-wallpaper-preview/);
assert.match(css, /\.aio-font-preview/);

// Context actions should report errors; freeze must block input and game switching should close sessions.
assert.match(ux, /Menu action failed:/);
assert.match(ux, /f\.blur\(\)/);
assert.match(ux, /f\.style\.pointerEvents=frozen\?'none':''/);
assert.match(ux, /await endSession\(\);orig\(i\)/);
assert.match(ux, /window\.open\('about:blank','_blank'\)/);
assert.match(ux, /openContext\(p\.x,p\.y\)/);
assert.match(ux, /e\.key==='ContextMenu'/);
assert.match(ux, /aio-wallpaper-hidden/);

// Auth restoration, profile provisioning and media upload cleanup are wired in the existing page.
assert.match(html, /persistSession:true/);
assert.match(html, /auth\.onAuthStateChange/);
assert.match(html, /async function ensureProfile\(\)/);
assert.match(html, /storage\.from\('social-media'\)\.upload/);
assert.match(html, /file&&isVideoFile&&file\.size>100\*1024\*1024/);
assert.match(html, /storage\.from\('social-media'\)\.remove\(\[uploadedStoragePath\]\)/);
assert.match(html, /__aioSocialPostBusy/);

// Database-side controls, not browser-supplied reward amounts, govern the economy.
assert.match(economy, /auth\.uid\(\)/);
assert.match(economy, /for update/i);
assert.match(rewardRules, /aio_game_reward_rules/);
assert.match(counter, /primary key \(user_id, sticker_id, day_key\)/i);
assert.match(counter, /revoke all on function public\.increment_tiktok_sticker_downloads\(uuid\) from public, anon, authenticated/i);
assert.match(counter, /grant execute on function public\.increment_tiktok_sticker_downloads\(uuid\) to authenticated/i);
assert.match(eventPolicy, /for all to anon, authenticated[\s\S]*using \(false\)[\s\S]*with check \(false\)/i);
assert.match(eventIndex, /create index if not exists tiktok_sticker_download_events_sticker_id_idx/i);
assert.match(staffRls, /sr\.user_id = \(select auth\.uid\(\)\)/i);

console.log('Frontend contract checks passed: appearance persistence, context menu/game freeze wiring, auth/video safeguards, and economy/security migration contracts.');
