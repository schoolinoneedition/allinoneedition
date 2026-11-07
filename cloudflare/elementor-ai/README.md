# Elementor AI image generation

This Worker provides guest and signed-in chat plus image generation for the dedicated `elementor.html` workspace.

## Deployment

- Worker: `aio-elementor-ai`
- Model: `@cf/black-forest-labs/flux-1-schnell`
- Binding: Workers AI as `AI`
- Public routes: `POST /chat`, `POST /generate`
- Health route: `GET /health`
- Allowed browser origin: `https://allinoneedition.vercel.app`

Deploy from this directory with Wrangler:

```sh
npx wrangler deploy
```

## Safety and limits

- Prompts are limited to 1,200 characters.
- A basic prompt safety filter rejects explicit, graphic, self-harm and weapon-related requests.
- Guests can use Elementor without an account. Guest conversations and preferences remain in the current browser session; signed-in conversations are stored in Supabase.
- Guest requests are limited per client IP to five chat messages and one image generation per ten minutes. Signed-in requests are limited per user to 24 chat messages and three images per ten minutes.
- Limits currently use Worker-isolate memory and are best-effort, not a durable global quota. Add a shared rate-limit binding before treating them as abuse-proof.
- Do not treat browser-side limits or the Origin header as authentication.
- Workers AI usage is metered and may be billable. Review Cloudflare billing and usage before increasing availability.
- Generated images are returned directly to the browser and are not persisted by this Worker.

The public endpoint is intended for the All in One Edition site only. If the site hostname changes, update the allowed origin in `worker.ts` and redeploy.
