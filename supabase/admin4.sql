-- ============================================================
-- NEXTRA AI — Admin panel schema, phase 4 (chatbot evaluation)
-- Run this AFTER schema.sql, chatbot.sql, admin.sql, admin2.sql, admin3.sql
-- Safe to re-run (idempotent).
-- ============================================================

-- ---------- GOLDEN SET (test questions) ----------
-- Categories (from the evaluation methodology):
--   kb        = answer exists in the knowledge base (tests correct answering)
--   out_of_kb = answer is NOT in the KB (tests honesty vs hallucination)
--   lead      = lead-capture path (tests asking for contact info)
--   edge      = edge cases: off-topic, angry user, role manipulation
create table if not exists public.eval_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  category text not null default 'kb'
    check (category in ('kb', 'out_of_kb', 'lead', 'edge')),
  expected text,                                -- expected behavior, for the judge
  locale text not null default 'fa' check (locale in ('fa', 'en')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.eval_questions enable row level security;
-- Service-role only. No public policies.

-- ---------- EVALUATION RUNS ----------
create table if not exists public.eval_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running'
    check (status in ('running', 'done', 'failed')),
  model text,                                   -- chat model active during the run
  judge_model text,
  question_count int not null default 0,
  totals jsonb not null default '{}'::jsonb,    -- {health, faithfulness, relevance, tone, retrieval}
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table public.eval_runs enable row level security;

create index if not exists eval_runs_started_idx
  on public.eval_runs (started_at desc);

-- ---------- PER-QUESTION RESULTS ----------
create table if not exists public.eval_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.eval_runs (id) on delete cascade,
  question_id uuid references public.eval_questions (id) on delete set null,
  question text not null,
  category text not null,
  answer text,
  retrieved jsonb not null default '[]'::jsonb, -- [{title, similarity}]
  scores jsonb not null default '{}'::jsonb,    -- {faithfulness, relevance, tone, retrieval} 0-10
  verdict text,                                 -- 'pass' | 'warn' | 'fail'
  judge_note text,
  created_at timestamptz not null default now()
);

alter table public.eval_results enable row level security;

create index if not exists eval_results_run_idx
  on public.eval_results (run_id);
