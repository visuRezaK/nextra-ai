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
The chatbot uses **Gemini 2.5 Flash** (direct Google AI Studio key, not Vercel billing). All models are configured in `lib/chatbot/models.ts`.

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

The chatbot widget (`components/chat/chat-widget.tsx`) is mounted in the locale layout and appears on every page.

### Auth & Database
Supabase handles auth (email/password + Google OAuth). Auth callback at `app/auth/callback/route.ts`. Server-side client at `lib/supabase/server.ts`, client-side at `lib/supabase/client.ts`.

Supabase tables used: `contacts` (leads from both booking form and chatbot), `chat_sessions`, `chat_messages`, `chat_memory`, `kb_documents` (pgvector, 1536-dim cosine).

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
