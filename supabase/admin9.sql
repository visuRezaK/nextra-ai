-- ============================================================
-- NEXTRA AI — Admin panel schema, phase 9 (contracts)
-- Run this AFTER schema.sql, chatbot.sql, admin.sql, admin2–admin8.sql
-- Safe to re-run (idempotent).
-- ============================================================
--
-- A deal that reaches «won» needs a document. This adds contracts generated
-- from a deal (party B = its person + company), authored in Markdown from the
-- Nextra consulting template (lib/admin/contracts.ts), and shared with the
-- client over a public, no-login page at /contract/[share_token].
--
-- The lifecycle is a status column, moved by app/admin/contracts/actions.ts:
--   draft  → sent (a share_token is minted) → viewed (stamped on the client's
--   first open of the public page) → accepted (client types their name) | canceled.
-- share_token is null until sent, so a draft has no reachable public URL. The
-- public page reads by token through the service-role client, so no RLS policy
-- is needed. Pages fail soft until this runs.

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  contract_no text unique,                      -- NX-<year>-<seq>, assigned on create
  title text not null,
  deal_id uuid references public.deals (id) on delete set null,
  person_id uuid references public.people (id) on delete set null,
  company_id uuid references public.companies (id) on delete set null,
  body_md text not null,
  amount_cad numeric(12,2) not null default 0,
  start_date date,
  duration_label text,
  status text not null default 'draft',          -- draft | sent | viewed | accepted | canceled
  share_token text unique,                       -- null until sent; the public URL key
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  accepted_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contracts drop constraint if exists contracts_status_check;
alter table public.contracts
  add constraint contracts_status_check
  check (status in ('draft', 'sent', 'viewed', 'accepted', 'canceled'));

alter table public.contracts drop constraint if exists contracts_amount_cad_check;
alter table public.contracts
  add constraint contracts_amount_cad_check check (amount_cad >= 0);

-- Public page looks a contract up by its token on every open.
create index if not exists contracts_share_token_idx
  on public.contracts (share_token) where share_token is not null;
create index if not exists contracts_deal_id_idx on public.contracts (deal_id);
create index if not exists contracts_created_at_idx on public.contracts (created_at desc);

alter table public.contracts enable row level security;
-- Read/write only via the service role: the admin panel (requireRole) and the
-- public page (keyed by the unguessable share_token). No public policies.
