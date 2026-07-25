/* ============================================================
   JALSA — app
   ============================================================ */

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = Templates.esc;
  const screen = $("#screen");
  const tabbar = $("#tabbar");
  const overlayRoot = $("#overlay-root");

  let S = Store.load();
  let currentNav = "feed";

  /* ============================ utils ======================== */
  function haptic(p = 12) { if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} }

  function toast(msg, ms = 2600) {
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<span class="dot"></span><span>${msg}</span>`;
    $("#toast-root").appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 320); }, ms);
  }

  function burst(host, n = 14) {
    const b = document.createElement("div");
    b.className = "burst";
    for (let i = 0; i < n; i++) {
      const p = document.createElement("i");
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const dist = 34 + Math.random() * 46;
      p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      p.style.setProperty("--dy", Math.sin(ang) * dist + "px");
      b.appendChild(p);
    }
    host.appendChild(b);
    setTimeout(() => b.remove(), 750);
  }

  function timeAgo(ts) {
    const s = (Date.now() - ts) / 1000;
    if (s < 90) return "just now";
    if (s < 3600) return Math.round(s / 60) + "m ago";
    if (s < 86400) return Math.round(s / 3600) + "h ago";
    return Math.round(s / 86400) + "d ago";
  }

  function countdown(ev) {
    const target = new Date(ev.date + "T" + (ev.time || "19:00"));
    const diff = target - new Date();
    if (diff < 0 && diff > -4 * 36e5) return "LIVE";
    if (diff < 0) return null;
    const d = Math.floor(diff / 864e5), h = Math.floor((diff % 864e5) / 36e5), m = Math.floor((diff % 36e5) / 6e4);
    if (d > 0) return `${d}D ${h}H`;
    if (h > 0) return `${h}H ${m}M`;
    return `${m}M ⚡`;
  }

  function whenLine(ev) {
    const d = new Date(ev.date + "T00:00");
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) + " · " + Engine.formatTime(ev.time);
  }

  function goingCount(ev) { return ev.rsvps.filter(r => r.status === "yes").length + (S.myRsvps[ev.id] === "yes" ? 1 : 0); }

  function avatarHTML(r, i) {
    return `<div class="av" style="background:hsl(${r.hue} 62% 46%);animation-delay:${i * 60}ms">${esc(r.name[0])}</div>`;
  }

  /* ============================ nav ========================== */
  function nav(to) {
    if (to === "create") { openCreate(); return; }
    currentNav = to;
    $$(".tab", tabbar).forEach(t => t.classList.toggle("active", t.dataset.nav === to));
    const renderers = { feed: renderFeed, discover: renderDiscover, memories: renderMemories, pulse: renderPulse, profile: renderProfile };
    (renderers[to] || renderFeed)();
  }

  tabbar.addEventListener("click", e => {
    const btn = e.target.closest("[data-nav]");
    if (!btn) return;
    haptic(8);
    nav(btn.dataset.nav);
  });

  function setScreen(html) {
    screen.onclick = null;
    screen.innerHTML = html;
    screen.scrollTop = 0;
    screen.classList.remove("screen-enter");
    void screen.offsetWidth;
    screen.classList.add("screen-enter");
  }

  /* ============================ overlays ===================== */
  function openOverlay(html) {
    const ov = document.createElement("div");
    ov.className = "overlay";
    ov.innerHTML = html;
    overlayRoot.appendChild(ov);
    return ov;
  }
  function closeOverlay(ov) {
    ov.classList.add("closing");
    setTimeout(() => ov.remove(), 300);
  }
  window.addEventListener("keydown", e => {
    if (e.key === "Escape") { const ov = overlayRoot.lastElementChild; if (ov) closeOverlay(ov); }
  });

  const backBtn = `<button class="icon-btn" data-close aria-label="Back"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>`;

  /* ============================================================
     ONBOARDING
     ============================================================ */
  const VIBES = [
    { id: "host", em: "🎪", nm: "The Planner", ds: "You make things happen. Constantly." },
    { id: "chaos", em: "⚡", nm: "Chaos Agent", ds: "Loud plans, louder execution." },
    { id: "soft", em: "🌿", nm: "Soft Launch", ds: "Intimate > everything." },
    { id: "filmy", em: "🎬", nm: "Full Filmy", ds: "Every event is a production." },
    { id: "foodie", em: "🍛", nm: "Khaana First", ds: "The menu IS the event." },
    { id: "afterdark", em: "🌙", nm: "After Dark", ds: "Nothing good starts before 9." },
  ];

  function renderOnboard(step = 0) {
    tabbar.classList.add("hidden");
    if (step === 0) {
      setScreen(`
        <div class="onboard">
          <div class="ob-word">
            <span class="row"><span>Your</span></span>
            <span class="row"><span>moments</span></span>
            <span class="row"><span>live here.</span></span>
          </div>
          <div class="ob-dev">जलसा — noun. celebration, gathering, the vibe of a good time.</div>
          <p class="ob-sub">Your people deserve better than a WhatsApp forward. AI-designed invites. Real RSVPs. Zero chaos.</p>
          <div class="ob-foot">
            <button class="btn btn-ember" id="ob-next">Shuru karein <span style="font-size:18px">→</span></button>
          </div>
        </div>`);
      $("#ob-next").onclick = () => { haptic(); renderOnboard(1); };
    }
    else if (step === 1) {
      setScreen(`
        <div class="onboard">
          <div class="ob-step">
            <div class="wordmark">JALSA<span class="dev">जलसा</span></div>
            <h2>What do your friends call you?</h2>
            <p class="hint">This goes on every invite you make. Choose wisely.</p>
            <input class="ob-name" id="ob-name" maxlength="18" placeholder="Priya" autocomplete="off">
          </div>
          <div class="ob-foot">
            <button class="btn btn-ember" id="ob-next" disabled>That's me</button>
          </div>
        </div>`);
      const inp = $("#ob-name"), btn = $("#ob-next");
      inp.focus();
      inp.oninput = () => { btn.disabled = inp.value.trim().length < 2; };
      btn.onclick = () => {
        S.profile.name = inp.value.trim();
        Store.save(); haptic(); renderOnboard(2);
      };
      inp.onkeydown = e => { if (e.key === "Enter" && !btn.disabled) btn.click(); };
    }
    else {
      setScreen(`
        <div class="onboard">
          <div class="ob-step">
            <div class="wordmark">JALSA<span class="dev">जलसा</span></div>
            <h2>Pick your energy, ${esc(S.profile.name)}.</h2>
            <p class="hint">Choose up to 3. The invite engine reads this — your designs start where your taste lives.</p>
            <div class="vibegrid" id="vibes">
              ${VIBES.map(v => `<button class="vibecard" data-v="${v.id}"><span class="em">${v.em}</span><span class="nm">${v.nm}</span><span class="ds">${v.ds}</span></button>`).join("")}
            </div>
          </div>
          <div class="ob-foot">
            <button class="btn btn-ember" id="ob-done" disabled>Enter the jalsa</button>
          </div>
        </div>`);
      const picked = new Set();
      $("#vibes").onclick = e => {
        const c = e.target.closest(".vibecard"); if (!c) return;
        const id = c.dataset.v;
        if (picked.has(id)) { picked.delete(id); c.classList.remove("on"); }
        else if (picked.size < 3) { picked.add(id); c.classList.add("on"); haptic(6); }
        $("#ob-done").disabled = picked.size === 0;
      };
      $("#ob-done").onclick = () => {
        S.profile.vibes = [...picked];
        S.profile.onboarded = true;
        Store.save(); haptic([20, 40, 20]);
        tabbar.classList.remove("hidden");
        nav("feed");
        setTimeout(() => toast(`Welcome in, ${esc(S.profile.name)}. Your circle awaits.`), 500);
      };
    }
  }

  /* ============================================================
     FEED  (Scene)
     ============================================================ */
  function renderFeed() {
    const up = Store.upcoming();
    const tick = "KAL JALSA HAI ✦ THE INVITE IS THE EVENT ✦ YOUR CIRCLE ONLY ✦ NO ALGORITHM ✦ ";
    setScreen(`
      <div class="apphead">
        <div>
          <h1>The Scene</h1>
          <div class="sub">Bengaluru · your circle only</div>
        </div>
        <div class="head-right">
          <button class="bell" id="pulse-bell" aria-label="Pulse">
            <svg viewBox="0 0 24 24"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>
            ${S.pulse.length ? `<span class="bell-dot"></span>` : ""}
          </button>
          <div class="wordmark">JALSA<span class="dev">जलसा</span></div>
        </div>
      </div>
      <div class="ticker"><div class="ticker-inner">${tick.repeat(2)}</div></div>
      <div class="feed" id="feed">
        ${up.length ? up.map((ev, i) => feedCard(ev, i)).join("") : `
          <div class="empty">
            <div class="big">Nothing here yet.</div>
            <p>Fix that. Tap <b style="color:var(--ember)">+</b> and make something worth showing up for.</p>
          </div>`}
      </div>`);
    bindFeed();
    startCountdowns();
    const bell = $("#pulse-bell");
    if (bell) bell.onclick = () => { haptic(8); openPulseOverlay(); };
  }

  function feedCard(ev, i) {
    const c = ev.concept;
    const my = S.myRsvps[ev.id];
    const cd = countdown(ev);
    const yes = ev.rsvps.filter(r => r.status === "yes");
    const spotsLeft = ev.capacity ? ev.capacity - goingCount(ev) : null;
    return `
    <article class="feedcard" style="--i:${i}" data-ev="${ev.id}">
      <button class="fc-hero" data-open="${ev.id}" style="${Templates.heroStyle(c)};width:100%;text-align:left;display:flex;flex-direction:column;justify-content:space-between">
        <span class="fc-type">${ev.glyph} ${esc(Engine.TYPES[ev.typeKey]?.label || "Jalsa")} · by ${esc(ev.hostName)}${ev.isMine ? " (you)" : ""}</span>
        <span>
          <span class="fc-title" style="${Templates.heroTitleStyle(c)}">${esc(ev.title)}</span>
          <span class="fc-tag" style="display:block">${esc(ev.tagline)}</span>
        </span>
        ${cd === "LIVE" ? `<span class="fc-live">● LIVE NOW</span>` : cd ? `<span class="fc-countdown" data-cd="${ev.id}">${cd}</span>` : ""}
      </button>
      <div class="fc-body">
        <div class="fc-meta">
          <span>🗓 <b>${whenLine(ev)}</b></span>
          <span>📍 <b>${esc(ev.venue || "TBD")}</b></span>
          ${ev.audience && ev.audience.mode === "some" ? `<span class="fc-private">🔒 ${ev.audience.names.length ? esc(ev.audience.names.slice(0, 2).join(", ")) + (ev.audience.names.length > 2 ? ` +${ev.audience.names.length - 2}` : "") : "Chosen ones"}</span>` : ""}
          ${spotsLeft !== null && spotsLeft <= 5 && spotsLeft > 0 ? `<span style="color:var(--ember)">🔥 ${spotsLeft} spots left. You know what to do.</span>` : ""}
        </div>
        <div class="fc-foot">
          <div style="display:flex;align-items:center">
            <div class="avstack">${yes.slice(0, 4).map(avatarHTML).join("")}${yes.length > 4 ? `<div class="avmore">+${yes.length - 4}</div>` : ""}</div>
            <span class="going-label"><b>${goingCount(ev)}</b> in${ev.capacity ? ` / ${ev.capacity}` : ""}</span>
          </div>
          ${ev.isMine
            ? `<button class="btn btn-ghost btn-sm" data-host="${ev.id}">Host desk →</button>`
            : rsvpRow(ev, my, true)}
        </div>
      </div>
    </article>`;
  }

  function rsvpRow(ev, my, compact = false) {
    const full = ev.capacity && goingCount(ev) >= ev.capacity && my !== "yes";
    const yesLabel = full ? "Waitlist" : "I'm in";
    return `
      <div class="rsvp-row" style="${compact ? "min-width:210px" : ""}">
        <button class="rsvp-btn ${my === "yes" ? "sel-yes" : my === "wait" ? "sel-wait" : my ? "dim" : ""}" data-rsvp="yes" data-ev="${ev.id}">
          ${my === "yes" ? "In ✓" : my === "wait" ? "Waitlisted" : yesLabel}
        </button>
        <button class="rsvp-btn ${my === "maybe" ? "sel-maybe" : my ? "dim" : ""}" data-rsvp="maybe" data-ev="${ev.id}">
          ${my === "maybe" ? "Hmm…" : "Maybe"}
        </button>
        <button class="rsvp-btn ${my === "no" ? "sel-no" : my ? "dim" : ""}" data-rsvp="no" data-ev="${ev.id}">
          ${my === "no" ? "Out" : "Can't"}
        </button>
      </div>`;
  }

  function bindFeed(root = screen) {
    root.onclick = e => {
      const open = e.target.closest("[data-open]");
      if (open) { openInvite(open.dataset.open); return; }
      const host = e.target.closest("[data-host]");
      if (host) { openHost(host.dataset.host); return; }
      const rs = e.target.closest("[data-rsvp]");
      if (rs) { doRsvp(rs.dataset.ev, rs.dataset.rsvp, rs); return; }
    };
  }

  let cdTimer = null;
  function startCountdowns() {
    clearInterval(cdTimer);
    cdTimer = setInterval(() => {
      $$("[data-cd]").forEach(el => {
        const ev = Store.ev(el.dataset.cd);
        if (ev) { const c = countdown(ev); if (c) el.textContent = c; }
      });
    }, 30000);
  }

  /* ============================ rsvp logic =================== */
  function doRsvp(id, status, btnEl) {
    const ev = Store.ev(id);
    if (!ev) return;
    const prev = S.myRsvps[id];
    if (prev === status) { delete S.myRsvps[id]; Store.save(); refreshCurrent(); return; }

    if (status === "yes" && ev.capacity && goingCount(ev) >= ev.capacity) {
      S.myRsvps[id] = "wait";
      Store.save(); haptic([10, 30, 10, 30, 10]);
      toast(`Full house. You're #1 on the waitlist — spots open up, you're in.`);
      refreshCurrent(); return;
    }

    S.myRsvps[id] = status;
    Store.save();

    if (status === "yes") {
      haptic(35);
      if (btnEl) burst(btnEl);
      const lines = [
        `You're in. ${esc(ev.hostName)} is going to be insufferable about this.`,
        `Locked. Now don't be the "5 min away" person.`,
        `Confirmed. The vibe just improved measurably.`,
      ];
      toast(lines[Math.floor(Math.random() * lines.length)]);
      Store.addPulse(`<b>You</b> RSVP'd yes to <b>${esc(ev.title)}</b>`);
    } else if (status === "maybe") {
      haptic(12);
      toast(`Noted. "Maybe" means no and everyone knows it. 👀`);
    } else {
      haptic(8);
      toast(`Fair. ${esc(ev.hostName)} will recover. Eventually.`);
    }
    setTimeout(refreshCurrent, 120);
  }

  function refreshCurrent() {
    if (overlayRoot.children.length) return; // overlay handles its own refresh
    nav(currentNav);
  }

  /* ============================================================
     INVITE VIEWER — the reveal
     ============================================================ */
  function openInvite(id, { reveal = true } = {}) {
    const ev = Store.ev(id);
    if (!ev) return;
    const my = S.myRsvps[id];
    const paid = S.myPaid[id];
    const isPast = Store.isPast(ev);

    const ov = openOverlay(`
      <div class="viewer ov-scroll">
        <div class="invite-wrap" id="inv-slot"></div>
        <div class="viewer-actions">
          ${backBtn}
          <button class="icon-btn" data-share aria-label="Share"><svg viewBox="0 0 24 24"><path d="M12 15V4m0 0L8 8m4-4 4 4"/><path d="M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"/></svg></button>
        </div>
        <div class="sheet detail-sheet">
          <div class="grab"></div>
          <div class="ds-title">${esc(ev.title)}</div>
          <div class="ds-host">hosted by <b style="color:var(--pearl)">${esc(ev.hostName)}${ev.isMine ? " (you)" : ""}</b> · ${goingCount(ev)} going${ev.capacity ? ` · ${Math.max(0, ev.capacity - goingCount(ev))} spots left` : ""}</div>

          <div class="ds-grid">
            <div class="ds-cell tap" data-ics>
              <div class="k">When · tap to save</div>
              <div class="v">${whenLine(ev)} <span class="go">＋ CAL</span></div>
            </div>
            <div class="ds-cell tap" data-maps>
              <div class="k">Where · tap for maps</div>
              <div class="v">${esc(ev.venue || "Location drops soon")} <span class="go">↗ MAP</span></div>
            </div>
          </div>

          ${ev.upiAmount ? `
          <div class="upi-card">
            <div class="amt">₹${ev.upiAmount}</div>
            <div class="why">per head · collected upfront so nobody chases anybody.<br><span style="font-family:var(--font-mono);font-size:9px;letter-spacing:.08em">THE VENUE DOES NOT ACCEPT VIBES AS PAYMENT.</span></div>
            <button class="pay ${paid ? "done" : ""}" data-pay>${paid ? "PAID ✓" : "PAY UPI"}</button>
          </div>` : ""}

          ${ev.updates.length ? `
            <div class="section-label">Updates from ${esc(ev.hostName)}</div>
            ${ev.updates.map(u => `<div class="updatecard">${esc(u.text)}<div class="when">${timeAgo(u.at)}</div></div>`).join("")}
          ` : ""}

          ${isPast
            ? `<button class="btn btn-ghost" data-album style="margin-top:8px">Open the memory album →</button>`
            : ev.isMine
              ? `<button class="btn btn-ember" data-hostdesk style="margin-top:8px">Open host desk</button>`
              : `<div class="section-label">Your answer</div>${rsvpRow(ev, my)}`
          }
          <div class="spacer"></div>
          <button class="btn btn-line" data-share>Share on WhatsApp — the invite does the talking</button>
          <div class="spacer"></div>
        </div>
      </div>`);

    // render the invite artwork (query by class, not id — a closing overlay
    // may still hold a duplicate #inv-slot while it animates out)
    const slot = ov.querySelector(".invite-wrap");
    const invEl = Templates.render(ev, ev.concept, { reveal });
    slot.appendChild(invEl);
    haptic(reveal ? [8, 60, 8] : 6);

    ov.onclick = e => {
      if (e.target.closest("[data-close]")) { closeOverlay(ov); refreshCurrent(); return; }
      if (e.target.closest("[data-share]")) { shareEvent(ev); return; }
      if (e.target.closest("[data-ics]")) { downloadICS(ev); return; }
      if (e.target.closest("[data-maps]")) { openMaps(ev); return; }
      if (e.target.closest("[data-pay]")) { payUPI(ev, e.target.closest("[data-pay]")); return; }
      if (e.target.closest("[data-album]")) { closeOverlay(ov); openAlbum(ev.id); return; }
      if (e.target.closest("[data-hostdesk]")) { closeOverlay(ov); openHost(ev.id); return; }
      const rs = e.target.closest("[data-rsvp]");
      if (rs) {
        doRsvp(rs.dataset.ev, rs.dataset.rsvp, rs);
        closeOverlay(ov); openInvite(id, { reveal: false });
      }
    };
  }

  /* ---------------- external actions ------------------------- */
  function inviteURL(ev) {
    // self-contained link: the whole invite rides in the hash, no backend needed
    const base = location.origin && location.origin !== "null"
      ? location.origin + location.pathname
      : "https://jalsa.app/i";
    return base + "#i=" + Store.encodeEvent(ev);
  }

  function cloudURL(code) {
    const base = location.origin && location.origin !== "null"
      ? location.origin + location.pathname
      : "https://jalsa.app/i";
    return base + "#e=" + code;
  }

  function shareEvent(ev) {
    haptic(10);
    // Prefer a live cloud link so the invite + headcount work across phones.
    // The code is the slug (known now), so the link is ready immediately and we
    // publish in the background. Falls back to the self-contained #i= link.
    let link = inviteURL(ev);
    if (Cloud.enabled && ev.slug) {
      ev.cloudId = ev.slug;
      if (ev.isMine) Store.save();
      Cloud.publish(ev);
      link = cloudURL(ev.slug);
    }
    const text = Engine.shareText(ev, S.profile.name, link);
    if (navigator.share) {
      navigator.share({ title: ev.title, text }).catch(() => {});
      return;
    }
    window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
    navigator.clipboard?.writeText(text).then(() => toast("Invite copied too — paste anywhere.")).catch(() => {});
  }

  function downloadICS(ev) {
    const dt = new Date(ev.date + "T" + (ev.time || "19:00"));
    const end = new Date(dt.getTime() + 3 * 36e5);
    const f = d => d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//JALSA//EN", "BEGIN:VEVENT",
      `UID:${ev.slug}@jalsa.app`, `DTSTART:${f(dt)}`, `DTEND:${f(end)}`,
      `SUMMARY:${ev.title}`, `DESCRIPTION:${ev.tagline} — RSVP'd on JALSA`, `LOCATION:${ev.venue || ""}`,
      "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = ev.slug + ".ics";
    a.click();
    toast("Calendar file saved. No excuses now.");
    haptic(10);
  }

  function openMaps(ev) {
    if (!ev.venue) { toast("Location drops soon. Patience."); return; }
    window.open("https://www.google.com/maps/search/" + encodeURIComponent(ev.venue + " Bengaluru"), "_blank");
  }

  function payUPI(ev, btn) {
    if (S.myPaid[ev.id]) return;
    const vpa = ev.upiId || "jalsa@upi";
    const url = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(ev.hostName + " via JALSA")}&am=${ev.upiAmount}&cu=INR&tn=${encodeURIComponent(ev.title)}`;
    // attempt deep link (works on phones with UPI apps)
    location.href = url;
    setTimeout(() => {
      S.myPaid[ev.id] = true; Store.save();
      if (btn) { btn.textContent = "PAID ✓"; btn.classList.add("done"); burst(btn); }
      haptic([15, 40, 15]);
      toast(`₹${ev.upiAmount} marked paid. ${esc(ev.hostName)} says thanks (for once).`);
    }, 900);
  }

  /* ============================================================
     CREATE FLOW
     ============================================================ */
  const PLACEHOLDERS = [
    "rooftop birthday, 20 people, sunset vibes, we're going to be loud",
    "chill Sunday coffee + books at Dyu, 6 of us max",
    "Holi at the farmhouse!! wear white, full chaos",
    "farewell dinner for Sana, she's moving to Bombay :(",
    "FIFA night at my place, loser buys biryani",
  ];

  function openCreate() {
    let brief = null, picked = 0, reroll = 0, lastText = "";
    let customTitle = null;                 // manual title override
    let origSnapshot = null;                // pristine design, for "reset"
    let audience = { mode: "all", names: [] };

    const ov = openOverlay(`
      <div class="ov-top">${backBtn}<span class="ov-title">New Jalsa</span><span style="width:40px"></span></div>
      <div class="ov-scroll"><div id="create-stage"></div></div>`);
    const stage = $("#create-stage", ov);
    ov.querySelector("[data-close]").onclick = () => closeOverlay(ov);

    stepDescribe();

    /* ---- step 1 : describe ---------------------------------- */
    function stepDescribe() {
      stage.innerHTML = `
        <div class="create-body">
          <h2 class="create-h">Describe it like you'd<br>text it. <span style="color:var(--ember)">We design it.</span></h2>
          <p class="create-sub">No forms. No dropdowns. Type the vibe — the engine reads event type, energy, and crowd, then designs three invites.</p>
          <div class="describe-box">
            <textarea id="desc" maxlength="280" placeholder="${PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]}"></textarea>
            <div class="vibe-read" id="vibe-read"><span class="lab">VIBE READ —</span><span style="color:var(--slate)">start typing…</span></div>
          </div>
          <div class="section-label">or start from a classic</div>
          <div class="chiprow scroll" id="typechips">
            ${Object.entries(Engine.TYPES).filter(([k]) => k !== "generic").slice(0, 12).map(([k, d]) =>
              `<button class="chip" data-t="${k}">${d.glyph} ${d.label}</button>`).join("")}
          </div>
          <div class="spacer"></div><div class="spacer"></div>
          <button class="btn btn-ember" id="gen-btn" disabled>Design my invite ✦</button>
          <p class="mic-note">FREE TEXT IN · DESIGNED INVITE OUT · 12 SECONDS</p>
        </div>`;
      const ta = $("#desc", stage), gen = $("#gen-btn", stage), vr = $("#vibe-read", stage);
      if (lastText) { ta.value = lastText; updateRead(); }
      ta.focus();
      ta.oninput = updateRead;
      function updateRead() {
        lastText = ta.value;
        gen.disabled = ta.value.trim().length < 6;
        const toks = Engine.read(ta.value);
        vr.innerHTML = `<span class="lab">VIBE READ —</span>` +
          (toks.length ? toks.map(t => `<span class="tok">${esc(t)}</span>`).join("") : `<span style="color:var(--slate)">start typing…</span>`);
      }
      $("#typechips", stage).onclick = e => {
        const c = e.target.closest(".chip"); if (!c) return;
        const d = Engine.TYPES[c.dataset.t];
        ta.value = (d.label.toLowerCase() + ", " + (ta.value || "")).replace(/, $/, "");
        updateRead(); ta.focus(); haptic(6);
      };
      gen.onclick = () => { haptic(12); stepGenerate(ta.value.trim()); };
    }

    /* ---- step 2 : generation theatre ------------------------- */
    function stepGenerate(text) {
      const taste = tasteTier();
      brief = Engine.generate(text, { tasteTier: taste, reroll });
      stage.innerHTML = `
        <div class="gen-theatre">
          <div class="gen-orb"></div>
          <div class="gen-word" id="gen-word">Reading the vibe…</div>
          <div class="gen-line" id="gen-line">&nbsp;</div>
        </div>`;
      const lines = [
        [`Reading the vibe…`, ``],
        [`Type locked.`, `${brief.glyph} ${brief.typeLabel.toUpperCase()}`],
        [`Mixing palette…`, brief.concepts[0].pal.name.toUpperCase()],
        [`Kerning aggressively.`, `TRACKING +${80 + (brief.energy + 3) * 20}`],
        [`Adding grain.`, `THEN MORE GRAIN`],
        [`Rendering…`, `3 CONCEPTS · 3 STUDIOS`],
      ];
      let i = 0;
      const word = $("#gen-word", stage), line = $("#gen-line", stage);
      const iv = setInterval(() => {
        i++;
        if (i >= lines.length) { clearInterval(iv); stepConcepts(text); return; }
        word.textContent = lines[i][0];
        line.innerHTML = lines[i][1] ? `<b>${esc(lines[i][1])}</b>` : "&nbsp;";
        haptic(4);
      }, 620);
    }

    /* ---- step 3 : pick a concept ----------------------------- */
    function stepConcepts(text) {
      picked = 0;
      origSnapshot = null;      // fresh designs → drop any prior customisation snapshot
      customTitle = null;
      const draft = draftEvent(text);
      stage.innerHTML = `
        <div class="concepts">
          <div class="create-body" style="padding-bottom:4px">
            <h2 class="create-h">Here's what we made.</h2>
            <p class="create-sub">Change everything or nothing. Three reads on your vibe — swipe, pick one.</p>
          </div>
          <div class="concept-strip" id="strip">
            ${brief.concepts.map((c, i) => `
              <button class="concept-card ${i === 0 ? "picked" : ""}" data-c="${i}">
                <div class="concept-frame" data-frame="${i}"></div>
                <div class="concept-label">
                  <span class="tiername t-${c.tierName.toLowerCase()}">◆ ${c.tierName} · ${esc(c.pal.name)}</span>
                  <span class="pickmark">${i === 0 ? "PICKED ✓" : "TAP TO PICK"}</span>
                </div>
              </button>`).join("")}
          </div>
          <div class="create-body" style="padding-top:2px">
            <button class="btn btn-ember" id="use-btn">Use this one →</button>
            <div class="spacer"></div>
            <button class="btn btn-line" id="reroll-btn">↻ None of these — remix all three</button>
          </div>
        </div>`;

      // mount scaled invite previews
      brief.concepts.forEach((c, i) => {
        const frame = $(`[data-frame="${i}"]`, stage);
        const inv = Templates.render(draft, c);
        frame.appendChild(inv);
        requestAnimationFrame(() => {
          const s = frame.clientWidth / 340;
          inv.style.transform = `scale(${s})`;
        });
      });

      $("#strip", stage).onclick = e => {
        const card = e.target.closest(".concept-card"); if (!card) return;
        picked = +card.dataset.c;
        $$(".concept-card", stage).forEach((el, i) => {
          el.classList.toggle("picked", i === picked);
          $(".pickmark", el).textContent = i === picked ? "PICKED ✓" : "TAP TO PICK";
        });
        haptic(8);
      };
      $("#use-btn", stage).onclick = () => {
        S.profile.tierPicks[brief.concepts[picked].tier]++;
        Store.save(); haptic(14);
        stepCustomize(text);
      };
      $("#reroll-btn", stage).onclick = () => { reroll += 17; haptic(8); stepGenerate(text); };
    }

    function draftEvent(text) {
      return {
        title: brief.title, tagline: brief.concepts[0].tagline, typeKey: brief.typeKey,
        glyph: brief.glyph, date: Store.dayOffset(7).date, time: brief.timeHint === "AM" ? "11:00" : brief.timeHint === "SUNSET" ? "17:30" : brief.timeHint === "LATE" ? "21:30" : "19:30",
        venue: "", desc: text,
      };
    }

    /* ---- step 3.5 : make it yours (manual editor) ------------ */
    function colourInput(key, label, val) {
      const v = hex6(val);
      return `<label class="swatch">
        <input type="color" data-k="${key}" value="${v}">
        <span class="sw-lab">${label}</span><span class="hex">${v.toUpperCase()}</span>
      </label>`;
    }

    function stepCustomize(text) {
      const c = brief.concepts[picked];        // edited in place
      const d = draftEvent(text);
      if (customTitle == null) customTitle = brief.title;
      if (!origSnapshot) origSnapshot = JSON.parse(JSON.stringify({ pal: c.pal, tagline: c.tagline, title: brief.title }));

      stage.innerHTML = `
        <div class="create-body" style="padding-bottom:4px">
          <h2 class="create-h">Make it <span style="color:var(--ember)">yours</span>.</h2>
          <p class="create-sub">Edit the words, tune the colours, or drop an inspo pic and we'll pull a palette from it.</p>
        </div>
        <div class="editor">
          <div class="editor-preview"><div class="ed-frame" id="ed-frame"></div></div>
          <div class="editor-controls">
            <div class="field"><label>Title</label><input id="ed-title" maxlength="40" value="${esc(customTitle)}"></div>
            <div class="field"><label>Tagline</label><input id="ed-tag" maxlength="60" value="${esc(c.tagline)}"></div>
            <div class="section-label">Colours</div>
            <div class="swatch-row" id="ed-colours">
              ${colourInput("bg", "Background", c.pal.bg)}
              ${colourInput("ink", "Text", c.pal.ink)}
              ${colourInput("a", "Accent", c.pal.a)}
              ${colourInput("pop", "Highlight", c.pal.pop || c.pal.a)}
            </div>
            <div class="section-label">Inspiration</div>
            <label class="inspo-drop">
              <input type="file" id="inspo-file" accept="image/*" hidden>
              <span id="inspo-label">＋ Add an inspo picture — we'll suggest a palette</span>
            </label>
            <div class="inspo-suggest" id="inspo-suggest" hidden></div>
          </div>
        </div>
        <div class="create-body" style="padding-top:0">
          <button class="btn btn-ember" id="ed-next">Next — the details →</button>
          <div class="spacer"></div>
          <button class="btn btn-line" id="ed-reset">↺ Back to the original design</button>
        </div>`;

      const frame = $("#ed-frame", stage);
      function repaint() {
        frame.innerHTML = "";
        const preview = Object.assign({}, d, { title: (customTitle || "").toUpperCase() || "YOUR JALSA" });
        const inv = Templates.render(preview, c);
        frame.appendChild(inv);
        requestAnimationFrame(() => { inv.style.transform = `scale(${frame.clientWidth / 340})`; });
      }
      repaint();

      $("#ed-title", stage).oninput = e => { customTitle = e.target.value; repaint(); };
      $("#ed-tag", stage).oninput = e => { c.tagline = e.target.value; repaint(); };
      $("#ed-colours", stage).oninput = e => {
        const key = e.target.dataset.k; if (!key) return;
        c.pal[key] = e.target.value;
        const lab = e.target.parentElement.querySelector(".hex"); if (lab) lab.textContent = e.target.value.toUpperCase();
        repaint();
      };

      function syncColourInputs() {
        [["bg", c.pal.bg], ["ink", c.pal.ink], ["a", c.pal.a], ["pop", c.pal.pop]].forEach(([k, v]) => {
          const inp = stage.querySelector(`input[data-k="${k}"]`);
          if (inp) { inp.value = hex6(v); const lab = inp.parentElement.querySelector(".hex"); if (lab) lab.textContent = hex6(v).toUpperCase(); }
        });
      }

      const fileIn = $("#inspo-file", stage);
      fileIn.onchange = () => {
        const f = fileIn.files && fileIn.files[0]; if (!f) return;
        $("#inspo-label", stage).textContent = "Reading colours…";
        extractPalette(f).then(cols => {
          const [bg, ink, a, pop] = mapInspo(cols);
          const box = $("#inspo-suggest", stage); box.hidden = false;
          box.innerHTML = `
            <div class="inspo-swatches">${cols.map(h => `<span style="background:${h}"></span>`).join("")}</div>
            <p class="inspo-note">Pulled from your pic — a <b style="color:${a}">${a.toUpperCase()}</b> accent over <b>${bg.toUpperCase()}</b>.</p>
            <button class="btn btn-ghost" id="inspo-apply">Apply this palette →</button>`;
          $("#inspo-label", stage).textContent = "✓ Palette ready below";
          $("#inspo-apply", stage).onclick = () => {
            c.pal.bg = bg; c.pal.ink = ink; c.pal.a = a; c.pal.pop = pop;
            syncColourInputs(); repaint(); haptic(14);
            toast("Palette applied from your inspo pic.");
          };
        }).catch(() => { $("#inspo-label", stage).textContent = "Couldn't read that image — try another"; });
      };

      $("#ed-next", stage).onclick = () => { haptic(12); stepDetails(text); };
      $("#ed-reset", stage).onclick = () => {
        c.pal = JSON.parse(JSON.stringify(origSnapshot.pal));
        c.tagline = origSnapshot.tagline;
        customTitle = origSnapshot.title;
        haptic(8); stepCustomize(text);
      };
    }

    /* pull a small dominant-colour palette out of an uploaded image */
    function extractPalette(file) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            const cv = document.createElement("canvas");
            const w = cv.width = 64, h = cv.height = 64;
            const ctx = cv.getContext("2d");
            ctx.drawImage(img, 0, 0, w, h);
            const data = ctx.getImageData(0, 0, w, h).data;
            const buckets = {};
            for (let i = 0; i < data.length; i += 4) {
              if (data[i + 3] < 125) continue;
              const key = (data[i] >> 5) + "," + (data[i + 1] >> 5) + "," + (data[i + 2] >> 5);
              const bk = buckets[key] || (buckets[key] = { n: 0, r: 0, g: 0, b: 0 });
              bk.n++; bk.r += data[i]; bk.g += data[i + 1]; bk.b += data[i + 2];
            }
            const top = Object.values(buckets).sort((a, b) => b.n - a.n).slice(0, 6)
              .map(bk => rgbToHex(bk.r / bk.n, bk.g / bk.n, bk.b / bk.n));
            URL.revokeObjectURL(img.src);
            top.length ? resolve(top) : reject();
          } catch (e) { reject(e); }
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
    }

    /* map extracted colours to bg / ink / accent / pop, kept legible & dark */
    function mapInspo(cols) {
      const rgb = hexRgb, lum = h => { const [r, g, b] = rgb(h); return .2126 * r + .7152 * g + .0722 * b; };
      const sat = h => { const [r, g, b] = rgb(h); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };
      const byLum = [...cols].sort((a, b) => lum(a) - lum(b));
      const bySat = [...cols].sort((a, b) => sat(b) - sat(a));
      let bg = byLum[0];
      if (lum(bg) > 120) { const [r, g, b] = rgb(bg); bg = rgbToHex(r * .32, g * .32, b * .34); }  // force a dark canvas
      const light = byLum[byLum.length - 1];
      const ink = lum(light) > 190 ? light : "#FAF8F3";
      const a = bySat[0] || ink;
      const pop = bySat[1] || a;
      return [bg, ink, a, pop];
    }

    function hexRgb(h) { const n = parseInt(hex6(h).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    function rgbToHex(r, g, b) { return "#" + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join(""); }
    function hex6(v) {
      v = String(v || "").trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
      if (/^#[0-9a-fA-F]{3}$/.test(v)) return "#" + v.slice(1).split("").map(c => c + c).join("");
      return "#141018";
    }

    /* ---- step 4 : details ------------------------------------ */
    function stepDetails(text) {
      const d = draftEvent(text);
      const c = brief.concepts[picked];
      stage.innerHTML = `
        <div class="create-body">
          <h2 class="create-h">Lock the details.</h2>
          <p class="create-sub">The design is done. Now the logistics — this is the part WhatsApp always loses.</p>
          <div class="field"><label>Event name</label><input id="f-title" maxlength="40" value="${esc(customTitle || brief.title)}"></div>
          <div class="fieldrow">
            <div class="field"><label>Date</label><input id="f-date" type="date" value="${d.date}"></div>
            <div class="field"><label>Time</label><input id="f-time" type="time" value="${d.time}"></div>
          </div>
          <div class="field"><label>Where (venue / area)</label><input id="f-venue" maxlength="60" placeholder="Terrace, 4th Block Koramangala"></div>
          <div class="fieldrow">
            <div class="field"><label>Capacity (0 = open)</label><input id="f-cap" type="number" min="0" max="500" value="${brief.count || 0}"></div>
            <div class="field"><label>₹ per head (0 = free)</label><input id="f-upi" type="number" min="0" max="99999" value="0"></div>
          </div>
          <div class="field" id="upi-id-wrap" style="display:none"><label>Your UPI ID (money lands here)</label><input id="f-upiid" placeholder="yourname@oksbi"></div>
          <div class="section-label" style="margin:4px 0 10px">Who's it for?</div>
          <div class="aud-toggle" id="aud-toggle">
            <button class="aud-opt ${audience.mode === "all" ? "on" : ""}" data-m="all"><b>Everyone</b><span>your whole circle sees it</span></button>
            <button class="aud-opt ${audience.mode === "some" ? "on" : ""}" data-m="some"><b>Chosen ones</b><span>only people you pick</span></button>
          </div>
          <div class="aud-people" id="aud-people" ${audience.mode === "some" ? "" : "hidden"}>
            ${Store.FRIENDS.map(f => `<button class="aud-chip ${audience.names.includes(f.name) ? "on" : ""}" data-n="${esc(f.name)}"><i style="background:hsl(${f.hue} 70% 55%)"></i>${esc(f.name)}</button>`).join("")}
          </div>
          <button class="btn btn-ember" id="pub-btn">Publish the jalsa ✦</button>
        </div>`;
      const upiIn = $("#f-upi", stage);
      upiIn.oninput = () => { $("#upi-id-wrap", stage).style.display = +upiIn.value > 0 ? "block" : "none"; };
      $("#aud-toggle", stage).onclick = e => {
        const b = e.target.closest("[data-m]"); if (!b) return;
        audience.mode = b.dataset.m;
        $$(".aud-opt", stage).forEach(el => el.classList.toggle("on", el.dataset.m === audience.mode));
        $("#aud-people", stage).hidden = audience.mode !== "some";
        haptic(6);
      };
      $("#aud-people", stage).onclick = e => {
        const b = e.target.closest("[data-n]"); if (!b) return;
        const n = b.dataset.n, i = audience.names.indexOf(n);
        if (i >= 0) audience.names.splice(i, 1); else audience.names.push(n);
        b.classList.toggle("on"); haptic(5);
      };
      $("#pub-btn", stage).onclick = () => {
        const title = $("#f-title", stage).value.trim() || customTitle || brief.title;
        const ev = {
          id: Store.uid(), slug: Store.slugify(title),
          title: title.toUpperCase(), tagline: c.tagline, typeKey: brief.typeKey, glyph: brief.glyph,
          concept: c, date: $("#f-date", stage).value, time: $("#f-time", stage).value || "19:30",
          venue: $("#f-venue", stage).value.trim(), capacity: +$("#f-cap", stage).value || 0,
          upiAmount: +upiIn.value || 0, upiId: ($("#f-upiid", stage)?.value || "").trim(),
          hostName: S.profile.name || "You", isMine: true,
          audience: audience.mode === "some" ? { mode: "some", names: [...audience.names] } : { mode: "all" },
          rsvps: [], updates: [], photos: [], createdAt: Date.now(),
        };
        S.events.unshift(ev);
        S.myRsvps[ev.id] = "yes";
        Store.addPulse(`<b>You</b> dropped a new event — <b>${esc(ev.title)}</b>`);
        Store.save();
        haptic([20, 50, 20, 50, 40]);
        scheduleFriendRsvps(ev);
        stepPublished(ev);
      };
    }

    /* ---- step 5 : published ---------------------------------- */
    function stepPublished(ev) {
      const share = Engine.shareText(ev, S.profile.name, inviteURL(ev));
      stage.innerHTML = `
        <div class="pub-hero">
          <div class="big">It's live. 🔥</div>
          <p>The invite is out there being gorgeous. Every share on WhatsApp is the event starting early.</p>
        </div>
        <div class="sharecard">${esc(share).replace(/\*([^*]+)\*/g, "<b>$1</b>")}</div>
        <div class="create-body" style="padding-top:0">
          <button class="btn btn-ember" id="wa-btn">Share on WhatsApp</button>
          <div class="spacer"></div>
          <div class="actrow">
            <button class="btn btn-ghost" id="view-btn">See the invite</button>
            <button class="btn btn-ghost" id="copy-btn">Copy text</button>
          </div>
        </div>`;
      const heroEl = $(".pub-hero .big", stage);
      burst(heroEl, 18);
      $("#wa-btn", stage).onclick = () => shareEvent(ev);
      $("#copy-btn", stage).onclick = () => { navigator.clipboard?.writeText(share); toast("Copied. Go cause a stir."); haptic(8); };
      $("#view-btn", stage).onclick = () => { closeOverlay(ov); openInvite(ev.id); };
    }
  }

  function tasteTier() {
    const p = S.profile.tierPicks || { 1: 0, 2: 0, 3: 0 };
    let best = 0, bestT = null;
    for (const t of [1, 2, 3]) if (p[t] > best) { best = p[t]; bestT = t; }
    if (bestT) return bestT;
    const v = S.profile.vibes || [];
    if (v.includes("chaos") || v.includes("afterdark")) return 3;
    if (v.includes("soft")) return 1;
    return null;
  }

  /* ---- simulated circle: friends respond to your event ------- */
  function scheduleFriendRsvps(ev) {
    let pool = [...Store.FRIENDS];
    if (ev.audience && ev.audience.mode === "some") {
      pool = pool.filter(f => ev.audience.names.includes(f.name));   // only the chosen ones see it
    }
    pool = pool.sort(() => Math.random() - .5);
    if (!(ev.audience && ev.audience.mode === "some")) pool = pool.slice(0, 5 + Math.floor(Math.random() * 4));
    pool.forEach((f, i) => {
      setTimeout(() => {
        const cur = Store.ev(ev.id);
        if (!cur) return;
        if (cur.capacity && cur.rsvps.filter(r => r.status === "yes").length + 1 >= cur.capacity) return;
        const status = Math.random() < .78 ? "yes" : "maybe";
        cur.rsvps.push({ name: f.name, hue: f.hue, status, paid: false });
        Store.addPulse(`<b>${f.name}</b> said ${status === "yes" ? "haan ✓" : "shayad…"} to <b>${esc(cur.title)}</b>`);
        Store.save();
        haptic(6);
        toast(`${f.name} ${status === "yes" ? "is IN — haan aaunga (actually confirmed)" : 'said "maybe". Classic.'}`, 2200);
        if (!overlayRoot.children.length) nav(currentNav);
      }, 6000 + i * (7000 + Math.random() * 9000));
    });
  }

  /* ============================================================
     HOST DESK
     ============================================================ */
  function openHost(id) {
    const ev = Store.ev(id);
    if (!ev) return;
    const yes = ev.rsvps.filter(r => r.status === "yes");
    const maybe = ev.rsvps.filter(r => r.status === "maybe");
    const no = ev.rsvps.filter(r => r.status === "no");
    const collected = ev.rsvps.filter(r => r.paid).length * (ev.upiAmount || 0);

    const ov = openOverlay(`
      <div class="ov-top">${backBtn}<span class="ov-title">Host Desk</span>
        <button class="icon-btn" data-share><svg viewBox="0 0 24 24"><path d="M12 15V4m0 0L8 8m4-4 4 4"/><path d="M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"/></svg></button>
      </div>
      <div class="ov-scroll"><div class="pagepad">
        <h2 class="create-h" style="margin-bottom:2px">${esc(ev.title)}</h2>
        <p class="create-sub" style="margin-bottom:16px">${whenLine(ev)} · ${esc(ev.venue || "venue TBD")}</p>

        <div class="stat-grid">
          <div class="stat hot"><div class="n">${yes.length + (S.myRsvps[ev.id] === "yes" ? 1 : 0)}</div><div class="l">Going</div></div>
          <div class="stat gold"><div class="n">${maybe.length}</div><div class="l">Maybe</div></div>
          <div class="stat"><div class="n">${no.length}</div><div class="l">Out</div></div>
          <div class="stat gold"><div class="n">${ev.upiAmount ? "₹" + collected : "—"}</div><div class="l">Collected</div></div>
        </div>
        ${ev.capacity ? `
          <div class="capbar"><i style="width:${Math.min(100, (goingCount(ev) / ev.capacity) * 100)}%"></i></div>
          <div class="caplab">${goingCount(ev)} / ${ev.capacity} — ${goingCount(ev) >= ev.capacity ? "FULL HOUSE. WAITLIST ACTIVE." : (ev.capacity - goingCount(ev)) + " SPOTS LEFT"}</div>` : ""}

        <div class="section-label">Broadcast an update</div>
        <div class="field"><textarea id="bc-text" rows="2" placeholder="Venue changed / bring ice / gate code is…"></textarea></div>
        <button class="btn btn-ghost" id="bc-btn">Send to everyone — one message, zero group chat</button>
        ${ev.updates.map(u => `<div class="updatecard" style="margin-top:10px">${esc(u.text)}<div class="when">${timeAgo(u.at)} · delivered to ${yes.length + maybe.length} people</div></div>`).join("")}

        <div class="section-label">Guest list</div>
        ${ev.rsvps.length === 0 ? `<p class="create-sub">Nobody yet. Share the link — the invite does the convincing.</p>` : ""}
        <div id="guestlist">
        ${ev.rsvps.map((r, i) => `
          <div class="guestrow">
            <div class="av" style="background:hsl(${r.hue} 62% 46%);margin:0">${esc(r.name[0])}</div>
            <div style="flex:1">
              <div class="gname">${esc(r.name)}</div>
              <div class="gsub">${r.status === "maybe" ? `said "maybe" — nudge gently` : r.status === "yes" ? "confirmed" : "declined"}</div>
            </div>
            <span class="pill pill-${r.status}">${r.status}</span>
            ${ev.upiAmount ? `<button class="paytog ${r.paid ? "paid" : ""}" data-pi="${i}">${r.paid ? "PAID ✓" : "₹ DUE"}</button>` : ""}
          </div>`).join("")}
        </div>

        ${maybe.length ? `<div class="spacer"></div><button class="btn btn-line" id="nudge-btn">Nudge the ${maybe.length} "maybe" people (gently…)</button>` : ""}
        <div class="spacer"></div>
        ${ev.upiAmount ? `<button class="btn btn-line" id="collect-btn">Remind unpaid — "the venue doesn't accept vibes"</button>` : ""}
      </div></div>`);

    ov.onclick = e => {
      if (e.target.closest("[data-close]")) { closeOverlay(ov); refreshCurrent(); return; }
      if (e.target.closest("[data-share]")) { shareEvent(ev); return; }
      const pt = e.target.closest("[data-pi]");
      if (pt) {
        const r = ev.rsvps[+pt.dataset.pi];
        r.paid = !r.paid; Store.save(); haptic(8);
        pt.classList.toggle("paid", r.paid);
        pt.textContent = r.paid ? "PAID ✓" : "₹ DUE";
        return;
      }
      if (e.target.closest("#bc-btn")) {
        const t = $("#bc-text", ov).value.trim();
        if (!t) { toast("Type something first. Even hosts need words."); return; }
        ev.updates.unshift({ text: t, at: Date.now() });
        Store.addPulse(`<b>You</b> sent an update to <b>${esc(ev.title)}</b>: “${esc(t.slice(0, 42))}${t.length > 42 ? "…" : ""}”`);
        Store.save(); haptic([10, 30, 10]);
        closeOverlay(ov); openHost(id);
        toast(`Update pushed to ${yes.length + maybe.length} people. No group chat harmed.`);
        return;
      }
      if (e.target.closest("#nudge-btn")) {
        const names = maybe.map(m => m.name).join(", ");
        const msg = `Arre ${names} — "${ev.title}" is on ${whenLine(ev)}. Maybe se haan kar do? RSVP: ${inviteURL(ev)}`;
        navigator.clipboard?.writeText(msg);
        window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
        toast("Nudge composed. Diplomacy included free.");
        return;
      }
      if (e.target.closest("#collect-btn")) {
        const unpaid = ev.rsvps.filter(r => r.status === "yes" && !r.paid).map(r => r.name);
        if (!unpaid.length) { toast("Everyone's paid. A historic first."); return; }
        const msg = `${unpaid.join(", ")} — ₹${ev.upiAmount} for "${ev.title}" please 🙏 The venue does not accept vibes as payment. Pay: ${inviteURL(ev)}`;
        navigator.clipboard?.writeText(msg);
        window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
        toast(`Reminder ready for ${unpaid.length} defaulters.`);
        return;
      }
    };
  }

  /* ============================================================
     MEMORIES (Rewind)
     ============================================================ */
  function renderMemories() {
    const past = Store.past();
    setScreen(`
      <div class="apphead">
        <div><h1>Rewind</h1><div class="sub">every jalsa gets a permanent home</div></div>
        <div class="wordmark">JALSA<span class="dev">जलसा</span></div>
      </div>
      <div class="memgrid">
        ${past.length ? past.map(ev => {
          const p = ev.concept.pal;
          return `
          <button class="memcard" data-album="${ev.id}" style="${Templates.heroStyle(ev.concept)}">
            <div class="shade"></div>
            <div class="mtitle" style="${Templates.heroTitleStyle(ev.concept)};font-size:24px">${esc(ev.title)}</div>
            <div class="msub">${Templates.fmtDate(ev)} · ${ev.photos.length} MEMORIES · ${ev.rsvps.filter(r => r.status === "yes").length} WERE THERE</div>
          </button>`;
        }).join("") : `
        <div class="empty">
          <div class="big">No memories yet.</div>
          <p>That's what happens when the jalsa hasn't happened. Host one — this page fills itself.</p>
        </div>`}
      </div>`);
    screen.onclick = e => {
      const a = e.target.closest("[data-album]");
      if (a) openAlbum(a.dataset.album);
    };
  }

  function openAlbum(id) {
    const ev = Store.ev(id);
    if (!ev) return;
    const ov = openOverlay(`
      <div class="ov-top">${backBtn}<span class="ov-title">Memory Album</span>
        <button class="icon-btn" id="reel-btn" title="Play memory reel"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg></button>
      </div>
      <div class="ov-scroll">
        <div class="pagepad" style="padding-top:4px">
          <h2 class="create-h" style="margin-bottom:2px">${esc(ev.title)}</h2>
          <p class="create-sub">${Templates.fmtDate(ev)} · that's a wrap. this one's going to age well.</p>
        </div>
        <div class="album-grid" id="ag">
          ${ev.photos.map((p, i) => albumCell(p, i)).join("")}
          <label class="album-add" for="photo-in">
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>ADD YOURS
          </label>
        </div>
        <input type="file" id="photo-in" accept="image/*" multiple style="display:none">
        <div class="pagepad" style="padding-top:18px">
          <button class="btn btn-line" id="inv-again">View the original invite</button>
        </div>
      </div>`);

    function albumCell(p, i) {
      if (p.type === "img") return `<div class="album-ph" style="--i:${i}"><img src="${p.src}" alt="memory"></div>`;
      return `<div class="album-ph" style="--i:${i};background:
        radial-gradient(120% 120% at 30% 20%, hsl(${p.h} 70% 55% / .9), hsl(${(p.h + 60) % 360} 65% 30%))"></div>`;
    }

    $("#photo-in", ov).onchange = async e => {
      const files = [...e.target.files].slice(0, 12);
      for (const f of files) {
        const src = await compressImage(f);
        if (src) ev.photos.push({ type: "img", src });
      }
      Store.save();
      Store.addPulse(`<b>You</b> added ${files.length} photo${files.length > 1 ? "s" : ""} to <b>${esc(ev.title)}</b>`);
      haptic(12);
      toast("Saved to the album. Memory secured.");
      closeOverlay(ov); openAlbum(id);
    };
    $("#reel-btn", ov).onclick = () => playReel(ev);
    $("#inv-again", ov).onclick = () => { closeOverlay(ov); openInvite(ev.id, { reveal: true }); };
    ov.addEventListener("click", e => { if (e.target.closest("[data-close]")) closeOverlay(ov); });
  }

  function compressImage(file) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        const max = 900, s = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = img.width * s; cv.height = img.height * s;
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        res(cv.toDataURL("image/jpeg", .78));
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => res(null);
      img.src = URL.createObjectURL(file);
    });
  }

  function playReel(ev) {
    if (!ev.photos.length) { toast("No photos yet. The reel needs raw material."); return; }
    const caps = [ev.tagline, "that's a wrap.", `${ev.rsvps.filter(r => r.status === "yes").length} people. one night.`, "this one's going to age well.", ev.title.toLowerCase()];
    const reel = document.createElement("div");
    reel.className = "reel";
    overlayRoot.appendChild(reel);
    let i = 0;
    function frame() {
      const p = ev.photos[i % ev.photos.length];
      reel.innerHTML = `
        <div class="frame">${p.type === "img"
          ? `<img src="${p.src}">`
          : `<div class="huefill" style="background:radial-gradient(120% 120% at 30% 20%, hsl(${p.h} 70% 50%), hsl(${(p.h + 70) % 360} 65% 22%))"></div>`}
        </div>
        <div class="rbrand">JALSA · MEMORY REEL</div>
        <div class="rcap">${esc(caps[i % caps.length])}</div>`;
      i++;
    }
    frame();
    const iv = setInterval(frame, 3200);
    reel.onclick = () => { clearInterval(iv); reel.remove(); };
    haptic([10, 60, 10]);
  }

  /* ============================================================
     PULSE
     ============================================================ */
  const pulseBody = () => `
    <div class="pagepad" style="padding-top:6px">
      ${S.pulse.map(p => `
        <div class="pulse-item">
          <div class="av" style="background:var(--midnight-3);margin:0;border-color:transparent">✦</div>
          <div class="ptxt">${p.text}<div class="pwhen">${timeAgo(p.at)}</div></div>
        </div>`).join("")}
      <div class="spacer"></div>
      <p class="mic-note">ONLY YOUR PEOPLE. NO ALGORITHM. NO STRANGERS.</p>
    </div>`;

  function renderPulse() {
    setScreen(`
      <div class="apphead">
        <div><h1>Pulse</h1><div class="sub">what your circle is up to</div></div>
        <div class="wordmark">JALSA<span class="dev">जलसा</span></div>
      </div>
      ${pulseBody()}`);
  }

  function openPulseOverlay() {
    const ov = openOverlay(`
      <div class="ov-top">${backBtn}<span class="ov-title">Pulse</span><span style="width:40px"></span></div>
      <div class="ov-scroll">${pulseBody()}</div>`);
    ov.querySelector("[data-close]").onclick = () => closeOverlay(ov);
  }

  /* ============================================================
     DISCOVER — the city layer (public events, venues, tickets)
     Second growth vector: FOMO crossover with your circle.
     ============================================================ */
  const DISCOVER_CATS = ["All", "Gigs", "Nightlife", "Workshops", "Open Mic", "Markets", "Art", "Food", "Wellness"];
  let discoverFilter = "All";

  function priceLabel(n) { return n > 0 ? `₹${n}` : "FREE"; }

  function renderDiscover() {
    const all = Store.discover();
    const list = discoverFilter === "All" ? all : all.filter(e => e.category === discoverFilter);
    const featured = discoverFilter === "All" ? all.slice().sort((a, b) => b.cityGoing - a.cityGoing)[0] : null;
    const rest = featured ? list.filter(e => e.id !== featured.id) : list;

    setScreen(`
      <div class="apphead">
        <div><h1>Discover</h1><div class="sub">what Bengaluru is doing this week</div></div>
        <div class="wordmark">JALSA<span class="dev">जलसा</span></div>
      </div>
      <div class="chiprow scroll" id="disc-cats" style="margin-bottom:14px">
        ${DISCOVER_CATS.map(c => `<button class="chip ${c === discoverFilter ? "on" : ""}" data-cat="${c}">${c}</button>`).join("")}
      </div>
      <div class="feed" id="disc-feed">
        ${featured ? featuredCard(featured) : ""}
        ${rest.length || featured
          ? rest.map((e, i) => discoverCard(e, i)).join("")
          : `<div class="empty"><div class="big">Nothing in ${esc(discoverFilter)} yet.</div><p>Try another category — the city's always got something on.</p></div>`}
        <p class="mic-note" style="padding:8px 0 0">PUBLIC EVENTS · POWERED BY BENGALURU VENUES</p>
      </div>`);

    $("#disc-cats").onclick = e => {
      const c = e.target.closest("[data-cat]"); if (!c) return;
      discoverFilter = c.dataset.cat; haptic(6); renderDiscover();
    };
    $("#disc-feed").onclick = e => {
      const card = e.target.closest("[data-disc]");
      if (card) { openDiscover(card.dataset.disc); return; }
    };
  }

  function circleGoingHTML(ev) {
    const cg = ev.circleGoing || [];
    if (!cg.length) return `<span class="going-label"><b>${ev.cityGoing}</b> going in the city</span>`;
    const avs = cg.slice(0, 3).map((r, i) => avatarHTML(r, i)).join("");
    const names = cg.length === 1 ? cg[0].name : `${cg[0].name} +${cg.length - 1}`;
    return `<div style="display:flex;align-items:center"><div class="avstack">${avs}</div><span class="going-label"><b style="color:var(--ember)">${esc(names)}</b> from your circle</span></div>`;
  }

  function featuredCard(ev) {
    const st = S.discoverState[ev.id];
    return `
    <article class="featured" data-disc="${ev.id}">
      <div class="feat-hero" style="${Templates.heroStyle(ev.concept)}">
        <span class="feat-flag">🔥 MOST WANTED IN BLR</span>
        <span class="fc-type">${ev.glyph} ${esc(ev.category)} · ${esc(ev.venueName)}</span>
        <div>
          <div class="feat-title" style="${Templates.heroTitleStyle(ev.concept)}">${esc(ev.title)}</div>
          <div class="fc-tag">${esc(ev.tagline)}</div>
        </div>
        <span class="feat-price">${priceLabel(ev.priceFrom)}</span>
      </div>
      <div class="fc-body">
        <div class="fc-meta">
          <span>🗓 <b>${whenLine(ev)}</b></span>
          <span>📍 <b>${esc(ev.area)}</b></span>
        </div>
        <div class="fc-foot">
          ${circleGoingHTML(ev)}
          <button class="btn btn-ember btn-sm" data-disc="${ev.id}">${st === "going" ? "Going ✓" : "See it →"}</button>
        </div>
      </div>
    </article>`;
  }

  function discoverCard(ev, i) {
    const st = S.discoverState[ev.id];
    return `
    <article class="feedcard disc-card" style="--i:${i}" data-disc="${ev.id}">
      <div class="disc-row">
        <div class="disc-thumb" style="${Templates.heroStyle(ev.concept)}">
          <span class="disc-glyph" style="color:${ev.concept.pal.a}">${ev.glyph}</span>
          <span class="disc-price">${priceLabel(ev.priceFrom)}</span>
        </div>
        <div class="disc-info">
          <div class="disc-cat">${esc(ev.category)} · ${esc(ev.area)}</div>
          <div class="disc-title">${esc(ev.title)}</div>
          <div class="disc-venue">${esc(ev.venueName)} · ${whenLine(ev)}</div>
          <div class="disc-foot">
            ${(ev.circleGoing && ev.circleGoing.length)
              ? `<span class="disc-crossover"><b>${esc(ev.circleGoing[0].name)}${ev.circleGoing.length > 1 ? " +" + (ev.circleGoing.length - 1) : ""}</b> going</span>`
              : `<span class="disc-city">${ev.cityGoing} going</span>`}
            ${st === "going" ? `<span class="disc-tag going">GOING ✓</span>` : st === "saved" ? `<span class="disc-tag saved">SAVED</span>` : ""}
          </div>
        </div>
      </div>
    </article>`;
  }

  function openDiscover(id, reveal = true) {
    const ev = Store.discoverEv(id);
    if (!ev) return;
    const st = S.discoverState[id];
    const paid = ev.priceFrom > 0;

    const ov = openOverlay(`
      <div class="viewer ov-scroll">
        <div class="invite-wrap" id="disc-slot"></div>
        <div class="viewer-actions">
          ${backBtn}
          <button class="icon-btn" data-share aria-label="Share"><svg viewBox="0 0 24 24"><path d="M12 15V4m0 0L8 8m4-4 4 4"/><path d="M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"/></svg></button>
        </div>
        <div class="sheet detail-sheet">
          <div class="grab"></div>
          <div class="disc-badge">${esc(ev.category)}</div>
          <div class="ds-title">${esc(ev.title)}</div>
          <div class="ds-host">${esc(ev.venueName)} · ${esc(ev.area)}, Bengaluru</div>

          <div class="ds-grid">
            <div class="ds-cell tap" data-ics><div class="k">When · tap to save</div><div class="v">${whenLine(ev)} <span class="go">＋ CAL</span></div></div>
            <div class="ds-cell tap" data-maps><div class="k">Where · tap for maps</div><div class="v">${esc(ev.venueName)} <span class="go">↗ MAP</span></div></div>
          </div>

          <div class="upi-card">
            <div class="amt">${priceLabel(ev.priceFrom)}</div>
            <div class="why">${paid ? "entry / cover · pay at the venue or grab tickets online" : "no cover · just show up and vibe"}<br><span style="font-family:var(--font-mono);font-size:9px;letter-spacing:.06em">${(ev.tags || []).map(t => "#" + t).join("  ")}</span></div>
          </div>

          <div class="section-label">Who's going</div>
          <div class="disc-going">
            <div class="avstack">${(ev.circleGoing || []).map((r, i) => avatarHTML(r, i)).join("") || ""}</div>
            <div class="disc-going-txt">
              ${(ev.circleGoing && ev.circleGoing.length)
                ? `<b>${ev.circleGoing.map(c => c.name).join(", ")}</b> from your circle${st === "going" ? " · and you" : ""}<br>`
                : ""}
              <span style="color:var(--slate-2)">${ev.cityGoing + (st === "going" ? 1 : 0)} going across Bengaluru</span>
            </div>
          </div>

          <div class="section-label">Your move</div>
          <div class="rsvp-row">
            <button class="rsvp-btn ${st === "going" ? "sel-yes" : ""}" data-go>${st === "going" ? (paid ? "Going ✓" : "In ✓") : (paid ? `Get tickets · ₹${ev.priceFrom}` : "I'm going")}</button>
            <button class="rsvp-btn ${st === "saved" ? "sel-maybe" : st === "going" ? "dim" : ""}" data-save>${st === "saved" ? "Saved" : "Save"}</button>
          </div>
          <div class="spacer"></div>
          <button class="btn btn-line" data-share>Share this with your circle</button>
          <div class="spacer"></div>
        </div>
      </div>`);

    ov.querySelector(".invite-wrap").appendChild(Templates.render(ev, ev.concept, { reveal }));
    if (reveal) haptic([8, 60, 8]);

    ov.onclick = e => {
      if (e.target.closest("[data-close]")) { closeOverlay(ov); if (currentNav === "discover") renderDiscover(); return; }
      if (e.target.closest("[data-share]")) { shareDiscover(ev); return; }
      if (e.target.closest("[data-ics]")) { downloadICS({ ...ev, venue: ev.venueName + ", " + ev.area }); return; }
      if (e.target.closest("[data-maps]")) { openMaps({ venue: ev.venueName + " " + ev.area }); return; }
      const go = e.target.closest("[data-go]");
      if (go) {
        if (S.discoverState[id] === "going") { delete S.discoverState[id]; Store.save(); haptic(8); }
        else {
          S.discoverState[id] = "going"; Store.save(); haptic(35); burst(go);
          Store.addPulse(`<b>You</b> are going to <b>${esc(ev.title)}</b> at ${esc(ev.venueName)}`);
          toast(paid ? `Nice. Tickets open on ${esc(ev.venueName)}'s page — you're marked going.` : `You're going. ${(ev.circleGoing[0] || {}).name || "The city"} will be happy.`);
        }
        closeOverlay(ov); openDiscover(id, false); return;
      }
      const sv = e.target.closest("[data-save]");
      if (sv) {
        if (S.discoverState[id] === "saved") delete S.discoverState[id];
        else S.discoverState[id] = "saved";
        Store.save(); haptic(10);
        closeOverlay(ov); openDiscover(id, false); return;
      }
    };
  }

  function shareDiscover(ev) {
    const d = new Date(ev.date + "T00:00");
    const when = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    const text = [
      `*${ev.title}* ${ev.glyph}`,
      ev.tagline,
      ``,
      `📍 ${ev.venueName}, ${ev.area}`,
      `🗓 ${when} · ${Engine.formatTime(ev.time)} · ${priceLabel(ev.priceFrom)}`,
      ``,
      `Found on JALSA Discover — Bengaluru's on.`,
    ].join("\n");
    haptic(10);
    if (navigator.share) { navigator.share({ title: ev.title, text }).catch(() => {}); return; }
    window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
    navigator.clipboard?.writeText(text).then(() => toast("Copied — spread the word.")).catch(() => {});
  }

  /* ============================================================
     PROFILE
     ============================================================ */
  function renderProfile() {
    const hosted = S.events.filter(e => e.isMine).length;
    const attended = Object.values(S.myRsvps).filter(v => v === "yes").length;
    const picks = S.profile.tierPicks;
    const total = Math.max(1, picks[1] + picks[2] + picks[3]);
    const vibeNames = (S.profile.vibes || []).map(id => (VIBES.find(v => v.id === id) || {}).nm).filter(Boolean);
    const tierColors = { 1: "#9BB59A", 2: "var(--marigold)", 3: "#B5FF3A" };
    const domTier = [1, 2, 3].sort((a, b) => picks[b] - picks[a])[0];
    const sig = { 1: "Quiet luxury. Editorial soul.", 2: "Confident. One wrong colour, on purpose.", 3: "Organized chaos. Grain on grain." }[domTier];

    setScreen(`
      <div class="me-head">
        <div class="me-av">${esc((S.profile.name || "J")[0].toUpperCase())}</div>
        <div>
          <div class="me-name">${esc(S.profile.name || "You")}</div>
          <div class="me-sub">${vibeNames.join(" · ") || "undeclared energy"}</div>
        </div>
      </div>
      <div class="pagepad">
        <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-top:14px">
          <div class="stat hot"><div class="n">${hosted}</div><div class="l">Hosted</div></div>
          <div class="stat gold"><div class="n">${attended}</div><div class="l">Going to</div></div>
          <div class="stat"><div class="n">${S.events.reduce((a, e) => a + e.photos.length, 0)}</div><div class="l">Memories</div></div>
        </div>

        <div class="section-label">Your taste signature</div>
        ${[1, 2, 3].map(t => `
          <div class="taste-bar">
            <span class="tl">${["", "Whisper", "Flex", "Unhinged"][t]}</span>
            <div class="track"><i style="width:${Math.round((picks[t] / total) * 100)}%;background:${tierColors[t]}"></i></div>
            <span class="pc">${Math.round((picks[t] / total) * 100)}%</span>
          </div>`).join("")}
        <p class="create-sub" style="margin-top:10px">${total > 1 ? `The engine is learning you: <b style="color:var(--pearl)">${sig}</b> Every invite you pick sharpens the next three.` : "Pick invite concepts and the engine learns your aesthetic. Three events in, it starts designing like you."}</p>

        <div class="manifesto">
          "The invite IS the event. When someone receives a JALSA invite, the experience has already begun."
          <div class="who">JALSA · BENGALURU · 2026</div>
        </div>

        <div class="section-label">Make it yours</div>
        <button class="btn btn-ghost" id="install-btn">Install JALSA on your phone</button>
        <div class="spacer"></div>

        <div class="section-label">Danger zone</div>
        <button class="btn btn-line" id="reset-btn">Reset everything — fresh jalsa</button>
        <div class="spacer"></div>
        <p class="mic-note">MADE IN BENGALURU · THE PLACE YOUR MOMENTS LIVE</p>
      </div>`);
    $("#reset-btn").onclick = () => {
      if (confirm("Wipe all events, RSVPs and memories on this device?")) Store.reset();
    };
    $("#install-btn").onclick = () => window.installJalsa();
  }

  /* ============================================================
     GUEST ARRIVAL — the viral loop, made real
     A shared link opens here for anyone, no account needed.
     TRIGGER (link) → ACTION (rsvp) → REWARD (in) → INVESTMENT (join)
     ============================================================ */
  function readInviteHash() {
    const m = (location.hash || "").match(/[#&]i=([^&]+)/);
    return m ? Store.decodeEvent(decodeURIComponent(m[1])) : null;
  }

  function clearHash() {
    history.replaceState(null, "", location.pathname + location.search);
  }

  function renderGuestArrival(ev) {
    tabbar.classList.add("hidden");
    const already = Object.prototype.hasOwnProperty.call(S.guestRsvps || {}, ev.id);
    S.guestRsvps = S.guestRsvps || {};

    setScreen(`
      <div class="arrival">
        <div class="arr-topbar">
          <span class="wordmark">JALSA<span class="dev">जलसा</span></span>
          <span class="arr-from"><b>${esc(ev.hostName)}</b>&nbsp;invited you</span>
        </div>
        <div class="arr-invite" id="arr-slot"></div>
        <div class="arr-dock" id="arr-dock"></div>
      </div>`);

    const slot = $("#arr-slot");
    slot.appendChild(Templates.render(ev, ev.concept, { reveal: true }));
    haptic([8, 60, 8]);

    renderDock();

    function renderDock() {
      const dock = $("#arr-dock");
      const my = S.guestRsvps[ev.id];
      if (!my) {
        dock.innerHTML = `
          <div class="kicker">You're invited ${ev.glyph}</div>
          <div class="ev-line">${esc(ev.title)}</div>
          <div class="ev-meta">${whenLine(ev)} · ${esc(ev.venue || "location drops soon")}</div>
          <p class="prompt">Tap once. No app, no signup — ${esc(ev.hostName)} just needs a headcount.</p>
          <div class="rsvp-row" id="arr-rsvp">
            <button class="rsvp-btn" data-g="yes">I'm in<span class="hint">see you there</span></button>
            <button class="rsvp-btn" data-g="maybe">Maybe<span class="hint">tentative</span></button>
            <button class="rsvp-btn" data-g="no">Can't<span class="hint">next time</span></button>
          </div>
          <div class="arr-foot">jalsa · the invite is the event</div>`;
        $("#arr-rsvp").onclick = e => {
          const b = e.target.closest("[data-g]"); if (!b) return;
          const status = b.dataset.g;
          S.guestRsvps[ev.id] = status;
          Store.save();
          if (ev.cloudId) Cloud.rsvp(ev.cloudId, S.profile.name || "A guest", status);
          if (status === "yes") { haptic(35); burst(b); }
          else haptic(10);
          setTimeout(renderConvert, 480);
        };
      } else {
        renderConvert();
      }
    }

    function renderConvert() {
      const my = S.guestRsvps[ev.id];
      const dock = $("#arr-dock");
      const headline = my === "yes" ? "You're in. 🔥" : my === "maybe" ? "Noted — a soft yes." : "Maybe next one.";
      const sub = my === "yes"
        ? `${esc(ev.hostName)} can see you're coming.${ev.upiAmount ? ` ₹${ev.upiAmount}/head gets collected here — no awkward chasing.` : ""}`
        : `${esc(ev.hostName)} has been told. ${my === "maybe" ? "Everyone knows what maybe means. 👀" : "No hard feelings."}`;
      dock.innerHTML = `
        <div class="arr-convert">
          <div class="big">${headline}</div>
          <div class="sub">${sub}</div>
          ${ev.upiAmount && my === "yes" ? `<button class="btn btn-ghost" id="g-pay" style="margin-bottom:10px">Pay ₹${ev.upiAmount} via UPI</button>` : ""}
          <button class="btn btn-ember" id="g-join">Plan yours on JALSA →</button>
          <div class="spacer"></div>
          <button class="btn btn-line" id="g-add">＋ Save this to my JALSA</button>
          <div class="arr-foot">this invite was designed, not typed · made on jalsa</div>
        </div>`;
      const payBtn = $("#g-pay");
      if (payBtn) payBtn.onclick = () => payUPI(ev, payBtn);
      $("#g-join").onclick = () => {
        haptic(14); clearHash();
        if (!S.profile.onboarded) renderOnboard(0);
        else { tabbar.classList.remove("hidden"); nav("create"); }
      };
      $("#g-add").onclick = () => {
        const added = Store.addSharedEvent({ ...ev });
        S = Store.get();
        if (added) { S.myRsvps[S.events[0].id] = my; Store.save(); }
        haptic(12); clearHash();
        toast(added ? "Saved to your Scene." : "Already in your Scene.");
        tabbar.classList.remove("hidden"); nav("feed");
      };
    }
  }

  /* ============================ PWA ========================== */
  function registerPWA() {
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }
  let deferredInstall = null;
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredInstall = e; });
  window.installJalsa = async () => {
    if (!deferredInstall) { toast("Open the browser menu → “Add to Home Screen”."); return; }
    deferredInstall.prompt();
    await deferredInstall.userChoice.catch(() => {});
    deferredInstall = null;
  };

  function cloudCodeFromHash() {
    const m = (location.hash || "").match(/[#&]e=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  // Open a shared invite: cloud link (#e=) fetched live, else self-contained (#i=).
  async function routeShared() {
    const code = cloudCodeFromHash();
    if (code) {
      tabbar.classList.add("hidden");
      setScreen(`
        <div class="arrival">
          <div class="arr-topbar"><span class="wordmark">JALSA<span class="dev">जलसा</span></span></div>
          <div class="cloud-load">Opening your invite…</div>
        </div>`);
      const ev = await Cloud.fetchEvent(code);
      if (ev) { renderGuestArrival(ev); return true; }
      toast("Couldn't load that invite — it may have expired.");
    }
    const shared = readInviteHash();
    if (shared) { renderGuestArrival(shared); return true; }
    return false;
  }

  // re-route if a link is opened while the app is already running
  window.addEventListener("hashchange", () => { routeShared(); });

  /* ============================ boot ========================= */
  registerPWA();
  (async () => {
    if (await routeShared()) return;
    if (!S.profile.onboarded) {
      renderOnboard(0);
    } else {
      tabbar.classList.remove("hidden");
      nav("feed");
    }
  })();
})();
