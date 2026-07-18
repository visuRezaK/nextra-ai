-- ============================================================
-- NEXTRA AI — Admin panel schema, phase 8 (normalized CRM core)
-- Run this AFTER schema.sql, chatbot.sql, admin.sql, admin2–admin7.sql
-- Safe to re-run (idempotent).
-- ============================================================
--
-- Phases 6–7 gave the leads queue a stage and a value flattened onto `contacts`.
-- This phase adds the classic normalized CRM around it — the shape a consulting
-- pipeline actually needs once one client can hold several engagements over
-- time. Modeled on siavash-smf/arkan-crm, adapted to THIS project's stack:
--
--   * `contacts` (already the intake queue that the 4 capture channels write to,
--     i.e. what arkan calls `leads`) stays as-is and gains `converted_at` +
--     `person_id`. Its capture flow is untouched.
--   * A lead is CONVERTED (app/admin/leads/[id] → convertLeadAction) into:
--       `people`    — the person (arkan's `contacts`; renamed to avoid colliding
--                     with our intake table of the same name)
--       `companies` — the org (find-or-create by name on convert)
--       `deals`     — the opportunity; stage + money live HERE now, not on the lead
--   * `activities` is the unified timeline (notes, calls, meetings, tasks, and
--     stage_change events) hanging off a person and/or deal.
--   * `pipeline_stages` is a CONFIG table (not an enum) so stages are editable;
--     a deal's open|won|lost status is derived from the stage's is_won/is_lost
--     flags by the server action, the same "set it from code" convention as
--     admin7's won_at (no triggers).
--
-- Every page reads the new columns/tables first and falls back when they're
-- missing, so this can be applied before or after the code deploys.

-- ---------- COMPANIES ----------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  website text,
  city text,
  size_label text,                              -- «۱–۱۰ نفر» etc., free text
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Convert does a case-insensitive find-or-create by name.
create index if not exists companies_name_lower_idx
  on public.companies (lower(name));

alter table public.companies enable row level security;
-- Read/write only via the service role from the admin panel. No public policies.

-- ---------- PEOPLE (converted contacts) ----------
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete set null,
  full_name text not null,
  phone text,
  email text,
  position text,
  source text not null default 'manual',        -- 'web' | 'chatbot' | 'voice' | 'manual'
  lead_id uuid references public.contacts (id) on delete set null,   -- the intake row it came from
  session_id uuid,                              -- chat session, for the 360° timeline
  notes text,
  ai_summary text,                              -- filled later by the AI phase
  ai_summary_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists people_company_id_idx on public.people (company_id);
create index if not exists people_lead_id_idx on public.people (lead_id) where lead_id is not null;
create index if not exists people_created_at_idx on public.people (created_at desc);

alter table public.people enable row level security;

-- ---------- PIPELINE STAGES (config, not enum) ----------
create table if not exists public.pipeline_stages (
  key text primary key,
  label_fa text not null,
  label_en text not null,
  position int not null,
  is_won boolean not null default false,
  is_lost boolean not null default false,
  created_at timestamptz not null default now()
);

-- Seed the default consulting pipeline. on conflict keeps labels/order fresh on
-- re-run without duplicating or resetting is_won/is_lost.
insert into public.pipeline_stages (key, label_fa, label_en, position, is_won, is_lost) values
  ('new',          'جدید',              'New',          1, false, false),
  ('reviewing',    'در حال بررسی',      'Reviewing',    2, false, false),
  ('consultation', 'جلسه مشاوره',       'Consultation', 3, false, false),
  ('proposal',     'ارسال پروپوزال',    'Proposal',     4, false, false),
  ('negotiation',  'مذاکره',            'Negotiation',  5, false, false),
  ('won',          'بسته‌شده (موفق)',   'Won',          6, true,  false),
  ('lost',         'بسته‌شده (ناموفق)', 'Lost',         7, false, true)
on conflict (key) do update set
  label_fa = excluded.label_fa,
  label_en = excluded.label_en,
  position = excluded.position,
  is_won = excluded.is_won,
  is_lost = excluded.is_lost;

alter table public.pipeline_stages enable row level security;

-- ---------- DEALS ----------
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  person_id uuid references public.people (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  stage_key text not null default 'new' references public.pipeline_stages (key),
  status text not null default 'open',          -- open | won | lost, derived from the stage flags
  amount_cad numeric(12,2) not null default 0,
  expected_close date,
  stage_entered_at timestamptz not null default now(),   -- for "days in stage" on the board
  won_at timestamptz,
  lost_at timestamptz,
  lost_reason text,
  owner_email text,
  ai_next_action text,                          -- filled later by the AI phase
  ai_next_action_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.deals drop constraint if exists deals_status_check;
alter table public.deals
  add constraint deals_status_check check (status in ('open', 'won', 'lost'));
alter table public.deals drop constraint if exists deals_amount_cad_check;
alter table public.deals
  add constraint deals_amount_cad_check check (amount_cad >= 0);

create index if not exists deals_stage_key_idx on public.deals (stage_key);
create index if not exists deals_person_id_idx on public.deals (person_id);
create index if not exists deals_status_idx on public.deals (status);
-- Monthly-revenue report groups won deals by close date.
create index if not exists deals_won_at_idx on public.deals (won_at) where won_at is not null;

alter table public.deals enable row level security;

-- ---------- ACTIVITIES (unified timeline) ----------
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.people (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete cascade,
  type text not null default 'note',            -- call | meeting | note | task | stage_change
  title text,
  body text,
  due_at timestamptz,                           -- tasks only
  done_at timestamptz,                          -- tasks only
  created_by text,                              -- actor email
  created_at timestamptz not null default now()
);

alter table public.activities drop constraint if exists activities_type_check;
alter table public.activities
  add constraint activities_type_check
  check (type in ('call', 'meeting', 'note', 'task', 'stage_change'));

create index if not exists activities_person_id_created_at_idx
  on public.activities (person_id, created_at desc);
create index if not exists activities_deal_id_created_at_idx
  on public.activities (deal_id, created_at desc);
-- Open tasks with a due date power the "overdue tasks" card + the tasks view.
create index if not exists activities_due_at_idx
  on public.activities (due_at) where due_at is not null and done_at is null;

alter table public.activities enable row level security;

-- ---------- LINK contacts (intake queue) → people ----------
-- A lead becomes 'converted' once promoted into a person. person_id lets the
-- lead list show a «مشاهدهٔ مخاطب» link instead of the Convert button.
alter table public.contacts
  add column if not exists converted_at timestamptz;
alter table public.contacts
  add column if not exists person_id uuid references public.people (id) on delete set null;
-- AI lead scoring, filled later by the AI phase.
alter table public.contacts
  add column if not exists ai_score int;
alter table public.contacts
  add column if not exists ai_score_rationale text;
alter table public.contacts
  add column if not exists ai_scored_at timestamptz;

create index if not exists contacts_person_id_idx
  on public.contacts (person_id) where person_id is not null;
