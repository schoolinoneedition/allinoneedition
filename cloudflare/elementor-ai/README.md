# Elementor AI Worker

This Worker serves Elementor's authenticated streaming chat and image-generation endpoints.

## Browser-backed Work Mode

The Worker also exposes POST /browse, backed by Cloudflare Browser Run's BROWSER binding. It renders a public HTTP(S) webpage in an isolated remote Chromium session and returns bounded Markdown and links for Elementor to analyse.

The browser integration is deliberately read-only:
- It does not inherit the visitor's local Chrome tabs, cookies, passwords, or browser session.
- It does not sign in, submit forms, click buttons, or make purchases.
- It rejects local/private IP literals and non-HTTP(S) schemes.
- It uses Browser Run's one-shot Markdown Quick Action with a 25-second navigation timeout.
- Browser Run may refuse sites that block automated browsers or require authentication.

The binding is configured in wrangler.toml as BROWSER. The account must have Browser Run enabled. Deploy with the authorised Cloudflare account, then verify /health and an authenticated POST /browse request with the production site Origin.

A normal website cannot obtain unrestricted access to Chrome tabs from a browser permission prompt. Full interactive sessions would need a separate session-backed browser runtime and an explicit user-controlled approval flow; this Worker does not claim those capabilities.

