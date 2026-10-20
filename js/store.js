/* ============================================================
   jalsa — local store
   Everything persists to localStorage. A first visit is seeded
   with a small Bengaluru circle so the app isn't an empty room.
   ============================================================ */

const Store = (() => {
  const KEY = "jalsa.v2";

  const FRIENDS = [
    { name: "Ananya", hue: 12 }, { name: "Rohan", hue: 205 }, { name: "Ishaan", hue: 152 },
    { name: "Meera", hue: 320 }, { name: "Kabir", hue: 38 }, { name: "Diya", hue: 262 },
    { name: "Advait", hue: 95 }, { name: "Sana", hue: 350 }, { name: "Vivaan", hue: 180 },
    { name: "Tara", hue: 24 }, { name: "Arjun", hue: 228 }, { name: "Nikita", hue: 130 },
  ];

  let state = null;

  function uid() { return Math.random().toString(36).slice(2, 9); }
  function slugify(t) {
    return String(t || "jalsa").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28) + "-" + uid().slice(0, 5);
  }
  function dayOffset(n, h = 19, m = 0) {
    const d = new Date(); d.setDate(d.getDate() + n);
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    return { date: iso, time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
  }
  function friend(n) { return FRIENDS.find(f => f.name === n) || { name: n, hue: 200 }; }
  function replies(names, statuses) {
    return names.map((n, i) => ({ ...friend(n), status: statuses[i] || "yes", paid: i % 3 !== 2 }));
  }

  /* ---------- around town: public listings ------------------- */
  function seedTown() {
    const P = [
      ["Bass Communion", "Till the lights come on.", "Gigs", "The Humming Tree", "Indiranagar", 499, 340, ["Ishaan", "Kabir"], 3, 21, 0, "riso", "afterhours"],
      ["Soft Launch", "Poetry, acoustic, and nowhere to hide.", "Open mic", "Dyu Art Café", "Koramangala", 0, 88, ["Tara", "Diya"], 2, 19, 0, "letterpress", "blush"],
      ["Riso & Ruin", "A two-colour zine workshop. Bring your mess.", "Workshops", "Bangalore Creative Circus", "Yeshwantpur", 800, 42, ["Meera"], 5, 11, 0, "riso", "sunteal"],
      ["Sunday Soil", "Farmers, makers, and very good bread.", "Markets", "Lalbagh West Gate", "Basavanagudi", 0, 210, [], 4, 8, 30, "sivakasi", "leaf"],
      ["Supper No. 7", "Seven courses. Twelve strangers.", "Food", "A kitchen in Cooke Town", "Cooke Town", 1500, 12, ["Advait"], 9, 20, 0, "telegram", "buff"],
      ["Cinema Paradiso", "A 35mm print, a rooftop, a hundred chairs.", "Film", "Suchitra Film Society", "Banashankari", 250, 96, ["Rohan", "Sana"], 6, 19, 30, "talkies", "butter"],
      ["Clay & Quiet", "Wheel-throwing for the overstimulated.", "Workshops", "Shanthinagar Studio", "Shanthinagar", 1200, 24, [], 8, 16, 0, "letterpress", "sage"],
      ["Tungsten Nights", "Warm light, warmer records. Vinyl only.", "Gigs", "Backdoors", "Indiranagar", 400, 178, ["Sana", "Kabir"], 7, 21, 30, "talkies", "rose"],
      ["The 6am Club", "Run, stretch, filter coffee. In that order.", "Wellness", "Cubbon Park bandstand", "Central", 0, 156, ["Rohan"], 2, 6, 0, "sivakasi", "sky"],
      ["Printed Matter", "A zine fair with teeth.", "Art", "Maraa", "JP Nagar", 200, 97, ["Meera", "Vivaan"], 11, 12, 0, "riso", "pinkblue"],
    ];
    return P.map(([title, tagline, category, venueName, area, price, cityGoing, circ, day, h, m, edition, ink]) => {
      const d = dayOffset(day, h, m);
      return {
        id: "pub-" + uid(), slug: slugify(title), public: true,
        title, tagline, category, venueName, area, venue: `${venueName}, ${area}`, hostName: venueName,
        priceFrom: price, cityGoing, circleGoing: circ.map(friend),
        concept: { edition, ink, tagline },
        date: d.date, time: d.time, rsvps: [], updates: [], photos: [], createdAt: Date.now(),
      };
    });
  }

  /* ---------- your circle ------------------------------------ */
  function seed() {
    const mk = o => Object.assign({
      id: uid(), slug: "", title: "", tagline: "", typeKey: "generic", concept: null,
      date: "", time: "19:30", venue: "", capacity: 0, upiAmount: 0, upiId: "", hostName: "",
      isMine: false, rsvps: [], updates: [], photos: [], createdAt: Date.now(),
    }, o);
    const at = (n, h, m) => dayOffset(n, h, m);

    const events = [
      mk({
        title: "Golden Hour & Co.", tagline: "Sunset is the opening act.", typeKey: "rooftop",
        concept: { edition: "letterpress", ink: "bone", tagline: "Sunset is the opening act." },
        ...at(2, 17, 30), venue: "The terrace, 4th Block, Koramangala", capacity: 20, upiAmount: 250, hostName: "Ananya",
        rsvps: replies(["Rohan", "Meera", "Kabir", "Diya", "Sana", "Vivaan", "Tara"], ["yes", "yes", "yes", "maybe", "yes", "yes", "maybe"]),
        updates: [{ text: "Gate code is 4402. The lift stops at ten, so take the stairs after.", at: Date.now() - 36e5 }],
      }),
      mk({
        title: "Ghar Pe Koi Nahi Hai", tagline: "The neighbours have been notified. Loosely.", typeKey: "houseparty",
        concept: { edition: "riso", ink: "pinkblue", tagline: "The neighbours have been notified. Loosely." },
        ...at(5, 21, 0), venue: "Kabir's flat, HSR Layout", capacity: 30, upiAmount: 300, hostName: "Kabir",
        rsvps: replies(["Ishaan", "Diya", "Advait", "Sana", "Arjun", "Nikita", "Rohan", "Tara", "Meera"], ["yes", "yes", "yes", "yes", "maybe", "yes", "yes", "yes", "maybe"]),
      }),
      mk({
        title: "Slow Morning Club", tagline: "Filter coffee and unfiltered talk.", typeKey: "coffee",
        concept: { edition: "telegram", ink: "buff", tagline: "Filter coffee and unfiltered talk." },
        ...at(9, 10, 30), venue: "Dyu Art Café, Koramangala", capacity: 8, hostName: "Meera",
        rsvps: replies(["Tara", "Diya", "Ananya"], ["yes", "maybe", "yes"]),
      }),
      mk({
        title: "Friendships End Tonight", tagline: "Loser buys biryani.", typeKey: "gamenight",
        concept: { edition: "talkies", ink: "mint", tagline: "Loser buys biryani." },
        ...at(12, 20, 0), venue: "Rohan's place, Jayanagar", capacity: 10, hostName: "Rohan",
        rsvps: replies(["Ishaan", "Arjun", "Kabir"], ["yes", "yes", "maybe"]),
      }),
      mk({
        title: "Goodbye, Vivaan", tagline: "You're leaving. We're not okay. There's food.", typeKey: "farewell",
        concept: { edition: "telegram", ink: "pink", tagline: "You're leaving. We're not okay. There's food." },
        ...at(-6, 19, 30), venue: "Byg Brewski, Sarjapur Road", capacity: 16, hostName: "Rohan",
        rsvps: replies(["Ananya", "Meera", "Kabir", "Ishaan", "Sana", "Tara", "Advait", "Diya"], Array(8).fill("yes")),
      }),
      mk({
        title: "Ears Will Ring", tagline: "No slow songs. Not one.", typeKey: "concert",
        concept: { edition: "riso", ink: "greenroom", tagline: "No slow songs. Not one." },
        ...at(-17, 22, 0), venue: "A warehouse, Yeshwantpur", capacity: 40, hostName: "Ishaan",
        rsvps: replies(["Arjun", "Nikita", "Kabir", "Diya", "Sana"], Array(5).fill("yes")),
      }),
    ];
    events.forEach(e => { e.slug = slugify(e.title); });

    return {
      profile: { name: "", onboarded: false, picks: {} },
      events,
      notes: [
        { text: "<b>Kabir</b> sent out <i>Ghar Pe Koi Nahi Hai</i>", at: Date.now() - 2 * 36e5 },
        { text: "<b>Sana</b> and three others accepted <i>Golden Hour &amp; Co.</i>", at: Date.now() - 5 * 36e5 },
        { text: "<b>Meera</b> is hosting <i>Slow Morning Club</i>. Five places left.", at: Date.now() - 50 * 36e5 },
      ],
      myReplies: {},   // eventId -> yes | maybe | no
      myPaid: {},
      town: seedTown(),
      townState: {},   // pubId -> going | saved
      guestReplies: {},// cloud code -> status, for invites opened as a guest
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { state = JSON.parse(raw); return state; }
    } catch (e) { /* unreadable → start fresh */ }
    state = seed();
    save();
    return state;
  }

  let timer = null;
  function save() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); }
      catch (e) { console.warn("save failed (storage full?)", e); }
    }, 100);
  }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) {} location.hash = ""; location.reload(); }

  const get = () => state;
  const ev = id => state.events.find(e => e.id === id) || state.town.find(e => e.id === id);
  const stamp = e => e.date + "T" + (e.time || "23:59");
  function isPast(e) { return !!e.date && new Date(stamp(e)) < new Date(Date.now() - 4 * 36e5); }
  const upcoming = () => state.events.filter(e => !isPast(e)).sort((a, b) => stamp(a).localeCompare(stamp(b)));
  const past = () => state.events.filter(isPast).sort((a, b) => stamp(b).localeCompare(stamp(a)));
  const town = () => state.town.filter(e => !isPast(e)).sort((a, b) => stamp(a).localeCompare(stamp(b)));

  function note(html) {
    state.notes.unshift({ text: html, at: Date.now() });
    state.notes = state.notes.slice(0, 40);
    save();
  }

  function addShared(ev) {
    if (state.events.some(e => e.slug === ev.slug)) return false;
    state.events.unshift(Object.assign({}, ev, { id: uid(), shared: true }));
    save();
    return true;
  }

  /* ---------- the transportable invite ---------------------
     `full` adds the heavy parts (photo, commissioned HTML) for
     the cloud copy; the self-contained #i= link leaves them out
     so it stays short enough for WhatsApp.                    */
  function payloadOf(ev, { full = false } = {}) {
    const c = ev.concept || {};
    const p = {
      s: ev.slug, t: ev.title, g: ev.tagline, k: ev.typeKey, d: ev.date, tm: ev.time, v: ev.venue,
      c: ev.capacity || 0, u: ev.upiAmount || 0, ui: ev.upiId || "", h: ev.hostName || "",
      e: c.edition, n: c.ink,
    };
    if (c.edition === "commission" && !full) { p.e = c.fallback || "letterpress"; p.n = null; }
    if (full) {
      if (ev.photo) p.ph = ev.photo;
      if (c.edition === "commission") p.html = c.html;
    }
    return p;
  }

  function eventFromPayload(p) {
    const edition = p.e === "commission" && !p.html ? "letterpress" : (p.e || "letterpress");
    return {
      id: "guest-" + uid(), slug: p.s || slugify(p.t), title: p.t || "An occasion", tagline: p.g || "", typeKey: p.k || "generic",
      concept: { edition, ink: p.n, tagline: p.g || "", html: p.html },
      date: p.d || "", time: p.tm || "19:30", venue: p.v || "", capacity: p.c || 0,
      upiAmount: p.u || 0, upiId: p.ui || "", hostName: p.h || "A friend", photo: p.ph || null,
      isMine: false, shared: true, rsvps: [], updates: [], photos: [], createdAt: Date.now(),
    };
  }

  function encodeEvent(ev) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(payloadOf(ev))))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decodeEvent(str) {
    try { return eventFromPayload(JSON.parse(decodeURIComponent(escape(atob(str.replace(/-/g, "+").replace(/_/g, "/")))))); }
    catch (e) { return null; }
  }

  return { load, save, reset, get, ev, upcoming, past, town, isPast, note, addShared, payloadOf, eventFromPayload, encodeEvent, decodeEvent, FRIENDS, friend, uid, slugify, dayOffset };
})();
