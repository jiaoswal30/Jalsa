/* ============================================================
   JALSA — AI design client
   Talks to the Supabase Edge Function `generate-invite`, which
   asks Claude (Opus 4.8) to design a self-contained HTML poster.
   The model's HTML is rendered in a sandboxed iframe (no scripts),
   so it can look like anything without touching the app.
   ============================================================ */

const AI = (() => {
  const FN_URL = "https://strfrvgatxdujfemmfua.supabase.co/functions/v1/generate-invite";
  const KEY = "sb_publishable_03_l2zlPFDxkdldkAV6Rag_3xxLz-eW";
  const enabled = !!(FN_URL && KEY);

  // a neutral placeholder shown where a photo would go, until one is added
  const PLACEHOLDER =
    "data:image/svg+xml;utf8," + encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='440'><rect width='100%' height='100%' fill='%23e7e0d3'/><text x='50%' y='50%' font-family='sans-serif' font-size='22' fill='%23a09788' text-anchor='middle' dominant-baseline='middle'>your photo</text></svg>");

  /* Ask the AI to design a poster. Returns an HTML string (may contain {{PHOTO}}). */
  async function generate({ prompt, palette, details, referenceImage } = {}, ms = 90000) {
    if (!enabled) throw new Error("AI not configured");
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": KEY,
          "Authorization": "Bearer " + KEY,
        },
        body: JSON.stringify({ prompt, palette, details, referenceImage }),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        throw new Error(data.detail || data.error || ("HTTP " + res.status));
      }
      return data.html;
    } finally { clearTimeout(t); }
  }

  /* Substitute the user's photo into the {{PHOTO}} token. */
  function withPhoto(html, photoDataUrl) {
    return (html || "").split("{{PHOTO}}").join(photoDataUrl || PLACEHOLDER);
  }

  /* Render AI HTML into `container`, scaled to fit its width (canvas is 1080x1350). */
  function renderInto(container, html, photoDataUrl) {
    container.innerHTML = "";
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "");            // no scripts — static render only
    frame.setAttribute("scrolling", "no");
    frame.style.cssText = "border:0;width:1080px;height:1350px;transform-origin:top left;background:#111";
    frame.srcdoc = withPhoto(html, photoDataUrl);
    container.appendChild(frame);
    const fit = () => {
      const w = container.clientWidth || 340;
      const s = w / 1080;
      frame.style.transform = `scale(${s})`;
      container.style.height = (1350 * s) + "px";
    };
    requestAnimationFrame(fit);
    return fit;
  }

  return { enabled, generate, withPhoto, renderInto };
})();
