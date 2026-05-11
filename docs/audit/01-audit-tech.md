# 01 — Audit Tech, Perf, Code & Sécurité

> Branche : `stage` — 2026-05-11

---

## 1.1 Stack & Architecture

### Schéma Mermaid

```mermaid
graph TD
    subgraph Client["Browser / PWA"]
        SW["Service Worker (public/sw.js)"]
        RC["React 19 Client Components"]
        PH["PostHog JS (EU)"]
    end

    subgraph Next["Next.js 16 (Vercel)"]
        RSC["Server Components (default)"]
        MW["Middleware (JWT refresh, RBAC)"]
        RH["Route Handlers /api/*"]
        CRON["Cron Routes /api/cron/* (17)"]
    end

    subgraph Supabase["Supabase (BaaS)"]
        AUTH["Auth (Google OAuth + PKCE)"]
        DB["Postgres (50+ tables, 114 migrations)"]
        RT["Realtime (WebSockets)"]
        RLS["Row Level Security"]
        RPC["Stored Procedures / RPC"]
    end

    subgraph External["Services externes"]
        AF["API-Football (sync live)"]
        TSDB["TheSportsDB (assets cosmétiques)"]
        RS["Resend (emails transactionnels)"]
        WP["Web Push (VAPID)"]
        TW["Twitter/X API v2"]
    end

    RC -->|cookies / JWT| MW
    RC -->|Realtime WS| RT
    RSC -->|server client| DB
    RH -->|admin client (service_role)| DB
    CRON -->|Bearer CRON_SECRET| RH
    RH -->|HTTP| AF
    RH -->|HTTP| TSDB
    RH -->|HTTP| RS
    RH -->|VAPID| WP
    RH -->|OAuth2 PKCE| TW
    SW -->|push events| WP
    RC -->|identify + capture| PH
```

### Pattern architectural

✅ **Observé** : Monolithe Next.js App Router avec Server Components par défaut. Pas de microservices, pas de couche hexagonale formelle. La logique métier est distribuée entre : Route Handlers (`src/app/api/`), Supabase RPCs (SECURITY DEFINER), Server Actions (`src/app/actions/`), et Services d'import (`src/services/`).

| Composant    | Description                                | Localisation                                                              |
| ------------ | ------------------------------------------ | ------------------------------------------------------------------------- |
| Auth guard   | Middleware JWT + redirect                  | `src/middleware.ts`                                                       |
| App shell    | Layout protégé, fetch profil, login streak | `src/app/(app)/layout.tsx`                                                |
| Betting core | RPC `place_bet` atomique                   | `supabase/migrations/0003_place_bet_rpc.sql` + `src/app/api/bet/route.ts` |
| Realtime     | 4 subscriptions Supabase Realtime          | `src/components/match/LiveRoom.tsx`                                       |
| Caching      | `unstable_cache` Next.js                   | `src/lib/cached-queries.ts`                                               |

---

## 1.2 Qualité du code

### Conventions de nommage

✅ **Observé** : Cohérente et exemplaire. PascalCase pour les composants, camelCase pour fonctions/variables, kebab-case pour fichiers, snake_case pour colonnes DB. Aliases `*Row` importés de `src/types/database.ts`.

### Typage

✅ **Observé** : `strict: true` dans `tsconfig.json`. Contrat de types Supabase complet dans `src/types/database.ts` (1834 lignes).

- **9 usages de `any`** dans le code source — la plupart dans des catch ou des types de payload JSON entrants, acceptable
- **24 directives `eslint-disable`** — faible pour 281 fichiers
- Aucun `@ts-ignore` ou `@ts-nocheck`

### Duplication

🤔 **Inféré** : La fonction `verifyCronBearer` est copiée-collée dans les 17 routes cron + certaines routes admin (`src/app/api/admin/sync-live/route.ts`) au lieu d'être extraite dans un utilitaire partagé. C'est la seule duplication structurelle notable.

### Complexité

🤔 **Inféré** : `src/app/api/cron/match-monitor/route.ts` est le fichier le plus long et complexe (orchestrateur complet : sync fixtures, events, stats, résolution). Difficile à tester isolément. Pas de "God class" identifiée.

### Gestion des erreurs

✅ **Observé** : Pattern uniforme `successResponse` / `errorResponse` dans tous les Route Handlers (`src/lib/api-response.ts:1`). Les RPCs Supabase retournent des messages d'erreur typés (`msg.includes("insufficient_balance")`) correctement interceptés dans `src/app/api/bet/route.ts:60-85`.

### Linter / Formatter

✅ **Observé** : ESLint 9 (flat config), Prettier configuré. Lancés via `npm run ai:check` avant tout commit selon `CLAUDE.md`.

---

## 1.3 Tests

### Inventaire

| Type               | Fichiers                                                                 | Couverture     |
| ------------------ | ------------------------------------------------------------------------ | -------------- |
| Unitaires (Vitest) | `src/lib/__tests__/stoppage.test.ts`, `src/lib/__tests__/scorer.test.ts` | **2 fichiers** |
| E2E (Playwright)   | `tests/e2e/user-journey.spec.ts`                                         | **1 spec**     |
| Intégration        | ❌ Absent                                                                | —              |
| Snapshot           | ❌ Absent                                                                | —              |

### Couverture estimée

🤔 **Inféré** : **< 5% de couverture** sur les 281 fichiers TS/TSX. Les 2 tests unitaires couvrent `stoppageResult` (logique métier du temps additionnel) et les helpers `expandScorers`/`resizeSlots`/`aggregateSlots` (interface pronostics). La logique critique (betting, odds parimutuel, push budget, streak) n'est pas testée.

### Tests manquants critiques — **P1**

- `src/app/api/bet/route.ts` — logique de validation du multiplicateur (tolérance `IMPLIED_ODDS_TOLERANCE`)
- `src/lib/resolve-event.ts` — résolution des événements VAR et paiement des gagnants
- `src/lib/odds.ts` — calcul des cotes parimutuel
- `src/lib/push-budget.ts` — throttling push (risque de doublons)
- `src/app/(app)/layout.tsx:38` — logique streak freeze

---

## 1.4 Performance

### Caching

✅ **Observé** : `unstable_cache` (Next.js) utilisé pour :

- Badges : TTL 3600s (`src/lib/cached-queries.ts:22`)
- Saison courante : TTL 300s (`src/lib/cached-queries.ts:32`)
- Matches lobby : TTL 30s (`src/lib/cached-queries.ts:50`)

### Requêtes DB

🤔 **Inféré** : Pas de N+1 visible dans les Server Components — les fetch sont bien groupés avec `Promise.all`. Dans `src/app/(app)/layout.tsx` : 2 requêtes séquentielles (profiles + DM threads) à chaque navigation protégée — potentiellement optimisable en une seule RPC.

### Rate limiting — **P1** (scalabilité)

🤔 **Inféré** : Le rate limiting est **basé sur une table Postgres** (`rate_limit_log`) et non sur Redis/Upstash/Vercel KV. Pour un trafic élevé, chaque requête rate-limitée génère une écriture DB (`src/lib/db-rate-limiter.ts:29`). La table grossit sans TTL/cleanup visible (voir audit data).

### Push budget

✅ **Observé** : `src/lib/push-budget.ts` implémente un budget de 3 pushs critiques/jour/user pour éviter le spam. Pattern correct.

### Bundle front

❓ **Non vérifiable** : Bundle size non mesurée (`.next/` non analysé ici). Tailwind v4 purge automatiquement les classes inutilisées.

---

## 1.5 Sécurité

### Authentification & Sessions

✅ **Observé** : Google OAuth via Supabase PKCE (`src/app/auth/callback/route.ts`). JWT refreshé à chaque requête par le middleware (`src/middleware.ts:32`). Cookies HTTPOnly gérés par `@supabase/ssr`.

### Autorisation (RBAC)

✅ **Observé** : Rôles `user | moderator | founder` sur `profiles.role` (migration `0106`). Les routes admin vérifient `isAdminRole()` (`src/lib/constants/permissions.ts`). Middleware RBAC sur `/admin/*` (`src/middleware.ts:60-73`).

**P1** : `GET /api/admin/health` est **public, sans auth** (`src/app/api/admin/health/route.ts:9` — commentaire "Public — no auth required"). Expose les compteurs de matchs live, événements ouverts, et pronos pending. Faible impact mais surface d'information non nécessaire.

### Secrets & Variables d'environnement

| Finding                                                                             | Localisation                 | Priorité |
| ----------------------------------------------------------------------------------- | ---------------------------- | -------- |
| `SPORTSDB_API_KEY=459569` hardcodé en clair dans `.env.example` (fichier versionné) | `.env.example:38`            | **P1**   |
| `TEST_USER_PASSWORD=S1fflet-E2E-2026!` en clair dans `.env.example`                 | `.env.example:28`            | **P2**   |
| `SUPABASE_SERVICE_ROLE_KEY` exposé via `NEXT_PUBLIC_*` ?                            | ❌ Non — correctement séparé | ✅       |
| `VAPID_PRIVATE_KEY` côté serveur uniquement                                         | ✅                           | ✅       |

### Validation des inputs

✅ **Observé** : Validation robuste sur `/api/bet` (types, entiers, min 10, unicité). Types whitelist sur `/api/alert` (`VALID_TYPES` array). Les RPCs Postgres ajoutent une couche de défense supplémentaire.

### Headers de sécurité — **P1**

❌ **Observé** : Aucun header de sécurité configuré dans `vercel.json` ou `next.config.ts`. Pas de CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy. Next.js applique quelques defaults mais sans CSP strict.

### CSRF / CORS

🤔 **Inféré** : Pas de CORS explicite. Les Route Handlers Next.js acceptent les requêtes cross-origin par défaut. La protection est assurée par le cookie Supabase HTTPOnly (impossible à lire par JS cross-origin) — acceptable pour une PWA mais à documenter.

### Logs sensibles

✅ **Observé** : Le logger (`src/lib/logger.ts`) structure les logs en JSON en prod, sans logging de tokens ou mots de passe visibles.

### Crons — Auth

✅ **Observé** : Les 17 routes cron utilisent `timingSafeEqual` pour vérifier `CRON_SECRET` (anti-timing-attack). Correct.

### Upload fichiers

✅ **Observé** : Aucun upload de fichiers utilisateur — non applicable.

---

## 1.6 CI/CD & Déploiement

| Aspect          | État                                                                   | Notes                                                                     |
| --------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Pipeline CI     | ✅ GitHub Actions                                                      | `.github/workflows/ci.yml`                                                |
| Déclenché sur   | `main` (push + PR)                                                     | ⚠️ **Pas sur `stage`** — la branche de dev quotidienne n'est pas couverte |
| Étapes CI       | Format + Lint + TypeCheck + Vitest + Playwright                        | —                                                                         |
| Secrets CI      | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` uniquement | `SUPABASE_SERVICE_ROLE_KEY` absent en CI → tests E2E sans service_role    |
| Déploiement     | Vercel (inféré)                                                        | Pas de config Vercel infra dans le repo                                   |
| Crons planifiés | ❓ **Dashboard Vercel uniquement**                                     | `vercel.json` ne contient **aucune** déclaration `crons`                  |
| Rollback        | ❓ Non documenté                                                       | Via Vercel dashboard (inféré)                                             |
| IaC             | ❌ Absent                                                              | Pas de Terraform, Pulumi, ni Vercel CLI config                            |
| Environnements  | ❓ dev/prod — staging non visible                                      |                                                                           |

**P1** : La CI ne tourne **pas sur la branche `stage`** qui est la branche de développement principale. Un code cassé peut rester sur `stage` jusqu'au merge vers `main`.

---

## 1.7 Tableau récapitulatif

| ID  | Catégorie | Finding                                                        | Localisation                      | Priorité | Effort |
| --- | --------- | -------------------------------------------------------------- | --------------------------------- | -------- | ------ |
| T1  | Sécurité  | `SPORTSDB_API_KEY` hardcodé dans `.env.example` versionné      | `.env.example:38`                 | **P1**   | XS     |
| T2  | Sécurité  | Aucun security header (CSP, HSTS, X-Frame)                     | `vercel.json`, `next.config.ts`   | **P1**   | S      |
| T3  | Sécurité  | `/api/admin/health` public — expose données opérationnelles    | `route.ts:9`                      | **P1**   | XS     |
| T4  | CI/CD     | CI ne s'exécute pas sur `stage`                                | `.github/workflows/ci.yml:4`      | **P1**   | XS     |
| T5  | Tests     | Couverture < 5% — logique métier critique non testée           | `src/lib/__tests__/`              | **P1**   | L      |
| T6  | Code      | `verifyCronBearer` dupliqué dans 17+ fichiers                  | `src/app/api/cron/*/route.ts`     | **P2**   | S      |
| T7  | Perf      | Rate limiting basé sur table Postgres sans TTL                 | `src/lib/db-rate-limiter.ts`      | **P2**   | M      |
| T8  | CI/CD     | Crons absents de `vercel.json` — configuration fantôme         | `vercel.json`                     | **P2**   | S      |
| T9  | Tests     | `TEST_USER_PASSWORD` en clair dans `.env.example`              | `.env.example:28`                 | **P2**   | XS     |
| T10 | Perf      | 2 requêtes DB séquentielles dans AppLayout à chaque navigation | `src/app/(app)/layout.tsx:78-101` | **P2**   | S      |

---

## Ce que je n'ai pas pu auditer

- **Bundle size réel** : non compilé en mode prod pendant cet audit
- **Requêtes Supabase côté Realtime** : impossibilité de mesurer la fréquence des reconnexions en prod
- **CVE npm** : `npm audit` non lancé (requiert install + réseau)
- **Performances réelles en prod** : pas d'accès aux métriques Vercel/Supabase
- **Cron schedule réel** : non visible dans `vercel.json`, uniquement dans le dashboard Vercel

## Questions ouvertes pour le mainteneur

1. Les 17 crons sont-ils tous déclarés dans le dashboard Vercel ? Avec quelles fréquences exactes ?
2. `GET /api/admin/health` est intentionnellement public ? Ou c'était temporaire ?
3. Y a-t-il un processus de rotation de `CRON_SECRET` et `VAPID_PRIVATE_KEY` ?
4. La CI Playwright E2E nécessite `SUPABASE_SERVICE_ROLE_KEY` pour fonctionner — comment tourne-t-elle sans lui en CI ?
5. Y a-t-il un Sentry ou équivalent prévu ? Le `TODO` dans `src/lib/logger.ts:28` est-il planifié ?
