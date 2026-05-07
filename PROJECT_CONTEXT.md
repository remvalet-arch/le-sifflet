# PROJECT_CONTEXT — VAR TIME

> Document de passation généré le 2026-05-07. Destiné à toute personne (humaine ou IA) reprenant le projet à froid.
> Pour les détails vivants (migrations, état exact des tables, bugs connus) → `PROJECT_STATE.md`.
> Pour les pièges techniques → `AI_LEARNINGS.md`.
> Pour le backlog de tâches → `TASKS.md`.

---

## 1. Vue d'ensemble du projet

**Nom :** VAR TIME (nom de code initial dans le repo : `le-sifflet`)

**Objectif :** PWA mobile-first "second écran" pour les matchs de football en direct. Les utilisateurs jouent le rôle d'arbitre-pronostiqueur : ils parient des points virtuels ("Pts" / "Sifflets") sur des actions litigieuses en temps réel (VAR, carton, penalty, but refusé) et font des pronostics avant chaque match (score exact, buteurs, résultat).

**Public cible :** Supporters de foot mobile-first, français en premier (puis internationalisation). Ton décalé et tutoiement systématique, références culturelles type MPG/Mon Petit Gazon. Horizon produit : Coupe du Monde 2026.

**Monnaie interne :** "Sifflets" (points fictifs). Aucune monnaie réelle, aucun gain pécuniaire.

**URL de déploiement :** Vercel (domaine VARTIME.\* non encore acheté — déployé provisoirement sous un domaine Vercel automatique).

---

## 2. Contexte & Genèse

**Pourquoi ce projet :** Combler le vide entre regarder un match en direct et une app de paris fictifs sociale. La mécanique d'alerte communautaire (type Waze) sur les actions VAR / penalties / cartons est le cœur de différenciation : les utilisateurs "signalent" une action, et si suffisamment de signaux arrivent → un événement de marché s'ouvre, et tout le monde a 90 secondes pour parier OUI ou NON.

**Historique des décisions clés (déductible des commits/migrations) :**

- Sprints 1-6 : socle auth Google, lobby matchs, live room, alertes communautaires, système de paris parimutuel, résolution auto + admin.
- Sprint 7 / "G" : Mode Championnat 1v1 en ligue (squads persistantes, `game_mode = braquage` ou `classic`).
- Sprint 8 : Pronos avant match (score exact + buteurs + Bunker 0-0), Push notifications VAPID, Contre-Pied bonus.
- Sprints H→K : Rétention (streak quotidien, récap post-match, nudge push), social (chat ligue, amis), complétude (pages légales, règles), polish.
- Sprints L→O : Robustesse (rate limiting, error boundary, ARIA), refactoring, tests E2E Playwright + CI GitHub Actions.
- Sprint D/E/F : Fix race condition auth Google, perf (Promise.all, ISR, index SQL), leaderboard par `lifetime_points_earned`.
- Sprint UX (Mai 2026) : Audit visuel complet — 18 corrections UX (identité VAR TIME, empty states, affordances, lisibilité).

---

## 3. PRD (Product Requirements Document)

### Fonctionnalités existantes et fonctionnelles

| Domaine                | Fonctionnalité                                                                                     | État                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Auth**               | Google OAuth PKCE, profil auto-créé au signup                                                      | ✅                                             |
| **Lobby**              | Liste matchs du jour (jour "Paris" = UTC-4h), filtres par championnat, groupés par ligue           | ✅                                             |
| **Live Room**          | Onglets Kop / Compo / Pronos (ou Stats), Realtime Supabase                                         | ✅                                             |
| **Alertes**            | Signaux communautaires Waze → market_event si seuil atteint, cooldown 15s                          | ✅                                             |
| **Paris VAR**          | Fenêtre 90s, cotes parimutuel en temps réel, slider + presets, résolution auto + admin             | ✅                                             |
| **Braquage**           | Mode ligue : mise commune intra-squad, redistribution entre membres                                | ✅                                             |
| **Pronos avant match** | Score exact + buteurs (allocation) + Bunker 0-0 ; verrouillés 45 min avant KO                      | ✅                                             |
| **Résolution**         | Auto via sync API-Football (fin de match) + admin manuel                                           | ✅                                             |
| **Ligues (Squads)**    | Création, rejoindre (code d'invitation), quitter, classement XP+Pts, chat                          | ✅                                             |
| **Mode Championnat**   | Round-robin automatique, journées aller+retour, résolution hebdo                                   | ✅                                             |
| **Profil**             | Solde, win rate, historique paris VAR + pronos, badges, trust score, amis                          | ✅                                             |
| **Trust Score**        | +2 pts alerte vraie / -5 fake ; grade d'Arbitre affiché                                            | ✅                                             |
| **Push VAPID**         | Alertes VAR, nudge pronos (squad), fin de match                                                    | ✅ (infra OK, résolution post-match manquante) |
| **Streak quotidien**   | Récompense connexion journalière, base badge "Fidèle au Poste"                                     | ✅ (migration OK, badge non encore déclenché)  |
| **Leaderboard**        | Global (lifetime points) + mensuel ; leaderboard par ligue                                         | ✅                                             |
| **Hub stats ligue**    | Classements, buteurs, passeurs (API-Football) dans le lobby                                        | ✅                                             |
| **PWA**                | Service Worker, manifest, install prompt, offline.html                                             | ✅                                             |
| **Pages légales**      | CGU, mentions légales, privacy policy, règles du jeu, lois IFAB                                    | ✅                                             |
| **Tests**              | E2E Playwright (connexion, prono, Bunker 0-0, profil) + tests unitaires vitest + CI GitHub Actions | ✅                                             |

### Fonctionnalités planifiées (backlog)

- **Capacitor (Cap-1 à Cap-6)** : Wrapping iOS/Android, push natif, soumission App Store / Google Play
- **i18n (Tâche 2X)** : Infrastructure `next-intl`, traductions FR/EN/ES/DE/IT (fichiers `messages/` présents, non branchés)
- **Push "VAR résolue"** : Notification gagnants/perdants après résolution (frein rétention #1)
- **Push "Fin de match + résultats pronos"** : Notification après `resolve_match_pronos`
- **Badge "Fidèle au Poste"** : Déclencheur `login_streak_3` à ajouter dans `checkAndUnlockBadges`
- **Avatars personnalisés** : Par grade d'Arbitre
- **Nettoyage fichiers orphelins** : ~22 fichiers `test-*.js` / `fix-ts.js` à la racine

### Cas d'usage clés

1. **Fan en direct** : Voit une faute litigieuse → signale → market_event s'ouvre → parie OUI/NON → reçoit les Sifflets ou en perd
2. **Pronostiqueur** : Avant le match → entre score exact + buteurs → à la fin du match → récompense calculée selon rareté du prono (Contre-Pied bonus)
3. **Groupe d'amis** : Crée une ligue "Braquage" → paris en commun → redistribution des Sifflets des perdants vers les gagnants de la squad
4. **Modérateur** : Résout manuellement les événements ambigus, gère les alertes abusives via trust score

---

## 4. Architecture technique

### Stack

| Couche              | Choix                                | Version |
| ------------------- | ------------------------------------ | ------- |
| Framework           | **Next.js** (App Router)             | 16.2.3  |
| UI                  | **React**                            | 19.2.4  |
| Styling             | **Tailwind CSS v4** + `lucide-react` | ^4      |
| Toasts              | `sonner`                             | ^2.0.7  |
| Auth & DB           | **Supabase** (`@supabase/ssr`)       | ^0.10.2 |
| Realtime            | Supabase Realtime (WebSocket)        | —       |
| Données live        | **API-Football** (api-sports.io v3)  | —       |
| Données cosmétiques | **TheSportsDB**                      | —       |
| Tabs UI             | `@radix-ui/react-tabs`               | ^1.1.13 |
| Dates               | `date-fns`                           | ^4.1.0  |
| Push                | `web-push` (VAPID)                   | ^3.6.7  |
| i18n                | `next-intl` (non branché)            | ^4.11.0 |
| Tests E2E           | `@playwright/test`                   | ^1.59.1 |
| Tests unitaires     | `vitest`                             | ^4.1.5  |
| Déploiement         | **Vercel**                           | —       |
| Langage             | **TypeScript**                       | ^5      |

### Structure des dossiers

```
le-sifflet/
├── src/
│   ├── app/
│   │   ├── (app)/              # Route group protégé (auth guard dans layout.tsx)
│   │   │   ├── lobby/          # Liste des matchs du jour
│   │   │   ├── match/[id]/     # Salle de match live (Kop, Compo, Pronos/Stats)
│   │   │   ├── profile/        # Profil utilisateur (onglets Profil/Historique/Badges/Amis)
│   │   │   ├── profile/[id]/   # Profil public d'un autre joueur
│   │   │   ├── ligues/         # Liste et création de ligues (squads)
│   │   │   ├── ligues/[id]/    # Détail d'une ligue (classement + chat)
│   │   │   ├── leaderboard/    # Classement global
│   │   │   ├── pronos/         # Hub pronostics avant match
│   │   │   ├── rules/          # Règles du jeu
│   │   │   └── laws/           # Lois IFAB
│   │   ├── admin/              # Interface admin résolution d'événements
│   │   ├── api/                # Route Handlers Next.js (logique métier sécurisée)
│   │   │   ├── alert/          # POST : signaux communautaires → market_event
│   │   │   ├── bet/            # POST : place_bet RPC (débit + insert atomique)
│   │   │   ├── squads/         # CRUD ligues + join + leave + nudge + var-alert
│   │   │   ├── admin/          # finish-match, resolve-event, sync-*, import-assets
│   │   │   ├── cron/           # match-monitor, prono-reminders, reset-monthly-points, sync-odds
│   │   │   ├── profile/        # PUT : update_profile RPC
│   │   │   ├── claim-daily-streak/  # POST : récompense connexion
│   │   │   ├── claim-rsa/      # POST : RSA du Parieur (recrédite 50 Pts si solde < 10)
│   │   │   ├── refill/         # POST : refill Sifflets admin
│   │   │   └── verify-event/   # POST : vérification auto via API-Football
│   │   ├── auth/callback/      # PKCE exchange OAuth
│   │   ├── actions/            # Server Actions (auth, badges, push, syncData)
│   │   ├── login/              # Page de connexion
│   │   └── page.tsx            # Landing page publique (marque VAR TIME)
│   ├── components/
│   │   ├── match/              # LiveRoom, Scoreboard, MatchTimeline, VotingModal, ActionDrawer…
│   │   ├── lobby/              # MatchLobby, MatchCard, LeagueHub, TopPlayersList…
│   │   ├── profile/            # ProfileClient, ProfileHeader, AmisContent, TrophyWall…
│   │   ├── pronos/             # PronosticsHubClient, MatchFilterBar, ScorerAllocationEditor…
│   │   ├── ligues/             # LiguesPageClient, SquadDetailClient, SquadLeaderboard, SquadChat…
│   │   ├── layout/             # Header, BottomNav, TopBar
│   │   ├── auth/               # SignInWithGoogleButton
│   │   ├── home/               # HomeAuthCtas
│   │   ├── onboarding/         # OnboardingTour
│   │   ├── pwa/                # InstallPrompt, PushOptIn, ServiceWorkerRegister
│   │   └── ui/                 # tabs.tsx (Radix), WhistleLogo
│   ├── lib/
│   │   ├── supabase/           # client.ts, server.ts, admin.ts (3 clients typés)
│   │   ├── api-response.ts     # { ok, data | error } — forme uniforme des API routes
│   │   ├── constants/          # alert.ts, economy.ts, odds.ts, permissions.ts, top-leagues.ts
│   │   ├── sports/             # sportsProvider.ts, api-football-market-bridge.ts
│   │   ├── colors.ts           # Couleurs équipes
│   │   ├── odds.ts             # convertOddToPoints (formule asymptotique)
│   │   ├── paris-day.ts        # Jour "Paris" (UTC-4h, évite coupure à minuit)
│   │   ├── resolve-event.ts    # Résolution parimutuel (admin)
│   │   └── …
│   ├── services/               # api-football-sync.ts, sportsdb-sync.ts, fixtures-import.ts…
│   ├── hooks/                  # useActiveSquad.ts (localStorage squad active)
│   ├── contexts/               # LiveRoomContext.tsx
│   ├── types/
│   │   ├── database.ts         # Types Supabase complets (Row/Insert/Update + RPCs)
│   │   └── lobby.ts            # LobbyMatchRow
│   └── middleware.ts           # Refresh JWT + protection routes
├── supabase/
│   └── migrations/             # 77 fichiers SQL versionnés (0001 → 0077)
├── scripts/                    # Import données, sync cotes, simulation scénario
├── tests/e2e/                  # Playwright
├── public/                     # sw.js, manifest.webmanifest, offline.html, icons
├── messages/                   # Fichiers i18n (fr/en/es/de/it) — non branchés
├── docs/                       # PRD.md, audit TheSportsDB
├── .skills/                    # Fichiers de compétences pour agents IA
├── CLAUDE.md                   # Instructions agents IA (règles absolues)
├── AGENTS.md                   # Instructions agents IA (skills + memory)
├── PROJECT_STATE.md            # Documentation vivante (architecture + migrations + état)
├── AI_LEARNINGS.md             # Pièges et bugs connus du projet
├── TASKS.md                    # Backlog complet (sprints A→UX4)
├── TECH_BIBLE.md               # Référence technique détaillée
└── V-CODER_GUIDE.md            # Guide workflow V-Coding pour agents autonomes
```

### Patterns architecturaux

- **Server Components par défaut** : `"use client"` uniquement quand nécessaire (hooks, Realtime, interactivité)
- **Route Handlers** pour la logique métier sécurisée (jamais de manipulation de solde côté client)
- **3 clients Supabase** : `server.ts` (Server Components/Actions), `client.ts` (Client Components), `admin.ts` (service_role, bypass RLS)
- **RPCs PostgreSQL SECURITY DEFINER** pour les opérations atomiques (place_bet, resolve_event, resolve_match_pronos…)
- **Response uniforme** : `{ ok: boolean, data?: T, error?: string }` via `src/lib/api-response.ts`
- **Realtime** : `REPLICA IDENTITY FULL` obligatoire sur toutes les tables Realtime (sinon événements silencieusement droppés)

### Base de données

**Supabase (PostgreSQL)** — 77 migrations versionnées.

Tables principales :

- `profiles` — utilisateurs (solde `sifflets_balance`, `xp`, `rank`, `trust_score`, `lifetime_points_earned`, `login_streak`)
- `matches` — matchs (statut, scores, `start_time`, `has_lineups`, `alert_cooldown_until`)
- `market_events` — événements à parier (type, statut `open/locked/closed/resolved`, résultat)
- `bets` — paris VAR (UNIQUE `user_id + event_id`)
- `pronos` — pronostics avant match (`score exact / scorer / scorer_allocation`, Contre-Pied bonus)
- `alert_signals` — signaux communautaires par match
- `match_timeline_events` — timeline officielle (buts, cartons, remplacements)
- `squads` + `squad_members` — ligues privées (game_mode `classic` / `braquage`)
- `squad_messages` — chat des ligues
- `friend_requests` — système d'amis (`pending / accepted / rejected`)
- `push_subscriptions` — endpoints VAPID Web Push
- `match_subscriptions` — abonnements notifications par match
- `league_standings` + `league_top_players` — stats API-Football (classements, buteurs)
- `badges` + `user_badges` — système de trophées

### Services externes

| Service                      | Usage                                                 | Clé env                                                                                  |
| ---------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Supabase                     | Auth, DB, Realtime                                    | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| API-Football (api-sports.io) | Données live : fixtures, events, lineups, stats, odds | `API_FOOTBALL_KEY`                                                                       |
| TheSportsDB                  | Assets cosmétiques (logos équipes, compétitions)      | `THESPORTSDB_API_KEY`                                                                    |
| Google OAuth                 | Authentification                                      | `NEXT_PUBLIC_GOOGLE_CLIENT_ID`                                                           |
| VAPID (Web Push)             | Notifications push                                    | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT`                     |
| Vercel                       | Déploiement + Cron jobs                               | `CRON_SECRET`                                                                            |

---

## 5. État d'avancement

### Implémenté et fonctionnel

- Auth Google complète + middleware protection routes
- Lobby matchs (8 ligues : Top 5 + 3 coupes UEFA), jour Paris, vue par journée
- Cron `match-monitor` : sync fixtures batch + timeline live + stats 5 min + lineups + résolution FT
- Salle de match : Kop (timeline + alertes), Compo (terrain interactif), Pronos/Stats
- Paris VAR : parimutuel temps réel, braquage intra-squad, résolution + notifications
- Pronos avant match complets (score exact, buteurs, Bunker 0-0, résolution auto)
- Ligues (squads) : mode classic + braquage, championnat 1v1, chat, nudge
- Profil complet : historique, badges (TrophyWall), trust score, amis, streak
- Leaderboard global (lifetime points) + mensuel + par ligue
- Hub stats championnat (classements, buteurs, passeurs)
- Push VAPID infra (alertes VAR, nudge pronos)
- PWA (SW + manifest + install prompt)
- Pages légales, règles du jeu, lois IFAB
- Tests E2E Playwright + tests unitaires vitest + CI GitHub Actions

### Points d'attention / incomplets

| Sujet                                 | Détail                                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Push post-résolution**              | Les gagnants/perdants ne reçoivent pas de notif après résolution VAR ni après `resolve_match_pronos` — frein rétention #1 |
| **Badge "Fidèle au Poste"**           | Migration `0065` OK, mais `checkAndUnlockBadges` n'a pas encore le case `login_streak_3`                                  |
| **Migrations non appliquées en prod** | Vérifier que `0062` → `0077` sont toutes appliquées dans le SQL Editor Supabase                                           |
| **`long_term_bets` legacy**           | Table encore en base (plus d'UI), à dropper si 0 ligne                                                                    |
| **Fichiers orphelins**                | ~22 fichiers `test-*.js` / `fix-ts.js` à la racine du projet                                                              |
| **i18n**                              | Fichiers `messages/` et infra `next-intl` présents mais non branchés                                                      |
| **Capacitor**                         | Non démarré (Cap-1 à Cap-6 dans TASKS.md)                                                                                 |
| **Temps de chargement**               | Signalé par l'utilisateur — suspect : requêtes Supabase non parallélisées sur certaines pages, images non optimisées      |

---

## 6. Configuration & Setup

### Variables d'environnement (`.env.local`)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # JAMAIS exposé côté client

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com

# API-Football (api-sports.io)
API_FOOTBALL_KEY=xxx

# TheSportsDB
THESPORTSDB_API_KEY=xxx

# Web Push VAPID
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BN...
VAPID_PRIVATE_KEY=xxx
VAPID_CONTACT=mailto:xxx@xxx.com

# Cron (Vercel)
CRON_SECRET=xxx
```

### Commandes principales

```bash
npm install          # Installation des dépendances
npm run dev          # Dev server (localhost:3000)
npm run build        # Build production
npm run lint         # ESLint sur src/
npm run typecheck    # tsc --noEmit
npm run format       # Prettier --write .
npm run ai:check     # format + lint + typecheck (à lancer avant tout commit)
npm run ai:verify    # ai:check + tests E2E Playwright
npm run test:unit    # Tests unitaires vitest
npm run test:e2e     # Tests E2E Playwright (nécessite dev server actif)
npm run sync:odds    # Sync des cotes depuis API-Football
npm run test:backend # Simulation scénario match (scripts/simulate-match-scenario.ts)
```

### Prérequis

- Node.js ≥ 20
- Compte Supabase avec projet configuré (appliquer toutes les migrations dans l'ordre)
- Compte API-Football (api-sports.io) avec clé active
- Compte Google Cloud (OAuth 2.0 Client ID)

---

## 7. Conventions & Choix de design

### Conventions de code

- **TypeScript strict** — tous les types DB importés depuis `src/types/database.ts` ; jamais de `any` pour les données DB
- **`*Row` aliases** — utiliser `ProfileRow`, `MatchRow`, etc. depuis `database.ts`
- **API shape uniforme** — toutes les routes `src/app/api/` utilisent `successResponse` / `errorResponse` de `src/lib/api-response.ts`
- **Toasts Sonner** — toute action async (succès ou échec) déclenche un toast ; messages courts en français tutoiement
- **Server Components par défaut** — `"use client"` uniquement quand indispensable
- **Pas de commentaires inutiles** — uniquement si le WHY n'est pas évident
- **Icons** — `lucide-react` exclusivement
- **Styling** — Tailwind v4, mobile-first. Tokens custom : `pitch-800`/`pitch-900` (fonds vert sombre), `chalk` (texte clair), `whistle` (accent jaune)

### Décisions techniques importantes

| Décision                                                  | Justification                                                                                                                           |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `service_role` pour les agrégations multi-users           | RLS filtre silencieusement les données des autres users — sans admin client, les classements de ligue affichent tout le monde à 0       |
| RPCs PostgreSQL SECURITY DEFINER                          | Opérations atomiques (débit + insert) impossibles à sécuriser depuis le client                                                          |
| `REPLICA IDENTITY FULL` obligatoire                       | Sans ça, Supabase Realtime droppe silencieusement les événements pour les clients qui filtrent hors PK                                  |
| Objet JS brut (pas stringify) pour les JSONB RPC          | Le client Supabase sérialise en JSONB — `JSON.stringify` double avant cause des erreurs silencieuses de cast                            |
| Jour "Paris" (UTC-4h) dans le lobby                       | Évite la coupure à minuit UTC (les matchs du soir à 23h UTC appartiennent au "jour du lendemain" côté UTC mais au même jour côté Paris) |
| `admin` client dans `/api/squads/[squadId]`               | Le classement ligue doit voir les paris/pronos de TOUS les membres, pas seulement ceux de l'utilisateur courant                         |
| `Date.now()` dans `useState`, pas dans le scope principal | React 19 est ultra-strict sur la pureté des composants                                                                                  |

### Ce qu'il faut ÉVITER (pièges connus)

1. **Ne pas oublier `/profile/[id]/page.tsx`** quand on modifie les props de `ProfileClient` — c'est une page parallèle que le TypeScript ne détecte pas immédiatement
2. **Ne pas supprimer une prop** passée depuis plusieurs pages — rendre optionnelle plutôt que de supprimer
3. **Ne pas utiliser `ilike` sur les noms d'équipe** pour des jointures — utiliser les foreign keys strictes (`team_id`)
4. **Ne pas appeler `Date.now()` / `new Date()` directement** dans le scope principal d'un composant — encapsuler dans `useState`
5. **Ne pas `JSON.stringify`** avant de passer un objet à une RPC qui attend `JSONB`
6. **Ne pas utiliser le client `anon`** pour des requêtes qui doivent voir les données de tous les utilisateurs d'une squad
7. **Toujours ajouter `REPLICA IDENTITY FULL`** sur une nouvelle table ajoutée à la publication Realtime
8. **Ne pas modifier `sifflets_balance` depuis le client** — opération `service_role` uniquement (RLS + grants)

---

## 8. Sessions de travail récentes

### Sprint UX — Mai 2026 (18 tâches UX1 à UX4, toutes complétées)

Audit UX visuel complet basé sur 27 captures d'écran de l'app. Corrections apportées :

**Identité & Landing (UX1)**

- Unification de la marque "VAR TIME" sur toute la landing (remplacement de "Le Sifflet")
- Boutons App Store passés en `disabled` + `cursor-not-allowed` (cohérence "bientôt disponible")
- Section "Progression des rangs" remontée en position 2 (meilleur hook de rétention)

**Navigation & Affordances (UX2)**

- Gradient fade sur les tabs scrollables (lobby, profil) pour indiquer le scroll horizontal
- Bouton retour renommé "← Matchs" (au lieu de "← Terrain")
- Correction "VS" avec espace parasite dans le Scoreboard
- Inputs de score pronos : placeholder "?", fontSize 16px (anti-zoom iOS)

**Empty States & Feedback (UX3)**

- SquadChat : empty state engageant "Soyez les premiers !"
- MatchTimeline à venir : countdown + CTA "Voir la Compo"
- AmisContent : barre de recherche par pseudo avec ajout en ligne

**Lisibilité & Hiérarchie (UX4)**

- MatchFilterBar : correction "Dem." → jour réel + badge "Demain"
- Cotes Pronos : micro-label "pts" sous chaque valeur
- Historique profil : "Score exact" → "Mon prono"
- Trust score intégré dans le hero du profil (badge compact)
- Code de ligue affiché en `font-mono` (plus sobre)
- Confirmation avant quitter une ligue

### Corrections UX post-audit — Mai 2026

- **Pastille rouge Vestiaire** : disparaît quand l'utilisateur consulte l'onglet (state `vestiaireSeen`)
- **Classement double** : suppression du `<h2>` interne dans `SquadLeaderboard` et du `<h1>` sur la page globale
- **XP → pts** : uniformisé en "pts" en mode Général dans le leaderboard de ligue
- **"La VAR dort"** : texte actualisé (pronos / classement / ligues au lieu de braquages)
- **Logos de compétitions** : fond blanc solide `rounded-lg` derrière chaque logo pour les logos à fond transparent (Ligue 1, Bundesliga, etc.)

---

## 9. Questions ouvertes / Points à trancher

### Décisions produit en suspens

1. **Distribution sur les stores** : Capacitor wrapping iOS/Android — non démarré. Décision requise sur le calendrier (avant la CDM 2026 ?). Tâches Cap-1 à Cap-6 dans TASKS.md.

2. **Nom de domaine** : `VARTIME.quelquechose` non acheté. L'app est provisoirement sur un domaine Vercel automatique.

3. **i18n** : Infrastructure `next-intl` présente mais non branchée. Fichiers de traductions FR/EN/ES/DE/IT créés (dossier `messages/`). Tâche 2X dans TASKS.md.

4. **Push "résolution VAR + pronos"** : Frein rétention #1 identifié — les utilisateurs ne reçoivent pas de notification après le verdict. Architecture côté serveur existante (`push-sender.ts`), il manque l'appel depuis `resolve-event.ts` et `resolve_match_pronos`.

5. **Badge "Fidèle au Poste"** : Migration `login_streak` en base (0065), mais le déclencheur dans `checkAndUnlockBadges` n'a pas encore le case `login_streak_3`.

6. **Performances de chargement** : Signalées comme lentes. Pistes : profiler pages précises (DevTools + Vercel Analytics), paralléliser davantage les requêtes Supabase côté server, vérifier les images de logos (Next/Image vs `<img>` brut).

7. **`long_term_bets` legacy** : Table encore en base, plus d'UI. À vérifier si 0 ligne en prod → DROP.

8. **Fichiers orphelins à la racine** : ~22 fichiers `test-*.js` / `fix-ts.js` (résidus de debugging). À supprimer.

### Zones d'incertitude technique

- **Quota API-Football** : Le cron `match-monitor` fait des batch de 20 fixtures par appel — à surveiller en cas de forte volumétrie (match de Coupe du Monde avec 64 matchs simultanés).
- **Coherence des migrations prod** : S'assurer que `0062` → `0077` sont toutes appliquées dans le Supabase SQL Editor de production avant déploiement.
- **TheSportsDB vs API-Football** : Les deux sources peuvent se contredire sur les noms de compétitions — règle : ne jamais écraser `competition.name` si `api_football_league_id` est déjà posé.
