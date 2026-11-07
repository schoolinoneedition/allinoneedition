interface Env {
  B2_ENDPOINT: string;
  B2_REGION: string;
  B2_BUCKET: string;
  B2_KEY_ID: string;
  B2_APPLICATION_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  APP_ORIGIN: string;
}

interface MediaRow {
  id: string; user_id: string; object_key: string; multipart_upload_id: string | null;
  filename: string; content_type: string; size_bytes: number; status: "uploading" | "ready" | "deleted"; visibility: "private" | "public";
}
interface StoredPart { part_number: number; etag: string; size_bytes: number }

const MAX_PARTS = 10_000;
const MAX_PART_BYTES = 32 * 1024 * 1024;
const MIN_PART_BYTES = 5 * 1024 * 1024;
const MAX_OBJECT_BYTES = MAX_PARTS * MAX_PART_BYTES;
const ALLOWED_TYPES = new Set([
  "video/mp4", "video/webm", "video/quicktime", "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf", "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"
]);

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
}
function cors(request: Request, env: Env) {
  const origin = request.headers.get("Origin");
  const headers = new Headers({ "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type, Content-Length, Range, X-Part-Size", "Access-Control-Expose-Headers": "ETag, Accept-Ranges, Content-Range, Content-Length", "Access-Control-Max-Age": "86400", Vary: "Origin" });
  if (origin && origin === env.APP_ORIGIN) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}
async function authenticate(request: Request, env: Env) {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: authorization } });
  if (!response.ok) return null;
  const user = await response.json() as { id?: string };
  return user.id ? user as { id: string } : null;
}
function serviceHeaders(env: Env, prefer?: string) {
  return { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) };
}
async function dbInsert(env: Env, row: Record<string, unknown>) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/aio_media_objects`, { method: "POST", headers: serviceHeaders(env, "return=representation"), body: JSON.stringify(row) });
  if (!response.ok) throw new Error("Could not save upload metadata");
  const rows = await response.json() as MediaRow[];
  if (!rows[0]) throw new Error("Upload metadata was not returned");
  return rows[0];
}
async function dbGet(env: Env, id: string, userId: string) {
  const query = new URLSearchParams({ id: `eq.${id}`, user_id: `eq.${userId}`, select: "*", limit: "1" });
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/aio_media_objects?${query}`, { headers: serviceHeaders(env) });
  if (!response.ok) throw new Error("Could not verify media ownership");
  return (await response.json() as MediaRow[])[0] || null;
}

async function dbGetPublic(env: Env, id: string) {
  const query = new URLSearchParams({ id: "eq." + id, status: "eq.ready", visibility: "eq.public", select: "*", limit: "1" });
  const response = await fetch(env.SUPABASE_URL + "/rest/v1/aio_media_objects?" + query, { headers: serviceHeaders(env) });
  if (!response.ok) throw new Error("Could not verify public media");
  return (await response.json() as MediaRow[])[0] || null;
}
function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
async function mediaSignature(env: Env, id: string, expires: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.SUPABASE_SERVICE_ROLE_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  const payload = new TextEncoder().encode(id + "." + expires);
  return { key, payload };
}
async function makeMediaSignature(env: Env, id: string, expires: string) {
  const data = await mediaSignature(env, id, expires);
  return base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", data.key, data.payload)));
}
async function verifyMediaSignature(env: Env, id: string, expires: string, signature: string) {
  const now = Math.floor(Date.now() / 1000);
  if (!/^\d{10}$/.test(expires) || Number(expires) <= now || Number(expires) > now + 3600) return false;
  try {
    const data = await mediaSignature(env, id, expires);
    return await crypto.subtle.verify("HMAC", data.key, fromBase64Url(signature), data.payload);
  } catch { return false; }
}
async function dbUpdate(env: Env, row: MediaRow, patch: Record<string, unknown>) {
  const query = new URLSearchParams({ id: `eq.${row.id}`, user_id: `eq.${row.user_id}` });
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/aio_media_objects?${query}`, { method: "PATCH", headers: serviceHeaders(env, "return=minimal"), body: JSON.stringify(patch) });
  if (!response.ok) throw new Error("Could not update media metadata");
}
async function dbUpsertPart(env: Env, uploadId: string, partNumber: number, etag: string, sizeBytes: number) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/aio_media_upload_parts?on_conflict=upload_id,part_number`, { method: "POST", headers: serviceHeaders(env, "resolution=merge-duplicates,return=minimal"), body: JSON.stringify({ upload_id: uploadId, part_number: partNumber, etag, size_bytes: sizeBytes }) });
  if (!response.ok) throw new Error("Could not save multipart progress");
}
async function dbGetParts(env: Env, uploadId: string) {
  const query = new URLSearchParams({ upload_id: `eq.${uploadId}`, select: "part_number,etag,size_bytes", order: "part_number.asc" });
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/aio_media_upload_parts?${query}`, { headers: serviceHeaders(env) });
  if (!response.ok) throw new Error("Could not verify multipart progress");
  return await response.json() as StoredPart[];
}
async function dbDeleteParts(env: Env, uploadId: string) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/aio_media_upload_parts?upload_id=eq.${encodeURIComponent(uploadId)}`, { method: "DELETE", headers: serviceHeaders(env, "return=minimal") });
  if (!response.ok) throw new Error("Could not clear multipart progress");
}
function hex(bytes: ArrayBuffer) { return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, "0")).join(""); }
async function sha256(value: string | ArrayBuffer) { return hex(await crypto.subtle.digest("SHA-256", typeof value === "string" ? new TextEncoder().encode(value) : value)); }
async function hmac(key: ArrayBuffer | Uint8Array, value: string) {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(value)));
}
function awsEncode(value: string) { return encodeURIComponent(value).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`); }
function xmlEscape(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;"); }
async function b2Request(env: Env, key: string, method: string, query: Record<string, string> = {}, body?: string | ArrayBuffer, extraHeaders: Record<string, string> = {}) {
  const endpoint = new URL(env.B2_ENDPOINT.startsWith("http") ? env.B2_ENDPOINT : `https://${env.B2_ENDPOINT}`);
  const path = `/${awsEncode(env.B2_BUCKET)}/${key.split("/").map(awsEncode).join("/")}`;
  const url = new URL(endpoint.origin + path);
  for (const [k, v] of Object.entries(query)) url.searchParams.append(k, v);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const payloadHash = await sha256(body ?? "");
  const headers: Record<string, string> = { host: url.host, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate, ...extraHeaders };
  const signedNames = Object.keys(headers).map(k => k.toLowerCase()).sort();
  const canonicalHeaders = signedNames.map(k => `${k}:${headers[Object.keys(headers).find(x => x.toLowerCase() === k)!].trim().replace(/\s+/g, " ")}\n`).join("");
  const canonicalQuery = [...url.searchParams.entries()].map(([k,v]) => [awsEncode(k), awsEncode(v)] as const).sort((a,b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1])).map(([k,v]) => `${k}=${v}`).join("&");
  const canonicalRequest = [method, url.pathname, canonicalQuery, canonicalHeaders, signedNames.join(";"), payloadHash].join("\n");
  const scope = `${date}/${env.B2_REGION}/s3/aws4_request`;
  const toSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${await sha256(canonicalRequest)}`;
  const kDate = await hmac(new TextEncoder().encode(`AWS4${env.B2_APPLICATION_KEY}`), date);
  const kRegion = await hmac(kDate, env.B2_REGION);
  const kService = await hmac(kRegion, "s3");
  const kSigning = await hmac(kService, "aws4_request");
  const signature = hex(await crypto.subtle.sign("HMAC", await crypto.subtle.importKey("raw", kSigning, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), new TextEncoder().encode(toSign)));
  headers.Authorization = `AWS4-HMAC-SHA256 Credential=${env.B2_KEY_ID}/${scope}, SignedHeaders=${signedNames.join(";")}, Signature=${signature}`;
  // Host is part of the SigV4 canonical request, but Workers derives it from the URL.
  // Sending an explicit Host header can be rejected by the Fetch runtime.
  delete headers.host;
  const response = await fetch(url, { method, headers, body: body as BodyInit | null | undefined });
  if (!response.ok) throw new Error(`Backblaze storage request failed (${response.status}): ${(await response.text()).slice(0, 400)}`);
  return response;
}
function hasExpectedMagic(contentType: string, bytes: ArrayBuffer) {
  const data = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 16));
  const starts = (...values: number[]) => values.every((value, index) => data[index] === value);
  if (contentType === "image/jpeg") return starts(0xff, 0xd8, 0xff);
  if (contentType === "image/png") return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (contentType === "image/gif") return new TextDecoder().decode(data.slice(0, 6)).startsWith("GIF8");
  if (contentType === "video/webm") return starts(0x1a, 0x45, 0xdf, 0xa3);
  if (contentType === "video/mp4" || contentType === "video/quicktime") return data.length >= 8 && data[4] === 0x66 && data[5] === 0x74 && data[6] === 0x79 && data[7] === 0x70;
  if (contentType === "application/pdf") return new TextDecoder().decode(data.slice(0, 5)) === "%PDF-";
  if (contentType.startsWith("application/vnd.openxmlformats-officedocument.")) return starts(0x50, 0x4b, 0x03, 0x04);
  if (contentType === "text/plain") { if (data.includes(0)) return false; try { new TextDecoder("utf-8", { fatal: true }).decode(data); return true; } catch { return false; } }
  return false;
}
function safeFilename(value: unknown) { return typeof value === "string" ? value.normalize("NFKC").replace(/[\\/\0-\x1f\x7f]/g, "_").slice(0, 180) || "upload" : "upload"; }
function safeId(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function xmlValue(xml: string, tag: string) { return new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml)?.[1] || ""; }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = cors(request, env);
    if (request.method === "OPTIONS") return request.headers.get("Origin") === env.APP_ORIGIN ? new Response(null, { status: 204, headers }) : new Response(null, { status: 403 });
    if (request.headers.get("Origin") && request.headers.get("Origin") !== env.APP_ORIGIN) return json({ error: "Origin not allowed" }, 403, headers);
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    if (request.method === "GET" && url.pathname === "/health") {
      try {
        await b2Request(env, "", "GET", { "list-type": "2", "max-keys": "1" });
        return json({ ok: true, storage: "connected" }, 200, headers);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        const status = /Backblaze storage request failed \((\d{3})\)/.exec(detail)?.[1] || "network_error";
        console.error("B2 health check failed", { status, detail: detail.slice(0, 180) });
        return json({ ok: false, storage: "unavailable", code: status }, 503, headers);
      }
    }
    const user = await authenticate(request, env);
    try {
      if (request.method === "GET" && parts.length === 3 && parts[0] === "media" && parts[2] === "signed-url") {
        const id = parts[1];
        if (!safeId(id)) return json({ error: "Invalid media ID" }, 400, headers);
        const row = await dbGetPublic(env, id);
        if (!row) return json({ error: "Media not found" }, 404, headers);
        const expires = String(Math.floor(Date.now() / 1000) + 3600);
        const signature = await makeMediaSignature(env, id, expires);
        const signedUrl = new URL("/media/" + id, request.url);
        signedUrl.searchParams.set("expires", expires);
        signedUrl.searchParams.set("signature", signature);
        return json({ url: signedUrl.href, expiresAt: new Date(Number(expires) * 1000).toISOString() }, 200, headers);
      }
      if (request.method === "POST" && url.pathname === "/uploads/initiate") {
        if (!user) return json({ error: "Authentication required" }, 401, headers);
        const input = await request.json() as { filename?: unknown; contentType?: unknown; sizeBytes?: unknown; visibility?: unknown };
        const filename = safeFilename(input.filename);
        const contentType = typeof input.contentType === "string" ? input.contentType.toLowerCase().split(";")[0].trim() : "";
        const sizeBytes = Number(input.sizeBytes);
        if (!ALLOWED_TYPES.has(contentType)) return json({ error: "File type is not supported" }, 415, headers);
        if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_OBJECT_BYTES) return json({ error: "Invalid file size" }, 400, headers);
        const visibility = input.visibility === "public" ? "public" : "private";
        const id = crypto.randomUUID(); const key = `${user.id}/${id}`;
        const init = await b2Request(env, key, "POST", { uploads: "" }, "");
        const uploadId = xmlValue(await init.text(), "UploadId");
        if (!uploadId) throw new Error("Backblaze did not return a multipart upload ID");
        try { await dbInsert(env, { id, user_id: user.id, object_key: key, multipart_upload_id: uploadId, filename, content_type: contentType, size_bytes: sizeBytes, status: "uploading", visibility }); }
        catch (error) { await b2Request(env, key, "DELETE", { uploadId }, ""); throw error; }
        return json({ uploadId: id, partSizeBytes: MAX_PART_BYTES, maxParts: MAX_PARTS }, 201, headers);
      }
      if (request.method === "POST" && parts.length === 4 && parts[0] === "uploads" && parts[2] === "parts") {
        if (!user) return json({ error: "Authentication required" }, 401, headers);
        const id = parts[1]; const partNumber = Number(parts[3]);
        if (!safeId(id) || !Number.isInteger(partNumber) || partNumber < 1 || partNumber > MAX_PARTS) return json({ error: "Invalid upload or part number" }, 400, headers);
        const length = Number(request.headers.get("Content-Length") || request.headers.get("X-Part-Size"));
        if (!Number.isSafeInteger(length) || length <= 0 || length > MAX_PART_BYTES) return json({ error: "Part must be between 1 byte and 32 MiB" }, 413, headers);
        const row = await dbGet(env, id, user.id);
        if (!row || row.status !== "uploading" || !row.multipart_upload_id) return json({ error: "Upload not found" }, 404, headers);
        const bytes = await request.arrayBuffer();
        if (bytes.byteLength !== length) return json({ error: "Part length mismatch" }, 400, headers);
        if (partNumber === 1 && !hasExpectedMagic(row.content_type, bytes)) return json({ error: "File content does not match its declared media type" }, 415, headers);
        const result = await b2Request(env, row.object_key, "PUT", { partNumber: String(partNumber), uploadId: row.multipart_upload_id }, bytes);
        const etag = result.headers.get("ETag")?.replace(/^"|"$/g, "");
        if (!etag) throw new Error("Backblaze did not return a part ETag");
        await dbUpsertPart(env, id, partNumber, etag, length);
        return json({ partNumber, etag }, 200, headers);
      }
      if (request.method === "POST" && parts.length === 3 && parts[0] === "uploads" && parts[2] === "complete") {
        if (!user) return json({ error: "Authentication required" }, 401, headers);
        const id = parts[1]; if (!safeId(id)) return json({ error: "Invalid upload ID" }, 400, headers);
        const row = await dbGet(env, id, user.id);
        if (!row || row.status !== "uploading" || !row.multipart_upload_id) return json({ error: "Upload not found" }, 404, headers);
        const input = await request.json() as { parts?: Array<{ partNumber: number; etag: string }> };
        const submitted = input.parts;
        if (!Array.isArray(submitted) || submitted.length < 1 || submitted.length > MAX_PARTS) return json({ error: "Invalid multipart completion list" }, 400, headers);
        const stored = await dbGetParts(env, id);
        if (stored.length !== submitted.length) return json({ error: "Some upload parts are missing" }, 400, headers);
        const verified: StoredPart[] = [];
        for (let i = 0; i < stored.length; i++) {
          if (submitted[i]?.partNumber !== stored[i].part_number || submitted[i]?.etag !== stored[i].etag) return json({ error: "Multipart part list does not match server records" }, 400, headers);
          verified.push(stored[i]);
        }
        if (verified.some((p, i) => p.part_number !== i + 1 || !Number.isSafeInteger(Number(p.size_bytes)) || p.size_bytes <= 0 || p.size_bytes > MAX_PART_BYTES) ||
            verified.slice(0, -1).some(p => p.size_bytes < MIN_PART_BYTES) ||
            verified.reduce((sum, p) => sum + Number(p.size_bytes), 0) !== row.size_bytes) return json({ error: "Multipart sizes do not match the declared file size or Backblaze part requirements" }, 400, headers);
        const body = `<CompleteMultipartUpload>${verified.map(p => `<Part><PartNumber>${p.part_number}</PartNumber><ETag>"${xmlEscape(p.etag)}"</ETag></Part>`).join("")}</CompleteMultipartUpload>`;
        await b2Request(env, row.object_key, "POST", { uploadId: row.multipart_upload_id }, body, { "content-type": "application/xml" });
        await dbUpdate(env, row, { status: "ready", multipart_upload_id: null, completed_at: new Date().toISOString() });
        await dbDeleteParts(env, id);
        return json({ id: row.id, status: "ready", sizeBytes: row.size_bytes }, 200, headers);
      }
      if (request.method === "POST" && parts.length === 3 && parts[0] === "uploads" && parts[2] === "abort") {
        if (!user) return json({ error: "Authentication required" }, 401, headers);
        const id = parts[1]; if (!safeId(id)) return json({ error: "Invalid upload ID" }, 400, headers);
        const row = await dbGet(env, id, user.id);
        if (!row || row.status !== "uploading" || !row.multipart_upload_id) return json({ error: "Upload not found" }, 404, headers);
        await b2Request(env, row.object_key, "DELETE", { uploadId: row.multipart_upload_id }, "");
        await dbUpdate(env, row, { status: "deleted", multipart_upload_id: null }); await dbDeleteParts(env, id);
        return json({ ok: true }, 200, headers);
      }
      if (request.method === "GET" && parts.length === 2 && parts[0] === "media") {
        const id = parts[1]; if (!safeId(id)) return json({ error: "Invalid media ID" }, 400, headers);
        let row: MediaRow | null = user ? await dbGet(env, id, user.id) : null;
        if (!row) {
          const expires = url.searchParams.get("expires") || "";
          const signature = url.searchParams.get("signature") || "";
          if (!signature || !await verifyMediaSignature(env, id, expires, signature)) return json({ error: "A valid temporary playback link is required" }, 401, headers);
          row = await dbGetPublic(env, id);
        }
        if (!row || row.status !== "ready") return json({ error: "Media not found" }, 404, headers);
        const rangeHeader = request.headers.get("Range");
        const objectHeaders: Record<string, string> = {};
        let status = 200; let rangeStart = 0; let rangeEnd = row.size_bytes - 1;
        if (rangeHeader) {
          const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
          if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { ...Object.fromEntries(headers), "Content-Range": `bytes */${row.size_bytes}` } });
          if (!match[1]) { const suffix = Number(match[2]); if (!Number.isSafeInteger(suffix) || suffix <= 0) return new Response(null, { status: 416 }); rangeStart = Math.max(0, row.size_bytes - suffix); }
          else { rangeStart = Number(match[1]); rangeEnd = match[2] ? Number(match[2]) : row.size_bytes - 1; }
          if (!Number.isSafeInteger(rangeStart) || !Number.isSafeInteger(rangeEnd) || rangeStart < 0 || rangeEnd < rangeStart || rangeStart >= row.size_bytes) return new Response(null, { status: 416, headers: { ...Object.fromEntries(headers), "Content-Range": `bytes */${row.size_bytes}` } });
          rangeEnd = Math.min(rangeEnd, row.size_bytes - 1); objectHeaders.Range = `bytes=${rangeStart}-${rangeEnd}`; status = 206;
        }
        const object = await b2Request(env, row.object_key, "GET", {}, undefined, objectHeaders);
        const responseHeaders = new Headers(headers); responseHeaders.set("Content-Type", row.content_type);
        responseHeaders.set("Content-Length", String(status === 206 ? rangeEnd - rangeStart + 1 : row.size_bytes));
        responseHeaders.set("ETag", object.headers.get("ETag") || ""); responseHeaders.set("Accept-Ranges", "bytes");
        responseHeaders.set("Cache-Control", "private, no-store"); responseHeaders.set("X-Content-Type-Options", "nosniff"); responseHeaders.set("Content-Disposition", "inline");
        if (status === 206) responseHeaders.set("Content-Range", `bytes ${rangeStart}-${rangeEnd}/${row.size_bytes}`);
        return new Response(object.body, { status, headers: responseHeaders });
      }
      if (request.method === "DELETE" && parts.length === 2 && parts[0] === "media") {
        if (!user) return json({ error: "Authentication required" }, 401, headers);
        const id = parts[1]; if (!safeId(id)) return json({ error: "Invalid media ID" }, 400, headers);
        const row = await dbGet(env, id, user.id); if (!row || row.status === "deleted") return json({ error: "Media not found" }, 404, headers);
        if (row.status === "uploading" && row.multipart_upload_id) await b2Request(env, row.object_key, "DELETE", { uploadId: row.multipart_upload_id }, "");
        else await b2Request(env, row.object_key, "DELETE", {}, "");
        await dbUpdate(env, row, { status: "deleted", multipart_upload_id: null }); await dbDeleteParts(env, id);
        return json({ ok: true }, 200, headers);
      }
      return json({ error: "Not found" }, 404, headers);
    } catch (error) {
      console.error("Media worker request failed", error);
      return json({ error: error instanceof Error ? error.message : "Media request failed" }, 500, headers);
    }
  }
} satisfies ExportedHandler<Env>;
