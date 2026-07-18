-- ============================================================
-- NEXTRA AI — Admin panel schema, phase 7 (deal value + reporting)
-- Run this AFTER schema.sql, chatbot.sql, admin.sql, admin2–admin6.sql
-- Safe to re-run (idempotent).
-- ============================================================
--
-- admin6.sql gave leads a stage but no money, so the panel could say WHERE a
-- lead was and not WHAT it was worth — «چقدر در خط لوله‌ام پول هست؟» had no
-- answer. These three columns are what app/admin/reports/page.tsx needs:
-- amount_cad + expected_close drive the funnel and pipeline-value views, and
-- won_at is what makes monthly revenue possible at all (updated_at moves on
-- every edit, so it can't say when a deal actually closed). Written by
-- app/admin/leads/actions.ts; the reports page and lead form fail soft until
-- this runs.
--
-- Modeled on the deals table in siavash-smf/arkan-crm, flattened onto contacts:
-- that project separates leads → contacts + companies + deals, which is the
-- right shape when one person can hold several deals over time. Here one lead
-- is one potential engagement, so the stage and the value live on the lead.
-- (Its amounts are in toman; this business bills in Canadian dollars.)

-- ---------- DEAL VALUE on contacts ----------
-- numeric(12,2), not float: exact decimal arithmetic, and dollars have cents.
alter table public.contacts
  add column if not exists amount_cad numeric(12,2) not null default 0;
alter table public.contacts
  add column if not exists expected_close date;

-- Set when the stage first becomes 'won', cleared if it moves back out.
-- The monthly-revenue report groups on this.
alter table public.contacts
  add column if not exists won_at timestamptz;

alter table public.contacts drop constraint if exists contacts_amount_cad_check;
alter table public.contacts
  add constraint contacts_amount_cad_check
  check (amount_cad >= 0);

-- ---------- INDEXES ----------
-- Monthly revenue on app/admin/reports/page.tsx scans won leads by close date.
create index if not exists contacts_won_at_idx
  on public.contacts (won_at)
  where won_at is not null;

-- «تاریخ بستن نزدیک» ordering on the reports page.
create index if not exists contacts_expected_close_idx
  on public.contacts (expected_close)
  where expected_close is not null;
