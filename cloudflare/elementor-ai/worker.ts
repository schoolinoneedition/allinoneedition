interface Env { AI: { run(model: string, input: Record<string, unknown>): Promise<{ image?: string }> } }

const ORIGIN = "https://allinoneedition.vercel.app";
const CORS = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Vary": "Origin"
};
const recent = new Map<string, number[]>();
const unsafePrompt = /\b(nude|nudity|porn|sexual|explicit sex|rape|gore|gory|dismember|self[- ]?harm|suicide|graphic violence|torture|bloodbath|gun|firearm|weapon|knife|bomb|explosive)\b/i;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") || "";
    if (origin !== ORIGIN) return new Response("Forbidden", { status: 403 });
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return json({ ok: true, service: "elementor-image-generation" });
    }
    if (url.pathname !== "/generate" || request.method !== "POST") {
      return json({ error: "Not found" }, 404);
    }
    if (Number(request.headers.get("Content-Length") || 0) > 6000) {
      return json({ error: "Prompt is too large" }, 413);
    }

    let body: { prompt?: unknown };
    try { body = await request.json() as { prompt?: unknown }; }
    catch { return json({ error: "Invalid JSON" }, 400); }

    const prompt = String(body.prompt || "").trim();
    if (prompt.length < 4 || prompt.length > 1200) {
      return json({ error: "Prompt must be 4 to 1,200 characters" }, 400);
    }
    if (unsafePrompt.test(prompt)) {
      return json({ error: "That image request is not supported. Try a safe, non-explicit concept." }, 400);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const now = Date.now();
    const times = (recent.get(ip) || []).filter(time => now - time < 10 * 60 * 1000);
    if (times.length >= 3) return json({ error: "Image limit reached. Try again in 10 minutes." }, 429);
    times.push(now);
    recent.set(ip, times);

    try {
      const result = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", { prompt, steps: 4 });
      if (!result.image) throw new Error("No image returned");
      const binary = atob(result.image);
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      return new Response(bytes, {
        headers: { ...CORS, "Content-Type": "image/jpeg", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
      });
    } catch {
      return json({ error: "Image generation is temporarily unavailable. Try again later." }, 502);
    }
  }
};