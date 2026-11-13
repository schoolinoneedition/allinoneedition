# All in One Edition media Worker

This Worker stores media in the private Backblaze B2 bucket and uses Supabase Auth/Postgres only for identity and private media metadata.

## Required configuration

Plain-text Worker variables:
- `APP_ORIGIN=https://allinoneedition.vercel.app`
- `B2_ENDPOINT=https://s3.us-east-005.backblazeb2.com`
- `B2_REGION=us-east-005`
- `B2_BUCKET=allinoneedition-media`
- `SUPABASE_URL=https://btnbuchsrfllpzlypjtn.supabase.co`

Worker secrets (never commit or expose):
- `B2_KEY_ID`
- `B2_APPLICATION_KEY`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The browser never receives B2 credentials, object keys, or the Supabase service-role key. Every upload requires a valid Supabase session. Public Watch videos are served only through short-lived signed playback URLs.

## API

- `POST /uploads/initiate` with `{ filename, contentType, sizeBytes, visibility }`
- `POST /uploads/:id/parts/:partNumber` with one binary part (32 MiB maximum)
- `POST /uploads/:id/complete` with verified ETags
- `POST /uploads/:id/abort`
- `GET /media/:id` streams private owner media or a valid signed public object; byte ranges are supported
- `GET /media/:id/signed-url` returns a one-hour playback URL for a completed public object
- `DELETE /media/:id` deletes only the signed-in owner's object
- `GET /health` reports the storage connection status

## Safety and limits

- Allowed media types are checked server-side.
- The first multipart chunk is checked against the declared file type.
- Multipart parts are limited to 32 MiB and verified against server-recorded ETags and byte counts.
- Public uploads are opt-in per object. Other media remains private.
- Watch's upload interface applies a stricter 1 GB maximum even though the storage service supports larger objects.
- Supabase stores metadata only; the video bytes stay in Backblaze B2.
