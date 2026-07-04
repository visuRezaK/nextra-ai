-- ============================================================
-- NEXTRA AI — Admin panel schema, phase 2
-- Run this AFTER schema.sql, chatbot.sql and admin.sql, in:
--   Supabase Dashboard > SQL Editor > New query
-- Safe to re-run (idempotent).
-- ============================================================

-- ---------- STAFF ROLES ----------
-- Extend the role set: admin (all), editor (content: KB/persona),
-- operator (leads/conversations/feedback), viewer (read-only core pages).
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'admin', 'editor', 'operator', 'viewer'));

-- ---------- CHAT FEEDBACK (👍/👎 on assistant answers) ----------
-- Written by the public /api/chat/feedback route (service role). Keyed by
-- session rather than message id: the streaming client never sees DB ids,
-- so the rated Q/A pair is stored inline.
create table if not exists public.chat_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.chat_sessions (id) on delete set null,
  rating smallint not null check (rating in (-1, 1)),
  question text,
  answer text,
  comment text,
  locale text,
  created_at timestamptz not null default now()
);

alter table public.chat_feedback enable row level security;
-- Read/write only via service role. No public policies.

create index if not exists chat_feedback_created_idx
  on public.chat_feedback (created_at desc);

-- ---------- AUDIT LOG ----------
-- One row per mutating admin action (persona save, model change, re-ingest,
-- role change, telegram broadcast, ...). Written by lib/admin/audit.ts.
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  actor_email text,
  action text not null,
  target text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;
-- Read/write only via service role. No public policies.

create index if not exists audit_log_created_idx
  on public.audit_log (created_at desc);
