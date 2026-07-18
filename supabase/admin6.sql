-- ============================================================
-- NEXTRA AI — Admin panel schema, phase 6 (lead pipeline / CRM)
-- Run this AFTER schema.sql, chatbot.sql, admin.sql, admin2–admin5.sql
-- Safe to re-run (idempotent).
-- ============================================================
--
-- `contacts` was capture-only: the panel could list leads but not work them.
-- This adds the four fields a one-person consulting pipeline actually needs —
-- a stage, an owner, a next-follow-up date and a touched-at stamp — directly on
-- contacts, because app/admin/leads/page.tsx filters and orders by them on every
-- page load and a side table would cost a join there. Free-text notes go to a
-- separate append-only table instead: a single notes column would overwrite
-- history, and the same table doubles as the activity timeline on
-- app/admin/leads/[id]/page.tsx (status changes append a kind='status' row).
-- Both are written by app/admin/leads/actions.ts. Pages fail soft until this
-- runs, so it can be applied before or after the code deploys.

-- ---------- PIPELINE COLUMNS on contacts ----------
-- status defaults to 'new', so the four capture paths (book/actions.ts,
-- chatbot/tools.ts, voice/lead/route.ts, telegram via the same tool) keep
-- inserting without naming the column and every new lead lands in «جدید».
alter table public.contacts
  add column if not exists status text not null default 'new';
alter table public.contacts
  add column if not exists owner_id uuid references public.profiles (id) on delete set null;
alter table public.contacts
  add column if not exists next_follow_up_at timestamptz;
alter table public.contacts
  add column if not exists updated_at timestamptz not null default now();

-- Stage enum. Drop-then-add (rather than an inline check) keeps this re-runnable.
alter table public.contacts drop constraint if exists contacts_status_check;
alter table public.contacts
  add constraint contacts_status_check
  check (status in ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost'));

-- ---------- LEAD NOTES (notes + activity timeline) ----------
-- One row per note or logged touch. kind='status' rows are written automatically
-- by updateLeadAction when the stage changes, which is what makes the timeline on
-- the lead detail page a single query.
create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_email text,                            -- denormalized: timeline renders with no join
  kind text not null default 'note',            -- 'note' | 'status' | 'call' | 'email' | 'meeting'
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.lead_notes drop constraint if exists lead_notes_kind_check;
alter table public.lead_notes
  add constraint lead_notes_kind_check
  check (kind in ('note', 'status', 'call', 'email', 'meeting'));

alter table public.lead_notes enable row level security;
-- Read/write only via the service role from app/admin/leads/actions.ts, gated by
-- requireRole(['operator']). No public policies — same model as contacts.

-- ---------- INDEXES ----------
-- contacts had no indexes at all; the leads list is the only page that reads it hot.

-- Default order of app/admin/leads/page.tsx (no filter).
create index if not exists contacts_created_at_idx
  on public.contacts (created_at desc);

-- ?status= filter + default order on app/admin/leads/page.tsx, and the pipeline
-- counts on app/admin/page.tsx.
create index if not exists contacts_status_created_at_idx
  on public.contacts (status, created_at desc);

-- ?overdue=1 on the leads list and the «پیگیری‌های عقب‌افتاده» card on the
-- dashboard. Partial: most leads have no follow-up date set.
create index if not exists contacts_next_follow_up_at_idx
  on public.contacts (next_follow_up_at)
  where next_follow_up_at is not null;

-- app/admin/conversations/[id]/page.tsx looks up leads by session_id on every load.
create index if not exists contacts_session_id_idx
  on public.contacts (session_id)
  where session_id is not null;

-- Timeline on app/admin/leads/[id]/page.tsx.
create index if not exists lead_notes_contact_id_created_at_idx
  on public.lead_notes (contact_id, created_at desc);
