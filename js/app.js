/* ============================================================
   jalsa — app
   ============================================================ */

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = Editions.esc;
  const screen = $("#screen");
  const tabbar = $("#tabbar");
  const overlays = $("#overlay-root");

  let S = Store.load();
  let current = "upcoming";

  /* ============================ utils ======================== */
  function haptic(p = 10) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }

  function toast(msg, ms = 2600) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    $("#toast-root").appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 320); }, ms);
  }

  function timeAgo(ts) {
    const s = (Date.now() - ts) / 1000;
    if (s < 90) return "just now";
    if (s < 3600) return Math.round(s / 60) + " min ago";
    if (s < 86400) return Math.round(s / 3600) + " hr ago";
    const d = Math.round(s / 86400);
    return d === 1 ? "yesterday" : d + " days ago";
  }

  function until(ev) {
    const diff = new Date(ev.date + "T" + (ev.time || "19:00")) - new Date();
    if (diff < 0 && diff > -4 * 36e5) return "Happening now";
    if (diff < 0) return "";
    const h = diff / 36e5;
    if (h < 1) return "In " + Math.max(1, Math.round(diff / 6e4)) + " min";
    if (h < 20) return "In " + Math.round(h) + " hr";
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Math.round((new Date(ev.date + "T00:00") - today) / 864e5);
    return days <= 1 ? "Tomorrow" : "In " + days + " days";
  }

  function shortDate(ev) {
    if (!ev.date) return "Date to follow";
    return new Date(ev.date + "T00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  }
  const when = ev => `${shortDate(ev)} · ${Engine.formatTime(ev.time)}`;

  const STATUS = {
    yes:   { opt: "Accepts with pleasure", stamp: "Accepted",     cls: "" },
    maybe: { opt: "Will confirm shortly",  stamp: "Pencilled in", cls: "grey" },
    no:    { opt: "Declines with regret",  stamp: "Regrets",      cls: "red" },
  };

  /* everyone who has replied to an event, wherever the reply came from */
  function replies(ev) {
    const list = (ev.rsvps || []).slice();
    (ev.cloudRsvps || []).forEach(r => list.push({ name: r.name, hue: (Engine.hashStr(r.name) % 360), status: r.status, src: "link", at: r.created_at }));
    return list;
  }
  function counts(ev) {
    const all = replies(ev);
    const mine = !ev.isMine && S.myReplies[ev.id];
    const c = { yes: 0, maybe: 0, no: 0 };
    all.forEach(r => { if (c[r.status] != null) c[r.status]++; });
    if (mine && c[mine] != null) c[mine]++;
    return c;
  }
  function faces(list, n = 4) {
    const yes = list.filter(r => r.status === "yes");
    return `<span class="faces">${yes.slice(0, n).map(r =>
      `<span class="face" style="background:hsl(${r.hue} 32% 40%)">${esc(r.name[0])}</span>`).join("")}${yes.length > n ? `<span class="more">+${yes.length - n}</span>` : ""}</span>`;
  }
  function stampHTML(status, extra = "") {
    const s = STATUS[status];
    return s ? `<span class="stamp ${s.cls} ${extra}">${s.stamp}</span>` : "";
  }
  function houseStyle() {
    const p = S.profile.picks || {};
    return Object.keys(p).sort((a, b) => p[b] - p[a])[0] || null;
  }

  /* ============================ nav ========================== */
  const RENDER = { upcoming: renderUpcoming, town: renderTown, kept: renderKept, you: renderYou };

  function nav(to) {
    if (to === "new") { openCreate(); return; }
    current = to;
    $$(".tab", tabbar).forEach(t => t.classList.toggle("active", t.dataset.nav === to));
    (RENDER[to] || renderUpcoming)();
  }
  tabbar.addEventListener("click", e => {
    const b = e.target.closest("[data-nav]");
    if (b) { haptic(6); nav(b.dataset.nav); }
  });

  function setScreen(html, { bare = false } = {}) {
    screen.onclick = null;
    screen.innerHTML = html;
    screen.scrollTop = 0;
    screen.classList.toggle("bare", bare);
    screen.classList.remove("screen-enter");
    void screen.offsetWidth;
    screen.classList.add("screen-enter");
  }
  function refresh() { if (!overlays.children.length && !screen.querySelector(".arrival, .cover")) nav(current); }

  /* ============================ sheets ======================= */
  function openSheet(label, body, { table = false, tools = "" } = {}) {
    const el = document.createElement("div");
    el.className = "sheet" + (table ? " table" : "");
    el.innerHTML = `
      <div class="sheet-top">
        <button class="close" data-close aria-label="Close">×</button>
        <span class="lab">${label}</span>
        <span style="min-width:40px;display:flex;justify-content:flex-end">${tools}</span>
      </div>
      <div class="sheet-body">${body}</div>`;
    overlays.appendChild(el);
    el.addEventListener("click", e => { if (e.target.closest("[data-close]")) closeSheet(el); });
    return el;
  }
  function closeSheet(el, after) {
    if (!el || el.classList.contains("closing")) return;
    el.classList.add("closing");
    setTimeout(() => { el.remove(); clearInterval(el._poll); after ? after() : refresh(); }, 280);
  }
  addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(overlays.lastElementChild); });

  const WORDMARK = `<span class="wordmark">jalsa<sup>जलसा</sup></span>`;

  /* ============================================================
     ONBOARDING
     ============================================================ */
  function renderOnboard(step = 0) {
    tabbar.classList.add("hidden");
    if (step === 0) {
      const fan = [
        { edition: "letterpress", ink: "bone", s: "left:2%;top:26px;transform:rotate(-9deg)" },
        { edition: "riso", ink: "pinkblue", s: "left:33%;top:0;transform:rotate(2deg);z-index:2" },
        { edition: "talkies", ink: "butter", s: "right:2%;top:30px;transform:rotate(10deg)" },
      ];
      setScreen(`
        <div class="cover">
          <div class="cover-top"><span class="lab">An invitation press</span><span class="lab">Bengaluru · 2026</span></div>
          <div class="cover-fan" id="fan"></div>
          <div class="cover-word">
            <span class="big">jalsa</span>
            <span class="dev">जलसा</span>
            <div class="entry-def">
              <b>jal·sa</b> <i>(n.) Hindustani</i>
              <ol><li>A gathering of people for celebration.</li><li>The sort of evening that deserves a proper invitation.</li></ol>
            </div>
          </div>
          <p class="cover-lede">Describe your plan the way you'd text it. We set it in type, print it to a link, and keep the guest list.</p>
          <button class="btn" id="go">Make it an occasion <span class="arr">→</span></button>
        </div>`, { bare: true });
      const sample = { title: "Kal Jalsa Hai", tagline: "Your presence is requested, and expected.", date: Store.dayOffset(3).date, time: "19:30", venue: "Indiranagar, Bengaluru", hostName: "Jalsa", slug: "cover" };
      const sampleT = [{ ...sample }, { ...sample, title: "Doors at Nine" }, { ...sample, title: "House Full" }];
      fan.forEach((f, i) => {
        const slot = document.createElement("div");
        slot.className = "fan-card";
        slot.style.cssText = f.s;
        $("#fan").appendChild(slot);
        Editions.mount(slot, sampleT[i], { edition: f.edition, ink: f.ink, tagline: sample.tagline });
      });
      $("#go").onclick = () => { haptic(); renderOnboard(1); };
      return;
    }

    setScreen(`
      <div class="cover">
        <div class="cover-top"><span class="lab">Before we print anything</span><span class="lab">1 / 1</span></div>
        <h2 class="c-h" style="margin-top:34px">How should we print <em>your name?</em></h2>
        <p class="c-sub">It goes on every invitation you send. First name is plenty.</p>
        <input class="name-in" id="nm" maxlength="18" placeholder="Priya" autocomplete="given-name" value="${esc(S.profile.name)}">
        <div class="name-preview" id="np"></div>
        <div style="margin-top:auto;padding-top:28px">
          <button class="btn" id="done" disabled>That's me <span class="arr">→</span></button>
        </div>
      </div>`, { bare: true });
    const inp = $("#nm"), btn = $("#done");
    const paint = () => {
      const n = inp.value.trim();
      btn.disabled = n.length < 2;
      Editions.mount($("#np"),
        { title: "Kal Jalsa Hai", date: Store.dayOffset(3).date, time: "19:30", venue: "Your place", hostName: n || "You", slug: "name" },
        { edition: "letterpress", ink: "bone", tagline: "Your presence is requested, and expected." });
    };
    paint();
    inp.oninput = paint;
    inp.onkeydown = e => { if (e.key === "Enter" && !btn.disabled) btn.click(); };
    setTimeout(() => inp.focus(), 300);
    btn.onclick = () => {
      S.profile.name = inp.value.trim().replace(/^\w/, c => c.toUpperCase());
      S.profile.onboarded = true;
      Store.save(); haptic([12, 40, 12]);
      tabbar.classList.remove("hidden");
      const next = S._after; delete S._after;
      nav("upcoming");
      if (next === "new") openCreate();
    };
  }

  /* ============================================================
     UPCOMING
     ============================================================ */
  function renderUpcoming() {
    const up = Store.upcoming();
    const [next, ...rest] = up;
    const unread = S.notes.length;
    setScreen(`
      <header class="mast">
        <div class="mast-row">${WORDMARK}
          <div class="mast-tools"><button class="textbtn" id="notes">Notes${unread ? `<span class="n">${unread}</span>` : ""}</button></div>
        </div>
        <h1>Upcoming</h1>
        <p>${up.length ? `${up.length} occasion${up.length > 1 ? "s" : ""} in your circle, ${esc(S.profile.name)}.` : "Nothing on the calendar yet."}</p>
      </header>
      ${next ? nextCard(next) : `
        <div class="empty"><h3>A clear calendar.</h3><p>Describe a plan in one line and we'll make it an occasion.</p>
        <button class="btn btn-sm" data-new style="margin:0 auto">Start an invitation</button></div>`}
      ${rest.length ? `<div class="section"><h2>Later</h2><span class="lab">${rest.length}</span></div>
        <div id="later">${rest.map(entryRow).join("")}</div>` : ""}
    `);
    mountThumbs();
    $("#notes").onclick = openNotes;
    screen.onclick = e => {
      const o = e.target.closest("[data-open]");
      if (o) { openInvite(o.dataset.open); return; }
      if (e.target.closest("[data-new]")) openCreate();
    };
  }

  function nextCard(ev) {
    const my = ev.isMine ? "host" : S.myReplies[ev.id];
    const c = counts(ev);
    return `
      <button class="next" data-open="${ev.id}" style="display:block;width:calc(100% - 40px);text-align:left">
        <span class="next-card" data-thumb="${ev.id}"></span>
        <span class="next-meta">
          <span>
            <span class="lab">Next · ${esc(shortDate(ev))}</span>
            <h3>${esc(ev.title)}</h3>
            <span style="display:flex;align-items:center;gap:10px;margin-top:8px">${faces(replies(ev).concat(my === "yes" ? [{ name: S.profile.name || "You", hue: 250, status: "yes" }] : []))}<span class="lab">${c.yes} attending</span></span>
          </span>
          <span style="display:flex;flex-direction:column;align-items:flex-end;gap:10px">
            <span class="count">${esc(until(ev))}</span>
            ${my === "host" ? `<span class="stamp">Hosting</span>` : stampHTML(my)}
          </span>
        </span>
      </button>`;
  }

  function entryRow(ev) {
    const my = ev.isMine ? "host" : S.myReplies[ev.id];
    const d = Editions.parts(ev);
    return `
      <button class="entry" data-open="${ev.id}">
        <span class="entry-thumb" data-thumb="${ev.id}"></span>
        <span>
          <span class="entry-date"><b>${esc(d.day)}</b><span class="lab">${esc(d.mo3 || "")} · ${esc(d.dw3 || "")}</span></span>
          <h3>${esc(ev.title)}</h3>
          <p>${ev.isMine ? "Your occasion" : "From " + esc(ev.hostName)} · ${esc(Engine.formatTime(ev.time))}</p>
          <span class="foot">${faces(replies(ev), 3)}${my === "host" ? `<span class="stamp">Hosting</span>` : my ? stampHTML(my) : `<span class="lab" style="color:var(--stamp)">Reply →</span>`}</span>
        </span>
      </button>`;
  }

  function mountThumbs(root = screen) {
    $$("[data-thumb]", root).forEach(slot => {
      const ev = Store.ev(slot.dataset.thumb);
      if (ev) Editions.mount(slot, ev, ev.concept);
    });
  }

  function openNotes() {
    haptic(6);
    openSheet("Notes from your circle", `
      <div class="pad" style="padding-top:8px">
        ${S.notes.map(n => `<div class="fact" style="grid-template-columns:1fr auto;cursor:default"><span>${n.text}</span><span class="lab">${timeAgo(n.at)}</span></div>`).join("")}
        <p class="prose" style="margin:18px 0 0">Only people you've invited, or who've invited you. No strangers, no feed.</p>
      </div>`);
  }

  /* ============================================================
     INVITE — the card and its reply slip
     ============================================================ */
  function openInvite(id, { reveal = true } = {}) {
    const ev = Store.ev(id);
    if (!ev) return;
    if (ev.public) { openListing(ev, reveal); return; }
    const past = Store.isPast(ev);
    const c = counts(ev);

    const sh = openSheet(ev.isMine ? "Your occasion" : `From ${esc(ev.hostName)}`, `
      <div class="viewer-card" id="card"></div>
      <div class="slip">
        <h2>${esc(ev.title)}</h2>
        <p class="by">${esc(ev.tagline)}</p>
        ${factsHTML(ev)}
        ${ev.upiAmount && !ev.isMine && !past ? payHTML(ev) : ""}
        ${(ev.updates || []).map(u => `<div class="note-card">${esc(u.text)}<span class="lab">${esc(ev.hostName)} · ${timeAgo(u.at)}</span></div>`).join("")}
        ${past
          ? `<div class="gap"></div><button class="btn btn-line" data-album>Open the keepsake <span class="arr">→</span></button>`
          : ev.isMine
            ? `<div class="gap"></div><div class="stack"><button class="btn" data-register>Open the register <span class="arr">→</span></button><button class="btn btn-line" data-share>Send on WhatsApp</button></div>`
            : `<div id="reply-slot"></div><div class="gap"></div><button class="btn btn-line" data-share>Forward to someone</button>`}
        <p class="lab" style="margin-top:18px;text-align:center">${c.yes} accepted · ${c.maybe} pencilled · ${c.no} regrets</p>
      </div>`, { table: true });

    Editions.mount($("#card", sh), ev, ev.concept, { reveal });
    haptic(reveal ? [6, 50, 6] : 4);

    const slot = $("#reply-slot", sh);
    if (slot) mountReply(slot, {
      current: S.myReplies[ev.id], askName: false,
      onReply: status => {
        S.myReplies[ev.id] = status;
        Store.note(`<b>You</b> ${status === "yes" ? "accepted" : status === "no" ? "sent regrets to" : "pencilled in"} <i>${esc(ev.title)}</i>`);
        Store.save();
        if (ev.cloudId) Cloud.rsvp(ev.cloudId, S.profile.name, status);
        toast(status === "yes" ? `${ev.hostName} will be pleased.` : status === "no" ? `${ev.hostName} has been told, kindly.` : "Pencilled in. Do confirm when you can.");
      },
    });

    sh.addEventListener("click", e => {
      if (e.target.closest("[data-share]")) shareEvent(ev);
      else if (e.target.closest("[data-ics]")) downloadICS(ev);
      else if (e.target.closest("[data-maps]")) openMaps(ev.venue);
      else if (e.target.closest("[data-pay]")) payUPI(ev, e.target.closest("[data-pay]"));
      else if (e.target.closest("[data-album]")) closeSheet(sh, () => openAlbum(ev.id));
      else if (e.target.closest("[data-register]")) closeSheet(sh, () => openRegister(ev.id));
    });
  }

  function factsHTML(ev) {
    return `
      <div class="facts">
        <button class="fact" data-ics><span class="lab">When</span><b>${esc(Engine.longDate(ev))}, ${esc(Engine.formatTime(ev.time))}</b><span class="go">Calendar</span></button>
        <button class="fact" data-maps><span class="lab">Where</span><b>${esc(ev.venue || "To follow")}</b><span class="go">${ev.venue ? "Map" : ""}</span></button>
        ${ev.capacity ? `<div class="fact"><span class="lab">Places</span><b>${Math.max(0, ev.capacity - counts(ev).yes)} of ${ev.capacity} left</b><span></span></div>` : ""}
      </div>`;
  }

  function payHTML(ev) {
    const paid = S.myPaid[ev.id];
    return `
      <div class="pay-card">
        <div><b>₹${ev.upiAmount}</b><p>a head, settled here so nobody has to ask twice.</p></div>
        <button class="btn btn-sm ${paid ? "btn-line" : ""}" data-pay>${paid ? "Paid ✓" : "Pay by UPI"}</button>
      </div>`;
  }

  /* the reply card: three printed options, one rubber stamp */
  function mountReply(slot, { current, askName, onReply, name = "" }) {
    function paint(stamped) {
      slot.innerHTML = `
        <div class="reply">
          <div class="reply-h"><h3>Kindly reply</h3><span class="lab">RSVP</span></div>
          ${askName ? `<input class="reply-name" id="rn" maxlength="30" placeholder="Your name, as the host knows it" value="${esc(name)}" autocomplete="given-name">` : ""}
          ${["yes", "no", "maybe"].map(k => `
            <button class="opt ${current === k ? "on" : current ? "off" : ""}" data-r="${k}"><i>${current === k ? "✓" : ""}</i>${STATUS[k].opt}</button>`).join("")}
          <div class="stamp-slot">${current ? `<span class="stamp big ${STATUS[current].cls} ${stamped ? "thud" : ""}">${STATUS[current].stamp}<small>${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" }).toUpperCase()}</small></span>` : ""}</div>
        </div>`;
    }
    paint(false);
    slot.onclick = e => {
      const b = e.target.closest("[data-r]");
      if (!b) return;
      const nameIn = $("#rn", slot);
      if (askName) {
        name = nameIn.value.trim();
        if (name.length < 2) { nameIn.focus(); nameIn.placeholder = "Your name first, please"; haptic([8, 30, 8]); return; }
      }
      current = b.dataset.r;
      haptic(current === "yes" ? [10, 30, 40] : 14);
      paint(true);
      onReply(current, name);
    };
  }

  /* ---------------- outbound ---------------------------------- */
  function base() { return /^https?:/.test(location.protocol) ? location.origin + location.pathname : "https://jalsa.invalid/"; }
  function linkFor(ev) {
    if (Cloud.enabled && ev.cloudOk) return base() + "#e=" + encodeURIComponent(ev.slug);
    return base() + "#i=" + Store.encodeEvent(ev);
  }

  async function shareEvent(ev) {
    haptic(8);
    if (ev.isMine && Cloud.enabled && !ev.cloudOk) { ev.cloudOk = !!(await Cloud.publish(ev)); Store.save(); }
    const text = Engine.shareText(ev, linkFor(ev));
    if (navigator.share) { navigator.share({ title: ev.title, text }).catch(() => {}); return; }
    open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
  }

  function downloadICS(ev) {
    if (!ev.date) { toast("The date is still to follow."); return; }
    const dt = new Date(ev.date + "T" + (ev.time || "19:00"));
    const end = new Date(dt.getTime() + 3 * 36e5);
    const f = d => d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//jalsa//EN", "BEGIN:VEVENT",
      `UID:${ev.slug}@jalsa`, `DTSTART:${f(dt)}`, `DTEND:${f(end)}`,
      `SUMMARY:${ev.title}`, `DESCRIPTION:${ev.tagline || ""}`, `LOCATION:${ev.venue || ""}`,
      "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = (ev.slug || "jalsa") + ".ics";
    a.click();
    toast("Added to your calendar.");
  }

  function openMaps(v) { if (v) open("https://www.google.com/maps/search/" + encodeURIComponent(v + ", Bengaluru"), "_blank"); }

  function payUPI(ev, btn) {
    if (S.myPaid[ev.id]) return;
    if (!ev.upiId) { toast(`${ev.hostName} hasn't added a UPI ID yet.`); return; }
    location.href = `upi://pay?pa=${encodeURIComponent(ev.upiId)}&pn=${encodeURIComponent(ev.hostName)}&am=${ev.upiAmount}&cu=INR&tn=${encodeURIComponent(ev.title)}`;
    setTimeout(() => {
      S.myPaid[ev.id] = true; Store.save();
      if (btn) { btn.textContent = "Paid ✓"; btn.classList.add("btn-line"); }
      toast(`Marked as paid. ${ev.hostName} will see it.`);
    }, 900);
  }

  /* ============================================================
     CREATE — brief → proofs → the proof desk → details → sent
     ============================================================ */
  const STARTERS = [
    ["Birthday", "rooftop birthday for Ananya, sunset, twenty of us"],
    ["House party", "house party at mine, loud, doors at nine"],
    ["Dinner", "small dinner at home, eight people, bring a dish"],
    ["Farewell", "farewell for Sana, she's moving to Bombay"],
    ["Screening", "RCB match screening at my place, wear the jersey"],
    ["Coffee", "slow sunday coffee and books at Dyu, six of us"],
  ];

  function openCreate() {
    if (!S.profile.onboarded) { S._after = "new"; renderOnboard(0); return; }
    const st = { text: "", brief: null, pick: 0, reroll: 0, concept: null, title: "", photo: null, commission: null };
    const sh = openSheet("New invitation", `<div id="cstage"></div>`);
    const stage = $("#cstage", sh);
    const draft = () => ({
      title: st.title || st.brief.title, date: Store.dayOffset(7).date, time: st.brief.time,
      venue: "", hostName: S.profile.name, photo: st.photo, slug: "draft-" + st.text.length,
    });
    describe();

    /* 1 · the brief */
    function describe() {
      stage.innerHTML = `
        <div class="c-pad">
          <span class="lab">Step 1 of 4 · The brief</span>
          <h2 class="c-h">Tell us about it the way <em>you'd text it.</em></h2>
          <p class="c-sub">Who, what, roughly when, and the mood. We'll read it and set three proofs.</p>
          <textarea class="brief" id="brief" maxlength="280" placeholder="${esc(STARTERS[Math.floor(Math.random() * STARTERS.length)][1])}">${esc(st.text)}</textarea>
          <div class="reading" id="reading"></div>
          <span class="lab" style="display:block;margin-top:18px">Or begin from</span>
          <div class="starters">${STARTERS.map(([l, t]) => `<button class="filter" data-s="${esc(t)}">${l}</button>`).join("")}</div>
          <button class="btn" id="pull" disabled>Set three proofs <span class="arr">→</span></button>
        </div>`;
      const ta = $("#brief", stage), go = $("#pull", stage);
      const read = () => {
        st.text = ta.value;
        go.disabled = ta.value.trim().length < 6;
        const toks = Engine.read(ta.value);
        $("#reading", stage).innerHTML = toks.length ? `<span class="lab">Reading</span>` + toks.map(t => `<span class="tok">${esc(t)}</span>`).join("") : "";
      };
      ta.oninput = read; read();
      setTimeout(() => ta.focus(), 350);
      $(".starters", stage).onclick = e => { const b = e.target.closest("[data-s]"); if (b) { ta.value = b.dataset.s; read(); haptic(5); } };
      go.onclick = () => { haptic(10); press(); };
    }

    /* 2 · the press runs */
    function press() {
      st.brief = Engine.generate(st.text, { reroll: st.reroll, houseStyle: houseStyle() });
      st.title = st.brief.title; st.pick = 0;
      const p0 = st.brief.proofs[0], ed0 = Editions.get(p0.edition);
      const lines = [
        ["Reading the brief", st.brief.typeLabel],
        ["Setting the type", st.brief.title],
        ["Mixing the ink", Editions.inkOf(p0).name],
        ["Pulling three proofs", st.brief.proofs.map(p => Editions.get(p.edition).name).join(" · ")],
      ];
      stage.innerHTML = `
        <div class="press">
          <div class="press-sheets"><i style="--r:-1"></i><i style="--r:1"></i><i style="--r:-.5"></i></div>
          <div class="press-line" id="pl">${lines[0][0]}</div>
          <div class="lab press-sub" id="ps">${esc(lines[0][1])}</div>
        </div>`;
      let i = 0;
      const iv = setInterval(() => {
        if (++i >= lines.length) { clearInterval(iv); proofs(); return; }
        $("#pl", stage).textContent = lines[i][0];
        $("#ps", stage).textContent = lines[i][1];
        haptic(3);
      }, 560);
      void ed0;
    }

    /* 3 · three proofs and the studio */
    function proofs() {
      stage.innerHTML = `
        <div class="c-pad" style="padding-bottom:6px">
          <span class="lab">Step 2 of 4 · Proofs</span>
          <h2 class="c-h">Three proofs, <em>fresh off the press.</em></h2>
          <p class="c-sub" style="margin-bottom:8px">Swipe through. Every word and every ink can be changed on the next page.</p>
        </div>
        <div class="proofs" id="proofs">
          ${st.brief.proofs.map((p, i) => {
            const ed = Editions.get(p.edition);
            return `<button class="proof ${i === st.pick ? "on" : ""}" data-i="${i}">
              <div class="frame" data-f="${i}"></div>
              <div class="proof-cap"><b>${ed.name}</b><span class="lab">Nº ${ed.no}</span></div>
              <p>${esc(Editions.inkOf(p).name)} · ${esc(ed.note)}</p>
            </button>`;
          }).join("")}
          <div class="proof ${st.pick === 3 ? "on" : ""}" data-i="3" id="cm">${commissionCard()}</div>
        </div>
        <div class="c-pad" style="padding-top:8px">
          <div class="stack">
            <button class="btn" id="take">Take this proof <span class="arr">→</span></button>
            <button class="btn btn-line" id="again">Pull three more</button>
          </div>
        </div>`;
      st.brief.proofs.forEach((p, i) => Editions.mount($(`[data-f="${i}"]`, stage), draft(), p, { reveal: true }));
      if (st.commission && st.commission.html) Editions.mount($("[data-cmf]", stage), draft(), st.commission);

      $("#proofs", stage).onclick = e => {
        if (e.target.closest("#commission")) { commission(); return; }
        const card = e.target.closest(".proof"); if (!card) return;
        const i = +card.dataset.i;
        if (i === 3 && !(st.commission && st.commission.html)) return;
        st.pick = i;
        $$(".proof", stage).forEach(el => el.classList.toggle("on", +el.dataset.i === i));
        haptic(5);
      };
      $("#take", stage).onclick = () => {
        st.concept = st.pick === 3 ? Object.assign({}, st.commission) : Object.assign({}, st.brief.proofs[st.pick]);
        if (st.concept.edition !== "commission") S.profile.picks[st.concept.edition] = (S.profile.picks[st.concept.edition] || 0) + 1;
        Store.save(); haptic(10);
        proofDesk();
      };
      $("#again", stage).onclick = () => { st.reroll += 1; haptic(6); press(); };
    }

    function commissionCard() {
      if (st.commission && st.commission.html) return `
        <div class="frame" data-cmf></div>
        <div class="proof-cap"><b>Commission</b><span class="lab">One-off</span></div>
        <p>Drawn for this brief alone by the studio.</p>`;
      if (st.commission && st.commission.pending) return `
        <div class="commission-cta"><div><span class="lab live">In the studio</span><b>Drawing your one-off…</b><p>Usually under a minute. You can keep browsing the proofs.</p></div></div>
        <div class="proof-cap"><b>Commission</b><span class="lab">One-off</span></div>`;
      return `
        <div class="commission-cta"><div>
          <span class="lab">The studio · Nº 00</span>
          <b>Commission a one-off.</b>
          <p>${AI.enabled ? "Claude draws a poster for this brief alone, not one of our six editions. It takes about a minute." : "Claude draws a poster for this brief alone. The studio opens once this copy of jalsa is connected to its cloud."}</p>
          ${AI.enabled ? `<button class="btn btn-sm" id="commission" style="margin:0 auto">Commission it</button>` : `<span class="lab">Closed on this copy</span>`}
          ${st.commission && st.commission.error ? `<p style="margin:14px 0 0;color:#e9a08f">${esc(st.commission.error)}</p>` : ""}
        </div></div>
        <div class="proof-cap"><b>Commission</b><span class="lab">One-off</span></div>`;
    }

    async function commission() {
      haptic(10);
      st.commission = { pending: true };
      $("#cm", stage).innerHTML = commissionCard();
      const d = draft();
      try {
        const html = await AI.generate({
          prompt: st.text,
          details: { title: d.title, host: d.hostName, date: Engine.longDate(d), time: Engine.formatTime(d.time), venue: "Venue to follow" },
        });
        st.commission = { edition: "commission", html, tagline: st.brief.proofs[0].tagline, fallback: st.brief.proofs[0].edition };
        haptic([10, 40, 10]);
        toast("Your commission is back from the studio.");
      } catch (e) {
        st.commission = { error: e.message || "The studio couldn't finish this one." };
      }
      const cm = $("#cm", stage);
      if (!cm) return;   // they've moved on; the result waits for them
      cm.innerHTML = commissionCard();
      if (st.commission.html) Editions.mount($("[data-cmf]", cm), draft(), st.commission);
    }

    /* 4 · the proof desk */
    function proofDesk() {
      const c = st.concept;
      const isCm = c.edition === "commission";
      const ed = isCm ? null : Editions.get(c.edition);
      stage.innerHTML = `
        <div class="c-pad proofdesk">
          <div>
            <span class="lab">Step 3 of 4 · Corrections</span>
            <h2 class="c-h" style="margin-bottom:0">Mark up <em>the proof.</em></h2>
          </div>
          <div class="viewer-card" id="pv"></div>
          ${isCm ? `<p class="c-sub" style="margin:0">A commission is drawn as one piece, so its words are set by the studio. Change the brief and commission again if you'd like different wording.</p>` : `
          <label class="field"><span class="lab">Title</span><input id="t" maxlength="40" value="${esc(st.title)}"></label>
          <label class="field"><span class="lab">The line beneath</span><input id="g" maxlength="70" value="${esc(c.tagline)}"></label>
          <div><span class="lab" style="display:block;margin-bottom:10px">Edition</span>
            <div class="eds" id="eds">${Editions.LIST.map(k => `<button class="ed-pick ${k === c.edition ? "on" : ""}" data-ed="${k}"><span data-edp="${k}"></span>${Editions.get(k).name}</button>`).join("")}</div>
          </div>
          <div><span class="lab" style="display:block;margin-bottom:10px">Ink · ${esc(ed.name)}</span>
            <div class="inks" id="inks">${Object.entries(ed.inks).map(([k, v]) => `<button class="ink ${k === c.ink ? "on" : ""}" data-ink="${k}"><i style="background:linear-gradient(135deg, ${v.p} 50%, ${v.a || v.i} 50%)"></i>${esc(v.name)}</button>`).join("")}</div>
          </div>`}
          <label class="upload">
            <input type="file" id="ph" accept="image/*" hidden>
            <span>${st.photo ? "<b>Photograph added.</b> Tap to change it." : `<b>Add a photograph</b> ${isCm ? "for the studio's frame" : "· it sets the card as a Snapshot"}`}</span>
            ${st.photo ? `<img src="${st.photo}" alt="">` : `<span class="lab">Optional</span>`}
          </label>
          <button class="btn" id="next">The particulars <span class="arr">→</span></button>
        </div>`;

      const pv = $("#pv", stage);
      const paint = () => Editions.mount(pv, draft(), c);
      paint();
      if (!isCm) {
        $$("[data-edp]", stage).forEach(s => Editions.mount(s, draft(), { edition: s.dataset.edp, tagline: c.tagline }));
        $("#t", stage).oninput = e => { st.title = e.target.value; paint(); };
        $("#g", stage).oninput = e => { c.tagline = e.target.value; paint(); };
        $("#eds", stage).onclick = e => {
          const b = e.target.closest("[data-ed]"); if (!b) return;
          c.edition = b.dataset.ed; c.ink = Object.keys(Editions.get(c.edition).inks)[0];
          haptic(5); proofDesk();
        };
        $("#inks", stage).onclick = e => {
          const b = e.target.closest("[data-ink]"); if (!b) return;
          c.ink = b.dataset.ink;
          $$(".ink", stage).forEach(x => x.classList.toggle("on", x === b));
          haptic(4); paint();
        };
      }
      $("#ph", stage).onchange = async e => {
        const f = e.target.files && e.target.files[0]; if (!f) return;
        st.photo = await compress(f, 720, .8);
        if (st.photo && !isCm && c.edition !== "snapshot") { c.edition = "snapshot"; c.ink = "tomato"; }
        haptic(8); proofDesk();
      };
      $("#next", stage).onclick = () => { haptic(8); particulars(); };
    }

    /* 5 · the particulars */
    function particulars() {
      const d = draft();
      stage.innerHTML = `
        <div class="c-pad">
          <span class="lab">Step 4 of 4 · Particulars</span>
          <h2 class="c-h">The part WhatsApp <em>always loses.</em></h2>
          <p class="c-sub">Date, place, numbers. Guests can tap any of it straight into their calendar or maps.</p>
          <label class="field"><span class="lab">Title</span><input id="f-t" maxlength="40" value="${esc(d.title)}"></label>
          <div class="field-row">
            <label class="field"><span class="lab">Date</span><input id="f-d" type="date" value="${d.date}"></label>
            <label class="field"><span class="lab">Time</span><input id="f-h" type="time" value="${d.time}"></label>
          </div>
          <label class="field"><span class="lab">Where</span><input id="f-v" maxlength="70" placeholder="The terrace, 4th Block, Koramangala"></label>
          <div class="field-row">
            <label class="field"><span class="lab">Places (0 = open)</span><input id="f-c" type="number" inputmode="numeric" min="0" max="500" value="${st.brief.count || 0}"></label>
            <label class="field"><span class="lab">₹ a head (0 = free)</span><input id="f-u" type="number" inputmode="numeric" min="0" max="99999" value="0"></label>
          </div>
          <label class="field" id="upi-wrap" hidden><span class="lab">Your UPI ID · money lands here</span><input id="f-ui" maxlength="50" placeholder="yourname@okhdfcbank"></label>
          <button class="btn" id="print">Print and send <span class="arr">→</span></button>
        </div>`;
      $("#f-u", stage).oninput = e => { $("#upi-wrap", stage).hidden = !(+e.target.value > 0); };
      $("#print", stage).onclick = async () => {
        const title = $("#f-t", stage).value.trim() || d.title;
        const concept = Object.assign({}, st.concept);
        if (concept.edition !== "commission") delete concept.html;
        const ev = {
          id: Store.uid(), slug: Store.slugify(title), title,
          tagline: concept.tagline, typeKey: st.brief.typeKey, concept,
          date: $("#f-d", stage).value, time: $("#f-h", stage).value || "19:30",
          venue: $("#f-v", stage).value.trim(), capacity: +$("#f-c", stage).value || 0,
          upiAmount: +$("#f-u", stage).value || 0, upiId: $("#f-ui", stage).value.trim(),
          hostName: S.profile.name, isMine: true, photo: st.photo,
          rsvps: [], updates: [], photos: [], createdAt: Date.now(),
        };
        const btn = $("#print", stage);
        btn.disabled = true; btn.textContent = "At the press…";
        if (Cloud.enabled) ev.cloudOk = !!(await Cloud.publish(ev));
        if (ev.cloudOk) ev.cloudId = ev.slug;
        S.events.unshift(ev);
        Store.note(`<b>You</b> sent out <i>${esc(ev.title)}</i>`);
        Store.save();
        haptic([14, 40, 14, 40, 30]);
        sent(ev);
      };
    }

    /* 6 · sent */
    function sent(ev) {
      const text = Engine.shareText(ev, linkFor(ev));
      stage.innerHTML = `
        <div class="sent">
          <span class="lab">Printed · ${esc(new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long" }))}</span>
          <div class="viewer-card" id="sv" style="margin-top:22px"></div>
          <h2>It's ready to send.</h2>
          <p>Guests open the link, see this card arrive in an envelope, and reply in one tap. No app, no sign-up.</p>
          <div class="msg">${esc(text).replace(/\*([^*]+)\*/g, "<b>$1</b>")}</div>
          <div class="stack" style="text-align:left">
            <button class="btn" id="wa">Send on WhatsApp</button>
            <div class="btn-row">
              <button class="btn btn-line" id="cp">Copy the link</button>
              <button class="btn btn-line" id="rg">The register</button>
            </div>
            ${Cloud.enabled && !ev.cloudOk ? `<p class="prose" style="margin:6px 0 0">The cloud didn't answer, so this link carries the whole invitation itself. Replies will reach you once it's back.</p>` : ""}
            ${!Cloud.enabled ? `<p class="prose" style="margin:6px 0 0">This copy of jalsa isn't connected to a cloud, so the link carries the invitation itself. Open it in another tab to see the guest side.</p>` : ""}
          </div>
        </div>`;
      Editions.mount($("#sv", stage), ev, ev.concept, { reveal: true });
      $("#wa", stage).onclick = () => shareEvent(ev);
      $("#cp", stage).onclick = () => { navigator.clipboard?.writeText(linkFor(ev)).then(() => toast("Link copied.")).catch(() => toast(linkFor(ev))); };
      $("#rg", stage).onclick = () => closeSheet(sh, () => { nav("upcoming"); openRegister(ev.id); });
    }
  }

  function compress(file, max = 900, q = .78) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(img.src);
        res(cv.toDataURL("image/jpeg", q));
      };
      img.onerror = () => res(null);
      img.src = URL.createObjectURL(file);
    });
  }

  /* ============================================================
     THE REGISTER — who's coming, live
     ============================================================ */
  function openRegister(id) {
    const ev = Store.ev(id);
    if (!ev) return;
    const sh = openSheet("The register", `<div class="c-pad" id="reg"></div>`, {
      tools: `<button class="textbtn" data-share>Send</button>`,
    });
    const root = $("#reg", sh);

    function paint() {
      const all = replies(ev);
      const c = counts(ev);
      const collected = all.filter(r => r.paid).length * (ev.upiAmount || 0);
      const maybes = all.filter(r => r.status === "maybe");
      root.innerHTML = `
        <span class="lab">${esc(when(ev))}</span>
        <h2 class="c-h" style="margin:8px 0 4px">${esc(ev.title)}</h2>
        <p class="c-sub" style="margin:0">${esc(ev.venue || "Venue to follow")}</p>
        <div class="tally">
          <div><b>${c.yes}</b><span class="lab">Accepted</span></div>
          <div><b>${c.maybe}</b><span class="lab">Pencilled</span></div>
          <div><b>${c.no}</b><span class="lab">Regrets</span></div>
        </div>
        ${ev.capacity ? `<div class="cap"><i style="width:${Math.min(100, c.yes / ev.capacity * 100)}%"></i></div>
          <p class="lab" style="margin-top:8px">${c.yes >= ev.capacity ? "Full house" : `${ev.capacity - c.yes} of ${ev.capacity} places left`}${ev.upiAmount ? ` · ₹${collected} collected` : ""}</p>` : ""}
        <div class="section" style="margin:28px 0 0"><h2>Replies</h2>
          <span class="lab ${Cloud.enabled && ev.cloudOk ? "live" : ""}">${Cloud.enabled && ev.cloudOk ? "Live" : "On this device"}</span></div>
        <div class="reg">
          ${all.length ? all.map((r, i) => `
            <div class="reg-row">
              <span class="n">${String(i + 1).padStart(2, "0")}</span>
              <span><span class="nm">${esc(r.name)}</span><br><span class="src">${r.src === "link" ? "replied through the link" : "from your circle"}${r.at ? " · " + timeAgo(new Date(r.at).getTime()) : ""}</span></span>
              ${stampHTML(r.status)}
              ${ev.upiAmount && r.status === "yes" && r.src !== "link" ? `<button class="paid ${r.paid ? "on" : ""}" data-paid="${i}">${r.paid ? "Paid" : "Due"}</button>` : "<span></span>"}
            </div>`).join("") : `<p class="prose" style="margin:16px 0">No replies yet. Send the link; the invitation does the persuading.</p>`}
        </div>
        <div class="stack" style="margin-top:22px">
          <button class="btn" data-share>Send on WhatsApp</button>
          <button class="btn btn-line" id="upd">Send everyone an update</button>
          ${maybes.length ? `<button class="btn btn-line" id="nudge">Nudge the ${maybes.length} pencilled in</button>` : ""}
          ${ev.upiAmount ? `<button class="btn btn-line" id="dues">Remind about the ₹${ev.upiAmount}</button>` : ""}
        </div>`;
    }
    paint();

    async function pull() {
      if (!(Cloud.enabled && ev.cloudOk)) return;
      const rows = await Cloud.getRsvps(ev.slug);
      if (JSON.stringify(rows) !== JSON.stringify(ev.cloudRsvps || [])) {
        const before = (ev.cloudRsvps || []).length;
        ev.cloudRsvps = rows; Store.save();
        if (rows.length > before && before > 0) { haptic([8, 30, 8]); toast(`${rows[rows.length - 1].name} just replied.`); }
        if (sh.isConnected) paint();
      }
    }
    pull();
    sh._poll = setInterval(pull, 8000);

    const wa = msg => open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
    sh.addEventListener("click", e => {
      if (e.target.closest("[data-share]")) { shareEvent(ev); return; }
      const p = e.target.closest("[data-paid]");
      if (p) { const r = ev.rsvps[+p.dataset.paid]; if (r) { r.paid = !r.paid; Store.save(); haptic(5); paint(); } return; }
      if (e.target.closest("#upd")) wa(`An update on *${ev.title}*:\n\n`);
      if (e.target.closest("#nudge")) wa(`A gentle nudge about *${ev.title}*, ${when(ev)}. Could you confirm when you get a moment?\n${linkFor(ev)}`);
      if (e.target.closest("#dues")) wa(`For *${ev.title}*: ₹${ev.upiAmount} a head, whenever you can. You can pay from the invitation:\n${linkFor(ev)}`);
    });
  }

  /* ============================================================
     AROUND TOWN — public listings
     ============================================================ */
  const CATS = ["Everything", "Gigs", "Workshops", "Food", "Film", "Markets", "Open mic", "Art", "Wellness"];
  let cat = "Everything";

  function renderTown() {
    const all = Store.town();
    const list = cat === "Everything" ? all : all.filter(e => e.category === cat);
    setScreen(`
      <header class="mast">
        <div class="mast-row">${WORDMARK}<span class="lab">Bengaluru</span></div>
        <h1>Around town</h1>
        <p>Public listings from venues this week, with a note when your circle's going.</p>
      </header>
      <div class="filters" id="cats">${CATS.map(c => `<button class="filter ${c === cat ? "on" : ""}" data-c="${c}">${c}</button>`).join("")}</div>
      <div class="board">
        ${list.map(ev => {
          const st = S.townState[ev.id];
          const cg = ev.circleGoing || [];
          return `<button class="pin" data-open="${ev.id}">
            <span data-thumb="${ev.id}"></span>
            <h4>${esc(ev.title)}</h4>
            <p>${esc(ev.venueName)} · ${esc(shortDate(ev))}</p>
            <span class="lab ${cg.length ? "circle" : ""}">${st === "going" ? "You're going" : cg.length ? `${esc(cg[0].name)}${cg.length > 1 ? " +" + (cg.length - 1) : ""} going` : ev.priceFrom ? "₹" + ev.priceFrom : "Free"}</span>
          </button>`;
        }).join("") || `<p class="prose">Nothing under ${esc(cat)} this week.</p>`}
      </div>`);
    mountThumbs();
    $("#cats").onclick = e => { const b = e.target.closest("[data-c]"); if (b) { cat = b.dataset.c; haptic(4); renderTown(); } };
    screen.onclick = e => { const o = e.target.closest("[data-open]"); if (o) openInvite(o.dataset.open); };
  }

  function openListing(ev, reveal) {
    const st = S.townState[ev.id];
    const cg = ev.circleGoing || [];
    const sh = openSheet(esc(ev.category), `
      <div class="viewer-card" id="card"></div>
      <div class="slip">
        <h2>${esc(ev.title)}</h2>
        <p class="by">${esc(ev.tagline)}</p>
        ${factsHTML(ev)}
        <div class="fact" style="cursor:default"><span class="lab">Entry</span><b>${ev.priceFrom ? "₹" + ev.priceFrom + ", at the door or online" : "Free. Just turn up."}</b><span></span></div>
        <div class="fact" style="cursor:default"><span class="lab">Going</span><b>${cg.length ? `${cg.map(c => esc(c.name)).join(", ")} from your circle, ` : ""}${ev.cityGoing + (st === "going" ? 1 : 0)} in all</b><span></span></div>
        <div class="gap"></div>
        <div class="btn-row">
          <button class="btn ${st === "going" ? "btn-line" : ""}" data-go>${st === "going" ? "Going ✓" : "I'm going"}</button>
          <button class="btn btn-line" data-save>${st === "saved" ? "Saved ✓" : "Save for later"}</button>
        </div>
        <div class="gap"></div>
        <button class="btn btn-line" data-fwd>Tell your circle</button>
      </div>`, { table: true });
    Editions.mount($("#card", sh), ev, ev.concept, { reveal });
    sh.addEventListener("click", e => {
      if (e.target.closest("[data-ics]")) downloadICS(ev);
      else if (e.target.closest("[data-maps]")) openMaps(ev.venue);
      else if (e.target.closest("[data-go]") || e.target.closest("[data-save]")) {
        const v = e.target.closest("[data-go]") ? "going" : "saved";
        if (S.townState[ev.id] === v) delete S.townState[ev.id];
        else {
          S.townState[ev.id] = v;
          if (v === "going") Store.note(`<b>You</b> are going to <i>${esc(ev.title)}</i> at ${esc(ev.venueName)}`);
        }
        Store.save(); haptic(8);
        closeSheet(sh, () => { refresh(); openListing(ev, false); });
      } else if (e.target.closest("[data-fwd]")) {
        const text = `*${ev.title}*\n${ev.tagline}\n\n${when(ev)}\n${ev.venue}\n${ev.priceFrom ? "₹" + ev.priceFrom : "Free"}\n\nShall we?`;
        if (navigator.share) navigator.share({ title: ev.title, text }).catch(() => {});
        else open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
      }
    });
  }

  /* ============================================================
     KEEPSAKES
     ============================================================ */
  function renderKept() {
    const past = Store.past();
    setScreen(`
      <header class="mast">
        <div class="mast-row">${WORDMARK}<span class="lab">${past.length} kept</span></div>
        <h1>Keepsakes</h1>
        <p>Every occasion keeps its invitation, its guest list and its photographs.</p>
      </header>
      <div class="shelf">
        ${past.map(ev => `
          <button class="keep" data-album="${ev.id}">
            <span data-thumb="${ev.id}"></span>
            <span>
              <span class="lab">${esc(Engine.longDate(ev))}</span>
              <h3>${esc(ev.title)}</h3>
              <p>${counts(ev).yes} were there · ${ev.photos.length ? ev.photos.length + " photographs" : "no photographs yet"}</p>
              ${ev.photos.length ? `<span class="contact">${ev.photos.slice(0, 6).map(p => `<i style="background-image:url('${p.src}')"></i>`).join("")}</span>` : `<span class="lab" style="display:block;margin-top:12px;color:var(--stamp)">Add the first →</span>`}
            </span>
          </button>`).join("") || `<div class="empty"><h3>Nothing kept yet.</h3><p>Once an occasion has happened, it moves here with its photographs.</p></div>`}
      </div>`);
    mountThumbs();
    screen.onclick = e => { const a = e.target.closest("[data-album]"); if (a) openAlbum(a.dataset.album); };
  }

  function openAlbum(id) {
    const ev = Store.ev(id);
    if (!ev) return;
    const sh = openSheet("Keepsake", `
      <div class="c-pad" style="padding-bottom:16px">
        <span class="lab">${esc(Engine.longDate(ev))} · ${esc(ev.venue)}</span>
        <h2 class="c-h" style="margin:8px 0 0">${esc(ev.title)}</h2>
      </div>
      <div class="sheetfilm">
        ${ev.photos.map((p, i) => `<span><img src="${p.src}" alt=""><span class="fno">${i + 1}A</span></span>`).join("")}
        <label for="add">+ Add</label>
      </div>
      <input type="file" id="add" accept="image/*" multiple hidden>
      <div class="c-pad">
        <div class="stack">
          ${ev.photos.length ? `<button class="btn" id="reel">Play it back</button>` : ""}
          <button class="btn btn-line" id="inv">The original invitation</button>
        </div>
        <p class="prose" style="margin:18px 0 0">${counts(ev).yes} people said yes: ${replies(ev).filter(r => r.status === "yes").map(r => esc(r.name)).join(", ") || "the guest list was kept private"}.</p>
      </div>`);
    $("#add", sh).onchange = async e => {
      const files = [...e.target.files].slice(0, 12);
      for (const f of files) { const src = await compress(f); if (src) ev.photos.push({ src }); }
      Store.save(); haptic(10);
      Store.note(`<b>You</b> added ${files.length} photograph${files.length > 1 ? "s" : ""} to <i>${esc(ev.title)}</i>`);
      closeSheet(sh, () => { refresh(); openAlbum(id); });
    };
    const reel = $("#reel", sh);
    if (reel) reel.onclick = () => playReel(ev);
    $("#inv", sh).onclick = () => closeSheet(sh, () => openInvite(ev.id));
  }

  function playReel(ev) {
    const caps = [ev.tagline, `${counts(ev).yes} people, one evening.`, "That's a wrap.", ev.title];
    const r = document.createElement("div");
    r.className = "reel";
    overlays.appendChild(r);
    let i = 0;
    const frame = () => {
      const p = ev.photos[i % ev.photos.length];
      r.innerHTML = `<div class="frame" style="background-image:url('${p.src}')"></div><span class="lab brand" style="color:#F3EFE7">jalsa · ${esc(ev.title)}</span><div class="cap">${esc(caps[i % caps.length])}</div>`;
      i++;
    };
    frame();
    const iv = setInterval(frame, 3200);
    r.onclick = () => { clearInterval(iv); r.remove(); };
  }

  /* ============================================================
     YOU
     ============================================================ */
  function renderYou() {
    const hosted = S.events.filter(e => e.isMine).length;
    const accepted = Object.values(S.myReplies).filter(v => v === "yes").length + Object.values(S.townState).filter(v => v === "going").length;
    const photos = S.events.reduce((a, e) => a + e.photos.length, 0);
    const picks = S.profile.picks || {};
    const total = Object.values(picks).reduce((a, b) => a + b, 0);
    const top = houseStyle();
    setScreen(`
      <header class="mast">
        <div class="mast-row">${WORDMARK}<span class="lab">Account</span></div>
      </header>
      <div class="you-card">
        <span class="lab">Printed on every invitation as</span>
        <div class="you-name">${esc(S.profile.name)}</div>
        <div class="ledger">
          <div><b>${hosted}</b><span class="lab">Hosted</span></div>
          <div><b>${accepted}</b><span class="lab">Accepted</span></div>
          <div><b>${photos}</b><span class="lab">Photos</span></div>
        </div>
      </div>
      <div class="section"><h2>Your house style</h2><span class="lab">${total} chosen</span></div>
      <ul class="style-list">
        ${Editions.LIST.map(k => {
          const ed = Editions.get(k), n = picks[k] || 0;
          return `<li><span class="no">Nº ${ed.no}</span><span class="nm">${ed.name}</span><span class="bar"><i style="width:${total ? n / total * 100 : 0}%"></i></span></li>`;
        }).join("")}
      </ul>
      <p class="prose">${top ? `You keep choosing <b>${Editions.get(top).name}</b>, so it comes up first when a brief could go either way.` : "Each proof you take teaches the press your taste. It leans on it when a brief could go either way."}</p>

      <div class="section"><h2>Colophon</h2></div>
      <p class="prose">Set in Bodoni Moda, Schibsted Grotesk and IBM Plex Mono, with Tiro Devanagari for the जलसा. The six editions are drawn from Indian print: letterpress cards, Sivakasi matchbox labels, single-screen cinema tickets, riso zines, telegram forms and the Polaroid. Commissions are drawn by Claude.</p>
      <p class="prose"><b>Jalsa Press.</b> Proprietor, compositor and night-shift printer: Jia Oswal. Est. Bengaluru, 2026.</p>
      <div class="pad" style="margin-top:22px">
        <div class="stack">
          <button class="btn btn-line" id="rename">Change your name</button>
          <button class="btn btn-line" id="install">Add jalsa to your home screen</button>
          <button class="link" id="reset" style="display:block;margin:14px auto 0">Start over on this device</button>
        </div>
      </div>
      <div class="gap"></div>`);
    $("#rename").onclick = () => renderOnboard(1);
    $("#install").onclick = () => window.installJalsa();
    $("#reset").onclick = () => { if (confirm("Clear every invitation, reply and photograph on this device?")) Store.reset(); };
  }

  /* ============================================================
     ARRIVAL — a guest opens the link
     ============================================================ */
  function renderArrival(ev) {
    tabbar.classList.add("hidden");
    overlays.innerHTML = "";
    const code = ev.cloudId || ev.slug;
    const mine = S.events.find(e => e.isMine && e.slug === ev.slug);
    const prior = S.guestReplies[code];
    const d = Editions.parts(ev);

    setScreen(`
      <div class="arrival">
        <div class="arr-top">${WORDMARK}<span class="lab">${mine ? "Your own invitation, as guests see it" : "An invitation"}</span></div>
        <div class="envelope-stage" id="es">
          <div class="env" id="env" role="button" tabindex="0" aria-label="Open the envelope">
            <div class="env-back"></div>
            <div class="env-card" id="ec"></div>
            <div class="env-front"></div>
            <div class="env-flap"></div>
            <div class="env-addr">For<b>you</b>with love from ${esc(ev.hostName)}</div>
            <div class="env-post">BENGALURU<br>${esc(d.dd)} ${esc((d.mo3 || "").toUpperCase())}<br>JALSA</div>
            <div class="env-seal">जलसा</div>
          </div>
          <div class="env-hint"><span class="lab">Tap to open</span><p>${esc(ev.hostName)} has sent you something.</p></div>
        </div>
      </div>`, { bare: true });
    Editions.mount($("#ec"), ev, ev.concept);

    const env = $("#env");
    const opened = () => {
      if (env.classList.contains("open")) return;
      env.classList.add("open");
      haptic([6, 60, 10]);
      $(".env-hint").style.opacity = 0;
      setTimeout(afterOpen, 1500);
    };
    env.onclick = opened;
    env.onkeydown = e => { if (e.key === "Enter" || e.key === " ") opened(); };
    if (prior) { afterOpen(); }

    function afterOpen() {
      const stage = $("#es");
      stage.outerHTML = `
        <div class="arr-after">
          <div class="viewer-card" id="card" style="margin-top:18px"></div>
          <div class="slip">
            <span class="lab">${esc(ev.hostName)} requests the pleasure of your company</span>
            <h2 style="margin-top:8px">${esc(ev.title)}</h2>
            <p class="by">${esc(ev.tagline)}</p>
            ${factsHTML(ev)}
            ${ev.upiAmount ? payHTML(ev) : ""}
            <div id="reply-slot"></div>
            <div id="convert"></div>
          </div>
        </div>`;
      Editions.mount($("#card"), ev, ev.concept, { reveal: !prior });
      $(".arrival").addEventListener("click", e => {
        if (e.target.closest("[data-ics]")) downloadICS(ev);
        else if (e.target.closest("[data-maps]")) openMaps(ev.venue);
        else if (e.target.closest("[data-pay]")) payUPI(ev, e.target.closest("[data-pay]"));
      });
      mountReply($("#reply-slot"), {
        current: prior, askName: true, name: S.profile.name,
        onReply: (status, name) => {
          S.guestReplies[code] = status;
          if (!S.profile.name) S.profile.name = name;
          if (mine) {
            // opened on the host's own device: put the reply straight in the register
            mine.rsvps.push({ name, hue: Engine.hashStr(name) % 360, status, src: "link", paid: false });
          }
          Store.save();
          if (Cloud.enabled && !mine) Cloud.rsvp(code, name, status);
          convert(status);
        },
      });
      if (prior) convert(prior);
    }

    function convert(status) {
      const line = status === "yes" ? `${ev.hostName} will see your name in the register.` : status === "no" ? `${ev.hostName} has been told, kindly.` : `${ev.hostName} knows you're trying.`;
      $("#convert").innerHTML = `
        <p class="prose" style="margin:18px 0 0;text-align:center">${esc(line)}</p>
        <div class="stack" style="margin-top:22px">
          ${status === "yes" && ev.date ? `<button class="btn btn-line" data-ics>Put it in my calendar</button>` : ""}
          <button class="btn" id="own">Make your own invitation <span class="arr">→</span></button>
          <button class="link" id="keep" style="display:block;margin:10px auto 0">Keep this in my jalsa</button>
        </div>
        <p class="lab" style="text-align:center;margin-top:28px">Printed by jalsa · An invitation press</p>`;
      $("#own").onclick = () => { clearHash(); haptic(8); if (S.profile.onboarded) { tabbar.classList.remove("hidden"); nav("upcoming"); openCreate(); } else { S._after = "new"; renderOnboard(0); } };
      $("#keep").onclick = () => {
        clearHash();
        const added = !mine && Store.addShared(Object.assign({}, ev, { cloudId: Cloud.enabled ? code : null }));
        if (added) { S.myReplies[S.events[0].id] = status; Store.save(); }
        toast(mine ? "That one's yours already." : added ? "Kept in your Upcoming." : "Already in your Upcoming.");
        if (S.profile.onboarded) { tabbar.classList.remove("hidden"); nav("upcoming"); } else renderOnboard(0);
      };
    }
  }

  function clearHash() { history.replaceState(null, "", location.pathname + location.search); }

  async function route() {
    const h = location.hash || "";
    const e = h.match(/[#&]e=([^&]+)/);
    const i = h.match(/[#&]i=([^&]+)/);
    if (e) {
      const code = decodeURIComponent(e[1]);
      tabbar.classList.add("hidden");
      setScreen(`<div class="arrival"><div class="arr-top">${WORDMARK}</div><div class="press"><div class="press-line">Fetching your invitation…</div></div></div>`, { bare: true });
      const ev = await Cloud.fetchEvent(code);
      if (ev) { renderArrival(ev); return true; }
      const local = S.events.find(x => x.slug === code);
      if (local) { renderArrival(local); return true; }
      toast("That invitation couldn't be found.");
      clearHash();
      return false;
    }
    if (i) {
      const ev = Store.decodeEvent(decodeURIComponent(i[1]));
      if (ev) { if (Cloud.enabled) ev.cloudId = ev.slug; renderArrival(ev); return true; }
    }
    return false;
  }
  addEventListener("hashchange", async () => { if (!(await route())) boot(); });

  /* ============================ PWA ========================== */
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(() => {});
  let installEvt = null;
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; });
  window.installJalsa = async () => {
    if (!installEvt) { toast("Use your browser's menu: Add to Home Screen."); return; }
    installEvt.prompt();
    await installEvt.userChoice.catch(() => {});
    installEvt = null;
  };

  /* keep the host's counts fresh in the background */
  async function syncReplies() {
    if (!Cloud.enabled) return;
    for (const ev of S.events.filter(e => e.isMine && e.cloudOk && !Store.isPast(e))) {
      ev.cloudRsvps = await Cloud.getRsvps(ev.slug);
    }
    Store.save();
    refresh();
  }

  /* ============================ boot ========================= */
  function boot() {
    if (!S.profile.onboarded) { renderOnboard(0); return; }
    tabbar.classList.remove("hidden");
    nav(current);
  }
  (async () => {
    if (await route()) return;
    boot();
    syncReplies();
  })();
})();
