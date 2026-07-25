-- ============================================================
-- JALSA — Supabase setup
-- Run this ONCE in your Supabase project:
--   Dashboard → SQL Editor → New query → paste all → Run.
-- Creates the two tables the app needs and opens them for
-- anonymous read + insert (fine for a shareable-invite prototype).
-- ============================================================

-- Published invites. `data` holds the invite payload as JSON.
create table if not exists public.events (
  id          text primary key,
  slug        text,
  title       text,
  data        jsonb not null,
  created_at  timestamptz not null default now()
);

-- Guest RSVPs, one row per tap.
create table if not exists public.rsvps (
  id          bigint generated always as identity primary key,
  event_id    text not null references public.events(id) on delete cascade,
  name        text not null default 'A guest',
  status      text not null default 'yes',
  created_at  timestamptz not null default now()
);

create index if not exists rsvps_event_idx on public.rsvps (event_id);

-- Row-level security: the publishable key can only do what these allow.
alter table public.events enable row level security;
alter table public.rsvps  enable row level security;

-- Anyone with the link can read an invite and add/refresh one.
drop policy if exists "events read"   on public.events;
drop policy if exists "events insert" on public.events;
drop policy if exists "events update" on public.events;
create policy "events read"   on public.events for select using (true);
create policy "events insert" on public.events for insert with check (true);
create policy "events update" on public.events for update using (true) with check (true);

-- Anyone can read the headcount and add their own RSVP.
drop policy if exists "rsvps read"   on public.rsvps;
drop policy if exists "rsvps insert" on public.rsvps;
create policy "rsvps read"   on public.rsvps for select using (true);
create policy "rsvps insert" on public.rsvps for insert with check (true);
