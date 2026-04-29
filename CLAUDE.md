# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Vision

**Le Sifflet** is a mobile-first PWA "second screen" app for live football matches, targeting the 2026 World Cup. Users play the role of referee and bet virtual points ("Sifflets") on contentious in-game actions in real time.

- **Tone & design:** Immersive and tongue-in-cheek (think MPG — Mon Petit Gazon), tutoiement throughout, mobile-first UI with large tap targets.
- **Current MVP state:** Étapes 1–6 complete — Google OAuth, middleware, auto-generated profiles, sorted match lobby, live room with community alerts (Waze mechanic), real-time sync via Supabase Realtime, VotingModal with degressive odds, full bet resolution loop (auto + manual admin), Realtime win/loss notifications, and bet history profile page.

## Commands

```bash
npm run dev          # dev server (localhost:3000)
npm run build        # production build
npm run lint         # ESLint (eslint src/)
npm run typecheck    # tsc --noEmit
npm run format       # prettier --write .
```

No test framework is configured yet.

## Environment

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — Project Settings > API > service_role (never expose client-side)

## Code conventions

- **Server Components by default.** Add `"use client"` only when required (React hooks, interactivity, WebSockets/Realtime).
- **Route Handlers** (`src/app/api/.../route.ts`) for secure business logic — point manipulation, market creation, etc.
- **Supabase:** always use `@supabase/ssr`. Use `src/lib/supabase/server.ts` in Server Components, Server Actions, and Route Handlers; use `src/lib/supabase/client.ts` in Client Components.
- **Icons:** `lucide-react`.
- **Styling:** Tailwind CSS v4, mobile-first. Custom tokens: `pitch-800`/`pitch-900` (dark green backgrounds), `chalk` (light text), `whistle` (accent/yellow).

## Absolute rules (skills)

### 1. Auto-correction

Before declaring any task complete, run `npm run lint` and `npm run typecheck`. Fix all errors silently before reporting done.

### 2. Supabase typing

All database types live in `src/types/database.ts` — a `Database` interface following the Supabase SDK generic contract: each table has `Row`/`Insert`/`Update`/`Relationships: []`, and the schema has `Views`/`Functions` as `{ [_ in never]: never }`. Both Supabase clients (`server.ts`, `client.ts`) are typed with `createServerClient<Database>` / `createBrowserClient<Database>`. Import `*Row` aliases from `src/types/database.ts` — never use implicit types or `any` for database data.

### 3. API response format

All Route Handlers under `src/app/api/` must use `successResponse` / `errorResponse` from `src/lib/api-response.ts` to guarantee a uniform `{ ok, data|error }` shape.

### 4. Toast feedback (Sonner)

Any async action (API call) that succeeds or fails must trigger a toast via `import { toast } from "sonner"`. Use short, immersive French messages (e.g. `toast.success("Sifflet enregistré !")`, `toast.error("Doucement l'arbitre, attends un peu…")`). The `<Toaster />` is mounted in the root layout via `src/components/providers/ToasterProvider.tsx`.

## Architecture

### Route structure

- `/` — public landing page
- `/debug` — Supabase connection health check
- `/auth/callback` — OAuth PKCE exchange (`src/app/auth/callback/route.ts`)
- `/(app)/lobby` — match list (protected)
- `/(app)/match/[id]` — match room: scoreboard + `LiveRoom` (client) + `VotingModal` (client)
- `/(app)/profile` — profil joueur : solde, stats win/loss, historique des paris
- `/api/alert` — POST: inserts an `alert_signal`; if ≥ threshold signals of the same type in 15 s → creates a `market_event` + 3-min cooldown on the match (uses `service_role` admin client for INSERT/UPDATE)
- `/api/bet` — POST: validates and calls `place_bet` RPC (atomic debit + bet insert; enforces one bet per user/event via UNIQUE constraint)
- `/api/verify-event` — POST: checks event age (> 3 min), calls mock sports API (`src/lib/sports/sportsProvider.ts`), auto-resolves if result available
- `/api/admin/resolve-event` — POST: manual override to force OUI/NON on any open event
- `/admin/resolve` — admin UI listing open events with FORCER OUI / FORCER NON / Auto buttons

`LiveRoom` (props: `match`, `siffletsBalance`, `userId`) opens four Realtime subscriptions on mount: `matches` UPDATE (cooldown sync), `market_events` INSERT (triggers VotingModal), `market_events` UPDATE (closes modal when event resolves), `bets` UPDATE filtered by `user_id` (win/loss toast + balance update). It also queries for any already-open event on mount (for late joiners). Channel cleaned up on unmount.

The `(app)` route group layout (`src/app/(app)/layout.tsx`) acts as auth guard and fetches the user's `profiles` row (username + sifflets_balance) for the header.

### Auth flow

Google OAuth → Supabase → `/auth/callback` (PKCE code exchange, sets cookies) → `/lobby`. The middleware (`src/middleware.ts`) refreshes the JWT on every request and protects `/lobby` and `/match/*`.

### Server Actions

Located in `src/app/actions/`. Add new actions here as `"use server"` files.

## Database schema

Tables and key constraints (see `supabase/migrations/0001_init.sql`):

- `profiles` — one row per `auth.users`, auto-created by trigger on signup. `sifflets_balance` is **read-only from the client** (only `service_role` can modify it; enforced by RLS + grants).
- `matches` — `status` in `('upcoming', 'live', 'finished')`, `alert_cooldown_until` (throttles rapid signals). Clients can only SELECT.
- `alert_signals` — per-user signals on a match (`match_id`, `user_id`, `action_type`, `created_at`).
- `market_events` — betting events tied to a match, `type` in `('penalty', 'offside', 'card')`, `status` in `('open', 'locked', 'resolved')`.
- `bets` — user bets; users can only SELECT/INSERT their own rows.
- `rooms` / `room_members` — private rooms require an `invite_code`.

Realtime is enabled on `market_events`, `bets`, and `alert_signals`.

**Migrations to apply in Supabase SQL Editor (in order):**

- `0002_alert_signals.sql` — `alert_signals` table + `alert_cooldown_until` on `matches`
- `0003_place_bet_rpc.sql` — `place_bet(p_event_id, p_chosen_option, p_amount_staked)` SECURITY DEFINER function; handles balance debit + bet insert atomically with row-level locking; uses `auth.uid()` internally
- `0004_realtime_matches.sql` — REPLICA IDENTITY FULL on `matches` + adds to publication
- `0005_fix_realtime.sql` — REPLICA IDENTITY FULL on `market_events` + idempotent publication adds
- `0006_resolve_event.sql` — UNIQUE (user_id, event_id) on bets; REPLICA IDENTITY FULL on bets; `resolve_event(p_event_id, p_result)` SECURITY DEFINER function (resolves event + pays out winners atomically)

**Important:** All Realtime tables with RLS require `REPLICA IDENTITY FULL`. Without it, events are silently dropped for passive clients. Tables currently configured: `matches`, `market_events`, `bets`.

**Admin client (`src/lib/supabase/admin.ts`):** `createAdminClient()` uses `SUPABASE_SERVICE_ROLE_KEY` (never `NEXT_PUBLIC`_). Required for operations that bypass RLS: market_event INSERT in `/api/alert`, matches UPDATE for cooldown, `resolve_event` RPC call.

**Degressive odds in `place_bet`:** 0–10 s → ×2.0 · 11–45 s → ×1.5 · 46–90 s → ×1.1. Event expires after 90 s.

Seed data: run `supabase/seed.sql` in the Supabase SQL Editor to populate demo matches.