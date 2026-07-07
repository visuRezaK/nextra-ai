-- ============================================================
-- NEXTRA AI — Admin panel schema, phase 5 (evaluation by daily groups)
-- Run this AFTER schema.sql, chatbot.sql, admin.sql, admin2–admin4.sql
-- Safe to re-run (idempotent).
-- ============================================================
--
-- The free Gemini tier can't score the whole golden set in one day, so the
-- runner now evaluates ONE group of questions per run (one per day). Groups are
-- derived dynamically from question order (every GROUP_SIZE=8 active questions,
-- ordered by created_at, form a group) — no per-question column is needed. Each
-- run records which group number it covered so the health score can combine the
-- latest run of every group into one aggregate.

alter table public.eval_runs
  add column if not exists eval_group int;   -- 1-based group this run covered; null = legacy full run

-- Latest done run per group is looked up on every evaluation page load.
create index if not exists eval_runs_group_idx
  on public.eval_runs (eval_group, started_at desc);
