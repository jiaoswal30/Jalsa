/* ============================================================
   jalsa — cloud layer (Supabase)
   Optional online copy of published invites + guest replies, so
   one link works on every phone and the host sees who's coming.
   Talks to PostgREST with fetch() — no SDK. Every call fails soft:
   unconfigured or offline, the app carries on with localStorage.
   ============================================================ */

const Cloud = (() => {
  const URL = (typeof CONFIG !== "undefined" && CONFIG.SUPABASE_URL || "").replace(/\/$/, "");
  const KEY = typeof CONFIG !== "undefined" && CONFIG.SUPABASE_KEY || "";

  const enabled = /^https:\/\//.test(URL) && !!KEY;
  const rest = URL + "/rest/v1";
  const headers = { "apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json" };

  async function req(path, opts = {}, ms = 8000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(rest + path, { ...opts, headers: { ...headers, ...(opts.headers || {}) }, signal: ctrl.signal });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    } finally { clearTimeout(t); }
  }

  /* Publish an invite once. Insert-only: the slug carries a random
     suffix, and the table has no update policy, so nobody can
     overwrite someone else's invite. Returns the code, or null. */
  async function publish(ev) {
    if (!enabled) return null;
    const code = ev.slug;
    try {
      await req("/events?on_conflict=id", {
        method: "POST",
        headers: { "Prefer": "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({ id: code, slug: code, title: ev.title || "", data: Store.payloadOf(ev, { full: true }) }),
      }, 15000);
      return code;
    } catch (e) { console.warn("[cloud] publish failed", e); return null; }
  }

  async function fetchEvent(code) {
    if (!enabled || !code) return null;
    try {
      const rows = await req("/events?id=eq." + encodeURIComponent(code) + "&select=data&limit=1");
      if (!rows || !rows.length) return null;
      const ev = Store.eventFromPayload(rows[0].data);
      ev.cloudId = code;
      ev.slug = code;
      return ev;
    } catch (e) { console.warn("[cloud] fetch failed", e); return null; }
  }

  async function rsvp(code, name, status) {
    if (!enabled || !code) return false;
    try {
      await req("/rsvps", {
        method: "POST",
        headers: { "Prefer": "return=minimal" },
        body: JSON.stringify({ event_id: code, name: String(name || "A guest").slice(0, 40), status }),
      });
      return true;
    } catch (e) { console.warn("[cloud] rsvp failed", e); return false; }
  }

  /* Replies for an invite, oldest first → [{name,status,created_at}] */
  async function getRsvps(code) {
    if (!enabled || !code) return [];
    try {
      return (await req("/rsvps?event_id=eq." + encodeURIComponent(code) + "&select=name,status,created_at&order=created_at.asc")) || [];
    } catch (e) { return []; }
  }

  return { enabled, publish, fetchEvent, rsvp, getRsvps, URL, KEY };
})();
