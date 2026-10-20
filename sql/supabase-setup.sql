-- ============================================================
-- jalsa — Supabase setup
-- Run once: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run.
--
-- What the publishable key can do, by design:
--   events : read any invite (links are unguessable slugs), add new ones.
--            No update, no delete — nobody can edit someone else's invite.
--   rsvps  : read replies, add a reply. No update, no delete.
-- ============================================================

create table if not exists public.events (
  id          text primary key,
  slug        text,
  title       text,
  data        jsonb not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.rsvps (
  id          bigint generated always as identity primary key,
  event_id    text not null references public.events(id) on delete cascade,
  name        text not null default 'A guest',
  status      text not null default 'yes',
  created_at  timestamptz not null default now()
);

create index if not exists rsvps_event_idx on public.rsvps (event_id);

alter table public.events enable row level security;
alter table public.rsvps  enable row level security;

drop policy if exists "events read"   on public.events;
drop policy if exists "events insert" on public.events;
drop policy if exists "events update" on public.events;   -- removed: anyone could rewrite any invite
create policy "events read"   on public.events for select using (true);
create policy "events insert" on public.events for insert with check (
  length(id) between 6 and 48
  and pg_column_size(data) < 400000                         -- invite + one compressed photo
);

drop policy if exists "rsvps read"   on public.rsvps;
drop policy if exists "rsvps insert" on public.rsvps;
create policy "rsvps read"   on public.rsvps for select using (true);
create policy "rsvps insert" on public.rsvps for insert with check (
  status in ('yes', 'maybe', 'no')
  and length(name) between 1 and 40
);
