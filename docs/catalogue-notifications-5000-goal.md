# All in One Edition: Game catalogue and floating notice upgrade

## Batch verified on 14 November 2026

- Baseline **884 raw entries** in the main inlined catalogue. It already includes **313 Pizza Edition** and **64 TopVaz** sourced entries, plus 49 additional TopVaz links in the legacy extra catalogue. These previous entries are preserved.
- **92 distinct game entries** added from the **MIT-licensed, publicly released** `sausi-7/games` registry. These entries link to the project's original static HTML game pages, e.g. `https://sausi-7.github.io/games/games/puzzle/6oct/index.html`, with author credit and a recorded source. The live streaming/player functionality and frame permissions still depend on the third-party publisher.
- The initial catalogue source: `https://github.com/sausi-7/games/blob/main/games/registry.json`; licence: `https://github.com/sausi-7/games/blob/main/LICENSE`. Registry metadata is not proof of successfully controlled gameplay inside the AIO player. Three representative index files were checked through the connected GitHub API before this batch.
- No guessed Pizza Edition or TopVaz paths were added. Previous verified entries remain; adding more from those sites requires exact URL and permission checking.
- **976 raw main-registry entries** after the import, **not** 976 independently verified running games. Runtime filtering, cross-list deduplication and browser permissions can alter the displayed total. The long-term target of **5,000** is not a claim that 5,000 currently exist.

### Next catalogue batches

1. Keep separate manifests for the source, normalized title, category, original game URL, permit/attribution, iframe/embedding test and last verified date.
2. Add only direct provider-permitted entries with real browser play or a clearly labelled external-provider fallback. Exclude unsuitable/horror content, duplicates and missing game paths. Do not remove attribution required by a source licence.
3. Import no more than a manageable batch at a time. Run `node tests/curated-github-pack.cjs` and `node scripts/audit-games.cjs`, then test game pages in a browser and record broken embeds.
4. Before trying thousands of entries, move the large static JSON registry out of `index.html` into paged/manifests data and add efficient filtering/virtualization rather than injecting thousands of DOM cards.
5. Grow the real verified number toward 5,000 and report actual counts. No bulk title-generation or invented game URLs.

## Floating notifications

A dedicated `aio-notifications.js` and stylesheet provide a fixed low-obstruction notification stack that **animates up from the bottom**, then gently exits upward. Card design has glass, ocean, pumpkin-season and midnight themes, manual dismiss, a four-card cap, auto-dismiss, reduced-motion support and safe text-only rendering.

**Settings** → **Floating notifications** lets visitors disable on-site alerts, enable/disable greetings and hometime, select cover theme and position, and preview a real notification. These choices are kept **on-device** under `aio-notification-settings-v1` and are also editable in the existing six-step setup tour. No browser or OS permission is requested.

Hometime alerts use `Europe/London` calendar time so 14:50 (40-minute warning) and 15:30 (hometime) are reliable even when the computer's timezone is different. Only on UK weekdays and once per day, no weekend spam. Background/inactive tabs do not emit alerts; missed alert windows are not replayed.

Existing appearance setup receives three lightweight CSS-gradient wallpapers: **Deep sea, Pumpkin twilight and Starlight**, without adding expensive images or disrupting previous wallpapers.

Tests cover notice animation hook, user choice persistence, morning/hometime control, time-zone conversion, weekends, once-per-day dedupe, safe text and the legacy settings/setup wiring.

## Deployment note

Vercel deployment quotas and billing rules are unchanged. If a production build fails because of the free-plan deployment limit, leave the previous production build intact, retain the tested merged code, and state clearly that the new UI is not live until a successful deployment has been verified.
