# 📖 BIBLE TECHNIQUE — VAR TIME (Le Sifflet) — V6

> Audit CTO • 2026-05-09 • Base : sprints 1–8 + A–UX8 + Eco1–4 + FK1/FK2 + Push + LAND + CHAT-1/2/3 + MON-1 + AUTO-1–7 + DMs + Twitter + bug fixes (badge, VAR options, journée sort, lobby UX) • **100 migrations Supabase** • **72 tables** • **~85 composants client**

---

## PILIER 1 — INGESTION DES DONNÉES & API (Le Moteur)

### 1.1 Le Client API-Football

**Fichier :** `src/lib/api-football-client.ts`

```
Base URL : https://v3.football.api-sports.io
Auth     : Header x-apisports-key = $API_FOOTBALL_KEY
Cache    : "no-store" (jamais de cache Next.js)
Season   : $API_FOOTBALL_SEASON (défaut 2025)
Retry    : 3 tentatives, délai exponentiel 100ms × 2^attempt ✅
```

Toutes les requêtes passent par `fetchApiFootball<T>(endpoint, params)` — un seul point d'entrée.

---

### 1.2 Les Services de Synchronisation

| Fichier                                            | Rôle                                                         | Endpoints API-Football                                                       |
| -------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `src/services/api-football-sync.ts` (~1000 lignes) | Sync principal : fixtures, events, stats, lineups            | `/fixtures`, `/fixtures/events`, `/fixtures/statistics`, `/fixtures/lineups` |
| `src/services/api-football-fixtures-import.ts`     | Import calendrier (Top 5 + Coupes UEFA)                      | `/fixtures?league=&date=`                                                    |
| `src/services/api-football-hub-sync.ts`            | Stats de ligue (classements, buteurs)                        | `/standings`, `/players/topscorers`, `/players/topassists`                   |
| `src/lib/sports/api-football-market-bridge.ts`     | Détection auto VAR/Penalty → ouverture/résolution de marchés | (lit les events déjà fetchés)                                                |

**Les 4 fonctions atomiques de `api-football-sync.ts` :**

- **`syncMatchEvents(matchId)`** — Timeline + détection VAR auto, upsert `match_timeline_events`
- **`syncMatchStatistics(matchId)`** — Possession, tirs, corners → `match_statistics`
- **`syncMatchLineups(matchId)`** — Compos + résolution joueurs → `lineups`
- **`syncApiFootballMatch(matchId)`** — **Orchestrateur FT** : lance les 3 atomiques en parallèle + `resolve_match_pronos` RPC

---

### 1.3 Infrastructure Cron — État Réel

> ⚠️ **`vercel.json` ne contient AUCUN cron.** Tous les jobs sont gérés via **cron-job.org** (appels GET avec Bearer CRON_SECRET). `vercel.json` ne contient qu'une règle de redirect `le-sifflet.vercel.app → vartime.app`.

| Job                      | Route                                | Fréquence estimée     | Auth               |
| ------------------------ | ------------------------------------ | --------------------- | ------------------ |
| **match-monitor**        | `GET /api/cron/match-monitor`        | ~1 min (cron-job.org) | Bearer CRON_SECRET |
| **match-imminent**       | `GET /api/cron/match-imminent`       | Toutes les 5 min      | Bearer CRON_SECRET |
| **match-reminder-2h**    | `GET /api/cron/match-reminder-2h`    | Toutes les 30 min     | Bearer CRON_SECRET |
| **prono-reminders**      | `GET /api/cron/prono-reminders`      | Toutes les 30 min     | Bearer CRON_SECRET |
| **daily-digest**         | `GET /api/cron/daily-digest`         | 8h UTC quotidien      | Bearer CRON_SECRET |
| **weekly-recap**         | `GET /api/cron/weekly-recap`         | Hebdomadaire          | Bearer CRON_SECRET |
| **sync-odds**            | `GET /api/cron/sync-odds`            | Lundi 6h UTC          | Bearer CRON_SECRET |
| **reset-monthly-points** | `GET /api/cron/reset-monthly-points` | 1er du mois           | Bearer CRON_SECRET |
| **transition-season**    | `GET /api/cron/transition-season`    | 1er du mois minuit    | Bearer CRON_SECRET |
| **solo-activation**      | `GET /api/cron/solo-activation`      | J+3 après inscription | Bearer CRON_SECRET |
| **j1-inactive**          | `GET /api/cron/j1-inactive`          | J+1 sans activité     | Bearer CRON_SECRET |
| **j3-inactive**          | `GET /api/cron/j3-inactive`          | J+3 sans ligue        | Bearer CRON_SECRET |
| **j7-churn**             | `GET /api/cron/j7-churn`             | J+7 churned           | Bearer CRON_SECRET |
| **community-listener**   | `GET /api/cron/community-listener`   | Périodique            | Bearer CRON_SECRET |
| **twitter-live**         | `GET /api/cron/twitter-live`         | Live matches          | Bearer CRON_SECRET |
| **personal-branding**    | `GET /api/cron/personal-branding`    | Périodique            | Bearer CRON_SECRET |

---

### 1.4 Cycle du Match-Monitor (~1 tick / minute)

```
0. close_expired_market_events RPC  → ferme fenêtres VAR > 90s
1a. Fixture Batch                   → scores/status/minute (lots de 20 matchs)
1b. Stoppage markets                → ouvre stoppage_ht (min ≥ 41) et stoppage_ft (min ≥ 86)
                                      résout sur HT et END statuses ✅
2. syncMatchEvents                  → TOUS les matchs LIVE (délai 200ms inter-match)
3. syncMatchStatistics              → heartbeat toutes les 5 min
4. syncMatchLineups                 → backfill unique si has_lineups=false et < 45 min
5. syncApiFootballMatch (FT)        → sync complète si status=FT/AET/PEN
6. resolve_league_round             → résolution hebdo des confrontations 1v1
```

---

### 1.5 Transition de Statut NS → LIVE → FT

Mécanisme **100% poll-based**, aucun webhook. Mapping via `mapApiFootballFixtureStatusShort()` :

```
API short code          →  DB status interne
────────────────────────   ──────────────────
NS / TBD                →  "upcoming"
1H / LIVE               →  "first_half"
HT / BT                 →  "half_time"
2H / ET / P             →  "second_half"
FT / AET / PEN / AWD    →  "finished"
PST / CANC / ABD / SUSP →  "paused"
```

---

### 1.6 Détection Automatique des Marchés VAR

| Marché          | Trigger d'ouverture                                               | Trigger de résolution                                        |
| --------------- | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| `var_goal`      | Mot-clé VAR : "possible/review/check/offside/await/pending"       | "confirmed/awarded/stands" OU "cancelled/disallowed/no goal" |
| `penalty_check` | "possible penalty/penalty check/penalty+review" OU type="penalty" | "confirmed/awarded" OU "cancelled/not awarded/no penalty"    |
| `red_card`      | type="Card" + detail contenant "red"                              | API-Football event confirmé ✅                               |
| `corner`        | type="Corner"                                                     | API-Football event confirmé ✅                               |
| `free_kick`     | type="Free Kick" dans zone dangereuse                             | API-Football event confirmé ✅                               |
| `stoppage_ht`   | elapsed ≥ 41 ET status = first_half                               | Status = half_time (résultat = elapsed-41)                   |
| `stoppage_ft`   | elapsed ≥ 86 ET status = second_half                              | Status = finished (résultat = elapsed-86)                    |

**Effet Domino :** `penalty_check` → OUI → ouvre automatiquement `penalty_outcome` (`src/lib/resolve-event.ts`).

**Multi-options stoppage :** 6 options (`1`, `2`, `3`, `4`, `5`, `6+`) — parimutuel dynamique via `get_event_odds`.

**Fallback 3 min :** Si pas de verdict API-Football dans les 3 min → auto-résolution via `verify-event` route.

---

### 1.7 Gaps Identifiés — Pilier 1

| Criticité | Gap                                               | Impact                                                       |
| --------- | ------------------------------------------------- | ------------------------------------------------------------ |
| 🟡 MOYEN  | Pas de webhook API-Football                       | Latence 1 min max entre un événement réel et l'app           |
| 🟡 MOYEN  | Fixture ID ambigu si 2 matchs home/away même jour | `syncApiFootballMatch` abandonne la sync                     |
| 🟡 MOYEN  | `console.log` dans match-monitor (nombreux)       | Logs parasites en production — logger.ts créé mais pas migré |
| 🟢 RÉSOLU | Pas de retry/backoff sur `fetchApiFootball`       | Sprint C5 ✅                                                 |
| 🟢 RÉSOLU | `injury_sub` type invalide dans les marchés       | Migration 0100 ✅                                            |

---

## PILIER 2 — CARTOGRAPHIE DES NOTIFICATIONS PUSH (Le Système Nerveux)

### 2.1 Infrastructure

```
Library    : web-push ^3.6.7
SW         : /public/sw.js  (Smart Mute = pas de notif si app visible)
VAPID keys : NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY
Core lib   : src/lib/push-sender.ts (134 lignes)
  ├── sendPushToMatchSubscribers(matchId, payload, excludeUserIds?) → filtre smart_mute + preferred_competitions + exclusions
  └── sendPushToUsers(userIds[], payload)                           → dédupliqué, nettoie les 410 Gone
Tables     : push_subscriptions (endpoint, keys JSONB) + match_subscriptions (smart_mute)
Budget     : src/lib/push-budget.ts → logPushSent() / dedup via push_logs
```

**Exclusion VAR :** `sendPushToMatchSubscribers` accepte `excludeUserIds?: string[]` — les initiateurs d'un marché VAR sont exclus du push (ils sont déjà sur la page match). ✅

---

### 2.2 Triggers Implémentés ✅

| #   | Trigger                            | Fichier                             | Condition                                                                      |
| --- | ---------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------ |
| 1   | **VAR Market Opening**             | `/api/alert/route.ts`               | ≥ seuil signaux distincts en 30s (dynamique par audience) — initiateurs exclus |
| 2   | **Squad VAR Siren**                | `/api/squads/var-alert/route.ts`    | Manuel par l'utilisateur (cooldown 15 min)                                     |
| 3   | **Prono Nudge**                    | `/api/squads/nudge/route.ts`        | Squad leader (cooldown 30 min/squad)                                           |
| 4   | **VAR Résolue**                    | `/api/admin/resolve-event/route.ts` | Après `resolveEvent()` ✅                                                      |
| 5   | **Fin de match**                   | `/api/admin/finish-match/route.ts`  | Après résolution pronos ✅                                                     |
| 6   | **Nouveau membre**                 | `/api/squads/join/route.ts`         | ✅                                                                             |
| 7   | **Rappel prono H-2h**              | `/api/cron/match-reminder-2h`       | Exclut users ayant déjà un prono ✅                                            |
| 8   | **Rappel match imminent (H-5min)** | `/api/cron/match-imminent`          | FK2 ✅                                                                         |
| 9   | **Fin de saison 1v1**              | Cron resolve-league-round           | ✅                                                                             |
| 10  | **Quick-bet VAR** (action)         | `/api/var-bets/quick-bet`           | Depuis SW notificationclick — FK1 ✅                                           |
| 11  | **Badge débloqué**                 | `/api/admin/resolve-event`          | `checkAndUnlockBadges()` — BadgeUnlockListener                                 |
| 12  | **Daily Digest**                   | `/api/cron/daily-digest`            | 8h UTC ✅                                                                      |
| 13  | **Chat de ligue**                  | `/api/squads/[id]/messages`         | Cooldown 30 min/squad via `chat_last_push_at` — CHAT-3 ✅                      |
| 14  | **Solo Activation (J+3)**          | `/api/cron/solo-activation`         | Users actifs (≥1 prono/bet) sans ligue à J+71-73h → push + email top 3 squads  |
| 15  | **J+1 inactif**                    | `/api/cron/j1-inactive`             | Push de réengagement J+1                                                       |
| 16  | **J+3 sans ligue**                 | `/api/cron/j3-inactive`             | Push invitation ligue J+3                                                      |
| 17  | **J+7 churn**                      | `/api/cron/j7-churn`                | Push anti-churn J+7                                                            |
| 18  | **Streak Freeze utilisé**          | `src/app/(app)/layout.tsx`          | Fire-and-forget si freeze consommé à la connexion                              |

### 2.3 Triggers Manquants ❌

| #   | Trigger manquant                | Priorité                                                         |
| --- | ------------------------------- | ---------------------------------------------------------------- |
| 19  | **Badge débloqué (app fermée)** | 🟡 MOYEN                                                         |
| 20  | **Rappel streak quotidien**     | 🟢 FAIBLE                                                        |
| 21  | **DM reçu (push)**              | 🟡 MOYEN — colonne `notif_dm` dans profiles, push non implémenté |

---

## PILIER 3 — RADIOGRAPHIE DES MÉCANIQUES DE JEU (Les Règles Métier)

### 3.1 Résolution des Paris VAR — Flux Complet

**Fonction PostgreSQL :** `resolve_event_parimutuel()` (migration `0045`)
**Appelée par :** `src/lib/resolve-event.ts`

**Étape 1 — Calcul du multiplicateur parimutuel :**

```sql
v_total_pool   = SUM(amount_staked)                                 -- tous les parieurs
v_winning_pool = SUM(amount_staked) WHERE chosen_option = p_result  -- gagnants uniquement
v_multiplier   = v_total_pool / v_winning_pool                      -- ex: 1.5x si 2/3 perdants
```

**Étape 2 — Distribution aux gagnants :**

```sql
reward = FLOOR(amount_staked × v_multiplier)
→ profiles.sifflets_balance += reward
→ profiles.xp += 30  (c_xp_live_won)
→ profiles.rank = profile_rank_from_xp(xp + 30)
→ profiles.lifetime_points_earned += reward  (fix migration 0095 ✅)
```

**Étape 3 — Bonus "Braquage" (mécanique de ligue) :**

```
Pour chaque squad ayant des parieurs dans les 2 camps :
  chambrage_pool = SUM(mises des perdants de la squad)
  bonus_gagnant  = floor(chambrage_pool × mise_gagnant / total_mises_gagnants_squad)
  → profiles.sifflets_balance += bonus
  → profiles.xp += 8  (c_xp_braquage_bonus)
```

---

### 3.2 Classement Hybride des Ligues

**Route :** `GET /api/squads/[squadId]?period=week|month|general`

```
Source 1 : pronos.points_earned > 0  (filtré par placed_at si period ≠ general)
Source 2 : bets.potential_reward - bets.amount_staked  (si status = 'won')
           filtré par placed_at si period ≠ general

Tri : xp_période DESC, username ASC
total_xp_earned = SUM de tous les xp_période des membres (≠ pot commun — sprint F3 ✅)
```

---

### 3.3 Système XP & Grades

| Action                              | XP gagné   |
| ----------------------------------- | ---------- |
| Prono gagné (score exact ou buteur) | **+45 XP** |
| Paris VAR gagné                     | **+30 XP** |
| Bonus Braquage (ligue)              | **+8 XP**  |
| Prono perdu / VAR perdu             | 0          |

**Grades (fonction `profile_rank_from_xp()`) :**

| Seuil XP      | Grade               | Avatar tier |
| ------------- | ------------------- | ----------- |
| 0 – 499       | Arbitre de District | district    |
| 500 – 1 999   | Sifflet de Bronze   | bronze      |
| 2 000 – 4 999 | Sifflet d'Argent    | argent      |
| ≥ 5 000       | Boss de la VAR      | boss        |

---

### 3.4 Système 1v1 — Mode Championnat ✅

- Tables : `squad_seasons`, `squad_fixtures`, `squad_standings`
- Algo round-robin "cercle tournant" (N-1 rounds aller + retour)
- Résolution hebdomadaire via RPC `resolve_league_round` + match-monitor
- UI : tableau W/D/L/Pts, journée en cours, calendrier complet dans `SquadDetailClient`

---

### 3.5 Badges & XP — Système de Récompenses

**Badges actifs (6) :**

| Badge             | Critère                           | Statut |
| ----------------- | --------------------------------- | ------ |
| Oeil de Faucon    | 3 VAR gagnés consécutifs          | ✅     |
| Nostradamus       | Score exact trouvé                | ✅     |
| Pierluigi Collina | trust_score ≥ MODERATOR_THRESHOLD | ✅     |
| Le Chat Noir      | 5 VAR perdus sur même match       | ✅     |
| Fidèle au Poste   | login_streak ≥ 3                  | ✅     |
| Goleador          | Buteur correct trouvé             | ✅     |

**Où `checkAndUnlockBadges()` est appelé :**

- `/api/admin/resolve-event` ✅
- `/api/admin/finish-match` ✅
- `profile/page.tsx` ✅

---

### 3.6 Économie des Sifflets

- **Solde initial :** 1 000 pts (trigger profile creation)
- **Refill :** +500 pts si solde < 500 pts, max 1×/24h
- **Streak quotidien :** +50 pts × min(streak, 7) via `/api/claim-daily-streak`
- **Streak Freeze :** protège la série si absence un jour (`streak_freezes_owned`)
- **RSA (Revenu de Soutien Arbitral) :** solde < seuil minimum → injection automatique (Eco1 ✅)
- **Règle Apple :** Aucun achat possible — Sifflets 100% gagnés in-game

**Mises Minimum (`src/lib/economy/min-bet.ts`) :**

| Solde               | Mise minimum |
| ------------------- | ------------ |
| < 5 000 pts         | 5 pts        |
| 5 000 – 19 999 pts  | 50 pts       |
| 20 000 – 49 999 pts | 200 pts      |
| 50 000 – 99 999 pts | 500 pts      |
| ≥ 100 000 pts       | 1 000 pts    |

**Points Saison (`season_points`) :** Séparés de `sifflets_balance`. Reset mensuel via `/api/cron/reset-monthly-points`. Alimentent `/leaderboard`. Archive via `season_archives`.

---

### 3.7 Boosters (Eco2 ✅)

| Booster      | Effet                                 | Durée   |
| ------------ | ------------------------------------- | ------- |
| `double_xp`  | XP × 2 sur le prochain pari VAR gagné | 1 usage |
| `cote_plus`  | Multiplicateur majoré de +0.25x       | 1 usage |
| `safety_net` | Rembourse la mise si défaite          | 1 usage |
| `vision`     | Affiche la répartition des mises      | 1 match |

---

### 3.8 Boutique Cosmétique (Eco3 ✅)

- Avatars premium, bordures de profil, effets de badge
- Achat via `/api/shop/purchase`, équipement via `/api/shop/equip`
- Réservés aux paliers XP : certains items nécessitent grade minimum

---

### 3.9 Messagerie Privée (DMs — migration 0098)

- Tables : `direct_message_threads` (threads), `direct_messages` (messages)
- Rate limit : 1 message / 2s par user (query count sur `direct_messages`)
- Unread badge dans `TopBar` : `hasUnreadDm` calculé côté serveur dans `(app)/layout.tsx`
- Colonne `notif_dm` dans `profiles` (opt-in push DM — push non encore implémenté)

---

### 3.10 Automatisation Croissance (Sprint AUTO-1–7)

| Cron                 | Rôle                                                           |
| -------------------- | -------------------------------------------------------------- |
| `solo-activation`    | J+71-73h : users actifs sans ligue → push + email top 3 squads |
| `j1-inactive`        | J+1 : réengagement si pas de prono ni bet                      |
| `j3-inactive`        | J+3 : invitation ligue si toujours solo                        |
| `j7-churn`           | J+7 : anti-churn                                               |
| `twitter-live`       | Tweet automatique sur matchs live (OAuth2 — migration 0099)    |
| `community-listener` | Monitoring communauté (Twitter/Discord)                        |
| `personal-branding`  | Contenu social automatisé                                      |
| `weekly-recap`       | Récap hebdomadaire utilisateurs                                |

---

## PILIER 4 — ARCHITECTURE DES COMPOSANTS (La Structure)

### 4.1 Hiérarchie des Routes

```
/                       → Landing page (Server Component ✅)
/login                  → Google OAuth (Client Component)
/auth/callback          → PKCE exchange (Route Handler)
/join/[code]            → Rejoindre une ligue via lien direct
/(app)/                 → Layout protégé : TopBar + BottomNav + auth guard + LiveRoomContext
  lobby/                → Server Component + Suspense skeleton (⚠️ revalidate manquant)
  match/[id]/           → Server Component + LiveRoom (Client)
  pronos/               → Server Component + PronosticsHubClient (Client, revalidate 60s ✅)
  profile/              → Server Component + ProfileClient (Client, ⚠️ revalidate manquant)
  profile/[id]/         → Profil public
  ligues/               → Server Component + LiguesPageClient (Client, ⚠️ revalidate manquant)
  squads/[id]/          → SquadDetailClient (Client)
  messages/             → Messagerie privée (DMs — 0098)
  leaderboard/          → Server Component, revalidate=86400 (24h ISR ✅)
  settings/             → Server Component (⚠️ revalidate manquant)
  shop/                 → Server Component (⚠️ revalidate manquant)
  rules/ laws/          → Server Components statiques (⚠️ revalidate manquant)
/admin/resolve          → Admin UI (protégé trust_score ≥ 150)
/api/og/victory/[id]    → OG image dynamique ✅
```

### 4.2 Composants Critiques — Taille & Responsabilités (Audit 2026-05-09)

| Composant                 | Lignes    | État     | Problème principal                             |
| ------------------------- | --------- | -------- | ---------------------------------------------- |
| `PronosticsHubClient.tsx` | **1 106** | ⚠️ Lourd | Mix score picker + scorer + date filter        |
| `VotingModal.tsx`         | **892**   | ⚠️ Lourd | 3 setIntervals, scroll lock manquant           |
| `ProfileClient.tsx`       | **843**   | ⚠️ Lourd | Onglets profil/amis/badges/historique mélangés |
| `LiveRoom.tsx`            | **628**   | ✅ OK    | Bien structuré, cleanup correct                |
| `MatchLobby.tsx`          | **539**   | ✅ OK    | Europe hub extrait proprement                  |
| `LeagueHub.tsx`           | **309**   | ✅ OK    | Tri journées par numéro ✅                     |

### 4.3 Contexte React & Hooks Personnalisés

**Context unique :** `LiveRoomContext` — fourni dans `src/app/(app)/layout.tsx`, consommé par `LiveRoom` et `BottomNav`.

**Hooks personnalisés :**

| Hook                       | Fichier                                 | Rôle                                  |
| -------------------------- | --------------------------------------- | ------------------------------------- |
| `useActiveSquad`           | `src/hooks/useActiveSquad.ts`           | localStorage + `useSyncExternalStore` |
| `usePreferredCompetitions` | `src/hooks/usePreferredCompetitions.ts` | Sync optimiste API competition prefs  |

### 4.4 Patterns de Données — Bon vs Mauvais

**✅ Bons patterns en production :**

- `Promise.all()` pour les fetches parallèles sur toutes les pages critiques ✅
- `revalidate` sur leaderboard (86400s) et pronos (60s) ✅
- **0 instance de `select("*")`** — toutes les requêtes Supabase ont des colonnes explicites ✅ (résolu depuis V5)
- `Map<string, Row>` pour dédupliquer les jointures sans N+1
- `REPLICA IDENTITY FULL` sur les tables Realtime
- Tri journées par numéro extrait (`extractRoundNumber`) — évite le bug match reporté ✅
- `sendPushToMatchSubscribers(..., excludeUserIds)` — initiateurs VAR exclus ✅
- `visitedLiguesRef` dans BottomNav — badge non-lu persistant entre navigations ✅

**⚠️ Patterns à corriger :**

- **Sequential awaits** dans `profile/[id]` et `profile/page.tsx` qui pourraient être parallélisés
- Polling toutes les 5s dans `SquadDetailClient` sans backoff
- 17 fichiers route avec `console.log/error/warn` directs — `logger.ts` créé mais pas encore migré partout

### 4.5 État des Subscriptions Realtime

| Table             | Composant           | REPLICA IDENTITY | Statut        |
| ----------------- | ------------------- | ---------------- | ------------- |
| `matches`         | LiveRoom            | FULL             | ✅            |
| `market_events`   | LiveRoom            | FULL             | ✅            |
| `bets`            | LiveRoom/TopBar     | FULL             | ✅            |
| `profiles`        | TopBar              | FULL             | ✅            |
| `alert_signals`   | LiveRoom            | FULL             | ✅            |
| `squad_messages`  | SquadDetailClient   | FULL             | ✅            |
| `friend_requests` | AmisContent         | ?                | ⚠️ À vérifier |
| `match_presence`  | LiveRoom            | ?                | ⚠️ À vérifier |
| `user_badges`     | BadgeUnlockListener | ?                | ⚠️ À vérifier |

**Manque :** Aucun indicateur de connexion Realtime ("En ligne / Reconnexion...") visible pour l'utilisateur.

### 4.6 Infrastructure i18n

```
Library     : next-intl
Config      : src/i18n.ts + src/lib/i18n/locale.ts (cookie + header locale detection)
Locales     : ["fr", "en", "es", "de", "it"]
Messages    : messages/*.json (fr, en, es, de, it — tous complets)
Namespaces  : Navigation (BottomNav) + TopBar — 2 namespaces implémentés
Couverture  : ~5% (TopBar + BottomNav uniquement)
SSR         : getLocale() / getMessages() de "next-intl/server"
Client      : useTranslations("Namespace") + useLocale() de "next-intl"
Locale switch: Server Action switchLocale() → cookie → router.refresh()
```

> ⚠️ **Dual system**: `src/lib/translations.ts` est le système i18n primaire (100+ strings FR/EN). `messages/*.json` est secondaire (next-intl). Les ~130 appels `toast.*` et la quasi-totalité des labels UI sont hardcodés en français.

---

## PILIER 5 — DETTE TECHNIQUE & NETTOYAGE (La Santé du Code)

### 5.1 Fichiers Orphelins

✅ Les `test-*.js`, `fix-ts.js` et scripts de debug racine ont été nettoyés depuis V5.

Résidu potentiel : `src/services/sportsdb-sync.ts` — vérifier si encore importé dans `/api/admin/sync-live`.

---

### 5.2 Risques de Sécurité (Audit 2026-05-09)

| Risque                                             | Sévérité | État                                                |
| -------------------------------------------------- | -------- | --------------------------------------------------- |
| Pas de rate limiting sur `/api/claim-daily-streak` | 🔴       | ❌ Non traité                                       |
| Pas de rate limiting sur `/api/claim-rsa`          | 🔴       | ❌ Non traité                                       |
| Pas de rate limiting sur `/api/shop/purchase`      | 🔴       | ❌ Non traité                                       |
| Pas de rate limiting sur `/api/boosters/purchase`  | 🔴       | ❌ Non traité                                       |
| Pas de rate limiting sur `/api/var-bets/quick-bet` | 🔴       | ❌ Non traité                                       |
| Rate limiting sur `/api/bet`                       | ✅       | 10 req/min                                          |
| Rate limiting sur `/api/alert`                     | ✅       | 5 req/min                                           |
| Rate limiting sur `/api/messages/[otherId]`        | ✅       | 1 msg/2s                                            |
| Cooldown 30min sur `/api/squads/nudge`             | ✅       | DB-based                                            |
| Cron routes vérifient Bearer CRON_SECRET           | ✅       | Toutes                                              |
| Admin routes vérifient trust_score ≥ 150           | ✅       | Toutes                                              |
| Pas de validation structurée (no zod)              | 🟡       | ❌ Non traité                                       |
| `console.log` directs en production                | 🟡       | ⚠️ Partiel — logger.ts créé, 17 fichiers non migrés |

---

### 5.3 Performance — Gaps Identifiés (Audit 2026-05-09)

**ISR manquante sur 9 pages :**

| Page              | revalidate cible | État actuel |
| ----------------- | ---------------- | ----------- |
| `/lobby`          | 30s              | ❌ dynamic  |
| `/shop`           | 3600s (1h)       | ❌ dynamic  |
| `/settings`       | 86400s (24h)     | ❌ dynamic  |
| `/ligues`         | 300s (5min)      | ❌ dynamic  |
| `/profile`        | 300s             | ❌ dynamic  |
| `/profile/[id]`   | 300s             | ❌ dynamic  |
| `/rules`, `/laws` | 86400s           | ❌ dynamic  |
| `/messages`       | N/A (dynamique)  | acceptable  |
| `/squads`         | 300s             | ❌ dynamic  |

**Images non optimisées :** 7 balises `<img>` brutes (hôtes hors remotePatterns) dans : `MatchCard`, `MatchLobby`, `MatchLineupsPitch`, `MatchLineups`, `MatchStats`, `PolymarketTab`, `Scoreboard`. Chaque `<img>` contient un commentaire eslint-disable car l'hôte image (API-Sports) n'est pas dans `remotePatterns` — à ajouter ou à rendre dynamique.

**Suspense boundaries manquants :** pages profile, ligues, shop (skeleton loader non implémenté).

---

### 5.4 Type Safety

| Fichier                             | Problème                                           | Sprint     |
| ----------------------------------- | -------------------------------------------------- | ---------- |
| `src/app/(app)/match/[id]/page.tsx` | `// @ts-ignore` sur join relationship              | En cours   |
| `src/types/database.ts`             | `Relationships: []` vide (joins typés impossibles) | Structurel |

---

### 5.5 Constants & Magic Numbers

Valeurs hardcodées restantes à extraire dans `src/lib/constants/` :

| Valeur                                         | Localisation            | Constante cible                   |
| ---------------------------------------------- | ----------------------- | --------------------------------- |
| `24 * 60 * 60 * 1000`                          | Répété ~8× dans le code | `MS_PER_DAY`                      |
| `signal timer 30s`                             | `LiveRoom.tsx`          | `SIGNAL_TIMEOUT_MS`               |
| Seuils journées crons (71-73h, 24h, 72h, 168h) | Crons j1/j3/j7/solo     | `src/lib/constants/activation.ts` |

---

### 5.6 Accessibilité (WCAG 2.1 AA) — Audit 2026-05-09

| Problème                                                                       | Composant(s)              | Sévérité  |
| ------------------------------------------------------------------------------ | ------------------------- | --------- |
| Zéro attribut ARIA dialog (`role`, `aria-modal`)                               | ActionDrawer, AlertDrawer | 🔴 Haute  |
| `aria-labelledby` manquant                                                     | ProfileEditModal          | 🟡 Moyen  |
| Scroll lock body manquant lors d'une modale ouverte                            | VotingModal, ActionDrawer | 🟡 Moyen  |
| 29+ inputs de formulaire sans `<label>` associé                                | Formulaires partout       | 🟡 Moyen  |
| `text-zinc-500` sur `bg-zinc-900` ≈ ratio 4:1                                  | Labels partout            | Limite AA |
| ✅ VotingModal: role="dialog", aria-modal, focus trap, role="timer", aria-live | VotingModal               | Excellent |

---

### 5.7 i18n — État Réel

```
Système primaire   : src/lib/translations.ts (FR/EN hardcodé — couverture ~60%)
Système secondaire : next-intl + messages/*.json (TopBar + BottomNav — couverture ~5%)
Toasts             : ~130 appels toast.* — 100% hardcodés en français, 0% i18n
Labels UI          : ~95% hardcodés en français
Conflits potentiels: 2 systèmes i18n actifs (translations.ts vs next-intl)
```

---

### 5.8 Indexes DB Manquants

| Table               | Colonne              | Impact                            |
| ------------------- | -------------------- | --------------------------------- |
| `user_badges`       | `badge_id`           | Lookups lents sur badges          |
| `friend_requests`   | `receiver_id`        | Liste amis en attente non indexée |
| `push_logs`         | `user_id`            | Logs push non indexés             |
| `user_daily_recaps` | `user_id`            | Recap quotidien non indexé        |
| `direct_messages`   | `thread_id, sent_at` | Messages DM non indexés           |
| `tweet_log`         | `match_id`           | Logs Twitter non indexés          |

---

### 5.9 Console & Logging — État Réel

**`src/lib/logger.ts` ✅ — Créé et partiellement adopté.**

```typescript
log.info(service: string, msg: string, data?: unknown)
log.warn(service: string, msg: string, data?: unknown)
log.error(service: string, msg: string, data?: unknown)
```

**Routes utilisant `log.*` correctement :** `alert/route.ts`, `match-reminder-2h/route.ts`, `solo-activation/route.ts`, et quelques autres.

**17 fichiers utilisant encore `console.log/error/warn` directs :**

| Fichier                                        | Type        |
| ---------------------------------------------- | ----------- |
| `admin/finish-match/route.ts`                  | Debug flows |
| `admin/invalidate-push-subscriptions/route.ts` | Admin       |
| `admin/resolve-league-round/route.ts`          | Admin       |
| `claim-rsa/route.ts`                           | Économie    |
| `cron/community-listener/route.ts`             | Cron        |
| `cron/j3-inactive/route.ts`                    | Cron        |
| `cron/j7-churn/route.ts`                       | Cron        |
| `cron/match-monitor/route.ts`                  | Nombreux    |
| `cron/reset-monthly-points/route.ts`           | Cron        |
| `cron/twitter-live/route.ts`                   | Cron        |
| `match-subscription/route.ts`                  | Route       |
| `push/subscribe/route.ts`                      | Push        |
| `squads/join/route.ts`                         | Squad       |
| `squads/leave/route.ts`                        | Squad       |
| `squads/route.ts`                              | Squad       |
| `squads/[squadId]/route.ts`                    | Squad       |
| `webhooks/new-profile/route.ts`                | Webhook     |

---

## PILIER 6 — PLAN DES PROCHAINS SPRINTS

### 🔴 Sprint SECURITY — "Rate Limiting des Routes Économiques"

Routes manipulant l'économie sans rate limiting = vecteur d'abus majeur avant le CDM.

| Tâche | Description                                                          | Priorité |
| ----- | -------------------------------------------------------------------- | -------- |
| S1    | Rate limiting sur `/api/claim-daily-streak` (1 req/24h/user via DB)  | 🔴       |
| S2    | Rate limiting sur `/api/shop/purchase` (10 req/min/user)             | 🔴       |
| S3    | Rate limiting sur `/api/boosters/purchase` (10 req/min/user)         | 🔴       |
| S4    | Rate limiting sur `/api/var-bets/quick-bet` (10 req/min/user)        | 🔴       |
| S5    | Rate limiting sur `/api/claim-rsa` et `/api/refill` (1 req/24h/user) | 🔴       |

### 🟠 Sprint PERF — "Images & ISR"

| Tâche | Description                                                                                         | Fichier(s)                    |
| ----- | --------------------------------------------------------------------------------------------------- | ----------------------------- |
| P1    | Ajouter api-sports.io aux `remotePatterns` next.config.ts → convertir les 7 `<img>` en `next/image` | `next.config.ts` + 7 fichiers |
| P2    | Ajouter `revalidate` sur lobby (30s), shop (1h), ligues (5min), squads (5min)                       | Pages concernées              |
| P3    | Ajouter `revalidate` sur profile/settings/rules/laws (300s / 24h)                                   | Pages concernées              |
| P4    | Paralléliser les awaits séquentiels dans profile/[id] et profile                                    | `src/app/(app)/profile/`      |
| P5    | Ajouter Suspense + skeleton loaders sur pronos, shop, profile                                       | Composants concernés          |

### 🟡 Sprint LOGGER — "Observabilité Complète"

| Tâche | Description                                                 | Impact               |
| ----- | ----------------------------------------------------------- | -------------------- |
| LOG1  | Migrer les 17 fichiers restants de `console.*` vers `log.*` | Logs propres en prod |
| LOG2  | Ajouter indexes DB manquants (6 tables, voir §5.8)          | Performance requêtes |
| LOG3  | Push DM (`notif_dm`) — colonne existe, push manquant        | Feature complète     |

### 🟡 Sprint ARIA — "Accessibilité Critique"

| Tâche | Description                                                               | Fichier(s)                |
| ----- | ------------------------------------------------------------------------- | ------------------------- |
| A1    | Ajouter `role="dialog"`, `aria-modal`, `aria-labelledby` sur ActionDrawer | `ActionDrawer.tsx`        |
| A2    | Même chose sur AlertDrawer                                                | `AlertDrawer.tsx`         |
| A3    | Connecter le `<h2>` à `aria-labelledby` dans ProfileEditModal             | `ProfileEditModal.tsx`    |
| A4    | Ajouter scroll lock body (`overflow-hidden`) sur ouverture modales        | VotingModal, ActionDrawer |

### 🟢 Sprint REFACTOR — "Architecture Composants"

| Tâche | Description                                                                  | Fichier(s)                       |
| ----- | ---------------------------------------------------------------------------- | -------------------------------- |
| R1    | Extraire `ScorerAllocationEditor` de `PronosticsHubClient` (~300L)           | Nouveau `src/components/pronos/` |
| R2    | Extraire `MatchFilterBar` + `DateSlider` de `PronosticsHubClient`            | Nouveau `src/components/pronos/` |
| R3    | Extraire `AmisContent` de `ProfileClient` (déjà en fichier séparé, vérifier) | `src/components/profile/`        |

---

## ANNEXE A — INVENTAIRE DES ROUTES API

| Route                                  | Méthode  | Auth               | Rôle                                    |
| -------------------------------------- | -------- | ------------------ | --------------------------------------- |
| `/api/cron/match-monitor`              | GET      | Bearer CRON_SECRET | Sync live principale (~1 min)           |
| `/api/cron/sync-odds`                  | GET      | Bearer CRON_SECRET | Odds hebdomadaires                      |
| `/api/cron/prono-reminders`            | GET      | Bearer CRON_SECRET | Push H-1 avant matchs                   |
| `/api/cron/match-imminent`             | GET      | Bearer CRON_SECRET | Push H-5min avant matchs ✅             |
| `/api/cron/match-reminder-2h`          | GET      | Bearer CRON_SECRET | Push H-2h — exclut users avec prono ✅  |
| `/api/cron/daily-digest`               | GET      | Bearer CRON_SECRET | Résumé quotidien 8h UTC ✅              |
| `/api/cron/weekly-recap`               | GET      | Bearer CRON_SECRET | Récap hebdomadaire ✅                   |
| `/api/cron/reset-monthly-points`       | GET      | Bearer CRON_SECRET | Reset points mensuels                   |
| `/api/cron/transition-season`          | GET      | Bearer CRON_SECRET | Archive + reset saison ✅               |
| `/api/cron/solo-activation`            | GET      | Bearer CRON_SECRET | J+3 actifs sans ligue → push + email ✅ |
| `/api/cron/j1-inactive`                | GET      | Bearer CRON_SECRET | Réengagement J+1                        |
| `/api/cron/j3-inactive`                | GET      | Bearer CRON_SECRET | Invitation ligue J+3                    |
| `/api/cron/j7-churn`                   | GET      | Bearer CRON_SECRET | Anti-churn J+7                          |
| `/api/cron/community-listener`         | GET      | Bearer CRON_SECRET | Monitoring communauté                   |
| `/api/cron/twitter-live`               | GET      | Bearer CRON_SECRET | Tweets live automatiques                |
| `/api/cron/personal-branding`          | GET      | Bearer CRON_SECRET | Contenu social auto                     |
| `/api/alert`                           | POST     | User (trust ≥ 50)  | Signal VAR → marché si seuil dynamique  |
| `/api/bet`                             | POST     | User               | Place un pari VAR (RPC atomique)        |
| `/api/verify-event`                    | POST     | User               | Vérifie VAR > 6 min via API-Football    |
| `/api/claim-daily-streak`              | POST     | User               | Récompense streak quotidienne           |
| `/api/claim-rsa`                       | POST     | User               | RSA si solde trop bas ✅                |
| `/api/refill`                          | POST     | User               | Refill manuel si solde < 500            |
| `/api/profile`                         | PATCH    | User               | Mise à jour profil (username, avatar)   |
| `/api/var-bets/quick-bet`              | POST     | User               | Quick-bet depuis notification SW ✅     |
| `/api/shop/purchase`                   | POST     | User               | Achat item cosmétique ✅                |
| `/api/shop/equip`                      | POST     | User               | Équiper item acheté                     |
| `/api/boosters/purchase`               | POST     | User               | Achat booster ✅                        |
| `/api/recap/today`                     | GET      | User               | Résumé pronos du jour                   |
| `/api/match-subscription`              | POST     | User               | Subscribe/mute un match                 |
| `/api/messages/[otherId]`              | GET/POST | User               | Messagerie privée DMs (0098)            |
| `/api/admin/resolve-event`             | POST     | Modérateur         | Force OUI/NON sur un événement          |
| `/api/admin/finish-match`              | POST     | Modérateur         | Termine match + résout paris + pronos   |
| `/api/admin/sync-apifootball-fixtures` | GET      | Modérateur         | Import matchs par date                  |
| `/api/admin/sync-apifootball-round`    | GET      | Modérateur         | Import par journée de championnat       |
| `/api/admin/sync-live`                 | GET      | Modérateur         | Sync ad-hoc matchs actifs               |
| `/api/admin/resolve-league-round`      | POST     | Modérateur         | Résolution hebdo 1v1                    |
| `/api/admin/health`                    | GET      | Modérateur         | Status dernier tick monitor             |
| `/api/squads`                          | GET/POST | User               | Liste/Création ligues                   |
| `/api/squads/[id]`                     | GET      | Membre             | Détail ligue + classement hybride       |
| `/api/squads/[id]/start-season`        | POST     | Owner              | Lance championnat 1v1                   |
| `/api/squads/[id]/messages`            | POST     | Membre             | Chat ligue + push (cooldown 30min) ✅   |
| `/api/squads/join`                     | POST     | User               | Rejoindre via invite_code               |
| `/api/squads/leave`                    | POST     | User               | Quitter une ligue                       |
| `/api/squads/var-alert`                | POST     | User               | Sirène VAR → push squad members         |
| `/api/squads/nudge`                    | POST     | User               | Rappel pronos → push squad members      |
| `/api/push/subscribe`                  | POST     | User               | Enregistrement subscription web push    |
| `/api/webhooks/new-profile`            | POST     | Supabase           | Webhook création profil                 |
| `/api/og/victory/[id]`                 | GET      | Public             | OG image dynamique résultats ✅         |

---

## ANNEXE B — AUDIT UX/UI (2026-05-09)

### 1. Design System — État

**✅ Cohérent :**

- Fond dark : `zinc-900` / `zinc-800` / `zinc-950` uniforme
- Accent primaire : `green-500` (CTAs) + `whistle` (alerte/jaune) + `amber-500` (économie)
- Radius : `rounded-2xl` dominant, `rounded-3xl` sur les cartes hero
- Safe areas (`env(safe-area-inset-*)`) sur TopBar, BottomNav et layout ✅
- BottomNav hors `overflow-x-hidden` — iOS Safari fixed positioning correct ✅
- TopBar simplifié : section label dynamique ("MES PRONOS", "LE STADE"…) au lieu de balance/points ✅

**✅ UX Lobby résolus (2026-05-09) :**

- Tri journées par numéro (fini le bug match reporté) ✅
- Cartes match : date+heure en source unique (fini la triple redondance) ✅
- Centre carte : `VS` pour matchs lointains, countdown pour <24h ✅
- "Compos ✓" inline avec la date dans metaRow ✅

**⚠️ Incohérences restantes :**

- Hauteurs de boutons hétérogènes : `h-10` / `h-11` / `h-12` / `h-14`
- `text-[10px]`, `text-xs`, `text-sm` coexistent sans type scale clair
- Contraste `text-zinc-500` sur `bg-zinc-900` ≈ ratio 4:1 (limite WCAG AA)

### 2. Accessibilité — Bilan Global

| Composant        | Statut ARIA                 | Scroll Lock | Labels     |
| ---------------- | --------------------------- | ----------- | ---------- |
| VotingModal      | ✅ Excellent                | ❌ Manquant | ✅         |
| ActionDrawer     | ❌ Zéro                     | ❌ Manquant | ⚠️ Partiel |
| AlertDrawer      | ❌ Zéro                     | ❌ Manquant | ⚠️ Partiel |
| ProfileEditModal | ⚠️ aria-labelledby manquant | N/A         | ✅         |

### 3. Gamification — État

| Feature                                     | Statut |
| ------------------------------------------- | ------ |
| Streak quotidien visible + claim            | ✅     |
| Streak Freeze (protection série)            | ✅     |
| XP bar dans ProfileHeader                   | ✅     |
| Badges avec progress + critères             | ✅     |
| Leaderboard hybride saison/all-time         | ✅     |
| Historique groupé par match                 | ✅     |
| Récap post-match                            | ✅     |
| Overlay post-pari VAR                       | ✅     |
| Séparation sous-scores ligue pronos/VAR     | ✅     |
| Boutique cosmétique                         | ✅     |
| Boosters (4 types)                          | ✅     |
| RSA solde minimum                           | ✅     |
| Mise minimum dynamique                      | ✅     |
| Messagerie privée (DMs)                     | ✅     |
| Chat de ligue                               | ✅     |
| Automatisation acquisition (solo, j1/j3/j7) | ✅     |

### 4. Top 5 Priorités UX Restantes

1. **Rate limiting routes économiques** — abus economy = jeu cassé avant CDM.
2. **ARIA sur ActionDrawer/AlertDrawer** — lecteurs d'écran complètement aveuglés.
3. **Images next/image** — LCP dégradé sur lobby et match rooms.
4. **ISR manquante sur 9 pages** — coût DB élevé en période de pointe CDM.
5. **Logger migration complète** — 17 routes avec `console.*` en prod, logs illisibles sur Vercel.

---

## ANNEXE C — SCHÉMA BASE DE DONNÉES (Vue d'ensemble)

**100 migrations** (0001 → 0100) — évolution rigoureuse depuis `0001_init.sql`.
**72 tables actives** dans `src/types/database.ts`.
**27+ RPCs publiques** + 5 fonctions trigger.
**9+ tables Realtime** avec REPLICA IDENTITY FULL.

```
auth.users ─── profiles (balance, rank, xp, trust_score, login_streak, season_points,
              │           streak_freezes_owned, streak_freezes_used_count,
              │           preferred_competitions, notif_pre_match_5min, notif_var_results,
              │           notif_prono_results, notif_daily_digest, notif_pre_match_2h,
              │           notif_squad_chat, notif_dm, lifetime_points_earned)
              │
              ├── bets (paris VAR, status, chosen_option, parimutuel)
              ├── pronos (score exact / buteur, points_earned)
              ├── user_badges → badges
              ├── push_subscriptions + match_subscriptions (smart_mute)
              ├── push_logs (audit notifications, dedup)
              ├── user_shop_inventory → shop_items
              ├── user_boosters_inventory → boosters_catalog
              ├── booster_highlights (effets visuels actifs)
              ├── user_daily_recaps (résumés quotidiens)
              ├── friend_requests (sociale)
              ├── direct_message_threads (DMs — 0098)
              │     └── direct_messages
              └── squad_members (last_read_at — 0094) → squads (game_mode, invite_code,
                                                          chat_last_push_at — 0096)
                                ├── squad_seasons
                                │     ├── squad_fixtures (round-robin)
                                │     └── squad_standings (W/D/L/Pts)
                                └── squad_messages (is_system_message — 0093)

competitions → matches (status, start_time, odds, alert_cooldown)
              ├── market_events (type, status open/closed/resolved)
              │     └── bets
              ├── match_statistics
              ├── match_timeline_events
              ├── match_presence (joueurs actifs en salle live)
              └── lineups → players → teams

seasons (label, starts_at, ends_at, is_current)
season_archives (snapshot classement saison terminée)
tweet_log (logs tweets automatiques — 0099)
twitter_tokens (OAuth2 tokens — 0099)
```

**Migrations notables depuis V5 (0098–0100) :**

| Migration | Contenu                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------- |
| **0098**  | `direct_message_threads` + `direct_messages` — messagerie privée complète avec `user_a/b_read_at` |
| **0099**  | `tweet_log` + `twitter_tokens` — intégration Twitter OAuth2 pour tweets live automatiques         |
| **0100**  | Fix `place_bet` et market_events : supprime le type `injury_sub` des CHECK constraints            |

**Fixes critiques appliqués (V5 → V6) :**

- `0095` : `lifetime_points_earned` non incrémenté → `season_points` restait à 0. Fixed.
- `0097` : `place_bet()` rejetait les options stoppage (`1`/`2`/`3`/`4`/`5`/`6+`). Fixed.
- `0100` : `injury_sub` type invalide bloquait l'insertion de certains marchés. Fixed.
