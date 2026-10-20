/* ============================================================
   jalsa — the studio (AI commissions)
   Calls the Supabase Edge Function `generate-invite`, which asks
   Claude to draw a one-off 1080×1350 poster as self-contained
   HTML. The result renders in a sandboxed iframe with scripts
   off, so model-written markup can't touch the app.
   ============================================================ */

const AI = (() => {
  const FN_URL = Cloud.URL ? Cloud.URL + "/functions/v1/generate-invite" : "";
  const enabled = Cloud.enabled && !!(typeof CONFIG !== "undefined" && CONFIG.STUDIO);

  const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='100%' height='100%' fill='#DCD5C7'/><text x='50%' y='50%' font-family='Georgia' font-style='italic' font-size='22' fill='#6f675b' text-anchor='middle' dominant-baseline='middle'>your photograph</text></svg>");

  /* → HTML string (may contain {{PHOTO}}) */
  async function generate({ prompt, details, referenceImage } = {}, ms = 120000) {
    if (!enabled) throw new Error("The studio needs the cloud — add Supabase keys in js/config.js.");
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": Cloud.KEY, "Authorization": "Bearer " + Cloud.KEY },
        body: JSON.stringify({ prompt, details, referenceImage }),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.message || data.error || "HTTP " + res.status);
      return data.html;
    } catch (e) {
      if (e.name === "AbortError") throw new Error("The studio took too long. Try again in a minute.");
      throw e;
    } finally { clearTimeout(t); }
  }

  function withPhoto(html, photo) {
    return String(html || "").split("{{PHOTO}}").join(photo || PLACEHOLDER);
  }

  /* render into `box`, scaled to its width; re-fits on resize */
  function renderInto(box, html, photo) {
    box.innerHTML = "";
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "");          // no scripts, no same-origin
    frame.setAttribute("scrolling", "no");
    frame.setAttribute("tabindex", "-1");
    frame.setAttribute("title", "Commissioned invitation");
    frame.style.cssText = "border:0;width:1080px;height:1350px;transform-origin:0 0;background:#1b1917";
    frame.srcdoc = withPhoto(html, photo);
    box.appendChild(frame);
    const fit = () => { frame.style.transform = `scale(${(box.clientWidth || 300) / 1080})`; };
    fit();
    if ("ResizeObserver" in window) new ResizeObserver(fit).observe(box);
  }

  return { enabled, generate, withPhoto, renderInto };
})();
