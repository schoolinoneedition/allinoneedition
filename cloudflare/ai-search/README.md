# Cloudflare AI Search

## Live instance

- Namespace: `default`
- Instance: `aio-platform-search`
- Public endpoint ID: `59fa95cf-3fef-4c97-be4a-6328308cb959`
- Search route: `https://59fa95cf-3fef-4c97-be4a-6328308cb959.search.ai.cloudflare.com/search`
- Chat route: `https://59fa95cf-3fef-4c97-be4a-6328308cb959.search.ai.cloudflare.com/chat/completions`

The public endpoint is restricted to the production site origin and has a 20-request-per-minute fixed rate limit. It contains public catalogue information only. Never index private notes, account records, staff data, private messages, or user-specific social content in this shared instance.

## Search configuration

- Hybrid keyword + vector retrieval.
- Query rewriting enabled.
- Qwen3 Embedding 0.6B embedding model.
- 10 results maximum.
- 0.35 minimum score threshold.
- 24-hour similarity cache.
- Public endpoint search and chat routes enabled.

## Current indexed material

- `platform-guide.md`: public site sections and privacy boundaries.
- `games-catalogue.md`: 318 catalogue entries in non-weapon-focused categories, with additional title-level filtering for known shooter franchises and weapon terms. No external launch URLs or provider metadata are indexed.

The Watch series document was removed because episode availability is not yet verified. Watch results must not invent episodes or claim playback availability based on series names alone.

## Important limitations

- The instance uses managed AI Search storage, not R2.
- It is not yet connected to private user data or the Social feed.
- Frontend AI Search UI integration and end-to-end browser tests are still pending.
- AI Search usage is subject to Cloudflare's current plan allowances and pricing. Review the Cloudflare dashboard before increasing indexing volume or query rates.
