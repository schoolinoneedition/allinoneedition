# All in One Edition media storage Worker

This Worker is the private media gateway for All in One Edition. It stores objects in a **private Backblaze B2 bucket using its S3-compatible API** and uses Supabase Auth/Postgres for identity and ownership metadata.

## Build validation

The `Media Worker build check` GitHub Actions workflow is configured to run Wrangler's dry-run build for this directory on relevant changes and via manual dispatch. It compiles the TypeScript bundle without deploying it. A successful workflow run must be confirmed before deployment.

## Required configuration

The Wrangler configuration supplies these non-secret values for the configured bucket:
- `B2_ENDPOINT`: `https://s3.us-east-005.backblazeb2.com`
- `B2_REGION`: `us-east-005`
- `B2_BUCKET`: `allinoneedition-media`

For `B2_KEY_ID`, use the actual Backblaze Application Key ID, not the key name or bucket name.

Set these Worker secrets in Cloudflare (never commit them):
- `B2_KEY_ID`: Backblaze Application Key ID
- `B2_APPLICATION_KEY`: matching Backblaze Application Key
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (secret; never expose to the browser)

The Backblaze Application Key should be restricted to the `allinoneedition-media` bucket and have the list, read, write, and delete capabilities required by this Worker. Keep the bucket private. Deploy from this directory after the database migration is applied and all secrets are configured.

## API

Upload, abort, complete, owner-read, and delete routes require a Supabase access token in the Authorization bearer header. Health checks and signed public playback-link requests are intentionally unauthenticated.

- `GET /health` checks the configured private B2 bucket without exposing credentials or object names
- `POST /uploads/initiate` with `{ filename, contentType, sizeBytes, visibility }` (`visibility` is `private` by default; use `public` only for content intended for public posts or published episodes)
- `POST /uploads/:id/parts/:partNumber` with one binary part (32 MiB client chunks recommended)
- `POST /uploads/:id/complete` with `{ parts: [{ partNumber, etag }] }`
- `POST /uploads/:id/abort`
- `GET /media/:id/signed-url` returns a one-hour signed playback URL for a `public` object
- `GET /media/:id` streams an owner-authorized object or a public object with a valid temporary signature, and supports byte-range playback
- `DELETE /media/:id` deletes only the signed-in user's object

The browser never receives B2 credentials, object keys, or Supabase service-role credentials. The Worker checks the Supabase session and verifies ownership before uploads, private reads, completion, aborts, or deletes. Public playback is limited to objects explicitly marked `public` and uses HMAC-signed URLs that expire after one hour.

## Limits and safeguards

- Uses S3-compatible multipart upload with a 32 MiB per-request part ceiling and up to 10,000 parts.
- Non-final multipart parts must meet the S3 minimum part size (5 MiB).
- The Worker buffers each incoming part (up to 32 MiB) to calculate the AWS Signature V4 payload hash before sending it to B2.
- The bucket remains private; all object access is proxied through the Worker. Public media is not exposed through a public bucket URL.
- There is no per-user storage quota in this initial service. Add abuse protection, monitoring, and billing alerts before opening uploads widely.

## Important integration note

Keep existing Supabase Storage media intact until end-to-end upload, playback, byte-range seeking, and delete tests pass.

## Backblaze B2 credentials

Configure these as **Worker secrets** in Cloudflare, not as committed values:

- `B2_KEY_ID`: the Backblaze **Application Key ID** (not the key name or account ID).
- `B2_APPLICATION_KEY`: the matching **Application Key** secret.

Do not use the Backblaze master application key. Never commit or paste either secret into source control, issue comments, or chat.

The `GET /health` check first validates the key pair against Backblaze account authentication, then performs an authenticated S3 bucket-list request. A `credentials_rejected` result with HTTP 401 means the key ID and application key are invalid, mismatched, or swapped. A `NoSuchBucket` result usually means the bucket name or S3 region endpoint does not match the bucket's actual location. A `SignatureDoesNotMatch` response indicates an S3 signing, endpoint, region, or credential-pair mismatch.
