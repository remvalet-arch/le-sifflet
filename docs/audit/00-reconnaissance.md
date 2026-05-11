# 00 — Reconnaissance (Phase 0)

> Photographie à l'instant T : 2026-05-11
> Branche active : `stage`

---

## 1. Stack technique

| Couche          | Technologie         | Version                                      | Notes                                                  |
| --------------- | ------------------- | -------------------------------------------- | ------------------------------------------------------ |
| Framework       | Next.js             | **16.2.3**                                   | App Router, RSC, Route Handlers                        |
| Runtime UI      | React / React DOM   | **19.2.4**                                   | Stable (pas RC)                                        |
| Langage         | TypeScript          | ^5                                           | `strict: true`, `noEmit`                               |
| Styling         | Tailwind CSS        | ^4                                           | PostCSS, tokens custom (`pitch-*`, `chalk`, `whistle`) |
| BaaS            | Supabase (SSR SDK)  | @supabase/ssr ^0.10.2 / supabase-js ^2.105.3 | Auth, DB (Postgres), Realtime, RLS                     |
| i18n            | next-intl           | ^4.11.0                                      | 5 langues : fr / en / de / es / it (~900 clés chacune) |
| Analytics       | PostHog JS          | ^1.372.10                                    | Cloud EU, v1.1 instrumenté                             |
| Toasts          | Sonner              | ^2.0.7                                       | —                                                      |
| UI primitives   | Radix UI (Tabs)     | ^1.1.13                                      | Usage minimal                                          |
| Icons           | Lucide React        | ^1.12.0                                      | —                                                      |
| Dates           | date-fns            | ^4.1.0                                       | —                                                      |
| Push notifs     | web-push            | ^3.6.7                                       | VAPID                                                  |
| OAuth           | @react-oauth/google | ^0.13.5                                      | Google uniquement                                      |
| Email           | Resend              | ^6.12.3                                      | Sprint recap + digests                                 |
| Tests E2E       | Playwright          | ^1.59.1                                      | 1 spec, global-setup.ts                                |
| Tests unitaires | Vitest              | ^4.1.5                                       | 2 fichiers test                                        |
| Linter          | ESLint              | ^9 + eslint-config-next                      | `eslint.config.mjs`                                    |
| Formatter       | Prettier            | ^3.8.3                                       | `.prettierrc` présent                                  |
| Déploiement     | Vercel              | —                                            | `vercel.json` (redirects uniquement)                   |
| Package manager | npm                 | lockfile v3 présent                          | —                                                      |

---

## 2. Arborescence haut niveau (3 niveaux)

```
le-sifflet/
├── src/
│   ├── app/                   # Routes Next.js App Router
│   │   ├── (app)/             # Routes protégées (lobby, match, profil, squads…)
│   │   ├── api/               # Route Handlers (admin/, cron/, alert, bet, push…)
│   │   ├── admin/             # Pages admin (resolve, cron-test, push-test…)
│   │   ├── auth/callback/     # OAuth PKCE exchange
│   │   ├── [de|en|es|it]/     # Landing pages localisées
│   │   └── page.tsx           # Landing FR (racine)
│   ├── components/            # Composants React
│   │   ├── match/             # LiveRoom, VotingModal, scoreboard, VAR…
│   │   ├── profile/           # Stats, historique paris, badges
│   │   ├── pronos/            # Système de pronostics
│   │   ├── squad/             # Ligues / squads / chat
│   │   ├── shop/              # Boutique boosters / cosmétiques
│   │   └── ui/                # Design system minimal (boutons, modales…)
│   ├── lib/                   # Utilitaires partagés
│   │   ├── supabase/          # server.ts, client.ts, admin.ts
│   │   ├── analytics.ts       # Types PostHog + wrappers
│   │   ├── economy/           # Logique économie (sifflets, boosters)
│   │   └── sports/            # Providers sportifs (API-Football, TSDB)
│   ├── services/              # Services d'import/sync API externes
│   ├── hooks/                 # React hooks custom
│   ├── contexts/              # LiveRoomContext
│   └── types/                 # database.ts (contrat Supabase SDK)
├── supabase/
│   ├── migrations/            # 114 migrations SQL (0001→0114)
│   └── seed.sql
├── messages/                  # Fichiers i18n JSON (fr/en/de/es/it)
├── tests/e2e/                 # Playwright (1 spec + global-setup)
├── scripts/                   # Utilitaires CLI (tsx) + sprint-recap.mjs
├── public/                    # Assets statiques + manifest PWA + sw.js
├── docs/                      # Documentation projet (PRD, RBAC, sprints…)
├── .skills/                   # 9 fichiers XML de compétences agents IA
└── .github/workflows/ci.yml   # Pipeline CI/CD
```

---

## 3. Points d'entrée

| Type               | Fichier / chemin                 | Rôle                                           |
| ------------------ | -------------------------------- | ---------------------------------------------- |
| Landing publique   | `src/app/page.tsx`               | Landing FR (non-authentifié)                   |
| App protégée       | `src/app/(app)/layout.tsx`       | Auth guard + fetch profil                      |
| Auth OAuth         | `src/app/auth/callback/route.ts` | Échange PKCE, setcookies                       |
| Middleware         | `src/middleware.ts`              | Refresh JWT, redirects protégées, RBAC admin   |
| PWA Service Worker | `public/sw.js`                   | Offline, push notifications                    |
| Workers cron       | `src/app/api/cron/*/route.ts`    | 17 crons déclarés (pas de `vercel.json` crons) |
| CI/CD              | `.github/workflows/ci.yml`       | Push/PR sur `main` : lint+typecheck+tests      |

---

## 4. Fichiers de configuration notables

| Fichier                       | Rôle                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| `.env.example`                | 15+ variables documentées (Supabase, VAPID, PostHog, API-Football, CRON_SECRET…)      |
| `.env.local`                  | Présent localement (non versionné)                                                    |
| `next.config.ts`              | next-intl plugin, remotePatterns images (TSDB, API-Football, Google avatars)          |
| `tsconfig.json`               | `strict: true`, path alias `@/*`                                                      |
| `eslint.config.mjs`           | Flat config ESLint 9                                                                  |
| `.prettierrc`                 | Formatter                                                                             |
| `vercel.json`                 | Redirect `le-sifflet.vercel.app → vartime.app` uniquement (pas de crons déclarés ici) |
| `playwright.config.ts`        | Config E2E                                                                            |
| `vitest.config.ts`            | Config unitaire                                                                       |
| `public/manifest.webmanifest` | PWA manifest                                                                          |
| `public/sw.js`                | Service worker offline + push                                                         |

---

## 5. Tests

| Type               | Fichiers                                               | État                                      |
| ------------------ | ------------------------------------------------------ | ----------------------------------------- |
| Unitaires (Vitest) | `src/lib/__tests__/stoppage.test.ts`, `scorer.test.ts` | 2 fichiers, logique métier ciblée         |
| E2E (Playwright)   | `tests/e2e/user-journey.spec.ts`                       | 1 spec full journey                       |
| CI                 | `.github/workflows/ci.yml`                             | lint + unit + e2e sur push/PR vers `main` |

---

## 6. Documentation existante

- `README.md` — présent (non inspecté en détail)
- `CLAUDE.md` / `AGENTS.md` — instructions agents IA, architecture de haut niveau
- `docs/` — PRD, RBAC, sprint summaries, cleanup backlog, analytics doc, audit TSDB
- `AI_LEARNINGS.md` — journal de pièges techniques
- `PROJECT_STATE.md` — état vivant du projet
- `GAME_MECHANICS.md`, `TECH_BIBLE.md`, `STRATEGY.md`, `TRAJECTOIRE.md` — vision produit

---

## 7. Volume du code

| Métrique                    | Valeur                                        |
| --------------------------- | --------------------------------------------- |
| Fichiers TypeScript/TSX     | **281**                                       |
| Lignes de code (src/)       | **~43 000**                                   |
| Migrations SQL              | **114** (0001→0114)                           |
| Fichiers i18n               | 5 langues × ~900 clés ≈ **4 499 lignes JSON** |
| Routes API (Route Handlers) | **~75** (admin/, cron/, public)               |
| Crons applicatifs           | **17** routes sous `/api/cron/`               |

---

## 8. Activité Git

| Métrique               | Valeur                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------- |
| Dernier commit         | 2026-05-11                                                                          |
| Premier commit visible | 2026-04-29                                                                          |
| Pic d'activité         | 90 commits le 2026-05-09, 71 le 2026-05-10                                          |
| Cadence totale         | **~240+ commits en 13 jours** — rythme très élevé                                   |
| Branche de travail     | `stage` → merge vers `main` via `npm run sprint:ship`                               |
| Branches actives       | `stage`, `main` + historique sprints (cleanup-rbac, sprint-2/3/4, sprint-ux-phase1) |

---

## 9. Points d'attention préliminaires (à approfondir en Phase 1)

1. **17 crons** définis comme routes Next.js mais **absents de `vercel.json`** → pas de planification déclarée localement, probablement configurée dans le dashboard Vercel (non vérifiable depuis le code)
2. **2 tests unitaires seulement** pour ~43 000 lignes de code — couverture très faible
3. **`SPORTSDB_API_KEY=459569` hardcodé** dans `.env.example` (clé API publique en clair dans un fichier versionné)
4. Stack très récente : Next.js 16, React 19, Tailwind v4, Vitest v4 — toutes en versions majeures récentes potentiellement instables

---

_Prêt pour la Phase 1 sur validation._
