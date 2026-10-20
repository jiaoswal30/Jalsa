// ============================================================
// jalsa — generate-invite  (Supabase Edge Function, Deno)
// "The studio": asks Claude to draw one self-contained HTML
// invitation poster (1080×1350) for a brief.
//
// Secrets (Dashboard → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY   required
//   ALLOWED_ORIGINS     optional, comma-separated; defaults below
//
// This endpoint is public, so it guards itself: an origin
// allow-list, hard input limits, and a per-IP rate limit. None of
// that stops a determined caller (origins can be spoofed outside a
// browser) — the real ceiling is the monthly spend limit you set
// in the Anthropic Console.
//
// Request  (POST JSON): { prompt, details?, referenceImage? }
// Response (JSON):      { html }  — a full <!doctype html> document;
//   a subject photo, if any, is the literal token {{PHOTO}}.
// ============================================================

import Anthropic from "npm:@anthropic-ai/sdk";

const MODEL = "claude-opus-5-5";
const DEFAULT_ORIGINS = ["https://jiaoswal30.github.io", "http://localhost:8765", "http://127.0.0.1:8765"];
const ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map(s => s.trim()).filter(Boolean);
const ALLOWED = ORIGINS.length ? ORIGINS : DEFAULT_ORIGINS;

const LIMIT_PER_HOUR = 6;            // per IP, per warm instance (best effort)
const MAX_PROMPT = 400;
const MAX_FIELD = 90;
const MAX_IMAGE_B64 = 1_500_000;     // ~1.1 MB image

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

const FONTS_LINK =
  `<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wdth,wght@62..125,500..900&family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700&family=IBM+Plex+Mono:wght@400;500;600&family=Schibsted+Grotesk:wght@400..800&family=Tiro+Devanagari+Hindi&display=swap" rel="stylesheet">`;

const SYSTEM = `You are the in-house designer at jalsa, an invitation press in Bengaluru. You design ONE finished invitation poster as a complete, self-contained HTML document.

Output rules
- Output only the HTML document, starting with <!doctype html>. No prose, no markdown fences.
- The design is a fixed canvas exactly 1080px wide and 1350px tall; size the outermost element to 1080x1350 with overflow hidden and fill it edge to edge.
- Inline CSS only. No <script>, no external assets except this fonts link, verbatim, in <head>:
${FONTS_LINK}
- Fonts available: Bodoni Moda (high-contrast serif, with italics), Anton (condensed poster), Archivo (variable width 62–125, weights to 900), Schibsted Grotesk (sans), IBM Plex Mono, Tiro Devanagari Hindi (for Hindi words).
- If a photograph belongs in the design, reference it with the literal token {{PHOTO}} (in an <img src> or a CSS url()). Never invent image URLs.

The brief
- Draw from a specific print tradition that suits this occasion: a letterpress card, a Sivakasi matchbox label, a cinema ticket, a riso zine, a telegram form, a gig poster, a wedding card from Chawri Bazaar, a railway timetable, a mithai-box label. Commit to one and make it convincing.
- Type does the work. One dominant element, decisive size steps, real hierarchy, generous space. Avoid centring everything evenly.
- Two to four colours, used with intent. Add texture through CSS or inline SVG (grain, halftone, misregistration) where the tradition calls for it.
- Avoid the clichés of generic Indian design (mandalas, paisley fills, tricolour) and of generic event graphics (confetti, gradients on text, emoji, drop shadows on everything).
- Include the title, host, date, time and venue with clear hierarchy. Spell every supplied detail exactly as given.
- If a reference image is attached, follow its layout, type treatment and palette closely, swapping in this event's words.`;

const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now(), hour = 3_600_000;
  const recent = (hits.get(ip) || []).filter(t => now - t < hour);
  if (recent.length >= LIMIT_PER_HOUR) { hits.set(ip, recent); return true; }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

const clip = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").slice(0, n).trim();

function cors(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED.includes(origin) ? origin : ALLOWED[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function reply(status: number, body: unknown, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });
}

function cleanHtml(text: string): string {
  let t = text.trim().replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const at = t.toLowerCase().indexOf("<!doctype");
  if (at > 0) t = t.slice(at);
  // belt and braces: the client renders in a script-less sandbox anyway
  return t.replace(/<script[\s\S]*?<\/script>/gi, "");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" }, origin);
  if (!origin || !ALLOWED.includes(origin)) return reply(403, { error: "origin_not_allowed" }, origin);
  if (!Deno.env.get("ANTHROPIC_API_KEY")) return reply(500, { error: "not_configured", message: "The studio has no API key yet." }, origin);

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return reply(429, { error: "rate_limited", message: "The studio is busy. Try again in a little while." }, origin);

  let body: any;
  try { body = await req.json(); } catch { return reply(400, { error: "bad_json" }, origin); }

  const prompt = clip(body.prompt, MAX_PROMPT);
  if (prompt.length < 4) return reply(400, { error: "empty_brief", message: "The brief is empty." }, origin);
  const d = body.details || {};
  const details = ["title", "host", "date", "time", "venue"]
    .map(k => d[k] ? `${k[0].toUpperCase() + k.slice(1)}: ${clip(d[k], MAX_FIELD)}` : "")
    .filter(Boolean);

  const content: any[] = [];
  const img = body.referenceImage;
  if (img?.data && /^image\/(png|jpeg|webp|gif)$/.test(img.media_type || "")) {
    if (String(img.data).length > MAX_IMAGE_B64) return reply(413, { error: "image_too_large", message: "That reference image is too large." }, origin);
    content.push({ type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } });
  }
  content.push({ type: "text", text: [`The brief, as the host wrote it: ${prompt}`, ...details, "Design the invitation now."].join("\n") });

  try {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      // on a safety decline, re-run on Anthropic's recommended fallback model
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content }],
    } as any);
    const msg = await stream.finalMessage();

    if (msg.stop_reason === "refusal") return reply(422, { error: "refused", message: "The studio couldn't take this brief. Try rewording it." }, origin);
    if (msg.stop_reason === "max_tokens") return reply(502, { error: "truncated", message: "The design ran long. Try again." }, origin);

    const text = msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const html = cleanHtml(text);
    if (!/<html|<!doctype/i.test(html)) return reply(502, { error: "no_html", message: "The studio returned something that wasn't a design." }, origin);
    return reply(200, { html }, origin);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return reply(429, { error: "rate_limited", message: "The studio is busy. Try again in a minute." }, origin);
    if (e instanceof Anthropic.APIError) return reply(502, { error: "upstream", status: e.status, message: "The studio is unavailable right now." }, origin);
    return reply(500, { error: "exception", message: "Something went wrong in the studio." }, origin);
  }
});
