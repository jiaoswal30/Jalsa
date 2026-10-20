/* ============================================================
   jalsa — the reader
   Free text  →  a brief  →  three proofs, each on a different
   edition. Deterministic and on-device: the same sentence always
   reads the same way, and "pull new proofs" just turns the seed.
   ============================================================ */

const Engine = (() => {

  /* ---------- occasions ---------------------------------------
     editions: preference order (first fits best)
     titles / tags: written per occasion, in the house voice —
     dry, warm, never shouting.                                  */
  const TYPES = {
    birthday: {
      label: "Birthday", kw: ["birthday", "bday", "b'day", "turns ", "turning ", "cake"],
      editions: ["sivakasi", "snapshot", "riso", "letterpress"],
      titles: ["Another Year of This", "Cake, Then Consequences", "The Annual General Meeting"],
      tags: ["Candles are optional. You are not.", "One more lap around the sun, with witnesses.", "Bring nothing but a good mood and a better toast."],
    },
    houseparty: {
      label: "House party", kw: ["house party", "houseparty", "ghar pe", "my place", "flat party", "apartment", "at mine", "at ours"],
      editions: ["riso", "sivakasi", "talkies", "telegram"],
      titles: ["Ghar Pe Koi Nahi Hai", "The Living Room Is Open", "Doors at Nine"],
      tags: ["The neighbours have been notified. Loosely.", "Shoes off, volume up.", "Come as you are. Leave much later."],
    },
    rooftop: {
      label: "Rooftop", kw: ["rooftop", "terrace", "chhat", "sunset", "golden hour", "open air"],
      editions: ["letterpress", "sivakasi", "snapshot", "riso"],
      titles: ["Golden Hour & Co.", "Above the Traffic", "Terrace Standard Time"],
      tags: ["Sunset is the opening act.", "Four floors up, no lift after ten.", "The view is free. The company is better."],
    },
    holi: {
      label: "Holi", kw: ["holi", "rang", "colours party", "color party", "pichkari"],
      editions: ["riso", "sivakasi", "telegram", "letterpress"],
      titles: ["Rang Barse", "Wear White, Regret Nothing", "Full Colour Edition"],
      tags: ["Wear something you're ready to lose.", "Gulal provided. Mercy not.", "Come clean. Leave otherwise."],
    },
    diwali: {
      label: "Diwali", kw: ["diwali", "deepavali", "diya", "taash", "card party", "patakha"],
      editions: ["sivakasi", "letterpress", "riso", "telegram"],
      titles: ["Lights, Cards, Mithai", "The Taash Table", "Full Glow"],
      tags: ["Diyas lit by seven. Teen patti by eight.", "Mithai on the table, stakes kept friendly.", "Dress up. The house already has."],
    },
    dandiya: {
      label: "Garba night", kw: ["dandiya", "garba", "navratri", "raas"],
      editions: ["sivakasi", "riso", "letterpress", "talkies"],
      titles: ["Raas Till Late", "Nine Nights, One Floor", "Sticks & Stamina"],
      tags: ["Chaniya choli encouraged. Stamina required.", "The dhol starts at eight and doesn't stop.", "Bring your own dandiya. Spares at the door."],
    },
    farewell: {
      label: "Farewell", kw: ["farewell", "goodbye", "leaving", "last day", "moving to", "send off", "sendoff"],
      editions: ["telegram", "letterpress", "snapshot", "talkies"],
      titles: ["One Last Round", "Until Next Time", "The Final Scene"],
      tags: ["You're leaving. We're not okay. There's food.", "A proper goodbye, said badly and at length.", "Speeches will be short. Hugs will not."],
    },
    roadtrip: {
      label: "Road trip", kw: ["road trip", "roadtrip", "drive to", "getaway", "weekend trip", "coorg", "goa", "nandi", "hampi", "pondicherry", "chikmagalur", "trek"],
      editions: ["talkies", "telegram", "riso", "letterpress"],
      titles: ["Out of Office", "Tank Full, Plans None", "Miles & Playlists"],
      tags: ["Leaving at six. Sharp. Ish.", "Window seat goes to whoever brings snacks.", "Pack light. The playlist is already heavy."],
    },
    coffee: {
      label: "Coffee", kw: ["coffee", "chai", "cafe", "café", "brunch", "breakfast", "catch up", "catchup", "book club", "reading"],
      editions: ["letterpress", "telegram", "snapshot", "sivakasi"],
      titles: ["Slow Morning Club", "No Agenda", "Filter, Unfiltered"],
      tags: ["Filter coffee and unfiltered talk.", "Phones face down. Second cup on us.", "A small table, a long morning."],
    },
    study: {
      label: "Study session", kw: ["study", "exam", "revision", "assignment", "library", "placement prep"],
      editions: ["telegram", "letterpress", "talkies", "riso"],
      titles: ["Lock In", "The Syllabus Awaits", "Quiet Hours"],
      tags: ["Bring notes. Leave smarter. Or at least fed.", "Pomodoro rules apply. Snacks every fourth round.", "Silence is golden. Chai is mandatory."],
    },
    gamenight: {
      label: "Game night", kw: ["game night", "gamenight", "board game", "poker", "fifa", "valorant", "mafia", "uno", "monopoly", "catan"],
      editions: ["talkies", "sivakasi", "riso", "telegram"],
      titles: ["Friendships End Tonight", "The Table Decides", "House Rules"],
      tags: ["Loser buys biryani.", "Bring your poker face and a backup friend.", "Rules are final. Grudges are optional."],
    },
    watchparty: {
      label: "Screening", kw: ["watch party", "screening", "match", "cricket", "ipl", "world cup", "rcb", "finale", "movie night", "film night"],
      editions: ["talkies", "riso", "sivakasi", "telegram"],
      titles: ["Big Screen, Small Room", "Match Day HQ", "House Full"],
      tags: ["Popcorn at the interval. Opinions throughout.", "Wear the jersey. Mean it.", "No spoilers past the gate."],
    },
    concert: {
      label: "Night out", kw: ["rave", "concert", "gig", "dj", "techno", "edm", "afterparty", "after party", "club", "pre-game", "pregame"],
      editions: ["riso", "talkies", "sivakasi", "telegram"],
      titles: ["Ears Will Ring", "Till the Lights Come On", "Bass Communion"],
      tags: ["No slow songs. Not one.", "Doors at ten. Sleep is a rumour.", "Wear black. Leave late."],
    },
    potluck: {
      label: "Dinner", kw: ["potluck", "dinner party", "dinner at", "dinner", "home cooked", "khaana", "biryani", "supper"],
      editions: ["letterpress", "sivakasi", "telegram", "snapshot"],
      titles: ["The Long Table", "Bring a Dish, Stay Forever", "Second Helpings"],
      tags: ["One dish each. Seconds for everyone.", "Long table, longer conversations.", "Dinner at eight. Dessert whenever."],
    },
    housewarming: {
      label: "Housewarming", kw: ["housewarming", "house warming", "new flat", "new house", "griha", "new place"],
      editions: ["telegram", "letterpress", "sivakasi", "snapshot"],
      titles: ["New Pin Code", "The Door Is Open", "Home, Finally"],
      tags: ["Come see the place before it gets messy.", "Plants welcome. Opinions on the sofa, less so.", "Fourth floor, the door with the toran."],
    },
    sangeet: {
      label: "Sangeet", kw: ["sangeet", "shaadi", "wedding", "mehendi", "haldi", "engagement", "roka"],
      editions: ["letterpress", "sivakasi", "snapshot", "riso"],
      titles: ["The Rehearsals Paid Off", "Naach, Basically Mandatory", "Two Families, One Floor"],
      tags: ["Choreography optional. Enthusiasm is not.", "The dance-off has been rehearsed for weeks.", "Dress for the photos. Dance for yourself."],
    },
    generic: {
      label: "Occasion", kw: [],
      editions: ["letterpress", "sivakasi", "talkies", "riso", "telegram"],
      titles: ["Kal Jalsa Hai", "The Plan Is the Plan", "Be There"],
      tags: ["Your presence is requested, and expected.", "More details to follow. Show up regardless.", "A small occasion for good people."],
    },
  };

  /* ---------- energy ------------------------------------------ */
  const LOUD = ["loud", "chaos", "crazy", "wild", "unhinged", "insane", "rave", "banger", "all night", "no sleep", "full send", "dhamaal", "bawaal", "hype", "lit", "party"];
  const QUIET = ["chill", "quiet", "calm", "cozy", "cosy", "intimate", "slow", "soft", "low key", "lowkey", "peaceful", "classy", "elegant", "minimal", "small"];

  const TIME_HINTS = [
    [/sunset|golden hour|shaam|evening/i, "17:30"],
    [/midnight|late night|raat|night/i, "21:30"],
    [/morning|subah|brunch|breakfast/i, "10:30"],
    [/afternoon|lunch/i, "13:00"],
  ];

  function detectType(text) {
    const t = " " + text.toLowerCase() + " ";
    let best = "generic", bestIdx = Infinity;
    for (const [key, def] of Object.entries(TYPES)) {
      for (const kw of def.kw) {
        const idx = t.indexOf(kw);
        if (idx !== -1 && idx < bestIdx) { best = key; bestIdx = idx; }
      }
    }
    return best;
  }

  function detectEnergy(text) {
    const t = text.toLowerCase();
    let score = 0;
    LOUD.forEach(w => { if (t.includes(w)) score += 1; });
    QUIET.forEach(w => { if (t.includes(w)) score -= 1; });
    if (/!{2,}/.test(text)) score += 1;
    if (text === text.toUpperCase() && /[A-Z]{6,}/.test(text)) score += 1;
    return score;
  }

  function detectName(text) {
    const m = text.match(/\b([A-Z][a-z]{2,14})(?:'s|’s)\s/);
    if (m) return m[1];
    const f = text.match(/\bfor\s+([A-Z][a-z]{2,14})\b/);
    return f ? f[1] : null;
  }

  function detectCount(text) {
    const m = text.match(/(\d{1,3})\s*(?:people|ppl|log|guests|friends|of us|pax)/i);
    return m ? Math.min(parseInt(m[1], 10), 500) : null;
  }

  /* ---------- brief ------------------------------------------- */
  function hashStr(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  const pick = (arr, n) => arr[((n % arr.length) + arr.length) % arr.length];

  function makeTitle(typeKey, name, seed) {
    if (name) {
      const named = {
        birthday: `${name} Turns Up`, farewell: `Goodbye, ${name}`, sangeet: `${name} Ki Shaadi`,
        housewarming: `${name}'s New Place`, potluck: `Dinner at ${name}'s`,
      };
      if (named[typeKey]) return named[typeKey];
      if (typeKey !== "generic") return `${name}'s ${TYPES[typeKey].label}`;
    }
    return pick(TYPES[typeKey].titles, seed);
  }

  /** text → { typeKey, title, count, time, proofs:[concept ×3] } */
  function generate(text, opts = {}) {
    const typeKey = detectType(text);
    const def = TYPES[typeKey];
    const energy = detectEnergy(text);
    const seed = hashStr(text) + (opts.reroll || 0);

    // order editions by fit, then let energy and the host's house
    // style lean on it — loud reads pull riso forward, quiet reads
    // pull letterpress forward.
    let order = def.editions.slice();
    const lean = ed => { order = [ed, ...order.filter(e => e !== ed)]; };
    if (energy >= 2 && order.includes("riso")) lean("riso");
    if (energy <= -2) lean("letterpress");
    if (opts.houseStyle && Editions.LIST.includes(opts.houseStyle) && energy === 0 && opts.houseStyle !== "snapshot") lean(opts.houseStyle);
    // a reroll rotates the order so new editions surface
    const rot = (opts.reroll || 0) % order.length;
    order = order.slice(rot).concat(order.slice(0, rot));

    const proofs = order.slice(0, 3).map((edition, i) => {
      const inks = Object.keys(Editions.get(edition).inks);
      return {
        edition,
        ink: pick(inks, seed + i * 5),
        tagline: pick(def.tags, seed + i),
      };
    });

    return {
      typeKey,
      typeLabel: def.label,
      energy,
      name: detectName(text),
      count: detectCount(text),
      title: makeTitle(typeKey, detectName(text), seed),
      time: (TIME_HINTS.find(([re]) => re.test(text)) || [null, "19:30"])[1],
      proofs,
    };
  }

  /* ---------- as-you-type reading ----------------------------- */
  function read(text) {
    if (!text || text.trim().length < 3) return [];
    const toks = [];
    const k = detectType(text);
    if (k !== "generic") toks.push(TYPES[k].label.toLowerCase());
    const e = detectEnergy(text);
    if (e >= 2) toks.push("loud");
    else if (e <= -2) toks.push("hushed");
    const n = detectName(text);
    if (n) toks.push("for " + n);
    const c = detectCount(text);
    if (c) toks.push(c + " guests");
    const th = TIME_HINTS.find(([re]) => re.test(text));
    if (th) toks.push(formatTime(th[1]).toLowerCase());
    return toks;
  }

  /* ---------- the WhatsApp message ---------------------------- */
  function shareText(ev, link) {
    const lines = [
      `*${ev.title}*`,
      ev.tagline,
      ``,
      `${longDate(ev)}, ${formatTime(ev.time)}`,
      ev.venue || "Venue to follow",
    ];
    if (ev.upiAmount) lines.push(`₹${ev.upiAmount} a head, collected on the invite`);
    lines.push(``, `Kindly reply:`, link);
    return lines.join("\n");
  }

  function formatTime(t) {
    if (!t) return "7:30 pm";
    const [h, m] = t.split(":").map(Number);
    const ap = h >= 12 ? "pm" : "am";
    const hh = h % 12 === 0 ? 12 : h % 12;
    return m ? `${hh}:${String(m).padStart(2, "0")} ${ap}` : `${hh} ${ap}`;
  }

  function longDate(ev) {
    if (!ev.date) return "Date to follow";
    return new Date(ev.date + "T00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  }

  return { TYPES, generate, read, shareText, formatTime, longDate, hashStr };
})();
