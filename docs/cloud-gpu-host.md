# Private GPU Cloud Gaming: Integration Notes

All in One Edition can display first-party browser games today. Running Windows-only games on rented GPUs **inside the site** requires a separate, authorised game-running machine, a streaming service, and secure per-user session brokerage. This repository does not contain Fortnite or Roblox engines.

## Infrastructure choices checked (14 November 2026)

| Component | Suitable role | Important limit |
| --- | --- | --- |
| Vercel | All in One Edition frontend, serverless configuration checks | Does not render gaming desktops |
| Supabase | User accounts, authorised session records, realtime signals | Not a graphics encoder or gaming GPU |
| Backblaze B2 | Static assets and opted-in game recordings | Object storage cannot execute a game |
| Render | Small orchestration API or status service | Published compute plans are CPU and RAM, not gaming GPUs |
| Dedicated GPU machine or rental | Executes permitted installed game software | Needs the right OS, GPU access, licences and secure stream |
| Selkies (MPL-2.0) | Open-source Linux HTML5 remote desktop/video streamer | Linux game compatibility; this does **not** establish Roblox or Fortnite support |

Selkies reference: https://github.com/selkies-project/selkies
Render compute docs: https://render.com/docs/compute-plans
Roblox VM guidance: https://en.help.roblox.com/hc/en-us/articles/24275616578708-Anti-cheat-Messages

**Do not put game login passwords, signing tokens or machine credentials in HTML, Vercel's public env prefixes, Supabase's public tables, client logs or this repository.**

## Implemented preflight

The site calls `GET /api/cloud-host-status` to report whether a dedicated host is configured and responds to a server-controlled heartbeat. It has no streaming privileges, user-supplied URLs or password collection. With no host configured, the site says so, and all existing browser games still work.

To wire an owned GPU host after it is provisioned, set the server-only environment variable `AIO_GPU_HOST_HEALTH_URL` to its publicly reachable **HTTPS** health endpoint. This URL is read by the serverless function, not sent to website visitors. The health response contract is:

```json
{
  "service": "aio-game-host",
  "gpuReady": true,
  "sessionGatewayReady": true
}
```

Even a successful result reports only **host online**. It does not mark Fortnite, Roblox or interactive streaming as available.

## What is still required for real embedded streams

1. Establish a privately owned or rented GPU host, with costs explicitly authorised by its account owner and the game publisher's requirements verified.
2. Run an approved streaming server with low-latency browser video, controller/keyboard forwarding and secure session management. For Linux-compatible workloads, Selkies is a viable project to evaluate.
3. Add a **server-side** session broker that authenticates the All in One Edition user, provisions one isolated GPU session per allowed user, issues short-lived single-use stream credentials and revokes them when the session stops.
4. Put the streaming gateway behind TLS with WebSocket/WebRTC support as required and an appropriate `Content-Security-Policy: frame-ancestors` policy. Do not expose the raw machine desktop to visitors.
5. Validate the *actual game* launches and remains playable under the provider's VM, GPU, OS, anti-cheat and publisher rules. A 200 HTTP response, iframe load or GPU heartbeat is not gameplay verification.
6. Complete a full browser test, controller check, game exit/cleanup and billing/idle-timeout review before enabling gameplay for other users.

Roblox's support material treats ordinary VMs/cloud computers as unsupported, although another official anti-cheat page describes a dedicated GPU-passthrough scenario. The game must be tested under the specific machine and terms rather than assumed supported. Fortnite similarly needs a suitable approved Windows/game-streaming environment.

**Status of this batch:** in-site arcade games work independently. The GPU heartbeat path is implemented but the project has no connected GPU host, no live streaming session broker, and no verified Fortnite or Roblox runtime.


## Vagon Streams in-site player (14 November 2026)

This integration is implemented in `cloud-embedded-stream.js` and the owner-authorised `GET /api/cloud-stream-session`. It displays an **actual embedded Vagon Stream Link**, if and only if the owner configures one and signs in. Vagon documentation confirms its own Stream Links are designed to be embedded using an iframe: https://docs.vagon.io/streams/guides/how-to-start-streaming

The following **server-only** Vercel environment variables must be configured through the hosting dashboard, **not committed to Git**:

- `AIO_VAGON_EMBED_ENABLED=true` to allow the player to return an approved URL
- `AIO_CLOUD_STREAM_OWNER_ID` set to the Supabase Auth UUID of the permitted site owner
- `AIO_VAGON_STREAM_EMBED_URL` set to the exact Vagon-provided Stream Link from its dashboard, such as `https://app.vagon.io/stream/<stream-id>`; the code only accepts HTTPS on known Vagon stream domains with expected paths, and rejects URLs containing credentials, tokens, queries or redirects

The owner must set up billing and upload an **authorised executable application** directly in Vagon's dashboard. The code **does not purchase a machine**, register for Vagon, change billing, or upload Fortnite/Roblox program files. Vagon does not guarantee running those third-party games.

Vagon pricing checked on 14 November 2026: Basic platform plan listed as free, starter GPU streams from **$0.025/minute** and **$0.67/day application maintenance**. Location and quality can change costs. The pricing and idle limits must be reviewed in the provider account: https://vagon.io/streams/pricing

Security notes:
- The endpoint verifies the user's bearer token using Supabase Auth and compares the authenticated ID to the server-only owner ID. A unauthenticated or non-owner user cannot fetch the configured stream URL from the API.
- A **Stream Link is still visible** to the authenticated browser and may be reusable by anyone who obtains it. Configure provider-side password protection, limits, expiry and capacity as applicable. Do not rely on the AIO UI to keep a provider link secret.
- A successful iframe `load` event only proves the provider page navigated. It **does not prove** GPU startup, active stream, permitted game, anti-cheat compatibility, keyboard response or game availability.
- The **Stop viewing** control closes the iframe; the provider may keep charging until the Vagon session is terminated there. Configure short provider-side session duration and automatic shutoff.
- Clicking **Start** requires acknowledging that costs may be incurred. The player does not store, request or forward Roblox or Epic Games passwords.
- Only owner access is implemented. Public, multiuser GPU sessions require separate per-user admission, budget enforcement and rate limiting.

An alternative for a GPU machine owned by the user is the open-source browser-gaming project Quasar: https://accreleus.github.io/quasar/ . It requires compatible hardware and is not a free managed Fortnite/Roblox host.
