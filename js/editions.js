/* ============================================================
   jalsa — the editions
   Six printed objects, each borrowed from a real Indian print
   tradition. Every edition is sized in container units (cqw), so
   the same markup is a 90px thumbnail or a full-screen reveal.
   ============================================================ */

const Editions = (() => {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- the catalogue ---------------------------------- */
  const CATALOGUE = {
    letterpress: {
      no: "01", name: "Letterpress", note: "Debossed bone card, vermilion seal",
      inks: {
        bone:   { name: "Bone & Sindoor", p: "#EEE7DA", i: "#211C17", a: "#B8321F" },
        blush:  { name: "Blush & Wine",   p: "#F0E1DA", i: "#36161E", a: "#8E2E44" },
        sage:   { name: "Sage & Forest",  p: "#E3E5D9", i: "#1C2A21", a: "#4F6B4A" },
        cobalt: { name: "Oat & Cobalt",   p: "#EBE6DA", i: "#141E38", a: "#2B4C9B" },
      },
    },
    sivakasi: {
      no: "02", name: "Sivakasi", note: "After the matchbox labels of India's print capital",
      inks: {
        marigold: { name: "Marigold",  p: "#E9A43B", i: "#4E1710", a: "#1F5F5B", b: "#F5E7C9" },
        rani:     { name: "Rani",      p: "#DE4A7C", i: "#1D1B4B", a: "#F2C230", b: "#FBE7D6" },
        leaf:     { name: "Leaf",      p: "#2F7A4D", i: "#F3E7CF", a: "#D9372A", b: "#F1C443" },
        sky:      { name: "Sky",       p: "#93C6D5", i: "#1A2340", a: "#D9452B", b: "#F5EBD5" },
      },
    },
    talkies: {
      no: "03", name: "Talkies", note: "A single-screen cinema ticket, stub attached",
      inks: {
        rose:   { name: "Balcony Rose", p: "#F2CBC4", i: "#6E1A26", a: "#C2352B" },
        mint:   { name: "Dress Circle", p: "#CFE5D4", i: "#1E4631", a: "#2E7D4F" },
        butter: { name: "Front Stall",  p: "#F2E2A8", i: "#22305E", a: "#2F4FA8" },
        lilac:  { name: "Box Seat",     p: "#DCD4EE", i: "#36276A", a: "#5B47A8" },
      },
    },
    riso: {
      no: "04", name: "Riso", note: "Two fluorescent drums, misregistered on purpose",
      inks: {
        pinkblue:   { name: "Fluoro Pink / Blue",  p: "#F1EDE4", i: "#1B1A1F", a: "#FF48B0", b: "#0078BF", blend: "multiply" },
        sunteal:    { name: "Yellow / Teal",       p: "#F1EDE4", i: "#1B1A1F", a: "#FFE04A", b: "#00838A", blend: "multiply" },
        afterhours: { name: "After Hours",         p: "#131116", i: "#F2EEE6", a: "#FF48B0", b: "#3D7BFF", blend: "screen" },
        greenroom:  { name: "Green Room",          p: "#0F1612", i: "#EDF0E8", a: "#00A95C", b: "#FF6C2F", blend: "screen" },
      },
    },
    telegram: {
      no: "05", name: "Telegram", note: "Typewritten, stamped, delivered STOP",
      inks: {
        buff:  { name: "Buff Form",  p: "#E8DCC0", i: "#2A2620", a: "#4B3FA0" },
        blue:  { name: "Blue Form",  p: "#D8E2E4", i: "#1E2A30", a: "#B8321F" },
        pink:  { name: "Pink Slip",  p: "#EFD8D0", i: "#2A1F1F", a: "#4B3FA0" },
      },
    },
    snapshot: {
      no: "06", name: "Snapshot", note: "Your photograph, pinned to a coloured card",
      inks: {
        tomato: { name: "Tomato", p: "#D4452C", i: "#FFF3E6" },
        cobalt: { name: "Cobalt", p: "#2A4A97", i: "#F3EDDF" },
        olive:  { name: "Olive",  p: "#5C6A36", i: "#F2EDDB" },
        noir:   { name: "Noir",   p: "#1B1917", i: "#EEE6D8" },
      },
    },
  };
  const LIST = Object.keys(CATALOGUE);

  function get(ed) { return CATALOGUE[ed] || CATALOGUE.letterpress; }
  function inkOf(concept) {
    const ed = get(concept && concept.edition);
    return ed.inks[concept && concept.ink] || Object.values(ed.inks)[0];
  }

  /* ---------- helpers ---------------------------------------- */
  function parts(ev) {
    if (!ev.date) return { dow: "Day", day: "—", mon: "TBA", dd: "--", mm: "--", long: "Date to follow" };
    const d = new Date(ev.date + "T00:00");
    return {
      dow: d.toLocaleDateString("en-IN", { weekday: "long" }),
      dw3: d.toLocaleDateString("en-IN", { weekday: "short" }),
      day: String(d.getDate()),
      mon: d.toLocaleDateString("en-IN", { month: "long" }),
      mo3: d.toLocaleDateString("en-IN", { month: "short" }),
      dd: String(d.getDate()).padStart(2, "0"),
      mm: String(d.getMonth() + 1).padStart(2, "0"),
      yy: String(d.getFullYear()).slice(2),
    };
  }
  const time = ev => Engine.formatTime(ev.time);
  const venue = ev => ev.venue || ev.venueName || "Venue to follow";
  const host = ev => ev.hostName || ev.venueName || "A friend";
  function serial(ev) { return String(Engine.hashStr(ev.slug || ev.title || "x") % 1000000).padStart(6, "0"); }
  function venueSplit(ev) {
    const v = venue(ev);
    const i = v.indexOf(",");
    return i > 0 ? [v.slice(0, i), v.slice(i + 1).trim()] : [v, ""];
  }

  /* the largest size (in cqw) at which `text`, wrapped greedily into a
     measure of `measure` cqw, takes no more than `lines` lines.
     charW is the face's average advance, as a fraction of the size. */
  function fit(text, { measure, charW, lines = 2, max, min = 5, oneMax }) {
    // a title that fits on one line may run larger than a wrapped one
    if (oneMax && lines > 1) {
      const one = parseFloat(fit(text, { measure, charW, lines: 1, max: oneMax, min: max }));
      if (one > max) return one.toFixed(2) + "cqw";
    }
    const words = String(text).split(/\s+/).filter(Boolean);
    for (let size = max; size >= min; size -= .25) {
      const perLine = Math.floor(measure / (size * charW));
      let n = 1, cur = 0, ok = true;
      for (const w of words) {
        if (w.length > perLine) { ok = false; break; }
        if (!cur) cur = w.length;
        else if (cur + 1 + w.length <= perLine) cur += 1 + w.length;
        else { n++; cur = w.length; }
      }
      if (ok && n <= lines) return size.toFixed(2) + "cqw";
    }
    return min + "cqw";
  }

  /* break a title into short stacked lines */
  function stack(text, maxChars) {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = "";
    for (const w of words) {
      if (!cur) cur = w;
      else if ((cur + " " + w).length <= maxChars) cur += " " + w;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /* ---------- 01 letterpress --------------------------------- */
  function letterpress(ev) {
    const t = parts(ev), [v1, v2] = venueSplit(ev);
    const words = ev.title.split(/\s+/);
    const last = words.pop();
    const title = (words.length ? esc(words.join(" ")) + " " : "") + `<em>${esc(last)}</em>`;
    return `
      <div class="lp-frame" aria-hidden="true"></div>
      <p class="lp-top"><span>${esc(host(ev))}</span> requests the pleasure of your company</p>
      <div class="lp-body">
        <h1 class="lp-title" style="font-size:${fit(ev.title, { measure: 78, charW: .5, lines: 3, max: 15.5, min: 7, oneMax: 21 })}">${title}</h1>
        <p class="lp-tag">${esc(ev.tagline)}</p>
      </div>
      <div class="lp-foot">
        <div><small>When</small><b>${esc(t.dow)}</b>${esc(t.day)} ${esc(t.mon)}</div>
        <div><small>Hour</small><b>${esc(time(ev))}</b>onwards</div>
        <div><small>Where</small><b>${esc(v1)}</b>${esc(v2)}</div>
      </div>
      <div class="lp-seal" aria-hidden="true"><span>${esc((host(ev)[0] || "j").toUpperCase())}</span></div>`;
  }

  /* ---------- 02 sivakasi ------------------------------------ */
  let arcSeq = 0;
  function sivakasi(ev) {
    const t = parts(ev), id = "arc" + (++arcSeq);
    const presenter = `${host(ev)} & Co. present`.toUpperCase();
    return `
      <div class="sv-label">
        <i class="sv-c tl"></i><i class="sv-c tr"></i><i class="sv-c bl"></i><i class="sv-c br"></i>
        <svg class="sv-arc" viewBox="0 0 300 80" aria-hidden="true">
          <defs><path id="${id}" d="M 30 72 Q 150 -6 270 72"/></defs>
          <text><textPath href="#${id}" startOffset="50%" text-anchor="middle">${esc(presenter)}</textPath></text>
        </svg>
        <div class="sv-emblem">
          <div class="sv-rays"></div>
          <div class="sv-disc"><b>${esc(t.day)}</b><span>${esc(t.mo3 || t.mon)}</span></div>
        </div>
        <h1 class="sv-title" data-t="${esc(ev.title)}" style="font-size:${fit(ev.title.toUpperCase(), { measure: 80, charW: .52, lines: 2, max: 15, min: 6 })}"><span>${esc(ev.title)}</span></h1>
        <div class="sv-ribbon"><span>${esc(ev.tagline)}</span></div>
        <div class="sv-foot"><span>${esc(t.dow)} · ${esc(time(ev))}</span><span>${esc(venue(ev))}</span></div>
        <div class="sv-small">Nº ${serial(ev)} · Superior quality · Made in Bengaluru</div>
      </div>`;
  }

  /* ---------- 03 talkies ------------------------------------- */
  function talkies(ev) {
    const t = parts(ev), [v1, v2] = venueSplit(ev);
    const bars = Array.from({ length: 38 }, (_, i) => ((Engine.hashStr(ev.title + i) % 3) + 1)).map(w => `<i style="flex:${w}"></i>`).join("");
    return `
      <div class="tk-main">
        <div class="tk-row"><span class="tk-admit">Admit one</span><span class="tk-serial">Nº ${serial(ev)}</span></div>
        <p class="tk-house">${esc(host(ev))} presents</p>
        <h1 class="tk-title" style="font-size:${fit(ev.title.toUpperCase(), { measure: 82, charW: .52, lines: 2, max: 18, min: 7, oneMax: 23 })}">${esc(ev.title)}</h1>
        <p class="tk-tag">${esc(ev.tagline)}</p>
        <div class="tk-grid">
          <div><small>Date</small><b>${esc(t.dd)}.${esc(t.mm)}</b></div>
          <div><small>Day</small><b>${esc(t.dw3 || t.dow)}</b></div>
          <div><small>Show</small><b>${esc(time(ev))}</b></div>
          <div><small>Class</small><b>Balcony</b></div>
        </div>
      </div>
      <div class="tk-perf" aria-hidden="true"></div>
      <div class="tk-stub">
        <div class="tk-stub-l">
          <small>Hall</small><b>${esc(v1)}</b><span>${esc(v2)}</span>
        </div>
        <div class="tk-stub-r">
          <div class="tk-bars" aria-hidden="true">${bars}</div>
          <small>Retain this portion</small>
        </div>
      </div>`;
  }

  /* ---------- 04 riso ---------------------------------------- */
  function riso(ev) {
    const t = parts(ev);
    const lines = stack(ev.title.toUpperCase(), 8);
    const longest = Math.max(...lines.map(l => l.length));
    const fs = Math.min(lines.length > 3 ? 16 : 24, 78 / (longest * .8));
    return `
      <div class="rs-dot" aria-hidden="true"></div>
      <div class="rs-bar" aria-hidden="true"></div>
      <h1 class="rs-title" style="font-size:${fs.toFixed(2)}cqw">${lines.map(l => `<span data-t="${esc(l)}">${esc(l)}</span>`).join("")}</h1>
      <p class="rs-side">${esc(t.dow)} ${esc(t.day)} ${esc(t.mon)} — ${esc(time(ev))} — ${esc(venue(ev))}</p>
      <div class="rs-foot">
        <p class="rs-tag">${esc(ev.tagline)}</p>
        <p class="rs-host">Hosted by<br><b>${esc(host(ev))}</b></p>
      </div>`;
  }

  /* ---------- 05 telegram ------------------------------------ */
  function telegram(ev) {
    const t = parts(ev);
    const clean = s => String(s || "").toUpperCase().replace(/[.!]+$/, "").replace(/[.!]\s*/g, " STOP ");
    const msg = [
      clean(ev.tagline),
      `${t.dw3 || t.dow} ${t.day} ${t.mo3 || t.mon} ${time(ev)}`.toUpperCase(),
      clean(venue(ev)),
      "COME",
    ].join(" STOP ") + " STOP";
    return `
      <div class="tg-head">
        <span class="tg-brand"><span class="tg-dev">तार</span> Jalsa Telegraph</span>
        <span class="tg-form">Form T-${esc(t.dd)}</span>
      </div>
      <div class="tg-fields">
        <div><small>To</small><span>You, specifically</span></div>
        <div><small>From</small><span>${esc(host(ev))}</span></div>
        <div><small>Class</small><span>Ordinary · Urgent</span></div>
      </div>
      <div class="tg-main">
        <h1 class="tg-title" style="font-size:${fit(ev.title, { measure: 86, charW: .6, lines: 2, max: 12, min: 6, oneMax: 15 })}">${esc(ev.title.toUpperCase())}</h1>
        <p class="tg-body">${esc(msg)}</p>
      </div>
      <div class="tg-stamp" aria-hidden="true"><span>Priority</span><small>${esc(t.dd)} ${esc((t.mo3 || "").toUpperCase())} · BLR</small></div>
      <p class="tg-foot">Kindly reply by return. No charge for reply.</p>`;
  }

  /* ---------- 06 snapshot ------------------------------------ */
  function snapshot(ev) {
    const t = parts(ev);
    const img = ev.photo
      ? `<img src="${esc(ev.photo)}" alt="">`
      : `<div class="sn-empty"><span>your photograph here</span></div>`;
    return `
      <p class="sn-head">${esc(host(ev))} would love you at</p>
      <h1 class="sn-title" style="font-size:${fit(ev.title, { measure: 84, charW: .44, lines: 2, max: 12.5, min: 7, oneMax: 19 })}">${esc(ev.title)}</h1>
      <figure class="sn-pol">
        <i class="sn-tape" aria-hidden="true"></i>
        <div class="sn-img">${img}</div>
        <figcaption>${esc(ev.tagline)}</figcaption>
      </figure>
      <div class="sn-foot"><span>${esc(t.dw3 || t.dow)} ${esc(t.day)} ${esc(t.mo3 || t.mon)}</span><span>${esc(time(ev))}</span><span>${esc(venue(ev))}</span></div>`;
  }

  const RENDER = { letterpress, sivakasi, talkies, riso, telegram, snapshot };

  /* ---------- public: build an invite node ------------------- */
  function render(ev, concept, { reveal = false } = {}) {
    concept = concept || { edition: "letterpress" };
    const el = document.createElement("div");

    if (concept.edition === "commission") {
      el.className = "inv ed-commission" + (reveal ? " reveal" : "");
      const box = document.createElement("div");
      box.className = "cm-box";
      el.appendChild(box);
      if (concept.html && typeof AI !== "undefined") {
        // the frame is laid out at 1080px and scaled to the card's width
        requestAnimationFrame(() => AI.renderInto(box, concept.html, ev.photo));
      }
      return el;
    }

    const ed = CATALOGUE[concept.edition] ? concept.edition : "letterpress";
    const ink = inkOf({ edition: ed, ink: concept.ink });
    el.className = `inv ed-${ed}` + (reveal ? " reveal" : "");
    el.style.cssText = `--p:${ink.p};--i:${ink.i};--a:${ink.a || ink.i};--b:${ink.b || ink.a || ink.i};--blend:${ink.blend || "multiply"}`;
    const data = Object.assign({}, ev, { title: ev.title || "Your occasion", tagline: concept.tagline || ev.tagline || "" });
    el.innerHTML = RENDER[ed](data) + `<i class="inv-grain" aria-hidden="true"></i>`;
    return el;
  }

  /* Small copies are laid out at full size and scaled down, the way a
     proof is reduced: browsers enforce a minimum font size, so a card
     simply drawn at 100px wide would have its fine print blown up. */
  const BASE = 360;
  const ro = "ResizeObserver" in window ? new ResizeObserver(entries => entries.forEach(e => fitBox(e.target))) : null;
  function fitBox(box) {
    const w = box.clientWidth, node = box.firstElementChild;
    if (!w || !node) return;
    const k = w / BASE;
    box.style.height = (BASE * 1.25 * k) + "px";
    node.style.transform = `scale(${k})`;
  }
  function mount(slot, ev, concept, opts) {
    const node = render(ev, concept, opts);
    const box = document.createElement("div");
    box.className = "inv-scaled";
    node.style.width = BASE + "px";
    box.appendChild(node);
    slot.innerHTML = "";
    slot.appendChild(box);
    fitBox(box);
    if (ro) ro.observe(box);
    return node;
  }

  return { CATALOGUE, LIST, get, inkOf, render, mount, esc, parts };
})();
