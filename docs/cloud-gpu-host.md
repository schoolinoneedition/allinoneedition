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


## Public Eagle 3D Streaming GPU demos, added 14 November 2026

All in One Edition includes a separate **opt-in public cloud gaming demo** at `#cloud-gaming`. This is a real provider-hosted GPU-streaming experience, not a browser-only/WebGL game or a new rented GPU owned by All in One Edition.

- Unity *Chop Chop* sample game: `https://stream.eagle3dstreaming.com/v5/demo/E3DS_ChopChop_v6/Project_E3DS_ChopChop_v6`. Eagle shared this link publicly on the Unity Discussions forum, 11 November 2026: https://discussions.unity.com/t/beta-eagle-3d-streaming-stream-your-unity-build-to-any-browser-no-webgl-no-download-3-live-demos/1741633
- Interactive Unreal demo: `https://connector.eagle3dstreaming.com/v5/demo/DemoAppTP/default`, publicly documented by the provider: https://docs.eagle3dstreaming.com/wiki/getting-started
- Embed and lifecycle interface: https://docs.eagle3dstreaming.com/wiki/embed-stream-using-iframe/ and https://docs.eagle3dstreaming.com/wiki/iframe-stages
- Eagle 3D Streaming offers a developer-hosted **free trial** with 60 lifetime minutes, one concurrent stream and 5 GB project storage, no credit card: https://www.eagle3dstreaming.com/pricing. That is a different quota from the provider's public demos; no user billing account is configured in AIO.
- The public samples are shared provider assets. This integration **must not** be relabelled as Roblox, Fortnite, or an independently hosted unlimited gaming PC. Third-party infrastructure may be busy, rate-limited, unavailable or may block framing on some devices.

### Behaviour and safety

1. The provider iframe is inserted **only after** someone clicks a demo; the website does not auto-start a remote GPU session.
2. A 30-second helper notices a long wait without claiming the game failed. Eagle can queue sessions until capacity is free. The UI uses the provider's `stage1_inqueued`, `stage3_slotOccupied`, `stage4_playBtnShowedUp`, `stage5_playBtnPressed`, `sessionExpired` and other documented signals.
3. `postMessage` events are processed only from the currently active frame and its exact expected provider origin. Queue messages never become HTML.
4. The viewer closes at 10 minutes as a courtesy to shared infrastructure and has an explicit **Stop demo** button. Unloading the frame cannot guarantee the backend stopped immediately.
5. User accounts and game passwords are never requested by AIO. No stream account or shared GPU may be rented or charged automatically.
6. A game can only be claimed playable after an actual browser gameplay test; syntax checks and a published provider URL alone do not establish live video/controls.

This is a no-cost way to **try remote GPU streaming** inside AIO, with an actual publicly shared sample game. For permanent hosted Fortnite or Roblox availability, a separate approved game-streaming platform and compatible licences/sessions remain necessary.


## Cloud Gaming Library and additional public demos, 14 November 2026

The cloud section intentionally separates **in-site public GPU streaming** from **official cloud gaming service links** and original self-hosted browser games. Nobody must enter a gaming password into AIO. No new GPU VM, rental, payment, or Roblox/Fortnite host is provisioned.

### In-site streams

The existing provider-hosted Eagle 3D streamed Unity game (Chop Chop) and Unreal interactive world are preserved. Two additional officially published Unity *graphics showcases* are also embedded **on explicit user click only**:

- Space VFX demo: `https://stream.eagle3dstreaming.com/v5/demo/E3DS_SpaceshipDemo_v2/Project_E3DS_SpaceshipDemo_v2`
- HDRP showcase: `https://stream.eagle3dstreaming.com/v5/demo/E3DS_HDRP_Sample/Project_E3DS_HDRP_Sample`

Source: Unity Community post by an Eagle 3D Streaming representative, 11 Nov 2026, https://discussions.unity.com/t/beta-eagle-3d-streaming-stream-your-unity-build-to-any-browser-no-webgl-no-download-3-live-demos/1741633 .

Both new experiences use the same origin/frame-validated stream lifecycle handling, optional fullscreen and Stop controls, limited-duration viewing, and a visible **Open official demo** fallback for embeddability failures. **Only Chop Chop is described as a playable game**, because the other links are not confirmed complete games. Shared demo servers may queue; a stream URL existing or an iframe onload is not proof of successful gameplay. No owner credentials or provider API keys are needed to display the public showcase links.

### Cloud Gaming Library

The cloud provider library has search, local favourites, three transparent eligibility categories, and safe browser links:

| Provider | Official launch | Access claim |
| --- | --- | --- |
| GeForce NOW | https://play.geforcenow.com/ | A free tier exists; queues, title support and game licences can still apply. |
| Xbox Cloud Gaming | https://www.xbox.com/en-GB/play | Fortnite is a selected free cloud title using a free Microsoft account; other games may require eligible Game Pass. |
| Amazon Luna | https://luna.amazon.com/ | UK availability via eligible Prime membership; not a free subscription. |

Sources:
- https://www.nvidia.com/en-gb/geforce-now/faq/
- https://www.xbox.com/en-GB/cloud-gaming
- https://digprjsurvey.amazon.co.uk/csad/help/node/TXHVI0WFpYnGXsA0Gm

Each provider link opens separately: their web apps do not grant AIO permission to rehost the private streams inside its page. No subscription, account or password is requested by the finder. Favourites are saved only in the browser's local storage. No automatic session or remote machine is started by viewing the cloud service cards.

### Regression verification

The updated CI checks the Cloud Gaming entrypoint, new scripts, public demo allowlist, genuine remote queue events, malicious frame-message isolation, safe external links, search/eligibility filters, local favourites, responsive styles, and no hidden stream startup. Runtime provider gameplay and latency **have not been independently verified**. The project must not advertise 24/7 availability for the public GPU demos.
