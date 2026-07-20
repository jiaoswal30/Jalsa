/* ============================================================
   JALSA — invite renderers  v2 "louder"
   Builds a live .invite DOM node from an event + concept.
   Every invite is designed, not templated: layout, palette and
   type treatment all come from the brief.
   ============================================================ */

const Templates = (() => {

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let badgeSeq = 0;

  function fmtDate(ev) {
    if (!ev.date) return "DATE TBD";
    const d = new Date(ev.date + "T00:00");
    return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
  }
  function fmtDateShort(ev) {
    if (!ev.date) return "TBD";
    const d = new Date(ev.date + "T00:00");
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }).toUpperCase().replace(" ", ".");
  }

  /* split a title into 2 visual lines with weight/colour tension */
  function splitTitle(title) {
    const words = title.split(" ");
    if (words.length < 2) return [title, ""];
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
  }
  function splitTitle3(title) {
    const words = title.split(" ");
    if (words.length <= 2) return words;
    const a = Math.ceil(words.length / 3), b = Math.ceil((words.length * 2) / 3);
    return [words.slice(0, a).join(" "), words.slice(a, b).join(" "), words.slice(b).join(" ")].filter(Boolean);
  }

  /* highlight one word (the "wrong colour" word) */
  function popOneWord(line, cls) {
    const words = line.split(" ");
    if (!words.length) return esc(line);
    let idx = 0, maxLen = 0;
    words.forEach((w, i) => { if (w.length > maxLen) { maxLen = w.length; idx = i; } });
    return words.map((w, i) => i === idx ? `<span class="${cls}">${esc(w)}</span>` : esc(w)).join(" ");
  }

  /* spinning circular-text badge (unique path id per instance) */
  function spinBadge(text) {
    const id = "bpath" + (++badgeSeq);
    return `
      <svg class="spinbadge" viewBox="0 0 100 100" aria-hidden="true">
        <defs><path id="${id}" d="M50,50 m-40,0 a40,40 0 1,1 80,0 a40,40 0 1,1 -80,0"/></defs>
        <circle class="core" cx="50" cy="50" r="5"/>
        <text><textPath href="#${id}">${esc(text)}</textPath></text>
      </svg>`;
  }

  /* repeated-title wall */
  function wallHTML(title, rows = 9) {
    let out = "";
    for (let i = 0; i < rows; i++) {
      out += `<span class="${i % 3 === 1 ? "fill" : ""}">${esc(title)} ${esc(title)}</span>\n`;
    }
    return `<div class="u-wall" aria-hidden="true">${out}</div>`;
  }

  function render(ev, concept, { reveal = false } = {}) {
    const c = concept, pal = c.pal;
    const el = document.createElement("div");
    el.className = `invite t${c.tier} l-${c.layout}${reveal ? " revealing" : ""}`;
    el.style.setProperty("--bg", pal.bg);
    el.style.setProperty("--ink", pal.ink);
    el.style.setProperty("--a", pal.a);
    if (pal.pop) el.style.setProperty("--pop", pal.pop);
    if (pal.extra) el.style.setProperty("--extra", pal.extra);

    const dateStr = fmtDate(ev);
    const timeStr = Engine.formatTime(ev.time);
    const venue = ev.venue || "LOCATION DROPS SOON";
    const glyph = ev.glyph || "✦";
    const [l1, l2] = splitTitle(ev.title);

    /* ---------------- TIER 1 · WHISPER ---------------------- */
    if (c.tier === 1) {
      if (c.layout === "poster") {
        const lines = splitTitle3(ev.title.toLowerCase());
        el.innerHTML = `
          <div class="w-ghost" aria-hidden="true">${glyph}</div>
          <div class="w-kicker rv rv-1">${glyph}&ensp;YOU ARE INVITED</div>
          <h1 class="w-poster rv rv-2">${lines.map(l => `<span>${esc(l)}</span>`).join("")}</h1>
          <p class="w-tag rv rv-3" style="margin-top:4cqh">${esc(c.tagline)}</p>
          <div class="w-linedetails rv rv-4">
            <span>${esc(fmtDateShort(ev))}</span><span>${esc(timeStr)}</span><span>${esc(venue.toUpperCase())}</span>
          </div>
          <div class="inv-foot rv rv-5" style="color:var(--ink)">JALSA · RSVP BELOW</div>`;
      } else {
        el.innerHTML = `
          <div class="w-ghost" aria-hidden="true">${glyph}</div>
          <div class="w-kicker rv rv-1">${glyph}&ensp;YOU ARE INVITED</div>
          <h1 class="w-title rv rv-2">${esc(ev.title.toLowerCase().replace(/(^|\s)\S/g, m => m.toUpperCase()))}</h1>
          <div class="w-rule rv rv-3"></div>
          <p class="w-tag rv rv-3">${esc(c.tagline)}</p>
          <div class="w-details rv rv-4">
            <b>${esc(dateStr)}</b><br>${esc(timeStr)}<br>${esc(venue.toUpperCase())}
          </div>
          <div class="w-mark rv rv-5">जलसा</div>
          <div class="inv-foot rv rv-5" style="color:var(--ink)">JALSA · RSVP BELOW</div>`;
      }
    }

    /* ---------------- TIER 2 · FLEX ------------------------- */
    else if (c.tier === 2) {
      const badge = spinBadge("RSVP FAST ✦ LIMITED SPOTS ✦ RSVP FAST ✦ NO FLAKES ✦");
      const deco = c.layout === "marquee"
        ? `<div class="f-strip s1"><span>${(esc(ev.title) + " ✦ ").repeat(6)}</span></div>
           <div class="f-strip s2"><span>${(esc(fmtDateShort(ev)) + " · " + esc(timeStr) + " · BE THERE · ").repeat(5)}</span></div>`
        : `<div class="f-orb rv rv-wash"></div><div class="f-orb ring"></div><div class="f-orb mini"></div><div class="f-halftone"></div>`;
      el.innerHTML = `
        ${deco}
        <div class="f-coords rv rv-1">12.93°N 77.62°E<br>BLR / IN</div>
        <div class="f-kicker rv rv-1">${glyph} ${esc(dateStr)}</div>
        <div class="f-titlewrap">
          <div class="f-echo" aria-hidden="true">${esc(l1)}</div>
          <div class="f-line1 rv rv-2">${popOneWord(l1, "popword")}</div>
          ${l2 ? `<div class="f-line2 rv rv-3">${esc(l2)}</div>` : ""}
        </div>
        <p class="f-tag rv rv-3">${esc(c.tagline)}</p>
        <div class="f-details rv rv-4">
          <span class="hl">WHEN</span> ${esc(timeStr)}<br>
          <span class="hl">WHERE</span> ${esc(venue.toUpperCase())}<br>
          <span class="hl">DRESS</span> LIKE YOU MEAN IT
        </div>
        <div class="f-side rv rv-5">JALSA · THE INVITE IS THE EVENT</div>
        ${badge}`;
    }

    /* ---------------- TIER 3 · UNHINGED --------------------- */
    else {
      const textureText = (`${ev.title} ${dateStr} ${timeStr} ${venue} RSVP NOW NO MAYBES ` ).repeat(4);
      const details = `
        <div class="u-details rv rv-4">
          <span class="hl">${esc(timeStr)}</span><br>${esc(venue.toUpperCase())}<br>DOORS CLOSE NEVER
        </div>`;
      const texture = `<div class="u-texture rv rv-5" aria-hidden="true">${esc(textureText)}</div>`;
      const kicker = `<div class="u-kicker rv rv-1">${glyph} THIS IS NOT A DRILL</div>`;
      const side = `<div class="u-side rv rv-4">${esc(dateStr)}</div>`;

      if (c.layout === "wall") {
        el.innerHTML = `
          ${wallHTML(ev.title, 10)}
          ${kicker}
          <div class="u-block">
            ${esc(ev.title)}
            <span class="sub">${esc(fmtDateShort(ev))} · ${esc(timeStr)} · ${esc(venue.toUpperCase())}</span>
          </div>
          <p class="u-tag rv rv-3">${esc(c.tagline)}</p>
          ${spinBadge("FULL SEND ✦ NO MAYBES ✦ FULL SEND ✦ BE THERE ✦")}
          ${texture}
          ${details}`;
      }
      else if (c.layout === "y2k") {
        el.innerHTML = `
          <div class="u-grid" aria-hidden="true"></div>
          ${kicker}
          <h1 class="u-title">${popOneWord(l1, "alt")}<br>${esc(l2)}</h1>
          <p class="u-tag rv rv-3">${esc(c.tagline)}</p>
          <div class="u-star" aria-hidden="true">✶</div>
          <div class="u-slash" aria-hidden="true"></div>
          ${side}
          <div class="u-barcode rv rv-5" aria-hidden="true"></div>
          ${texture}
          ${details}`;
      }
      else { // chaos
        el.innerHTML = `
          ${wallHTML(ev.title, 8)}
          ${kicker}
          <div class="u-echo" aria-hidden="true">${esc(l1)}<br>${esc(l2)}</div>
          <div class="u-echo e2" aria-hidden="true">${esc(l1)}<br>${esc(l2)}</div>
          <h1 class="u-title">${popOneWord(l1, "alt")}<br>${esc(l2)}</h1>
          <p class="u-tag rv rv-3">${esc(c.tagline)}</p>
          <div class="u-tape" aria-hidden="true"></div>
          <div class="u-burst rv rv-3">FULL<br>SEND</div>
          ${side}
          <div class="u-barcode rv rv-5" aria-hidden="true"></div>
          ${texture}
          ${details}`;
      }
    }

    return el;
  }

  /* Feed-card hero: a compact styled banner driven by the concept */
  function heroStyle(concept) {
    const p = concept.pal;
    if (concept.tier === 1) {
      return `background:linear-gradient(160deg,${p.bg},${p.bg} 70%,${hexA(p.a, .35)});color:${p.ink}`;
    }
    if (concept.tier === 2) {
      return `background:radial-gradient(90% 120% at 85% -10%,${hexA(p.a, .55)},transparent 55%),radial-gradient(70% 90% at 0% 110%,${hexA(p.pop || p.a, .22)},transparent 60%),${p.bg};color:${p.ink}`;
    }
    return `background:radial-gradient(80% 100% at 50% 120%,${hexA(p.a, .4)},transparent 60%),${p.bg};color:${p.ink}`;
  }

  function heroTitleStyle(concept) {
    if (concept.tier === 1) return `font-family:'Playfair Display',serif;font-style:italic;font-weight:600`;
    if (concept.tier === 2) return `font-family:'Syne',sans-serif;font-weight:800;letter-spacing:-.02em`;
    return `font-family:'Bebas Neue',sans-serif;font-weight:400;font-size:42px;color:${concept.pal.a};text-shadow:2px 2px 0 ${concept.pal.pop || "#000"}`;
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  return { render, heroStyle, heroTitleStyle, esc, fmtDate };
})();
