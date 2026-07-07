# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run lint     # ESLint
```

No test suite exists. Verify changes visually using the preview MCP tools.

## Architecture

**Next.js 16 App Router** with locale-based routing (`/fa`, `/en`). All pages live under `app/[locale]/`. Default locale is `fa` (RTL).

### Content / i18n
All user-facing copy lives in `lib/i18n/dictionaries/fa.json` and `en.json`. Every section on the home page is data-driven — changing those files changes the rendered site. The dictionary type is exported from `lib/i18n/dictionaries.ts` as `Dictionary`.

`components/site/sections.tsx` contains every home-page section as named exports (`Hero`, `Problem`, `Services`, `Featured`, `Transform`, `Audience`, `Why`, `About`, `Faq`). They take `dict` and `locale` props and are stateless. **Edit the JSON, not the component, for copy changes.**

The navbar (`components/site/navbar.tsx`) renders a two-line logo lockup: the brand name with the trailing word "Consulting" stripped, then "CONSULTING" in the accent eyebrow. This keeps the lockup visually correct for "Nextra AI / CONSULTING". The brand mark itself is an inline SVG (`Logo` in `components/icons.tsx`) — there is no image asset. Both the navbar and footer logo links carry `dir="ltr"` so the icon stays left of the wordmark even on the RTL Persian pages.

### Chatbot (RAG brain)
The chatbot runs on **Gemini** via a direct Google AI Studio key (not Vercel billing) — mind the **free-tier daily request quota**. `lib/chatbot/models.ts` holds the fallback default and the `ALLOWED_CHAT_MODELS` whitelist, but the **live chat model, temperature, and persona are runtime-configurable, not hardcoded**: `getRuntimeChatConfig()` (`lib/chatbot/config.ts`, 60s cache) reads them from the Supabase `model_config` and `prompt_versions` tables, edited from the admin panel. So the running model may differ from the default (e.g. `gemini-2.5-flash-lite`). Embeddings stay on `gemini-embedding-001` (1536-dim, truncated).

Request flow: `POST /api/chat/route.ts` → `lib/chatbot/brain.ts` (orchestrator):
1. Resolve/create session in Supabase (`chat_sessions`)
2. Vector search over `kb_documents` (`lib/chatbot/rag.ts` → `match_kb` RPC)
3. Build system prompt with persona + RAG context + rolling memory summary (`lib/chatbot/prompts.ts`)
4. Stream via AI SDK with `captureLead` tool (`lib/chatbot/tools.ts`) — writes to `contacts` table + emails owner via Resend
5. On finish: persist turn to `chat_messages`, refresh rolling summary in `chat_memory` (`lib/chatbot/memory.ts`)

**Critical:** The RAG knowledge base is built from the i18n dictionaries by `buildChunks()` in `lib/chatbot/ingest.ts`. After any change to `fa.json` or `en.json`, the KB must be re-ingested or the chatbot answers with stale data:
```
POST /api/admin/ingest
Header: x-ingest-secret: <INGEST_SECRET env var>
```
The response reports a per-locale chunk `count` — verify it changed as expected. **`buildChunks` only ingests dictionary keys it explicitly iterates** (e.g. `dict.faq.items`, `dict.chatbot_faq.items`, `dict.services.items`). Adding a *new* section to the JSON does nothing until you add a loop for it in `buildChunks` — and because the `Dictionary` type is derived from `en.json`, any new key must exist in **both** locale files or ingest/typecheck breaks. Display-only copy (e.g. `chat.suggestions` chips) does not need re-ingest.

The chatbot widget (`components/chat/chat-widget.tsx`) is mounted in the locale layout and appears on every page. The same `brain.ts` also backs a Telegram bot (`app/api/telegram/route.ts`) and an embeddable script, so keep it transport-agnostic.

**Evaluation:** `lib/chatbot/evaluate.ts` powers the admin golden-set quality check (`/admin/evaluation`). For each active `eval_questions` row it runs the REAL pipeline (retrieve → generate) then an LLM judge scores faithfulness / relevance / tone / retrieval. The runner is a background (`after()`) job that is **time-bounded, resumable across passes, and rate-limit-paced** — read the tuning constants at the top of the file (`MAX_QUESTIONS_PER_RUN`, `MIN_FLASH_GAP_MS`, `TIME_BUDGET_MS`) before changing them. A full run of the 32-question set exceeds the Gemini free-tier daily quota; the golden set is seeded from `SEED_QUESTIONS` in `app/admin/evaluation/actions.ts` (keep it in sync with `nextra-chatbot-test-set.md`).

Because the whole set can't be scored in one free-tier day, evaluation runs **in daily groups**: every `GROUP_SIZE` (8) active questions — ordered by `created_at` — form a group (32 → 4 groups), and each run scores exactly one group. Grouping is **derived from question order, not stored per question**; `eval_runs.eval_group` records which group a run covered (added by `supabase/admin5.sql`). The **امتیاز سلامت** on `/admin/evaluation` is `loadEvaluationOverview()`'s aggregate — it combines the *latest done run of each group* into one health score (scored-count-weighted metrics) and shows coverage like "۳ از ۴ دسته". Run one group per day until all are covered.

### Auth & Database
Supabase handles auth (email/password + Google OAuth). Auth callback at `app/auth/callback/route.ts`. Server-side client at `lib/supabase/server.ts`, client-side at `lib/supabase/client.ts`.

Supabase tables used: `contacts` (leads from both booking form and chatbot), `chat_sessions`, `chat_messages`, `chat_memory`, `kb_documents` (pgvector, 1536-dim cosine), plus `profiles` (staff roles), `model_config` / `prompt_versions` (runtime config), and `eval_questions` / `eval_runs` / `eval_results` (evaluation).

### Admin panel (`/admin`)
Persian-only staff panel, separate from the public `/[locale]` site. Access is role-based on `profiles.role` (`admin` / `editor` / `operator` / `viewer`) via `lib/admin/auth.ts`. **Every page and server action must call `requireRole([...])` / `requireAdmin()` before using the service-role client** (`lib/chatbot/supabase-admin.ts`); the gates fail closed, and `admin` is always allowed. Sections cover leads, conversations, feedback, knowledge-base uploads, persona, model config, prompt playground, evaluation, Telegram, the embeddable widget, and users. Mutations are recorded with `logAudit()` (`lib/admin/audit.ts`).

### Database migrations
Schema lives in `supabase/*.sql` (`schema.sql`, `chatbot.sql`, `admin.sql`, `admin2`–`admin5.sql`), applied **by hand in the Supabase SQL editor** — there is no migration tool. Files are idempotent and each admin phase adds one; a new table or feature does nothing (its pages/actions fail soft) until the corresponding SQL is run.

### Environment variables
Key vars needed locally (pull via `vercel env pull`):
- `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini chat + embeddings
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — chatbot brain (admin client)
- `INGEST_SECRET` — guards `/api/admin/ingest`
- `RESEND_API_KEY` / `LEAD_NOTIFY_EMAIL` — lead email alerts (optional)
- `NEXT_PUBLIC_SITE_URL` — canonical URL for OG tags

### Deployment
Hosted on Vercel (project `nextra-ai`, primary domain `nextra-ai-consulting.vercel.app`). `NEXT_PUBLIC_SITE_URL` is read at **build time** for OG/canonical tags — changing it in Vercel requires a redeploy (`vercel --prod`) before the new value takes effect.

### Styling
Tailwind CSS v4 (PostCSS plugin, no `tailwind.config`). Design tokens are CSS variables — see `app/globals.css`. RTL layout is handled via `dir="rtl"` on `<html>` for Persian. Fonts: Inter (Latin) + Vazirmatn (Arabic/Persian), both as CSS variables (`--font-inter`, `--font-vazir`).
