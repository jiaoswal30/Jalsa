// ============================================================
// JALSA — generate-invite  (Supabase Edge Function, Deno)
// Calls Claude (Opus 4.8) to design a single, self-contained
// HTML invitation poster. Streams from Anthropic so long,
// high-effort generations never hit an idle HTTP timeout.
//
// Secret required (Dashboard → Edge Functions → Secrets, or
//   `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`):
//     ANTHROPIC_API_KEY
//
// Request  (POST JSON):
//   { prompt, palette?, details?, referenceImage? }
//     prompt         : free-text description of the event
//     palette        : { bg, ink, a, pop } hex strings (optional)
//     details        : { title, host, date, time, venue } (optional)
//     referenceImage : { media_type, data }  base64 (optional) — a design to match
//
// Response (JSON): { html }  — a full <!doctype html> document.
//   Any subject photo is referenced with the literal token {{PHOTO}};
//   the client swaps it for the user's uploaded image.
// ============================================================

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-8";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FONTS_LINK =
  `<link href="https://fonts.googleapis.com/css2?family=Anton&family=Shrikhand&family=Bebas+Neue&family=Archivo:wght@400;600;800;900&family=Unbounded:wght@600;800&family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500&family=Playfair+Display:ital,wght@0,600;1,600&family=Corinthia:wght@700&family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@400;500;700&family=Noto+Sans+Devanagari:wght@400;700&display=swap" rel="stylesheet">`;

function systemPrompt(): string {
  return [
    "You are an award-winning graphic designer. You produce ONE finished social-media invitation poster as a complete, self-contained HTML document.",
    "",
    "HARD CONSTRAINTS:",
    "- Output ONLY the HTML document. Start with <!doctype html>. No prose, no markdown, no code fences.",
    "- The root must render a fixed canvas exactly 1080px wide by 1350px tall (a 4:5 portrait). Size the outermost element to 1080x1350 with overflow hidden; the design fills it edge to edge.",
    "- Use only inline CSS in <style> or style attributes. NO <script>. No external assets except the exact fonts <link> given below.",
    `- Put this fonts link in <head> verbatim:\n${FONTS_LINK}`,
    "- Available font families (use these, nothing else): Anton and Bebas Neue and Archivo Black and Unbounded and Bricolage Grotesque (bold display); Shrikhand (chunky characterful display); Fraunces and Playfair Display (editorial serif); Corinthia (flowing script); DM Sans and Space Grotesk (clean body/mono-ish); Noto Sans Devanagari (for जलसा / Hindi).",
    "- If a subject photo belongs in the design, reference it with the LITERAL token {{PHOTO}} — e.g. <img src=\"{{PHOTO}}\"> or background-image:url('{{PHOTO}}'). Never invent an image URL. If no photo is needed, don't use the token.",
    "",
    "DESIGN BAR — this must look like a real designer made it, not a template:",
    "- Trendy invite aesthetics: bold condensed display type (Druk/Anton feel), or elegant serif+script, or grainy nightlife, or halftone/collage. Pick what fits the event.",
    "- Strong visual hierarchy: one dominant hero element, hard size/contrast steps, generous negative space. Never center-everything-evenly.",
    "- Add real texture: a subtle film-grain or halftone overlay via an inline SVG data URI or CSS gradients. Avoid flat, sterile blocks.",
    "- Type is the design. Mix weights and one script or serif accent. Tight, intentional tracking.",
    "- Cohesive palette (3–4 colors). If a palette is supplied, honor it. Cream/paper grounds and neon-on-dark both read well.",
    "- Include the event's title, host, date, time, and venue somewhere with clear hierarchy. Small mono/caps labels for details.",
    "",
    "If a REFERENCE IMAGE is attached: reproduce its layout, type treatment, color, and structure as closely as you can with the available fonts. Change only the words and the subject to match the event details. This is the priority when a reference is present.",
  ].join("\n");
}

function userContent(body: any): any[] {
  const parts: any[] = [];
  if (body.referenceImage?.data && body.referenceImage?.media_type) {
    parts.push({
      type: "image",
      source: { type: "base64", media_type: body.referenceImage.media_type, data: body.referenceImage.data },
    });
  }
  const d = body.details || {};
  const pal = body.palette;
  const lines = [
    `Event brief: ${body.prompt || "a gathering"}`,
    d.title ? `Title: ${d.title}` : "",
    d.host ? `Host: ${d.host}` : "",
    d.date ? `Date: ${d.date}` : "",
    d.time ? `Time: ${d.time}` : "",
    d.venue ? `Venue: ${d.venue}` : "",
    pal ? `Palette to honor — background ${pal.bg}, text ${pal.ink}, accent ${pal.a}${pal.pop ? `, highlight ${pal.pop}` : ""}.` : "",
    body.referenceImage ? "A reference design is attached — match it closely, swapping in the event details above." : "",
    "Design the poster now. Output only the HTML document.",
  ].filter(Boolean);
  parts.push({ type: "text", text: lines.join("\n") });
  return parts;
}

// Accumulate text from Anthropic's SSE stream.
async function streamText(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const ev = JSON.parse(payload);
        if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
          out += ev.delta.text;
        }
      } catch { /* ignore keep-alive / partial */ }
    }
  }
  return out;
}

function cleanHtml(text: string): string {
  let t = text.trim();
  // strip accidental code fences
  t = t.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const at = t.toLowerCase().indexOf("<!doctype");
  if (at > 0) t = t.slice(at);
  return t;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set on the function" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try { body = await req.json(); } catch { body = {}; }

  const anthReq = {
    model: MODEL,
    max_tokens: 8000,
    stream: true,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    system: systemPrompt(),
    messages: [{ role: "user", content: userContent(body) }],
  };

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(anthReq),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: "anthropic_error", status: res.status, detail: errText.slice(0, 500) }), {
        status: 502, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const raw = await streamText(res);
    const html = cleanHtml(raw);
    if (!html.toLowerCase().includes("<!doctype") && !html.toLowerCase().includes("<html")) {
      return new Response(JSON.stringify({ error: "no_html", sample: html.slice(0, 300) }), {
        status: 502, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ html }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "exception", detail: String(e).slice(0, 500) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
