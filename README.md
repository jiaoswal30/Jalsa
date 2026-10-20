# jalsa — an invitation press

*jal·sa (n.) Hindustani. A gathering of people for celebration; the sort of evening that deserves a proper invitation.*

Describe a plan the way you'd text it: *"rooftop birthday for Ananya, sunset, twenty of us"*. jalsa reads the brief, sets three proofs in different printed editions, sends the result as a link that opens like an envelope, and keeps the guest list.

**Live:** `https://jiaoswal30.github.io/Jalsa/` · best on a phone.

---

## The idea

Most event apps look like event apps. jalsa is built as a **press** instead, and every part of it uses that vocabulary: *brief, proof, edition, ink, register, stamp*. The look follows from that:

- **Paper and ink.** Bone paper, fountain-pen black, the violet of an Indian office stamp pad, and vermilion kept for things that are live.
- **Type.** Bodoni Moda, Schibsted Grotesk, IBM Plex Mono, and Tiro Devanagari for जलसा.
- **Voice.** Old invitation wording, played straight: *Accepts with pleasure / Declines with regret / Will confirm shortly.* No emoji.

### The six editions

Each one borrows from a real Indian print tradition rather than "Indian" decoration.

| Nº | Edition | Drawn from |
|---|---|---|
| 01 | Letterpress | A debossed bone card with a wax seal |
| 02 | Sivakasi | Matchbox labels from Sivakasi, India's print capital: sunburst emblem, two misregistered plates |
| 03 | Talkies | A single-screen cinema ticket, with a perforated stub and a serial number |
| 04 | Riso | A riso zine: two fluorescent drums with overprint and halftone |
| 05 | Telegram | A typewritten telegram form that says STOP, with a PRIORITY stamp |
| 06 | Snapshot | Your own photograph, as a Polaroid taped to a coloured card |
| 00 | Commission | A one-off poster drawn by Claude for this brief only (needs the cloud) |

Each edition is sized entirely in container units (`cqw`), so one design scales from a thumbnail up to full screen.

## The loop

```
host types a brief → three proofs → corrections → particulars → link
guest opens the link → sealed envelope → card slides out → reply card → violet stamp
host's register updates live → nudge the "pencilled in" lot on WhatsApp → collect ₹ by UPI
```

A guest needs no app and no account, just their name.

## How it's built

Vanilla HTML, CSS and JS. No build step and no framework. It's hosted on GitHub Pages.

| File | Role |
|---|---|
| `js/engine.js` | Reads a brief on-device (occasion, energy, names, headcount, time of day) and picks three editions |
| `js/editions.js` | The six editions, plus the scaled mounting that keeps fine print legible in thumbnails |
| `js/app.js` | Screens and flows: onboarding, Upcoming, Town, Keepsakes, the create flow, the register, guest arrival |
| `js/store.js` | localStorage state, seed data, and the portable invite payload |
| `js/cloud.js` | Optional Supabase layer over PostgREST and `fetch`. It fails soft. |
| `js/ai.js` | Calls the studio and renders its HTML in a sandboxed `<iframe>` with scripts disabled |
| `supabase/functions/generate-invite` | Edge Function that calls Claude (Opus 5.5) |
| `sql/supabase-setup.sql` | Tables plus row-level security |

**Two modes.**

- **Offline** (no keys in `js/config.js`): the whole invite travels inside the link (`#i=…`). Guests see the full experience, and a reply made on the same device lands in the host's register.
- **Cloud** (keys filled in): links become short (`#e=slug`), replies sync across phones and the register polls every 8 seconds. The studio (AI commissions) also turns on.

### Security decisions

- **AI output is sandboxed.** Model-written HTML renders in `<iframe sandbox="">`: no scripts, no same-origin access. The function also strips any `<script>` before returning.
- **Invites can't be edited by others.** Invites are insert-only and there is no update policy, so nobody can rewrite someone else's invite. Slugs carry a random suffix.
- **Reply inserts are validated.** Inserts are checked by row-level security: status must be one of three values, the name has a length limit, and payload size is capped.
- **The AI endpoint is public but guarded.** It has an origin allow-list, input limits and a per-IP rate limit. Origins can be spoofed outside a browser, so the real limit is the monthly spend cap in the Anthropic Console.

## Run it locally

```bash
python3 -m http.server 8765      # or: npm run dev
# open http://localhost:8765
```

To reset, go to the You tab and choose *Start over on this device*.

## Turn on the cloud (optional)

1. Create a Supabase project. In the SQL Editor, run `sql/supabase-setup.sql`.
2. Paste the project URL and publishable key into `js/config.js`.
3. For the studio: set a monthly spend limit in the Anthropic Console first. Then run:
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-…
   supabase functions deploy generate-invite --no-verify-jwt
   ```
   If the site isn't served from `jiaoswal30.github.io`, also set `ALLOWED_ORIGINS`.

---

Designed and built by Jia Oswal with Claude Code. Bengaluru, 2026.
