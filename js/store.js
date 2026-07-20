/* ============================================================
   JALSA — local store
   Everything persists to localStorage. First run seeds a live
   Bengaluru circle so the feed breathes from minute one.
   ============================================================ */

const Store = (() => {
  const KEY = "jalsa.v1";

  const FRIENDS = [
    { name: "Ananya", hue: 12 }, { name: "Rohan", hue: 205 }, { name: "Ishaan", hue: 152 },
    { name: "Meera", hue: 320 }, { name: "Kabir", hue: 45 }, { name: "Diya", hue: 268 },
    { name: "Advait", hue: 95 }, { name: "Sana", hue: 350 }, { name: "Vivaan", hue: 180 },
    { name: "Tara", hue: 28 }, { name: "Arjun", hue: 232 }, { name: "Nikita", hue: 130 },
  ];

  let state = null;

  function uid() { return Math.random().toString(36).slice(2, 9); }
  function slugify(t) { return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28) + "-" + uid().slice(0, 4); }
  function dayOffset(n, h = 19, m = 0) {
    const d = new Date(); d.setDate(d.getDate() + n);
    return { date: d.toISOString().slice(0, 10), time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
  }

  function mkRsvps(names, statuses) {
    return names.map((n, i) => {
      const f = FRIENDS.find(fr => fr.name === n) || { name: n, hue: 200 };
      return { name: f.name, hue: f.hue, status: statuses[i] || "yes", paid: Math.random() > .45 };
    });
  }

  function seed() {
    const e1t = dayOffset(2, 17, 30), e2t = dayOffset(5, 20, 0), e3t = dayOffset(9, 11, 0), p1t = dayOffset(-6, 19, 0), p2t = dayOffset(-16, 20, 30);

    const mk = (over) => Object.assign({
      id: uid(), slug: "", title: "", tagline: "", typeKey: "generic", glyph: "✦",
      concept: null, date: "", time: "19:00", venue: "", capacity: 0,
      upiAmount: 0, upiId: "", hostName: "", isMine: false,
      rsvps: [], updates: [], photos: [], createdAt: Date.now(),
    }, over);

    const g1 = Engine.generate("Ananya's rooftop birthday, sunset vibes, 20 people");
    const e1 = mk({
      title: "ANANYA'S GOLDEN HOUR", tagline: "Sunset is the opening act.",
      typeKey: "rooftop", glyph: "◭", concept: g1.concepts[0],
      date: e1t.date, time: e1t.time, venue: "Terrace, 4th Block Koramangala",
      capacity: 20, upiAmount: 250, hostName: "Ananya",
      rsvps: mkRsvps(["Rohan", "Meera", "Kabir", "Diya", "Sana", "Vivaan", "Tara"], ["yes", "yes", "yes", "maybe", "yes", "yes", "maybe"]),
      updates: [{ text: "Gate code is 4402 — terrace lift only works till 10", at: Date.now() - 36e5 }],
    });

    const g2 = Engine.generate("house party at my place, loud, all night, chaos");
    const e2 = mk({
      title: "GHAR PE KOI NAHI HAI", tagline: "THE NEIGHBOURS HAVE BEEN WARNED.",
      typeKey: "houseparty", glyph: "◉", concept: g2.concepts[0],
      date: e2t.date, time: e2t.time, venue: "Kabir's flat, HSR Layout Sector 2",
      capacity: 30, upiAmount: 300, hostName: "Kabir",
      rsvps: mkRsvps(["Ishaan", "Diya", "Advait", "Sana", "Arjun", "Nikita", "Rohan", "Tara", "Meera"], ["yes", "yes", "yes", "yes", "maybe", "yes", "yes", "yes", "maybe"]),
    });

    const g3 = Engine.generate("chill sunday coffee and books catchup, cozy");
    const e3 = mk({
      title: "SLOW MORNING CLUB", tagline: "Filter coffee and unfiltered talk.",
      typeKey: "coffee", glyph: "◌", concept: g3.concepts[0],
      date: e3t.date, time: e3t.time, venue: "Dyu Art Café, Koramangala",
      capacity: 8, hostName: "Meera",
      rsvps: mkRsvps(["Tara", "Diya", "Ananya"], ["yes", "maybe", "yes"]),
    });

    const g4 = Engine.generate("farewell dinner for Vivaan, rooftop, bittersweet");
    const p1 = mk({
      title: "LAST DANCE, VIVAAN", tagline: "You're leaving. We're not okay. There's food.",
      typeKey: "farewell", glyph: "➳", concept: g4.concepts[0],
      date: p1t.date, time: p1t.time, venue: "Byg Brewski, Sarjapur",
      capacity: 16, hostName: "Rohan",
      rsvps: mkRsvps(["Ananya", "Meera", "Kabir", "Ishaan", "Sana", "Tara", "Advait", "Diya"], ["yes", "yes", "yes", "yes", "yes", "yes", "yes", "yes"]),
      photos: [{ type: "hue", h: 18 }, { type: "hue", h: 260 }, { type: "hue", h: 140 }, { type: "hue", h: 330 }, { type: "hue", h: 48 }, { type: "hue", h: 200 }],
    });

    const g5 = Engine.generate("crazy rave night techno, unhinged");
    const p2 = mk({
      title: "EARS WILL RING", tagline: "NO SLOW SONGS. EVER.",
      typeKey: "concert", glyph: "◆", concept: g5.concepts[0],
      date: p2t.date, time: p2t.time, venue: "Warehouse, Yeshwantpur",
      capacity: 40, hostName: "Ishaan",
      rsvps: mkRsvps(["Arjun", "Nikita", "Kabir", "Diya", "Sana"], ["yes", "yes", "yes", "yes", "yes"]),
      photos: [{ type: "hue", h: 92 }, { type: "hue", h: 285 }, { type: "hue", h: 10 }, { type: "hue", h: 190 }],
    });

    [e1, e2, e3, p1, p2].forEach(e => e.slug = slugify(e.title));

    return {
      profile: { name: "", vibes: [], onboarded: false, tierPicks: { 1: 0, 2: 0, 3: 0 } },
      events: [e1, e2, e3, p1, p2],
      pulse: [
        { text: "<b>Kabir</b> dropped a new event — <b>GHAR PE KOI NAHI HAI</b>", at: Date.now() - 2 * 36e5 },
        { text: "<b>Sana</b> and 3 others RSVP'd yes to <b>Ananya's Golden Hour</b>", at: Date.now() - 5 * 36e5 },
        { text: "<b>Rohan</b> added 6 photos to <b>Last Dance, Vivaan</b>", at: Date.now() - 26 * 36e5 },
        { text: "<b>Meera</b> is hosting <b>Slow Morning Club</b> — 5 spots left", at: Date.now() - 50 * 36e5 },
      ],
      myRsvps: {},   // eventId -> status
      myPaid: {},    // eventId -> bool
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { state = JSON.parse(raw); return state; }
    } catch (e) { /* corrupted -> reseed */ }
    state = seed();
    save();
    return state;
  }

  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); }
      catch (e) { console.warn("save failed (storage full?)", e); }
    }, 120);
  }

  function reset() { localStorage.removeItem(KEY); location.reload(); }

  function get() { return state; }
  function ev(id) { return state.events.find(e => e.id === id); }
  function upcoming() { return state.events.filter(e => !isPast(e)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)); }
  function past() { return state.events.filter(isPast).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)); }
  function isPast(e) {
    if (!e.date) return false;
    return new Date(e.date + "T" + (e.time || "23:59")) < new Date(Date.now() - 3 * 36e5);
  }

  function addPulse(html) {
    state.pulse.unshift({ text: html, at: Date.now() });
    state.pulse = state.pulse.slice(0, 40);
    save();
  }

  function addSharedEvent(ev) {
    // a guest chose to add a friend's shared invite to their own feed
    if (!state) load();
    if (state.events.some(e => e.slug === ev.slug && e.title === ev.title)) return false;
    ev.id = uid();
    ev.shared = true;
    state.events.unshift(ev);
    save();
    return true;
  }

  /* ---------- self-contained share links --------------------
     The entire invite is packed into the URL hash so a link
     opened on ANY device renders the exact invite — no backend.
     ---------------------------------------------------------- */
  const TIER_NAMES = ["", "WHISPER", "FLEX", "UNHINGED"];

  function encodeEvent(ev) {
    const c = ev.concept || {};
    const p = {
      t: ev.title, g: ev.tagline, k: ev.typeKey, gl: ev.glyph,
      d: ev.date, tm: ev.time, v: ev.venue, c: ev.capacity || 0,
      u: ev.upiAmount || 0, ui: ev.upiId || "", h: ev.hostName || "",
      cc: { t: c.tier || 2, l: c.layout || "split", p: c.palette || "emberNight" },
    };
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(p))));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function decodeEvent(str) {
    try {
      const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
      const p = JSON.parse(decodeURIComponent(escape(atob(b64))));
      const cc = p.cc || {};
      const pal = (typeof Engine !== "undefined" && Engine.PALETTES[cc.p]) || { bg: "#16100E", ink: "#FAF8F3", a: "#FF4D00", pop: "#E8B531" };
      return {
        id: "guest-" + uid(),
        slug: slugify(p.t || "shared-invite"),
        title: p.t || "A JALSA", tagline: p.g || "", typeKey: p.k || "generic", glyph: p.gl || "✦",
        concept: { tier: cc.t || 2, tierName: TIER_NAMES[cc.t || 2], layout: cc.l || "split", palette: cc.p || "emberNight", pal, tagline: p.g || "" },
        date: p.d || "", time: p.tm || "19:30", venue: p.v || "", capacity: p.c || 0,
        upiAmount: p.u || 0, upiId: p.ui || "", hostName: p.h || "A friend",
        isMine: false, shared: true, rsvps: [], updates: [], photos: [], createdAt: Date.now(),
      };
    } catch (e) { return null; }
  }

  return { load, save, reset, get, ev, upcoming, past, isPast, addPulse, addSharedEvent, encodeEvent, decodeEvent, FRIENDS, uid, slugify, dayOffset };
})();
