# All in One Edition media storage Worker

This Worker is the private media gateway for All in One Edition. It uses a private Cloudflare R2 bucket and Supabase Auth/Postgres metadata.

## Required setup

1. Enable R2 in the Cloudflare dashboard and confirm billing/plan activation.
2. Create the private bucket named `aio-media` (or update the Wrangler binding and deploy config together).
3. Set the Worker secrets:
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (secret; never expose to the browser)
4. Keep `APP_ORIGIN` restricted to the production origin and add an explicit preview origin only if needed.
5. Deploy from this directory with Wrangler after the database migration is applied.

## API

All routes require a Supabase access token in the Authorization bearer header.

- `POST /uploads/initiate` with `{ filename, contentType, sizeBytes }`
- `POST /uploads/:id/parts/:partNumber` with one binary part (16 MiB client chunks recommended)
- `POST /uploads/:id/complete` with `{ parts: [{ partNumber, etag }] }`
- `POST /uploads/:id/abort`
- `GET /media/:id` streams a private object to its owner
- `DELETE /media/:id` deletes only the signed-in user's object

The browser never receives R2 credentials, bucket names, object keys, or Supabase service-role credentials. The Worker checks the Supabase session and then checks ownership of each media record before any read, completion, abort, or delete operation.

## Limits and cost controls

- Uses R2 multipart upload, with 16 MiB recommended parts and a 32 MiB per-request part ceiling.
- R2's documented maximum object size is 5 TiB and multipart upload supports up to 10,000 parts; practical request limits of the Worker platform still apply.
- There is no arbitrary per-user storage quota in this initial service. Enforce abuse protection and billing alerts before opening uploads widely.
- R2 egress is free. Storage and Class A/B operations beyond the current free allowance are billable.
- The Worker does not make the bucket public.

## Important next integration

This Worker is an infrastructure foundation. The existing Social and Watch frontends must be migrated to its upload and playback API before existing Supabase Storage paths can be retired. Do not delete existing buckets or media during that migration.
