/* ============================================================
   JALSA — Vibe Engine
   Free text  →  design brief  →  3 invite concepts.
   Deterministic, culturally-tuned, runs entirely on-device.
   ============================================================ */

const Engine = (() => {

  /* ---------- palettes (from the design intelligence report) --- */
  const PALETTES = {
    // tier 1 — desaturate everything 30%
    koramangalaCoffee: { tier: 1, name: "Koramangala Coffee", bg: "#F5EFE0", ink: "#1E1510", a: "#8FA886" },
    chaiSepia:         { tier: 1, name: "Chai Sepia",         bg: "#F1E8D8", ink: "#2A1F14", a: "#B0876B" },
    lalbaghDawn:       { tier: 1, name: "Lalbagh Dawn",       bg: "#EFF0EA", ink: "#1C1F1D", a: "#7C8DA5" },
    dustyRose:         { tier: 1, name: "Dusty Rose",         bg: "#F4ECE6", ink: "#241812", a: "#C09B92" },
    // tier 2 — one color should be "wrong"
    rooftopAmber:      { tier: 2, name: "Rooftop Amber",      bg: "#141010", ink: "#F5EDE2", a: "#C4833C", pop: "#E8F44A" },
    indiranagarMidnight:{tier: 2, name: "Indiranagar Midnight",bg:"#0D1B2A", ink: "#F0E6D3", a: "#C75B37", pop: "#E8F44A" },
    forestMustard:     { tier: 2, name: "Forest Mustard",     bg: "#10231A", ink: "#EFE9DA", a: "#D9A441", pop: "#FF6B4A" },
    emberNight:        { tier: 2, name: "Ember Night",        bg: "#16100E", ink: "#FAF8F3", a: "#FF4D00", pop: "#E8B531" },
    // tier 3 — maximum saturation, minimum colors
    raveChlorophyll:   { tier: 3, name: "Rave Chlorophyll",   bg: "#080808", ink: "#EBEBEB", a: "#B5FF3A", pop: "#FF2D78" },
    desiY2K:           { tier: 3, name: "Desi Y2K",           bg: "#1A0030", ink: "#F2EAFF", a: "#FF2D78", pop: "#FFD700", extra: "#00F5FF" },
    fluorOrange:       { tier: 3, name: "Fluorescent",        bg: "#0A0605", ink: "#FAF8F3", a: "#FF4D00", pop: "#B5FF3A" },
    midnightAcid:      { tier: 3, name: "Midnight Acid",      bg: "#0D0B1E", ink: "#FAF8F3", a: "#E8F44A", pop: "#FF2D78" },

    // ---- tier 1 · warm editorial grounds (cream / bone / paper) ----
    creamCrimson:      { tier: 1, name: "Cream Crimson",      bg: "#F3ECE1", ink: "#2A1410", a: "#C0271F" },
    ivoryGold:         { tier: 1, name: "Ivory Gold",         bg: "#F4EEDF", ink: "#2A2114", a: "#B0862E" },
    boneInk:           { tier: 1, name: "Bone & Ink",         bg: "#EDE7DA", ink: "#14110E", a: "#B5432C" },
    blushWine:         { tier: 1, name: "Blush Wine",         bg: "#F3E7E4", ink: "#2A1418", a: "#8E2E44" },
    oatCobalt:         { tier: 1, name: "Oat Cobalt",         bg: "#EFE9DC", ink: "#14171F", a: "#2E5AA8" },
    sageLinen:         { tier: 1, name: "Sage Linen",         bg: "#EBEDE3", ink: "#1B1E1A", a: "#6F8A5E" },
    terracottaPaper:   { tier: 1, name: "Terracotta Paper",   bg: "#F1E7DC", ink: "#241611", a: "#C56B41" },

    // ---- tier 2 · dark grounds, one loud accent + acid pop ----
    carbonLime:        { tier: 2, name: "Carbon Lime",        bg: "#121212", ink: "#F2F2EC", a: "#FF5A1F", pop: "#C6FF3A" },
    plumAcid:          { tier: 2, name: "Plum Acid",          bg: "#1A1226", ink: "#F0E9F5", a: "#C64BE0", pop: "#E8F44A" },
    navyCoral:         { tier: 2, name: "Navy Coral",         bg: "#0C1826", ink: "#EFE7DA", a: "#FF6B5C", pop: "#F4D03F" },
    oxblood:           { tier: 2, name: "Oxblood",            bg: "#1C0F10", ink: "#F3E9DD", a: "#E23B2E", pop: "#EAC66A" },
    tealTangerine:     { tier: 2, name: "Teal Tangerine",     bg: "#0C1B1B", ink: "#F0ECE0", a: "#FF7A2E", pop: "#34E0D0" },
    slateSulphur:      { tier: 2, name: "Slate Sulphur",      bg: "#171A1F", ink: "#F1EEE6", a: "#F2C21C", pop: "#FF5A6E" },

    // ---- tier 3 · max saturation neon ----
    cyberBubblegum:    { tier: 3, name: "Cyber Bubblegum",    bg: "#12001F", ink: "#F5EAFF", a: "#FF3DA5", pop: "#3DF5FF", extra: "#FFE23D" },
    voltGrape:         { tier: 3, name: "Volt Grape",         bg: "#14002E", ink: "#F0EAFF", a: "#B5FF3A", pop: "#FF2D78", extra: "#00F5FF" },
    infraRed:          { tier: 3, name: "Infrared",           bg: "#0A0000", ink: "#FFF0F0", a: "#FF2D2D", pop: "#FFD400", extra: "#00F5FF" },
    toxicSpearmint:    { tier: 3, name: "Toxic Spearmint",    bg: "#001410", ink: "#EAFFF7", a: "#00FFA3", pop: "#FF3DA5", extra: "#FFE23D" },
    hazardTape:        { tier: 3, name: "Hazard Tape",        bg: "#0A0A0A", ink: "#FAFAF0", a: "#FFD400", pop: "#FF2D2D", extra: "#00F5FF" },
  };

  // palette keys grouped by tier + display-font & layout pools — the
  // generator draws from these so no two invites look the same.
  const TIER_PALS = { 1: [], 2: [], 3: [] };
  for (const [k, v] of Object.entries(PALETTES)) TIER_PALS[v.tier].push(k);
  const FONT_POOLS = {
    1: ["Shrikhand", "Bricolage Grotesque", "Big Shoulders Display"],
    2: ["Anton", "Archivo", "Syne", "Unbounded"],
    3: ["Bebas Neue", "Anton", "Big Shoulders Display", "Unbounded"],
  };
  const LAYOUTS = { 1: ["editorial", "poster"], 2: ["split", "marquee"], 3: ["chaos", "y2k", "wall"] };

  /* ---------- event type intelligence ------------------------- */
  const TYPES = {
    birthday:   { label: "Birthday",       glyph: "✶", tier: 2, kw: ["birthday","bday","turns","turning","cake","另"],
      palettes: [["dustyRose","koramangalaCoffee"],["rooftopAmber","emberNight"],["desiY2K","midnightAcid"]],
      titles: ["ANOTHER YEAR OF THIS", "LEVEL UP NIGHT", "CAKE & CHAOS"],
      tags: {
        1: ["A quiet toast to one more year.", "Cake, candles, the people who matter."],
        2: ["Another year of this nonsense. Come celebrate it.", "The candles are a fire hazard at this point."],
        3: ["SURVIVED ANOTHER YEAR. ACT ACCORDINGLY.", "CAKE FIRST. DECISIONS LATER."],
      } },
    houseparty: { label: "House Party",    glyph: "◉", tier: 3, kw: ["house party","houseparty","ghar pe","my place","flat party","apartment","house warming? no"],
      palettes: [["lalbaghDawn"],["emberNight","rooftopAmber"],["desiY2K","raveChlorophyll"]],
      titles: ["GHAR PE KOI NAHI HAI", "FLOOR IS THE DANCE FLOOR", "NO NEIGHBOURS ALLOWED"],
      tags: {
        1: ["A slow evening at ours. Come as you are.", "Home, food, your favourite people."],
        2: ["The flat has speakers. The flat has snacks. The flat needs you.", "BYO nothing. Just come."],
        3: ["GHAR PE KOI NAHI HAI. YOU KNOW WHAT THAT MEANS.", "THE NEIGHBOURS HAVE BEEN WARNED."],
      } },
    rooftop:    { label: "Rooftop",        glyph: "◭", tier: 2, kw: ["rooftop","terrace","chhat","sunset","golden hour","open air"],
      palettes: [["chaiSepia","koramangalaCoffee"],["rooftopAmber","indiranagarMidnight"],["fluorOrange","midnightAcid"]],
      titles: ["GOLDEN HOUR & CO.", "ABOVE THE TRAFFIC", "TERRACE STANDARD TIME"],
      tags: {
        1: ["Sunset, slow music, nowhere to be.", "The city looks better from up here."],
        2: ["Sunset is the opening act.", "Above the traffic, beyond the excuses."],
        3: ["SCREAM AT THE SKYLINE.", "THE TERRACE HAS NO RULES."],
      } },
    holi:       { label: "Holi",           glyph: "✦", tier: 3, kw: ["holi","rang","colours party","color party","pichkari","bhang"],
      palettes: [["dustyRose"],["forestMustard","emberNight"],["desiY2K","midnightAcid"]],
      titles: ["RANG BARSE", "WEAR WHITE. REGRET NOTHING.", "FULL COLOUR MODE"],
      tags: {
        1: ["Colours, thandai, and a long afternoon.", "Soft holi. Real gulal."],
        2: ["Wear white. Regret nothing.", "The pichkaris are loaded."],
        3: ["YOU WILL NOT LEAVE CLEAN.", "RANG BARSE. VOLUME BHI."],
      } },
    diwali:     { label: "Diwali",         glyph: "❋", tier: 2, kw: ["diwali","deepavali","diya","taash","card party","patakha"],
      palettes: [["chaiSepia","koramangalaCoffee"],["emberNight","rooftopAmber"],["desiY2K"]],
      titles: ["FULL GLOW", "DIYA & TAASH NIGHT", "LIGHTS ON US"],
      tags: {
        1: ["Diyas, dinner, and everyone home by midnight. Maybe.", "A warm one. Bring your best self."],
        2: ["The taash table is set. Bring your luck.", "Maximum glow. Minimum decorum."],
        3: ["PATAKHA ENERGY ONLY.", "GLOW LOUD."],
      } },
    dandiya:    { label: "Dandiya Night",  glyph: "✺", tier: 2, kw: ["dandiya","garba","navratri","raas"],
      palettes: [["dustyRose"],["emberNight","forestMustard"],["desiY2K"]],
      titles: ["RAAS REPUBLIC", "STICKS & STAMINA", "GARBA TILL WE DROP"],
      tags: {
        1: ["An easy evening of garba and chaat.", "Twirl optional. Presence mandatory."],
        2: ["Sticks provided. Stamina is on you.", "The circle only works if you show up."],
        3: ["12 ROUNDS. NO MERCY.", "GARBA CARDIO CHAMPIONSHIP."],
      } },
    farewell:   { label: "Farewell",       glyph: "➳", tier: 2, kw: ["farewell","goodbye","leaving","last day","moving to","send off","sendoff"],
      palettes: [["lalbaghDawn","koramangalaCoffee"],["indiranagarMidnight","rooftopAmber"],["midnightAcid"]],
      titles: ["ONE LAST JALSA", "GOODBYE, DRAMATICALLY", "THE FINAL SCENE"],
      tags: {
        1: ["Before you go — one more evening, done properly.", "A quiet send-off for a loud friend."],
        2: ["Last jalsa before you leave us. Make it count.", "You're leaving. We're not okay. There's food."],
        3: ["CRY LOUD. DANCE LOUDER.", "EXIT INTERVIEW: DANCE FLOOR."],
      } },
    roadtrip:   { label: "Road Trip",      glyph: "⟿", tier: 2, kw: ["road trip","roadtrip","drive to","getaway","weekend trip","coorg","goa","nandi","hampi","pondicherry","trek"],
      palettes: [["lalbaghDawn","chaiSepia"],["forestMustard","indiranagarMidnight"],["fluorOrange"]],
      titles: ["OUT OF OFFICE", "TANK FULL, PLANS NONE", "MILES & PLAYLISTS"],
      tags: {
        1: ["Packing light. Vibing heavy.", "Out of network, into the hills."],
        2: ["Tank full. Plans none. Perfect.", "The playlist is 9 hours long for a reason."],
        3: ["GPS OFF. CHAOS ON.", "NO ITINERARY SURVIVES US."],
      } },
    coffee:     { label: "Coffee / Chai",  glyph: "◌", tier: 1, kw: ["coffee","chai","cafe","café","brunch","breakfast","catch up","catchup","book club","reading"],
      palettes: [["koramangalaCoffee","chaiSepia"],["rooftopAmber"],["midnightAcid"]],
      titles: ["NO AGENDA", "SLOW MORNING CLUB", "THIRD PLACE"],
      tags: {
        1: ["No agenda. Good chai.", "Slow morning, long conversations.", "Filter coffee and unfiltered talk."],
        2: ["Caffeine first, gossip immediately after.", "The table is booked. The tea is hot. Both kinds."],
        3: ["ESPRESSO-FUELLED NONSENSE.", "CAFFEINE RAVE (SEATED)."],
      } },
    study:      { label: "Study Session",  glyph: "▤", tier: 1, kw: ["study","exam","revision","assignment","grind","library","placement prep"],
      palettes: [["lalbaghDawn","koramangalaCoffee"],["indiranagarMidnight"],["raveChlorophyll"]],
      titles: ["LOCK IN", "THE SYLLABUS AWAITS", "GRIND HOURS"],
      tags: {
        1: ["Phones down. Standards up.", "Deep work, then dinner."],
        2: ["We suffer together or not at all.", "The syllabus fears the group chat."],
        3: ["PANIC. TOGETHER. PRODUCTIVELY.", "ALL-NIGHTER SPEEDRUN."],
      } },
    gamenight:  { label: "Game Night",     glyph: "▚", tier: 2, kw: ["game night","gamenight","board game","poker","fifa","valorant","mafia","uno","monopoly","cards against"],
      palettes: [["lalbaghDawn"],["indiranagarMidnight","forestMustard"],["raveChlorophyll","midnightAcid"]],
      titles: ["FRIENDSHIPS END TONIGHT", "GG OR NOTHING", "THE TABLE DECIDES"],
      tags: {
        1: ["Board games and better company.", "Low stakes. High snacks."],
        2: ["Friendships will be tested. Snacks will help.", "The UNO deck shows no mercy."],
        3: ["RAGE QUIT FRIENDLY ZONE.", "WINNER TAKES THE AUX."],
      } },
    watchparty: { label: "Watch Party",    glyph: "▶", tier: 2, kw: ["watch party","screening","match","cricket","ipl","world cup","rcb","finale","movie night","film night"],
      palettes: [["lalbaghDawn"],["indiranagarMidnight","emberNight"],["raveChlorophyll"]],
      titles: ["BIG SCREEN ENERGY", "MATCH DAY HQ", "THE LIVING ROOM STADIUM"],
      tags: {
        1: ["One screen, soft blankets, good company.", "The quiet kind of watch party."],
        2: ["The couch is the stadium. Act like it.", "Bring lungs. We're using them."],
        3: ["SCREAM AT THE TV WITH US.", "EE SALA CUP NAMDE. AGAIN."],
      } },
    concert:    { label: "Rave / Gig",     glyph: "◆", tier: 3, kw: ["rave","concert","gig","dj","techno","edm","afterparty","after party","club","pre-game","pregame","boiler"],
      palettes: [["lalbaghDawn"],["emberNight"],["raveChlorophyll","desiY2K","fluorOrange"]],
      titles: ["EARS WILL RING", "BASS COMMUNION", "TILL THE LIGHTS COME ON"],
      tags: {
        1: ["A gentle pregame. Allegedly.", "Warm-up: acoustic version."],
        2: ["Stretch first. You'll need it.", "The lineup is a rumour. The bass is real."],
        3: ["EARS WILL RING FOR DAYS.", "NO SLOW SONGS. EVER."],
      } },
    potluck:    { label: "Potluck",        glyph: "✚", tier: 1, kw: ["potluck","dinner party","dinner at","home cooked","khaana","biryani night","pizza night"],
      palettes: [["koramangalaCoffee","chaiSepia"],["rooftopAmber","forestMustard"],["fluorOrange"]],
      titles: ["BRING A DISH, STAY FOREVER", "THE LONG TABLE", "SECOND HELPINGS"],
      tags: {
        1: ["Bring one dish and your whole appetite.", "A long table and longer conversations."],
        2: ["Your maggi does not count as a dish. Try again.", "Judged solely on tupperware contents."],
        3: ["COMPETITIVE EATING (FRIENDLY).", "CARB SUMMIT 2026."],
      } },
    housewarming:{label:"Housewarming",    glyph: "⌂", tier: 1, kw: ["housewarming","house warming","new flat","new house","griha","new place"],
      palettes: [["koramangalaCoffee","dustyRose"],["rooftopAmber"],["midnightAcid"]],
      titles: ["NEW PIN CODE", "HOME AT LAST", "THE DOOR IS OPEN"],
      tags: {
        1: ["New keys, old friends. Come see the place.", "The paint is dry. The kettle is on."],
        2: ["The deposit was painful. The party won't be.", "New flat. Same nonsense."],
        3: ["CHRISTEN THE WALLS (WITH MUSIC).", "NEW HOUSE SPEEDRUN TOUR."],
      } },
    sangeet:    { label: "Sangeet / Shaadi", glyph: "❁", tier: 2, kw: ["sangeet","shaadi","wedding","mehendi","haldi","engagement","roka"],
      palettes: [["dustyRose","chaiSepia"],["emberNight","rooftopAmber"],["desiY2K"]],
      titles: ["THE REHEARSALS PAID OFF", "FULL FILMY", "NAACH BASICALLY MANDATORY"],
      tags: {
        1: ["An evening of songs and the people we love.", "Soft lights, old songs, new beginnings."],
        2: ["The choreography took 6 weeks. Respect it.", "Dress code: more is more."],
        3: ["BOLLYWOOD WILL BE FELT.", "DHOL ENTERS. DECORUM EXITS."],
      } },
    generic:    { label: "Jalsa",          glyph: "✦", tier: 2, kw: [],
      palettes: [["koramangalaCoffee","lalbaghDawn"],["rooftopAmber","indiranagarMidnight"],["midnightAcid","raveChlorophyll"]],
      titles: ["KAL JALSA HAI", "THE PLAN IS THE PLAN", "SHOW UP"],
      tags: {
        1: ["An evening, done properly.", "Come through. That's it. That's the invite."],
        2: ["You know the drill. Be there.", "The plan exists. You're in it."],
        3: ["NO REASON. FULL SEND.", "BECAUSE WHY NOT."],
      } },
  };

  /* ---------- energy detection -------------------------------- */
  const CHAOS_WORDS = ["loud","chaos","crazy","wild","unhinged","insane","rave","banger","all night","no sleep","full send","blast","dhamaal","bawaal","hype","turnt","litt","lit ","psycho","feral","scream"];
  const CALM_WORDS  = ["chill","quiet","calm","cozy","cosy","intimate","slow","soft","low key","lowkey","peaceful","classy","elegant","sober","aesthetic","minimal","sundowner"];

  const TIME_HINTS = [
    [/sunset|golden hour|shaam/i, "SUNSET"],
    [/midnight|late night|raat/i, "LATE"],
    [/morning|subah|brunch|breakfast/i, "AM"],
    [/afternoon|lunch/i, "NOON"],
  ];

  function detectType(text) {
    const t = text.toLowerCase();
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
    CHAOS_WORDS.forEach(w => { if (t.includes(w)) score += 1; });
    CALM_WORDS.forEach(w => { if (t.includes(w)) score -= 1; });
    if (/!{2,}/.test(text)) score += 1;
    if (text === text.toUpperCase() && text.length > 12) score += 1;
    return score;
  }

  function detectName(text) {
    // "Priya's birthday" / "for Rohan" → possessive or dedication
    const m = text.match(/([A-Z][a-zA-Z]{2,14})(?:'s|’s)\s/);
    if (m) return m[1];
    const f = text.match(/\bfor\s+([A-Z][a-zA-Z]{2,14})\b/);
    if (f) return f[1];
    return null;
  }

  function detectCount(text) {
    const m = text.match(/(\d{1,3})\s*(?:people|ppl|log|guests|friends|of us|pax)/i);
    return m ? Math.min(parseInt(m[1], 10), 500) : null;
  }

  /* ---------- brief + concepts -------------------------------- */
  function pick(arr, seed) { return arr[seed % arr.length]; }
  function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

  function makeTitle(typeKey, name, seed) {
    const def = TYPES[typeKey];
    if (name) {
      const map = {
        birthday: `${name.toUpperCase()}'S LEVEL UP`,
        farewell: `LAST DANCE, ${name.toUpperCase()}`,
        sangeet:  `${name.toUpperCase()} KI SHAADI`,
      };
      return map[typeKey] || `${name.toUpperCase()}'S ${def.label.toUpperCase()}`;
    }
    return pick(def.titles, seed);
  }

  /** Main entry — parse description, return brief with 3 concepts */
  function generate(text, opts = {}) {
    const typeKey = opts.forceType || detectType(text);
    const def = TYPES[typeKey];
    const energy = detectEnergy(text);
    const name = detectName(text);
    const count = detectCount(text);
    const seed = hashStr(text) + (opts.reroll || 0);

    // base tier: type default nudged by detected energy + user taste
    let tier = def.tier;
    if (energy >= 2) tier = Math.min(3, tier + 1);
    if (energy <= -2) tier = Math.max(1, tier - 1);
    if (opts.tasteTier && Math.abs(opts.tasteTier - tier) === 1 && energy === 0) tier = opts.tasteTier;

    const title = makeTitle(typeKey, name, seed);

    // three concepts: the matched tier + two contrasting reads.
    // Each pulls a palette from the WHOLE tier set (not the type's small
    // pool) plus a display font and layout — so colour, type and structure
    // all shift every generation and every reroll.
    const tierOrder = { 1: [1, 2, 3], 2: [2, 3, 1], 3: [3, 2, 1] }[tier];
    const concepts = tierOrder.map((t, i) => {
      const pals = TIER_PALS[t];
      // bias the first concept toward the type's curated palette, let the
      // others roam the full set for variety
      const palKey = (i === 0 && def.palettes[t - 1])
        ? pick(def.palettes[t - 1], seed)
        : pals[(seed + i * 13 + t * 5) % pals.length];
      const pal = PALETTES[palKey];
      const layouts = LAYOUTS[t];
      const layout = layouts[(seed + i * 7) % layouts.length];
      const fonts = FONT_POOLS[t];
      const titleFont = fonts[(seed + i * 11 + t * 3) % fonts.length];
      return {
        tier: t,
        tierName: ["", "WHISPER", "FLEX", "UNHINGED"][t],
        layout,
        palette: palKey,
        pal,
        titleFont,
        tagline: pick(def.tags[t], seed + i * 3),
      };
    });

    return {
      typeKey,
      typeLabel: def.label,
      glyph: def.glyph,
      energy,
      tier,
      name,
      count,
      title,
      timeHint: (TIME_HINTS.find(([re]) => re.test(text)) || [null, null])[1],
      concepts,
    };
  }

  /* ---------- live vibe read (as-you-type feedback) ----------- */
  function read(text) {
    if (!text || text.trim().length < 3) return [];
    const toks = [];
    const typeKey = detectType(text);
    if (typeKey !== "generic") toks.push(TYPES[typeKey].label.toLowerCase());
    const e = detectEnergy(text);
    if (e >= 2) toks.push("chaotic good");
    else if (e === 1) toks.push("warming up");
    else if (e <= -2) toks.push("soft launch");
    else if (e === -1) toks.push("easy vibe");
    const n = detectName(text);
    if (n) toks.push(`for ${n}`);
    const c = detectCount(text);
    if (c) toks.push(`${c} log`);
    const th = TIME_HINTS.find(([re]) => re.test(text));
    if (th) toks.push(th[1].toLowerCase() + " hours");
    if (toks.length === 0 && text.trim().length > 8) toks.push("reading…");
    return toks;
  }

  /* ---------- WhatsApp share copy ----------------------------- */
  function shareText(ev, hostName, link) {
    const d = new Date(ev.date + "T" + (ev.time || "19:00"));
    const when = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    const lines = [
      `*${ev.title}* ${TYPES[ev.typeKey] ? TYPES[ev.typeKey].glyph : "✦"}`,
      ev.tagline,
      ``,
      `📍 ${ev.venue || "Location drops soon"}`,
      `🗓 ${when} · ${formatTime(ev.time)}`,
    ];
    if (ev.upiAmount) lines.push(`💸 ₹${ev.upiAmount}/head — collected on JALSA, no awkward reminders`);
    lines.push(``, `RSVP karo yahan 👇`, link || `jalsa.app/e/${ev.slug}`, ``, `_made on JALSA — the invite IS the event_`);
    return lines.join("\n");
  }

  function formatTime(t) {
    if (!t) return "7:00 PM";
    const [h, m] = t.split(":").map(Number);
    const ap = h >= 12 ? "PM" : "AM";
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh}:${m.toString().padStart(2, "0")} ${ap}`;
  }

  const GEN_LINES = [
    ["reading the vibe", "…"],
    ["event type locked:", "%TYPE%"],
    ["mixing palette:", "%PAL%"],
    ["kerning", "aggressively"],
    ["adding grain.", "then more grain"],
    ["misregistering the print", "on purpose"],
    ["rendering", "3 concepts"],
  ];

  return { PALETTES, TYPES, generate, read, shareText, formatTime, GEN_LINES };
})();
