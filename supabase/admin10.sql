-- ============================================================
-- NEXTRA AI — Admin panel schema, phase 10 (email campaigns)
-- Run this AFTER schema.sql, chatbot.sql, admin.sql, admin2–admin9.sql
-- Safe to re-run (idempotent).
-- ============================================================
--
-- Human-in-the-loop email campaigns. A campaign targets a code-driven segment
-- (lib/admin/segments.ts) — lost leads, stale leads, lost deals, won customers —
-- capped at 20 recipients who have an email. On create, the segment is resolved
-- once and frozen into campaign_emails rows (one per recipient). Each email is
-- composed/reviewed by the operator (AI drafting is gated to a later phase) and
-- sent one at a time via Resend (lib/chatbot/notify.ts sendEmail). Pages fail
-- soft until this runs.

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  segment_key text not null,                     -- which segment (see lib/admin/segments.ts)
  goal text,                                     -- the brief; fed to AI drafting later
  status text not null default 'draft',          -- draft | sending | done
  created_by text,                               -- actor email
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.campaigns drop constraint if exists campaigns_status_check;
alter table public.campaigns
  add constraint campaigns_status_check check (status in ('draft', 'sending', 'done'));

create table if not exists public.campaign_emails (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  person_id uuid references public.people (id) on delete set null,
  lead_id uuid references public.contacts (id) on delete set null,
  to_name text not null,
  to_email text not null,
  context jsonb not null default '{}'::jsonb,     -- per-recipient facts for AI drafting
  subject text,
  body_text text,
  status text not null default 'pending',         -- pending | ready | skipped | sent | failed
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.campaign_emails drop constraint if exists campaign_emails_status_check;
alter table public.campaign_emails
  add constraint campaign_emails_status_check
  check (status in ('pending', 'ready', 'skipped', 'sent', 'failed'));

-- The campaign detail page lists its emails on every load.
create index if not exists campaign_emails_campaign_id_idx
  on public.campaign_emails (campaign_id, created_at);
create index if not exists campaigns_created_at_idx on public.campaigns (created_at desc);

alter table public.campaigns enable row level security;
alter table public.campaign_emails enable row level security;
-- Read/write only via the service role from the admin panel. No public policies.
