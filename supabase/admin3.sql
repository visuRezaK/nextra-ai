-- ============================================================
-- NEXTRA AI — Admin panel schema, phase 3
-- Run this AFTER schema.sql, chatbot.sql, admin.sql and admin2.sql, in:
--   Supabase Dashboard > SQL Editor > New query
-- Safe to re-run (idempotent).
-- ============================================================

-- ---------- KB DOCUMENT SOURCE ----------
-- 'site'   = built from the i18n dictionaries by ingestAll() (wiped + rebuilt
--            on every re-ingest)
-- 'upload' = PDF/Word/URL documents added from the admin panel (preserved
--            across re-ingests)
alter table public.kb_documents
  add column if not exists source text not null default 'site';

create index if not exists kb_documents_source_idx
  on public.kb_documents (source);

-- ---------- HUMAN-OPERATOR HANDOFF on chat_sessions ----------
-- Set by the requestOperator chatbot tool; cleared (resolved) from the admin
-- panel. A session with requested_at and null resolved_at is "in the queue".
alter table public.chat_sessions
  add column if not exists handoff_requested_at timestamptz;
alter table public.chat_sessions
  add column if not exists handoff_resolved_at timestamptz;
