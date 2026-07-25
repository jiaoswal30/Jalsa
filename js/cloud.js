/* ============================================================
   JALSA — cloud layer (Supabase)
   Optional online backing for events + RSVPs so an invite works
   across phones. Talks to Supabase's PostgREST API directly with
   fetch() — no SDK. Every call fails soft: if the cloud is
   unreachable or unconfigured, the app keeps working on localStorage.
   The publishable key is safe in client code — the tables are
   protected by row-level security (see sql/supabase-setup.sql).
   ============================================================ */

const Cloud = (() => {
  const URL = "https://strfrvgatxdujfemmfua.supabase.co";
  const KEY = "sb_publishable_03_l2zlPFDxkdldkAV6Rag_3xxLz-eW";

  const enabled = !!(URL && KEY && /^https?:/.test(URL));
  const rest = URL + "/rest/v1";
  const headers = {
    "apikey": KEY,
    "Authorization": "Bearer " + KEY,
    "Content-Type": "application/json",
  };

  async function req(path, opts = {}, ms = 7000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(rest + path, { ...opts, headers: { ...headers, ...(opts.headers || {}) }, signal: ctrl.signal });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    } finally { clearTimeout(t); }
  }

  /* Publish (or refresh) an event. Returns the short cloud code, or null. */
  async function publish(ev) {
    if (!enabled) return null;
    const code = ev.slug || (typeof Store !== "undefined" ? Store.slugify(ev.title || "jalsa") : String(Date.now()));
    const row = {
      id: code,
      slug: code,
      title: ev.title || "",
      data: Store.payloadOf(ev),
    };
    try {
      await req("/events?on_conflict=id", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(row),
      });
      return code;
    } catch (e) { console.warn("[cloud] publish failed", e); return null; }
  }

  /* Fetch a published event by its cloud code -> a guest-shaped event, or null. */
  async function fetchEvent(code) {
    if (!enabled || !code) return null;
    try {
      const rows = await req("/events?id=eq." + encodeURIComponent(code) + "&select=data&limit=1");
      if (!rows || !rows.length) return null;
      const ev = Store.eventFromPayload(rows[0].data);
      ev.cloudId = code;
      return ev;
    } catch (e) { console.warn("[cloud] fetch failed", e); return null; }
  }

  /* Record a guest RSVP. Fire-and-forget. */
  async function rsvp(code, name, status) {
    if (!enabled || !code) return false;
    try {
      await req("/rsvps", {
        method: "POST",
        headers: { "Prefer": "return=minimal" },
        body: JSON.stringify({ event_id: code, name: name || "A guest", status: status || "yes" }),
      });
      return true;
    } catch (e) { console.warn("[cloud] rsvp failed", e); return false; }
  }

  /* Live RSVP list for an event -> [{name,status}], or []. */
  async function getRsvps(code) {
    if (!enabled || !code) return [];
    try {
      return (await req("/rsvps?event_id=eq." + encodeURIComponent(code) + "&select=name,status&order=created_at.asc")) || [];
    } catch (e) { return []; }
  }

  return { enabled, publish, fetchEvent, rsvp, getRsvps };
})();
