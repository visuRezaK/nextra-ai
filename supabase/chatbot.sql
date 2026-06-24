-- ============================================================
-- CODE FIRST — AI Chatbot schema (Phase 1: brain + /chat)
-- Run this AFTER schema.sql, in:
--   Supabase Dashboard > SQL Editor > New query
-- Safe to re-run (idempotent).
-- ============================================================

-- pgvector for RAG embeddings
create extension if not exists vector;

-- ---------- CONTACTS (leads) ----------
-- Referenced by app/[locale]/book/actions.ts (submitContactAction) and by the
-- chatbot's captureLead tool. Defined here because it was missing from schema.sql.
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,                                   -- nullable: chatbot leads may give phone only
  phone text,
  message text,
  source text not null default 'web',          -- 'web' | 'chatbot'
  session_id uuid,                              -- chat_sessions.id when captured by the bot
  created_at timestamptz not null default now()
);

-- If `contacts` already existed (created earlier without these columns), bring it
-- up to date. All of these are no-ops when the column/state already matches.
alter table public.contacts add column if not exists source text not null default 'web';
alter table public.contacts add column if not exists session_id uuid;
alter table public.contacts alter column email drop not null;

alter table public.contacts enable row level security;
-- Inserts happen only via the service-role key (server-side). No public policies.

-- ---------- KB DOCUMENTS (RAG knowledge base) ----------
-- One row per content chunk (FAQ Q/A, marketing section, etc.).
-- 1536 dims = OpenAI text-embedding-3-small.
create table if not exists public.kb_documents (
  id uuid primary key default gen_random_uuid(),
  locale text not null,                         -- 'fa' | 'en'
  category text not null,                       -- 'faq' | 'service' | 'about' | ...
  title text,
  content text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.kb_documents enable row level security;
-- Read/write only via service role (retrieval runs server-side). No public policies.

-- Cosine-distance index for fast nearest-neighbour search.
create index if not exists kb_documents_embedding_idx
  on public.kb_documents
  using hnsw (embedding vector_cosine_ops);

create index if not exists kb_documents_locale_idx
  on public.kb_documents (locale);

-- ---------- match_kb RPC (vector similarity search) ----------
-- Returns the top matches for a query embedding, optionally filtered by locale.
create or replace function public.match_kb (
  query_embedding vector(1536),
  match_count int default 5,
  filter_locale text default null
)
returns table (
  id uuid,
  locale text,
  category text,
  title text,
  content text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.id,
    d.locale,
    d.category,
    d.title,
    d.content,
    1 - (d.embedding <=> query_embedding) as similarity
  from public.kb_documents d
  where d.embedding is not null
    and (filter_locale is null or d.locale = filter_locale)
  order by d.embedding <=> query_embedding
  limit match_count;
$$;

-- ---------- CHAT SESSIONS ----------
-- One row per conversation. Keyed by (channel, external_id):
--   web/widget -> anonymous cookie id; telegram -> chat id.
-- user_id is attached when a Supabase user is logged in, so long-term memory
-- can follow them across anonymous -> authenticated.
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  channel text not null default 'web'
    check (channel in ('web', 'telegram', 'widget')),
  external_id text not null,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (channel, external_id)
);

alter table public.chat_sessions enable row level security;

drop policy if exists "Sessions viewable by owner" on public.chat_sessions;
create policy "Sessions viewable by owner"
  on public.chat_sessions for select
  using (auth.uid() = user_id);

-- ---------- CHAT MESSAGES ----------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create index if not exists chat_messages_session_idx
  on public.chat_messages (session_id, created_at);

drop policy if exists "Messages viewable by session owner" on public.chat_messages;
create policy "Messages viewable by session owner"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id
        and s.user_id = auth.uid()
    )
  );

-- ---------- CHAT MEMORY (long-term, rolling) ----------
-- One row per session: a running summary + extracted facts the brain keeps
-- between turns and across reloads.
create table if not exists public.chat_memory (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.chat_sessions (id) on delete cascade,
  summary text,
  facts jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.chat_memory enable row level security;
-- Read/written only via service role (server-side). No public policies.
