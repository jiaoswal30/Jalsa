# JALSA — the place your moments live

*The invite IS the event.*

A functional prototype of the JALSA app from the Brand & Product Document (2026), built as a
zero-install web app. The design system is implemented straight from the Design Intelligence
Report — three tiers, three studios: **WHISPER · FLEX · UNHINGED**.

## Run it

Double-click **`index.html`**. That's it — no build, no server, no dependencies.

Works best in Chrome/Edge. On a phone it goes full-screen; on desktop it renders in a phone
frame. Fonts load from Google Fonts (falls back to system fonts offline). All data lives in
`localStorage` on your device.

**Installable app (PWA).** When served over http(s) (e.g. GitHub Pages / Vercel), JALSA installs
to the home screen and works offline via a service worker. There's an **Install JALSA** button
under the You tab. (Service workers don't run on `file://`, so install only lights up when hosted.)

## The core loop (why this exists)

Per the PRD, JALSA's #1 growth engine is **The WhatsApp Link**:

```
TRIGGER   friend shares an invite link on WhatsApp
ACTION    non-user opens it → full-screen animated invite → RSVPs in ~10s
REWARD    "You're in" + the invite was genuinely beautiful
INVESTMENT "Plan yours on JALSA" → they host their own → repeat
```

That loop is **live and real**. Every share link is **self-contained**: the entire invite
(title, tagline, date, venue, host, design tier + palette) is encoded into the URL hash, so a
link opened on *any* device renders the exact invite with **no backend**. Open your own
published event's link in a new tab/incognito to experience the guest side.

> Honest limitation: with no server, a guest's RSVP can't sync back to the host's device.
> The guest *experience* and the conversion loop are fully real; cross-device RSVP sync is the
> first thing a Supabase backend would add (the PRD's exact stack).

## What's inside

| Feature | Where |
|---|---|
| **AI Invite Engine** — describe the event like you'd text it; the on-device vibe engine reads event type (16 Indian event types: Holi, dandiya, sangeet, rooftop, farewell…), energy, crowd size and names, then designs **3 animated invite concepts** across the tier system | tap **+** |
| **Live vibe read** — tokens appear as you type ("holi · chaotic good · 25 log") | create flow |
| **Generation theatre** — you watch the invite being made ("kerning aggressively…") | create flow |
| **The Reveal** — full-screen animated invite with staged spring-physics entrance | tap any event |
| **RSVP with teeth** — morphing Yes/Maybe/Can't buttons, capacity + auto-waitlist, haptics | feed & invite |
| **Circle feed** — upcoming events from your people only, countdowns, "3 spots left" pressure | Scene tab |
| **UPI collection** — real `upi://` deep links, per-guest paid tracking, "the venue does not accept vibes as payment" reminders | invite + host desk |
| **Host Desk** — live stats, capacity bar, guest list, paid toggles, broadcast updates, WhatsApp nudges for the "maybe" people | your events |
| **WhatsApp-native share** — auto-composed Hinglish share text, `wa.me` deep link, Web Share API | everywhere |
| **Add to calendar** — one-tap `.ics` download; tap venue → Google Maps | invite sheet |
| **Rewind** — permanent memory albums, photo upload (auto-compressed), auto-playing **memory reel** with Ken Burns | Rewind tab |
| **Taste profile** — the engine tracks which tier you pick and starts designing like you | You tab |
| **Pulse** — activity from your circle, no algorithm, no strangers | Pulse tab |
| **Guest Arrival** — open a shared link as a non-user: reveal → RSVP → convert | any invite link |
| **Self-contained share links** — the whole invite rides in the URL, backend-free | share anywhere |
| **Discover** — city-wide public events (gigs, workshops, markets, open mics) across 8 categories, with **circle-crossover FOMO** ("Sana +2 from your circle going"), venue attribution, ticket/price, Going/Save | Discover tab |
| **PWA** — installable, offline app shell via service worker | when hosted |

**Scene vs. Discover.** Scene is your circle only (no algorithm, no strangers). Discover is the
public city layer — the PRD's second growth vector and venue-commission revenue stream — kept
deliberately separate. Pulse (circle activity) moved to the 🔔 in the Scene header.

The circle is alive: seeded Bengaluru friends RSVP to your published events over the first
couple of minutes, so the host dopamine loop is real from event one.

## Files

```
index.html            shell + fonts + PWA meta
manifest.webmanifest  installable-app metadata
sw.js                 service worker (offline app shell)
icon.svg / icon-maskable.svg
css/app.css           app chrome (Midnight / Ember / Pearl / Marigold / Slate)
css/invites.css       the 3-tier invite design system + reveal animations
js/engine.js          vibe engine: text → design brief → 3 concepts
js/templates.js       invite renderers (editorial / poster / split / marquee / chaos / y2k / wall)
js/store.js           localStorage state, seeded circle + Discover events, link encode/decode
js/app.js             screens, flows, guest arrival, Discover, interactions
```

To start fresh: **You tab → Reset everything**.
