interface Env {
  MEDIA: R2Bucket;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  APP_ORIGIN: string;
}

interface MediaRow {
  id: string;
  user_id: string;
  object_key: string;
  multipart_upload_id: string | null;
  filename: string;
  content_type: string;
  size_bytes: number;
  status: "uploading" | "ready" | "deleted";
}

const MAX_PARTS = 10_000;
const MAX_PART_BYTES = 32 * 1024 * 1024;
const MIN_PART_BYTES = 5 * 1024 * 1024;
const MAX_OBJECT_BYTES = MAX_PARTS * MAX_PART_BYTES;
const ALLOWED_TYPES = new Set([
  "video/mp4", "video/webm",
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"
]);

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });
}

function cors(request: Request, env: Env) {
  const origin = request.headers.get("Origin");
  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Content-Length",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  });
  if (origin && origin === env.APP_ORIGIN) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

async function authenticate(request: Request, env: Env) {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: authorization }
  });
  if (!response.ok) return null;
  const user = await response.json() as { id?: string };
  return user.id ? user as { id: string } : null;
}

function serviceHeaders(env: Env, prefer?: string) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {})
  };
}

async function dbInsert(env: Env, row: Record<string, unknown>) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/aio_media_objects`, {
    method: "POST",
    headers: serviceHeaders(env, "return=representation"),
    body: JSON.stringify(row)
  });
  if (!response.ok) throw new Error("Could not save upload metadata");
  const rows = await response.json() as MediaRow[];
  if (!rows[0]) throw new Error("Upload metadata was not returned");
  return rows[0];
}

async function dbGet(env: Env, id: string, userId: string) {
  const query = new URLSearchParams({
    id: `eq.${id}`, user_id: `eq.${userId}`, select: "*", limit: "1"
  });
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/aio_media_objects?${query}`, {
    headers: serviceHeaders(env)
  });
  if (!response.ok) throw new Error("Could not verify media ownership");
  const rows = await response.json() as MediaRow[];
  return rows[0] || null;
}

async function dbUpdate(env: Env, row: MediaRow, patch: Record<string, unknown>) {
  const query = new URLSearchParams({ id: `eq.${row.id}`, user_id: `eq.${row.user_id}` });
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/aio_media_objects?${query}`, {
    method: "PATCH",
    headers: serviceHeaders(env, "return=minimal"),
    body: JSON.stringify(patch)
  });
  if (!response.ok) throw new Error("Could not update media metadata");
}

async function dbUpsertPart(env: Env, uploadId: string, partNumber: number, etag: string, sizeBytes: number) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/aio_media_upload_parts?on_conflict=upload_id,part_number`, {
    method: "POST",
    headers: serviceHeaders(env, "resolution=merge-duplicates,return=minimal"),
    body: JSON.stringify({ upload_id: uploadId, part_number: partNumber, etag, size_bytes: sizeBytes })
  });
  if (!response.ok) throw new Error("Could not save multipart progress");
}

async function dbGetParts(env: Env, uploadId: string) {
  const query = new URLSearchParams({
    upload_id: `eq.${uploadId}`, select: "part_number,etag,size_bytes", order: "part_number.asc"
  });
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/aio_media_upload_parts?${query}`, {
    headers: serviceHeaders(env)
  });
  if (!response.ok) throw new Error("Could not verify multipart progress");
  return await response.json() as Array<{ part_number: number; etag: string; size_bytes: number }>;
}

async function dbDeleteParts(env: Env, uploadId: string) {
  const query = new URLSearchParams({ upload_id: `eq.${uploadId}` });
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/aio_media_upload_parts?${query}`, {
    method: "DELETE",
    headers: serviceHeaders(env, "return=minimal")
  });
  if (!response.ok) throw new Error("Could not clear multipart progress");
}

function safeFilename(value: unknown) {
  if (typeof value !== "string") return "upload";
  return value.normalize("NFKC").replace(/[\\/\0-\x1f\x7f]/g, "_").slice(0, 180) || "upload";
}

function safeId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = cors(request, env);
    if (request.method === "OPTIONS") {
      if (request.headers.get("Origin") !== env.APP_ORIGIN) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers });
    }
    if (request.headers.get("Origin") && request.headers.get("Origin") !== env.APP_ORIGIN) {
      return json({ error: "Origin not allowed" }, 403, headers);
    }

    const user = await authenticate(request, env);
    if (!user) return json({ error: "Authentication required" }, 401, headers);

    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);

    try {
      if (request.method === "POST" && url.pathname === "/uploads/initiate") {
        const input = await request.json() as { filename?: unknown; contentType?: unknown; sizeBytes?: unknown };
        const filename = safeFilename(input.filename);
        const contentType = typeof input.contentType === "string" ? input.contentType.toLowerCase().split(";")[0].trim() : "";
        const sizeBytes = Number(input.sizeBytes);
        if (!ALLOWED_TYPES.has(contentType)) return json({ error: "File type is not supported" }, 415, headers);
        if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_OBJECT_BYTES) {
          return json({ error: "Invalid file size" }, 400, headers);
        }

        const id = crypto.randomUUID();
        const key = `${user.id}/${id}`;
        const upload = await env.MEDIA.createMultipartUpload(key, {
          httpMetadata: { contentType }
        });
        try {
          await dbInsert(env, {
            id, user_id: user.id, object_key: key, multipart_upload_id: upload.uploadId,
            filename, content_type: contentType, size_bytes: sizeBytes, status: "uploading"
          });
        } catch (error) {
          await upload.abort();
          throw error;
        }
        return json({ uploadId: id, partSizeBytes: MAX_PART_BYTES, maxParts: MAX_PARTS }, 201, headers);
      }

      if (request.method === "POST" && parts.length === 4 && parts[0] === "uploads" && parts[2] === "parts") {
        const id = parts[1];
        const partNumber = Number(parts[3]);
        if (!safeId(id) || !Number.isInteger(partNumber) || partNumber < 1 || partNumber > MAX_PARTS) {
          return json({ error: "Invalid upload or part number" }, 400, headers);
        }
        const contentLength = request.headers.get("Content-Length");
        if (!contentLength || !/^\d+$/.test(contentLength)) return json({ error: "Content-Length is required for multipart parts" }, 411, headers);
        const length = Number(contentLength);
        if (length <= 0 || length > MAX_PART_BYTES) return json({ error: "Part must be between 1 byte and 32 MiB" }, 413, headers);
        const row = await dbGet(env, id, user.id);
        if (!row || row.status !== "uploading" || !row.multipart_upload_id) return json({ error: "Upload not found" }, 404, headers);
        const upload = env.MEDIA.resumeMultipartUpload(row.object_key, row.multipart_upload_id);
        const result = await upload.uploadPart(partNumber, request.body!);
        await dbUpsertPart(env, id, partNumber, result.etag, length);
        return json({ partNumber, etag: result.etag }, 200, headers);
      }

      if (request.method === "POST" && parts.length === 3 && parts[0] === "uploads" && parts[2] === "complete") {
        const id = parts[1];
        if (!safeId(id)) return json({ error: "Invalid upload ID" }, 400, headers);
        const row = await dbGet(env, id, user.id);
        if (!row || row.status !== "uploading" || !row.multipart_upload_id) return json({ error: "Upload not found" }, 404, headers);
        const input = await request.json() as { parts?: Array<{ partNumber: number; etag: string }> };
        const uploadedParts = input.parts;
        if (!Array.isArray(uploadedParts) || uploadedParts.length < 1 || uploadedParts.length > MAX_PARTS) {
          return json({ error: "Invalid multipart completion list" }, 400, headers);
        }
        const storedParts = await dbGetParts(env, id);
        if (storedParts.length !== uploadedParts.length) return json({ error: "Some upload parts are missing" }, 400, headers);
        const verifiedParts = storedParts.map((part, index) => {
          const submitted = uploadedParts[index];
          if (!submitted || submitted.partNumber !== part.part_number || submitted.etag !== part.etag) {
            throw new Error("Multipart part list does not match server records");
          }
          return { partNumber: part.part_number, etag: part.etag, sizeBytes: Number(part.size_bytes) };
        });
        if (verifiedParts.some((part, index) => part.partNumber !== index + 1 || !Number.isSafeInteger(part.sizeBytes) || part.sizeBytes <= 0 || part.sizeBytes > MAX_PART_BYTES)) {
          return json({ error: "Multipart parts must be sequential and within the part size limit" }, 400, headers);
        }
        const partSizes = verifiedParts.map(part => part.sizeBytes);
        const uniformNonFinalParts = partSizes.slice(0, -1).every(size => size === partSizes[0] && size >= MIN_PART_BYTES);
        if (!uniformNonFinalParts || partSizes.reduce((sum, size) => sum + size, 0) !== row.size_bytes) {
          return json({ error: "Multipart sizes do not match the declared file size or R2 part requirements" }, 400, headers);
        }
        const upload = env.MEDIA.resumeMultipartUpload(row.object_key, row.multipart_upload_id);
        const object = await upload.complete(verifiedParts.map(({ partNumber, etag }) => ({ partNumber, etag })));
        if (object.size !== row.size_bytes) {
          await env.MEDIA.delete(row.object_key);
          await dbUpdate(env, row, { status: "deleted", multipart_upload_id: null });
          await dbDeleteParts(env, id);
          return json({ error: "Uploaded size did not match the declared file size" }, 400, headers);
        }
        await dbUpdate(env, row, { status: "ready", multipart_upload_id: null, etag: object.etag, completed_at: new Date().toISOString() });
        await dbDeleteParts(env, id);
        return json({ id: row.id, status: "ready", sizeBytes: object.size }, 200, headers);
      }

      if (request.method === "POST" && parts.length === 3 && parts[0] === "uploads" && parts[2] === "abort") {
        const id = parts[1];
        if (!safeId(id)) return json({ error: "Invalid upload ID" }, 400, headers);
        const row = await dbGet(env, id, user.id);
        if (!row || row.status !== "uploading" || !row.multipart_upload_id) return json({ error: "Upload not found" }, 404, headers);
        await env.MEDIA.resumeMultipartUpload(row.object_key, row.multipart_upload_id).abort();
        await dbUpdate(env, row, { status: "deleted", multipart_upload_id: null });
        await dbDeleteParts(env, id);
        return json({ ok: true }, 200, headers);
      }

      if (request.method === "GET" && parts.length === 2 && parts[0] === "media") {
        const id = parts[1];
        if (!safeId(id)) return json({ error: "Invalid media ID" }, 400, headers);
        const row = await dbGet(env, id, user.id);
        if (!row || row.status !== "ready") return json({ error: "Media not found" }, 404, headers);
        const rangeHeader = request.headers.get("Range");
        let range: R2Range | undefined;
        let rangeStatus = 200;
        let rangeStart = 0;
        let rangeLength: number | undefined;
        if (rangeHeader) {
          const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
          if (!match || (!match[1] && !match[2])) {
            return new Response(null, { status: 416, headers: { ...Object.fromEntries(headers), "Content-Range": "bytes */*" } });
          }
          if (!match[1]) {
            const suffix = Number(match[2]);
            if (!Number.isSafeInteger(suffix) || suffix <= 0) return new Response(null, { status: 416 });
            rangeStart = Math.max(0, row.size_bytes - suffix);
            rangeLength = Math.min(suffix, row.size_bytes);
          } else {
            rangeStart = Number(match[1]);
            const end = match[2] ? Number(match[2]) : row.size_bytes - 1;
            if (!Number.isSafeInteger(rangeStart) || !Number.isSafeInteger(end) || rangeStart < 0 || end < rangeStart || rangeStart >= row.size_bytes) {
              return new Response(null, { status: 416, headers: { ...Object.fromEntries(headers), "Content-Range": `bytes */${row.size_bytes}` } });
            }
            rangeLength = Math.min(end, row.size_bytes - 1) - rangeStart + 1;
          }
          range = { offset: rangeStart, length: rangeLength };
          rangeStatus = 206;
        }
        const object = await env.MEDIA.get(row.object_key, range ? { range } : undefined);
        if (!object) return json({ error: "Media object missing" }, 404, headers);
        const responseHeaders = new Headers(headers);
        responseHeaders.set("Content-Type", row.content_type);
        responseHeaders.set("Content-Length", String(rangeLength ?? object.size));
        responseHeaders.set("ETag", object.httpEtag);
        responseHeaders.set("Accept-Ranges", "bytes");
        responseHeaders.set("Cache-Control", "private, no-store");
        responseHeaders.set("X-Content-Type-Options", "nosniff");
        responseHeaders.set("Content-Disposition", "inline");
        if (rangeStatus === 206 && rangeLength !== undefined) {
          responseHeaders.set("Content-Range", `bytes ${rangeStart}-${rangeStart + rangeLength - 1}/${row.size_bytes}`);
        }
        return new Response(object.body, { status: rangeStatus, headers: responseHeaders });
      }

      if (request.method === "DELETE" && parts.length === 2 && parts[0] === "media") {
        const id = parts[1];
        if (!safeId(id)) return json({ error: "Invalid media ID" }, 400, headers);
        const row = await dbGet(env, id, user.id);
        if (!row || row.status === "deleted") return json({ error: "Media not found" }, 404, headers);
        if (row.status === "uploading" && row.multipart_upload_id) {
          await env.MEDIA.resumeMultipartUpload(row.object_key, row.multipart_upload_id).abort();
        } else {
          await env.MEDIA.delete(row.object_key);
        }
        await dbUpdate(env, row, { status: "deleted", multipart_upload_id: null });
        await dbDeleteParts(env, id);
        return json({ ok: true }, 200, headers);
      }

      return json({ error: "Not found" }, 404, headers);
    } catch (error) {
      console.error("Media worker request failed", error);
      return json({ error: "Media request failed" }, 500, headers);
    }
  }
} satisfies ExportedHandler<Env>;
