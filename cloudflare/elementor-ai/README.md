# Elementor AI image generation

This Worker provides the image-generation endpoint used by the Elementor modal in `index.html`.

## Deployment

- Worker: `aio-elementor-ai`
- Model: `@cf/black-forest-labs/flux-1-schnell`
- Binding: Workers AI as `AI`
- Public route: `POST /generate`
- Health route: `GET /health`
- Allowed browser origin: `https://allinoneedition.vercel.app`

Deploy from this directory with Wrangler:

```sh
npx wrangler deploy
```

## Safety and limits

- Prompts are limited to 1,200 characters.
- A basic prompt safety filter rejects explicit, graphic, self-harm and weapon-related requests.
- The Worker applies a best-effort per-IP limit of three generations per ten minutes. The in-memory counter is not a durable billing quota.
- Do not treat browser-side limits or the Origin header as authentication.
- Workers AI usage is metered and may be billable. Review Cloudflare billing and usage before increasing availability.
- Generated images are returned directly to the browser and are not persisted by this Worker.

The public endpoint is intended for the All in One Edition site only. If the site hostname changes, update the allowed origin in `worker.ts` and redeploy.
