# Fast startup and game-library expansion — 15 November 2026

## What changed

### Remove the fixed startup wait

- Removed the `#siteLoader` full-screen startup HTML, forced 7.5-second intro timer and associated animation CSS. The homepage displays its existing UI and game cards immediately.
- Removed the retired splash observer in `game-motion.js`, keeping **actual game iframe loading and error/retry states**.
- Frontend and game-loading contract tests now assert no intro splash, immediate first render and retention of truthful game-loading indicators.
- Welcome notifications now appear after the site opens, without sitting over a first-time setup screen.

### Add three **new, original** 3×3 puzzle games

Three self-contained, no-account games use `games/3x3-originals.html` and `games/3x3-originals.js`:
1. `?game=slide` — **3×3 Tile Slide**: only solvable shuffles, keyboard and click/tap, move counter
2. `?game=xo` — **3×3 Tic Tac Toe**: player X versus minimax computer O
3. `?game=memory` — **3×3 Pattern Recall**: longer memory sequences, touch controls and safe pause on hidden tab

**Existing games are unchanged**: “3x3 +1 Keyboard Escape” and “3x3 Steal an Egg” retain their URLs and query parameters.

### A bounded, curated community HTML5 catalogue

- Keep the original **976 main-registry records**. The original Pizza Edition, TopVaz and other provider links are not overwritten or renamed.
- Add a distinct `games/catalogue-community.json` asset with **489 selected external HTML5 links**, derived from a published third-party game metadata index. The source collection has more games, but we deliberately excluded suspected horror, mature, violent, weapon-focused, gambling and other unsuitable titles, unverified file names, obvious duplicates and very large items.
- Entries preserve creator/copyright notices, and the UI only claims they are **catalogue links**: external hosts can queue, fail, disallow frames or change. Individual games have not all been played/verified.
- The JSON loads after initial cards render using a fixed same-origin URL, validates each record's exact link format and category, and deduplicates by normalized title and URL before appending. A failed optional import does not break the base website.
- Add a visible live **2,000 catalogue-entry goal** driven by actual current array length, not arbitrary marketing numbers. It may be lower than 2,000 after runtime restrictions and duplicate removal.

### Further technical cleanup

- Game-card rendering is no longer blocked by an artificial intro delay.
- Dead launch-animation observers and related state have been removed.
- Additional external titles are fetched separately and cacheably instead of growing `index.html` by hundreds of kilobytes.
- No changes to existing Party, Watch, Social, owner permissions, 3×3 legacy titles, no-ads/A-Coins policy or in-site 10-game arcade.

## Source acknowledgement and constraints

Third-party catalogue metadata was derived from the NEBULA CDN project (MIT-licensed *catalogue code*). Each game's underlying assets retain their original creator's rights; a collection licence does not assert ownership over every game. The new links point to publicly documented publisher-hosted HTML pages, not uploaded copies. Any broken iframe should be reported and removed rather than counted as working.

**This batch does not claim 2,000 confirmed playable games.** The target remains pending reliable source and actual game-play checks. Bulk addition without working URLs, age-appropriate content and licensing review would create broken entries and a misleading counter.

## Automated checks

- `node --check games/3x3-originals.js`
- `node tests/3x3-originals.cjs`: solvability, tic-tac-toe AI, nine-cell layout and memory timer cancellation
- `node tests/community-catalogue.cjs`: curated entries, duplicate checks, restricted-title exclusions, original 3×3 preservation, dynamic loading and splash removal
- Existing `tests/frontend-contracts.cjs`, `tests/real-games-loading.cjs`, `tests/bonus-arcade.cjs` and `scripts/audit-games.cjs`

HTTP health checks alone do not confirm browser playability. Verify the deployment's actual commit and state before claiming the release is live.
