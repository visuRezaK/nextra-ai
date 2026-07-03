-- ============================================================
-- NEXTRA AI — Admin panel schema
-- Run this AFTER schema.sql and chatbot.sql, in:
--   Supabase Dashboard > SQL Editor > New query
-- Safe to re-run (idempotent).
-- ============================================================

-- ---------- ADMIN ROLE on profiles ----------
alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

-- SECURITY: the existing "Profiles are updatable by owner" policy would let a
-- user UPDATE their own row — including role. Block the column at the grant
-- level so self-promotion via PostgREST is impossible.
revoke update (role) on public.profiles from anon, authenticated;

-- ---------- PROMPT VERSIONS (persona editor, versioned) ----------
-- The chatbot brain uses the row with is_active = true as its persona; when
-- the table is empty it falls back to the DEFAULT_PERSONA constant in code.
create table if not exists public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  note text,                                    -- optional label, e.g. "لحن رسمی‌تر"
  is_active boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.prompt_versions enable row level security;
-- Read/write only via service role (admin server actions + brain). No public policies.

-- At most one active version at a time.
create unique index if not exists prompt_versions_one_active
  on public.prompt_versions (is_active) where is_active;

-- ---------- MODEL CONFIG (singleton row) ----------
-- Gemini-only by design (direct Google AI Studio key, no Vercel billing).
create table if not exists public.model_config (
  id int primary key default 1 check (id = 1),
  chat_model text not null default 'gemini-2.5-flash'
    check (chat_model in ('gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro')),
  temperature real,                             -- null = provider default
  max_output_tokens int,                        -- null = provider default
  updated_at timestamptz not null default now()
);

alter table public.model_config enable row level security;
-- Read/write only via service role. No public policies.

insert into public.model_config (id) values (1) on conflict (id) do nothing;

-- ---------- TOKEN USAGE columns on chat_messages ----------
-- Populated by the brain's onFinish for assistant messages; nullable so old
-- rows and user messages are unaffected. Powers the admin dashboard.
alter table public.chat_messages add column if not exists model text;
alter table public.chat_messages add column if not exists tokens_in int;
alter table public.chat_messages add column if not exists tokens_out int;

-- ============================================================
-- MANUAL STEP (run once, replace the email if needed):
-- update public.profiles set role = 'admin' where email = 'mrk5677@gmail.com';
-- ============================================================
