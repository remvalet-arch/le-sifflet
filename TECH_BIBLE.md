# 📖 BIBLE TECHNIQUE — VAR TIME (Le Sifflet) — V4

> Audit CTO • 2026-05-08 • Base : sprints 1–8 + A–UX7 + Eco1–4 + FK1/FK2 + Push + LAND complétés • **92 migrations Supabase** • **~80 composants client**

---

## PILIER 1 — INGESTION DES DONNÉES & API (Le Moteur)

### 1.1 Le Client API-Football

**Fichier :** `src/lib/api-football-client.ts`

```
Base URL : https://v3.football.api-sports.io
Auth     : Header x-apisports-key = $API_FOOTBALL_KEY
Cache    : "no-store" (jamais de cache Next.js)
Season   : $API_FOOTBALL_SEASON (défaut 2025)
Retry    : 3 tentatives, délai exponentiel 100ms × 2^attempt (sprint C5 ✅)
```

Toutes les requêtes passent par `fetchApiFootball<T>(endpoint, params)` — un seul point d'entrée.

---

### 1.2 Les Services de Synchronisation

| Fichier                                           | Rôle                                                         | Endpoints API-Football                                                       |
| ------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `src/services/api-football-sync.ts` (1003 lignes) | Sync principal : fixtures, events, stats, lineups            | `/fixtures`, `/fixtures/events`, `/fixtures/statistics`, `/fixtures/lineups` |
| `src/services/api-football-fixtures-import.ts`    | Import calendrier (Top 5 + Coupes UEFA)                      | `/fixtures?league=&date=`                                                    |
| `src/services/api-football-hub-sync.ts`           | Stats de ligue (classements, buteurs)                        | `/standings`, `/players/topscorers`, `/players/topassists`                   |
| `src/lib/sports/api-football-market-bridge.ts`    | Détection auto VAR/Penalty → ouverture/résolution de marchés | (lit les events déjà fetchés)                                                |

**Les 4 fonctions atomiques de `api-football-sync.ts` :**

- **`syncMatchEvents(matchId)`** — Timeline + détection VAR auto, upsert `match_timeline_events`
- **`syncMatchStatistics(matchId)`** — Possession, tirs, corners → `match_statistics`
- **`syncMatchLineups(matchId)`** — Compos + résolution joueurs → `lineups`
- **`syncApiFootballMatch(matchId)`** — **Orchestrateur FT** : lance les 3 atomiques en parallèle + `resolve_match_pronos` RPC

---

### 1.3 Infrastructure Cron — État Réel

L'app utilise **à la fois** `vercel.json` (5 crons configurés) et **cron-job.org** pour certains jobs. `vercel.json` est la source principale.

| Job                   | Route                             | Fréquence             | Auth               |
| --------------------- | --------------------------------- | --------------------- | ------------------ |
| **match-imminent**    | `GET /api/cron/match-imminent`    | Toutes les 5 minutes  | Bearer CRON_SECRET |
| **match-reminder-2h** | `GET /api/cron/match-reminder-2h` | Toutes les 30 minutes | Bearer CRON_SECRET |
| **daily-digest**      | `GET /api/cron/daily-digest`      | 8h00 UTC quotidien    | Bearer CRON_SECRET |
| **sync-odds**         | `GET /api/cron/sync-odds`         | Lundi 6h UTC          | Bearer CRON_SECRET |
| **transition-season** | `GET /api/cron/transition-season` | 1er du mois minuit    | Bearer CRON_SECRET |

> ⚠️ **Match-monitor** (le tick principal 1/min) tourne via **cron-job.org** séparément — non dans `vercel.json`. Vérifier qu'il n'y a pas de doublon si `vercel.json` est mis à jour.

---

### 1.4 Cycle du Match-Monitor (~1 tick / minute)

```
0. close_expired_market_events RPC  → ferme fenêtres VAR > 90s
1a. Fixture Batch                   → scores/status/minute (lots de 20 matchs)
1b. Stoppage markets                → ouvre stoppage_ht (min ≥ 41) et stoppage_ft (min ≥ 86)
                                      résout sur HT et END statuses (sprint stoppages ✅)
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
| `stoppage_ht`   | elapsed ≥ 41 ET status = first_half                               | Status = half_time (résultat = `extra` ou elapsed-41)        |
| `stoppage_ft`   | elapsed ≥ 86 ET status = second_half                              | Status = finished (résultat = `extra` ou elapsed-86)         |

**Effet Domino :** `penalty_check` → OUI → ouvre automatiquement `penalty_outcome` (`src/lib/resolve-event.ts`).

**Multi-options stoppage :** 6 options (`1`, `2`, `3`, `4`, `5`, `6+`) — parimutuel dynamique via `get_event_odds`.

---

### 1.7 Gaps Identifiés — Pilier 1

| Criticité | Gap                                                    | Impact                                             |
| --------- | ------------------------------------------------------ | -------------------------------------------------- |
| 🟡 MOYEN  | Pas de webhook API-Football                            | Latence 1 min max entre un événement réel et l'app |
| 🟡 MOYEN  | Fixture ID ambigu si 2 matchs home/away même jour      | `syncApiFootballMatch` abandonne la sync           |
| 🟡 MOYEN  | `console.log` de debug dans match-monitor (ligne ~457) | Logs parasites en production                       |
| 🟢 RÉSOLU | Pas de retry/backoff sur `fetchApiFootball`            | Sprint C5 ✅                                       |

---

## PILIER 2 — CARTOGRAPHIE DES NOTIFICATIONS PUSH (Le Système Nerveux)

### 2.1 Infrastructure

```
Library    : web-push ^3.6.7
SW         : /public/sw.js  (Smart Mute = pas de notif si app visible)
VAPID keys : NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY
Core lib   : src/lib/push-sender.ts
  ├── sendPushToMatchSubscribers(matchId, payload) → filtre match_subscriptions.smart_mute=false
  └── sendPushToUsers(userIds[], payload)          → dédupliqué, nettoie les 410 Gone
Tables     : push_subscriptions (endpoint, keys JSONB) + match_subscriptions (smart_mute)
```

---

### 2.2 Triggers Implémentés ✅

| #   | Trigger                    | Fichier                             | Condition                                      |
| --- | -------------------------- | ----------------------------------- | ---------------------------------------------- |
| 1   | **VAR Market Opening**     | `/api/alert/route.ts`               | ≥ 2 signaux distincts en 30s                   |
| 2   | **Squad VAR Siren**        | `/api/squads/var-alert/route.ts`    | Manuel par l'utilisateur (cooldown 15 min)     |
| 3   | **Prono Nudge**            | `/api/squads/nudge/route.ts`        | Squad leader (cooldown 30 min/squad)           |
| 4   | **VAR Résolue**            | `/api/admin/resolve-event/route.ts` | Après `resolveEvent()` — sprint A1 ✅          |
| 5   | **Fin de match**           | `/api/admin/finish-match/route.ts`  | Après résolution pronos — sprint A2 ✅         |
| 6   | **Nouveau membre**         | `/api/squads/join/route.ts`         | Sprint B4 ✅                                   |
| 7   | **Rappel prono H-1**       | `/api/cron/prono-reminders`         | Sprint H3 ✅                                   |
| 8   | **Fin de saison 1v1**      | Cron resolve-league-round           | Sprint I3 ✅                                   |
| 9   | **Quick-bet VAR** (action) | `/api/var-bets/quick-bet`           | Depuis SW notificationclick — FK1 ✅           |
| 10  | **Badge débloqué**         | `/api/admin/resolve-event`          | `checkAndUnlockBadges()` — BadgeUnlockListener |
| 11  | **Rappel match imminent**  | `/api/cron/match-imminent`          | H-5min avant coup d'envoi — FK2 ✅             |
| 12  | **Rappel match 2h**        | `/api/cron/match-reminder-2h`       | H-2h avant coup d'envoi — FK2 ✅               |
| 13  | **Daily Digest**           | `/api/cron/daily-digest`            | 8h UTC — résumé pronos du jour ✅              |
| 14  | **Transition de saison**   | `/api/cron/transition-season`       | 1er du mois — archive + reset ✅               |

### 2.3 Triggers Manquants ❌

| #   | Trigger manquant                | Priorité  |
| --- | ------------------------------- | --------- |
| 15  | **Badge débloqué (app fermée)** | 🟡 MOYEN  |
| 16  | **Rappel streak quotidien**     | 🟢 FAIBLE |

---

## PILIER 3 — RADIOGRAPHIE DES MÉCANIQUES DE JEU (Les Règles Métier)

### 3.1 Résolution des Paris VAR — Flux Complet

**Fonction PostgreSQL :** `resolve_event_parimutuel()` (migration `0045`)
**Appelée par :** `src/lib/resolve-event.ts` (signature `result: string` depuis sprint stoppages)

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

**Grades (fonction `profile_rank_from_xp()`) — Seuils XP :**

| Seuil XP      | Grade               | Avatar tier |
| ------------- | ------------------- | ----------- |
| 0 – 499       | Arbitre de District | district    |
| 500 – 1 999   | Sifflet de Bronze   | bronze      |
| 2 000 – 4 999 | Sifflet d'Argent    | argent      |
| ≥ 5 000       | Boss de la VAR      | boss        |

Avatars cosmétiques débloquables par palier XP — `AVATAR_TIERS` dans `ProfileEditModal`.

---

### 3.4 Système 1v1 — Mode Championnat (sprint G ✅)

- Tables : `league_seasons`, `league_fixtures`, `league_standings`
- Algo round-robin "cercle tournant" (N-1 rounds aller + retour)
- Résolution hebdomadaire via RPC `resolve_league_round` + match-monitor
- UI : tableau W/D/L/Pts, journée en cours, calendrier complet dans `SquadDetailClient`

---

### 3.5 Badges & XP — Système de Récompenses

**Badges actifs (6) :**

| Badge             | Critère                           | Statut       |
| ----------------- | --------------------------------- | ------------ |
| Oeil de Faucon    | 3 VAR gagnés consécutifs          | ✅           |
| Nostradamus       | Score exact trouvé                | ✅           |
| Pierluigi Collina | trust_score ≥ MODERATOR_THRESHOLD | ✅           |
| Le Chat Noir      | 5 VAR perdus sur même match       | ✅           |
| Fidèle au Poste   | login_streak ≥ 3                  | ✅ Sprint B2 |
| Goleador          | Buteur correct trouvé             | ✅           |

**Où `checkAndUnlockBadges()` est appelé :**

- `/api/admin/resolve-event` ✅
- `/api/admin/finish-match` ✅ (sprint A3)
- `profile/page.tsx` ✅

**Pas de push si badge débloqué app fermée** — `BadgeUnlockListener` gère le cas app ouverte via Realtime.

---

### 3.6 Économie des Sifflets — Système Complet

- **Solde initial :** 1 000 pts (trigger profile creation)
- **Refill :** +500 pts si solde < 500 pts, max 1×/24h (route `/api/claim-daily-refill`)
- **Streak quotidien :** +50 pts × min(streak, 7) via `/api/claim-daily-streak` (sprint H1 ✅)
- **RSA (Revenu de Soutien Arbitral) :** solde < seuil minimum → injection automatique (sprint Eco1 ✅)
- **Règle Apple :** Aucun achat possible — Sifflets 100% gagnés in-game

**Mises Minimum (paliers, `src/lib/economy/min-bet.ts`) :**

| Solde               | Mise minimum |
| ------------------- | ------------ |
| < 5 000 pts         | 5 pts        |
| 5 000 – 19 999 pts  | 50 pts       |
| 20 000 – 49 999 pts | 200 pts      |
| 50 000 – 99 999 pts | 500 pts      |
| ≥ 100 000 pts       | 1 000 pts    |

**Points Saison (`season_points`) :** Séparés de `sifflets_balance`. Réinitialisés à chaque transition de saison. Alimentent le classement de saison dans `/leaderboard`. Archive via `season_archives` (migration 0078+).

---

### 3.7 Boosters (sprint Eco2 ✅)

**Table :** `boosters_catalog` / `user_boosters_inventory`

| Booster      | Effet                                                  | Durée   |
| ------------ | ------------------------------------------------------ | ------- |
| `double_xp`  | XP × 2 sur le prochain pari VAR gagné                  | 1 usage |
| `cote_plus`  | Multiplicateur majoré de +0.25x sur prochaine victoire | 1 usage |
| `safety_net` | Rembourse la mise si défaite sur prochain pari         | 1 usage |
| `vision`     | Affiche la répartition des mises (distribution %)      | 1 match |

Achat via `/api/boosters/purchase` — consommation auto-détectée dans `resolve_event_parimutuel`.

---

### 3.8 Boutique Cosmétique (sprint Eco3 ✅)

**Tables :** `shop_items` / `user_shop_inventory`

- Avatars premium, bordures de profil, effets de badge
- Achat via `/api/shop/purchase`, équipement via `/api/shop/equip`
- Affichage dans `ProfileClient` onglet profil + `ProfileEditModal`
- **Réservés aux paliers XP :** certains items nécessitent grade minimum (AVATAR_TIERS)

---

## PILIER 4 — ARCHITECTURE DES COMPOSANTS (La Structure)

### 4.1 Hiérarchie des Routes

```
/                       → Landing page (Server Component, LAND sprint ✅)
/login                  → Google OAuth (Client Component)
/auth/callback          → PKCE exchange (Route Handler)
/join/[code]            → Rejoindre une ligue via lien direct (Server Component)
/(app)/                 → Layout protégé : TopBar + BottomNav + auth guard + LiveRoomContext
  lobby/                → Server Component + Suspense skeleton (⚠️ revalidate manquant)
  match/[id]/           → Server Component + LiveRoom (Client)
  pronos/               → Server Component + PronosticsHubClient (Client, ⚠️ revalidate 60s)
  profile/              → Server Component + ProfileClient (Client)
  profile/[id]/         → Profil public — même structure
  ligues/               → Server Component + LiguesPageClient (Client, ⚠️ revalidate manquant)
  squads/[id]/          → SquadDetailClient (Client)
  leaderboard/          → Server Component, revalidate=86400 (24h ISR ✅)
  settings/             → Server Component (⚠️ revalidate manquant)
  shop/                 → Server Component (⚠️ revalidate manquant)
  rules/ laws/          → Server Components statiques ✅
/admin/resolve          → Admin UI (protégé trust_score ≥ 150)
/api/og/victory/[id]   → OG image dynamique (sprint LAND ✅)
```

### 4.2 Composants Critiques — Taille & Responsabilités (Audit 2026-05-08)

| Composant                 | Lignes | État     | Problème principal                                  |
| ------------------------- | ------ | -------- | --------------------------------------------------- |
| `PronosticsHubClient.tsx` | 1 097  | ⚠️ Lourd | Mix score picker + scorer + date filter             |
| `VotingModal.tsx`         | 842    | ⚠️ Lourd | 3 setIntervals, scroll lock manquant                |
| `ProfileClient.tsx`       | 840    | ⚠️ Lourd | Onglets profil/amis/badges/historique mélangés      |
| `ActionDrawer.tsx`        | 800    | ⚠️ Lourd | Alertes VAR + drawer — logique mélangée, pas d'ARIA |
| `LiveRoom.tsx`            | 622    | ✅ OK    | Bien structuré, cleanup correct                     |
| `SquadDetailClient.tsx`   | ~500   | ✅ OK    | Leaderboard + chat + 1v1 (extrait depuis V3)        |

### 4.3 Contexte React & Hooks Personnalisés

**Context unique :** `LiveRoomContext` — fourni dans `src/app/(app)/layout.tsx`, consommé par `LiveRoom` et `BottomNav`.

**Hooks personnalisés :**

| Hook                       | Fichier                                 | Rôle                                  |
| -------------------------- | --------------------------------------- | ------------------------------------- |
| `useActiveSquad`           | `src/hooks/useActiveSquad.ts`           | localStorage + `useSyncExternalStore` |
| `usePreferredCompetitions` | `src/hooks/usePreferredCompetitions.ts` | Sync optimiste API competition prefs  |

**Composants "use client" convertibles en Server Component :** `CompetitionFilter`, `MatchFilterBar`, `AlertDrawer`, `PostMatchRecap`, `MatchLineupsPitch`, `SquadChampionship`, `LeagueHubBoundary`, `tabs.tsx`.

### 4.4 Patterns de Données — Bon vs Mauvais

**✅ Bons patterns en production :**

- `Promise.all()` pour les fetches parallèles sur toutes les pages critiques (sprint E ✅)
- `revalidate` sur leaderboard (86400s) et pronos (60s)
- `Map<string, Row>` pour dédupliquer les jointures sans N+1
- `REPLICA IDENTITY FULL` sur les tables Realtime
- `setTimeout(() => setState(val), 0)` pour contourner `react-hooks/set-state-in-effect` (React 19)

**⚠️ Patterns à corriger :**

- `window.dispatchEvent(new CustomEvent("sifflet:..."))` dans `LiveRoom` ↔ `BottomNav` — couplage lâche non typé
- **27 instances de `select("*")`** — sur-fetching (profiles, pronos, shop, match components)
- **Sequential awaits** dans `profile/[id]` et `profile/page.tsx` qui pourraient être parallélisés
- Polling toutes les 5s dans `SquadDetailClient` sans backoff

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

### 4.6 Infrastructure i18n (Tâche 2X ✅)

```
Library     : next-intl
Config      : src/i18n.ts + src/lib/i18n/locale.ts (cookie + header locale detection)
Locales     : ["fr", "en", "es", "de", "it"]
Messages    : messages/*.json (fr, en, es, de, it — tous complets)
Namespaces  : Navigation (BottomNav) + TopBar — 2/N namespaces implémentés
Couverture  : ~5% (TopBar + BottomNav uniquement)
SSR         : getLocale() / getMessages() de "next-intl/server"
Client      : useTranslations("Namespace") + useLocale() de "next-intl"
Locale switch: Server Action switchLocale() → cookie → router.refresh()
```

> ⚠️ **Dual system**: `src/lib/translations.ts` est le système i18n primaire (100+ strings FR/EN). `messages/*.json` est secondaire (next-intl). Les 131 appels `toast.*` et la quasi-totalité des labels UI sont hardcodés en français.

---

## PILIER 5 — DETTE TECHNIQUE & NETTOYAGE (La Santé du Code)

### 5.1 Fichiers Orphelins

Fichiers de debug racine **encore présents dans le repo** (git status vu au démarrage de session) :

- `test-squad-route*.js` (×9), `test-*.js`, `fix-ts.js`, `test-supabase.ts`
- `scripts/test_*.ts` — vérifier si supprimés
- `src/services/sportsdb-sync.ts` — résidu TheSportsDB, encore importé dans `/api/admin/sync-live`

---

### 5.2 Risques de Sécurité (Audit 2026-05-08)

| Risque                                             | Sévérité | État          |
| -------------------------------------------------- | -------- | ------------- |
| Pas de rate limiting sur `/api/claim-daily-streak` | 🔴       | ❌ Non traité |
| Pas de rate limiting sur `/api/claim-rsa`          | 🔴       | ❌ Non traité |
| Pas de rate limiting sur `/api/shop/purchase`      | 🔴       | ❌ Non traité |
| Pas de rate limiting sur `/api/boosters/purchase`  | 🔴       | ❌ Non traité |
| Pas de rate limiting sur `/api/var-bets/quick-bet` | 🔴       | ❌ Non traité |
| Rate limiting présent sur `/api/bet`               | ✅       | 10 req/min    |
| Rate limiting présent sur `/api/alert`             | ✅       | 5 req/min     |
| Cooldown 30min sur `/api/squads/nudge`             | ✅       | DB-based      |
| Cron routes vérifient Bearer CRON_SECRET           | ✅       | Toutes        |
| Admin routes vérifient trust_score ≥ 150           | ✅       | Toutes        |
| `console.log` de debug dans match-monitor (~L457)  | 🟡       | ❌ Non traité |
| Pas de validation structurée (no zod)              | 🟡       | ❌ Non traité |

---

### 5.3 Performance — Gaps Identifiés (Audit 2026-05-08)

**ISR manquante sur 11 pages :**

| Page              | revalidate cible | État actuel          |
| ----------------- | ---------------- | -------------------- |
| `/lobby`          | 30s              | ❌ Pas de revalidate |
| `/shop`           | 3600s (1h)       | ❌ Pas de revalidate |
| `/settings`       | 86400s (24h)     | ❌ Pas de revalidate |
| `/ligues`         | 300s (5min)      | ❌ Pas de revalidate |
| `/profile`        | 300s             | ❌ Pas de revalidate |
| `/profile/[id]`   | 300s             | ❌ Pas de revalidate |
| `/rules`, `/laws` | 86400s           | ❌ Pas de revalidate |

**Images non optimisées :** 7 balises `<img>` brutes (non `next/image`) dans : MatchCard, MatchLobby, Scoreboard, MatchLineupsPitch, MatchLineups, PolymarketTab, MatchStats.

**Suspense boundaries manquants :** pages profile, pronos, shop (skeleton loader non implémenté).

---

### 5.4 Type Safety

| Fichier                                  | Problème                                           | Sprint           |
| ---------------------------------------- | -------------------------------------------------- | ---------------- |
| `src/components/profile/AmisContent.tsx` | `any` restants sur friend_requests                 | B3 ✅ / Vérifier |
| `src/app/(app)/match/[id]/page.tsx`      | `// @ts-ignore` sur join relationship              | En cours         |
| `src/types/database.ts`                  | `Relationships: []` vide (joins typés impossibles) | Structurel       |

---

### 5.5 Constants & Magic Numbers

Valeurs hardcodées à extraire dans `src/lib/constants/` :

| Valeur                      | Localisation           | Constante cible                    |
| --------------------------- | ---------------------- | ---------------------------------- |
| `ALERT_THRESHOLD = 2`       | `/api/alert/route.ts`  | `src/lib/constants/alert.ts`       |
| `ALERT_WINDOW_SECONDS = 30` | `/api/alert/route.ts`  | idem                               |
| `COOLDOWN_MINUTES = 5`      | `/api/alert/route.ts`  | idem                               |
| `MIN_TRUST_SCORE = 50`      | `/api/alert/route.ts`  | `src/lib/constants/permissions.ts` |
| `REFILL_THRESHOLD = 500`    | `profile/page.tsx`     | `src/lib/constants/economy.ts`     |
| `24 * 60 * 60 * 1000`       | Répété 5× dans le code | `MS_PER_DAY`                       |
| `signal timer 30s`          | `LiveRoom.tsx:307`     | `SIGNAL_TIMEOUT_MS`                |

---

### 5.6 Accessibilité (WCAG 2.1 AA) — Audit 2026-05-08

| Problème                                                                                           | Composant(s)              | Sévérité  |
| -------------------------------------------------------------------------------------------------- | ------------------------- | --------- |
| Zéro attribut ARIA dialog (`role`, `aria-modal`)                                                   | ActionDrawer, AlertDrawer | 🔴 Haute  |
| `aria-labelledby` manquant (h2 non connecté)                                                       | ProfileEditModal          | 🟡 Moyen  |
| Scroll lock body manquant lors d'une modale ouverte                                                | VotingModal, ActionDrawer | 🟡 Moyen  |
| 29/31 inputs de formulaire sans `<label>` associé                                                  | Formulaires partout       | 🟡 Moyen  |
| `text-zinc-500` sur `bg-zinc-900` ≈ ratio 4:1                                                      | Labels partout            | Limite AA |
| ✅ VotingModal: role="dialog", aria-modal, focus trap, role="timer", role="progressbar", aria-live | VotingModal               | Excellent |

---

### 5.7 i18n — État Réel

```
Système primaire   : src/lib/translations.ts (FR/EN hardcodé — couverture ~60%)
Système secondaire : next-intl + messages/*.json (TopBar + BottomNav — couverture ~5%)
Toasts             : 131 appels toast.* — 100% hardcodés en français, 0% i18n
Labels UI          : ~95% hardcodés en français
Conflits potentiels: 2 systèmes i18n actifs (translations.ts vs next-intl)
```

---

### 5.8 Indexes DB Manquants

| Table               | Colonne       | Impact                            |
| ------------------- | ------------- | --------------------------------- |
| `user_badges`       | `badge_id`    | Lookups lents sur badges          |
| `friend_requests`   | `receiver_id` | Liste amis en attente non indexée |
| `push_logs`         | `user_id`     | Logs push non indexés             |
| `user_daily_recaps` | `user_id`     | Recap quotidien non indexé        |

---

### 5.9 Console & Logging

**`console.log` en code production :**

| Fichier                              | Occurrences | Type        |
| ------------------------------------ | ----------- | ----------- |
| `/api/alert/route.ts`                | 3           | Debug flows |
| `/api/cron/match-monitor/route.ts`   | Nombreux    | Tick logs   |
| `/src/services/sportsdb-sync.ts`     | Nombreux    | Sync status |
| `/src/services/api-football-sync.ts` | Nombreux    | Sync status |

**Recommandation :** Créer `src/lib/logger.ts` wrappant `console` avec niveau (debug/info/warn/error) et préfixe `[service]`.

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

| Tâche | Description                                                      | Fichier(s)                  |
| ----- | ---------------------------------------------------------------- | --------------------------- |
| P1    | Remplacer les 7 `<img>` par `next/image` (LCP immédiat)          | MatchCard, Scoreboard, etc. |
| P2    | Ajouter `revalidate` sur lobby (30s), shop (1h), ligues (5min)   | Pages concernées            |
| P3    | Ajouter `revalidate` sur profile/settings/rules (300s / 24h)     | Pages concernées            |
| P4    | Paralléliser les awaits séquentiels dans profile/[id] et profile | `src/app/(app)/profile/`    |
| P5    | Ajouter Suspense + skeleton loaders sur pronos, shop, profile    | Composants concernés        |

### 🟡 Sprint ARIA — "Accessibilité Critique"

| Tâche | Description                                                               | Fichier(s)                |
| ----- | ------------------------------------------------------------------------- | ------------------------- |
| A1    | Ajouter `role="dialog"`, `aria-modal`, `aria-labelledby` sur ActionDrawer | `ActionDrawer.tsx`        |
| A2    | Même chose sur AlertDrawer                                                | `AlertDrawer.tsx`         |
| A3    | Connecter le `<h2>` à `aria-labelledby` dans ProfileEditModal             | `ProfileEditModal.tsx`    |
| A4    | Ajouter scroll lock body (`overflow-hidden`) sur ouverture modales        | VotingModal, ActionDrawer |
| A5    | Associer `<label>` aux 29 inputs orphelins                                | Formulaires partout       |

### 🟡 Sprint REFACTOR — "Architecture Composants"

| Tâche | Description                                                                  | Fichier(s)                       |
| ----- | ---------------------------------------------------------------------------- | -------------------------------- |
| R1    | Extraire `ScorerAllocationEditor` de `PronosticsHubClient` (~300L)           | Nouveau `src/components/pronos/` |
| R2    | Extraire `MatchFilterBar` + `DateSlider` de `PronosticsHubClient`            | Nouveau `src/components/pronos/` |
| R3    | Remplacer `window.dispatchEvent("sifflet:...")` par `LiveRoomContext`        | `LiveRoom.tsx` ↔ `BottomNav.tsx` |
| R4    | Extraire `AmisContent` de `ProfileClient` (déjà en fichier séparé, vérifier) | `src/components/profile/`        |
| R5    | Corriger les 27 instances de `select("*")` par des select explicites         | Partout                          |
| R6    | Supprimer les fichiers test-\*.js orphelins de la racine                     | Racine du projet                 |

### 🟢 Sprint LOGGER — "Observabilité"

| Tâche | Description                                               | Fichier(s)          |
| ----- | --------------------------------------------------------- | ------------------- |
| LOG1  | Créer `src/lib/logger.ts` (niveaux debug/info/warn/error) | Nouveau fichier     |
| LOG2  | Remplacer `console.log` dans routes prod par `logger.*`   | Routes admin + cron |
| LOG3  | Ajouter indexes DB manquants (4 tables, voir §5.8)        | Migration SQL       |

---

## ANNEXE A — INVENTAIRE DES ROUTES API

| Route                                  | Méthode  | Auth               | Rôle                                      |
| -------------------------------------- | -------- | ------------------ | ----------------------------------------- |
| `/api/cron/match-monitor`              | GET      | Bearer CRON_SECRET | Sync live principale (~1 min)             |
| `/api/cron/sync-odds`                  | GET      | Bearer CRON_SECRET | Odds hebdomadaires                        |
| `/api/cron/prono-reminders`            | GET      | Bearer CRON_SECRET | Push H-1 avant matchs                     |
| `/api/cron/match-imminent`             | GET      | Bearer CRON_SECRET | Push H-5min avant matchs (FK2 ✅)         |
| `/api/cron/match-reminder-2h`          | GET      | Bearer CRON_SECRET | Push H-2h avant matchs (FK2 ✅)           |
| `/api/cron/daily-digest`               | GET      | Bearer CRON_SECRET | Résumé quotidien 8h UTC ✅                |
| `/api/cron/transition-season`          | GET      | Bearer CRON_SECRET | Archive + reset saison 1er du mois ✅     |
| `/api/alert`                           | POST     | User (trust ≥ 50)  | Signal VAR → marché si seuil              |
| `/api/bet`                             | POST     | User               | Place un pari VAR (RPC atomique)          |
| `/api/verify-event`                    | POST     | User               | Vérifie VAR > 6 min via API-Football      |
| `/api/claim-daily-streak`              | POST     | User               | Récompense streak quotidienne             |
| `/api/claim-rsa`                       | POST     | User               | RSA si solde trop bas (Eco1 ✅)           |
| `/api/refill`                          | POST     | User               | Refill manuel si solde < 500              |
| `/api/profile`                         | PATCH    | User               | Mise à jour profil (username, avatar)     |
| `/api/var-bets/quick-bet`              | POST     | User               | Quick-bet depuis notification SW (FK1 ✅) |
| `/api/shop/purchase`                   | POST     | User               | Achat item cosmétique (Eco3 ✅)           |
| `/api/shop/equip`                      | POST     | User               | Équiper item acheté                       |
| `/api/boosters/purchase`               | POST     | User               | Achat booster (Eco2 ✅)                   |
| `/api/recap/today`                     | GET      | User               | Résumé pronos du jour                     |
| `/api/match-subscription`              | POST     | User               | Subscribe/mute un match                   |
| `/api/admin/resolve-event`             | POST     | Modérateur         | Force OUI/NON sur un événement            |
| `/api/admin/finish-match`              | POST     | Modérateur         | Termine match + résout paris + pronos     |
| `/api/admin/sync-apifootball-fixtures` | GET      | Modérateur         | Import matchs par date                    |
| `/api/admin/sync-apifootball-round`    | GET      | Modérateur         | Import par journée de championnat         |
| `/api/admin/sync-live`                 | GET      | Modérateur/Cron    | Sync ad-hoc matchs actifs                 |
| `/api/admin/resolve-league-round`      | POST     | Modérateur         | Résolution hebdo 1v1                      |
| `/api/admin/health`                    | GET      | Modérateur         | Status dernier tick monitor               |
| `/api/squads`                          | GET/POST | User               | Liste/Création ligues                     |
| `/api/squads/[id]`                     | GET      | Membre             | Détail ligue + classement hybride         |
| `/api/squads/[id]/start-season`        | POST     | Owner              | Lance championnat 1v1                     |
| `/api/squads/join`                     | POST     | User               | Rejoindre via invite_code                 |
| `/api/squads/leave`                    | POST     | User               | Quitter une ligue                         |
| `/api/squads/var-alert`                | POST     | User               | Sirène VAR → push squad members           |
| `/api/squads/nudge`                    | POST     | User               | Rappel pronos → push squad members        |
| `/api/og/victory/[id]`                 | GET      | Public             | OG image dynamique résultats (LAND ✅)    |

---

## ANNEXE B — AUDIT UX/UI (2026-05-08)

### 1. Design System — État

**✅ Cohérent :**

- Fond dark : `zinc-900` / `zinc-800` / `zinc-950` uniforme
- Accent primaire : `green-500` (CTAs) + `yellow-400` (alerte) + `amber-500` (économie)
- Radius : `rounded-2xl` dominant, `rounded-3xl` sur les cartes hero
- Glow accents sur les éléments de gamification (ProfileHeader ✅)
- Pill tabs horizontaux dans ProfileClient ✅
- Safe areas (`env(safe-area-inset-*)`) sur TopBar et layout ✅

**⚠️ Incohérences restantes :**

- Hauteurs de boutons hétérogènes : `h-10` / `h-11` / `h-12` / `h-14` — pas de token `.btn-primary`
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

| Feature                                 | Statut               |
| --------------------------------------- | -------------------- |
| Streak quotidien visible + claim        | ✅                   |
| XP bar dans ProfileHeader               | ✅                   |
| Badges avec progress + critères         | ✅                   |
| Leaderboard hybride saison/all-time     | ✅ (Hall of Fame ✅) |
| Historique groupé par match             | ✅                   |
| Récap post-match                        | ✅                   |
| Overlay post-pari VAR                   | ✅ Sprint C3         |
| Séparation sous-scores ligue pronos/VAR | ✅ Sprint C1         |
| Boutique cosmétique                     | ✅ Eco3              |
| Boosters (4 types)                      | ✅ Eco2              |
| RSA solde minimum                       | ✅ Eco1              |
| Mise minimum dynamique par palier       | ✅ Eco4              |

### 4. Top 5 Priorités UX Restantes

1. **Rate limiting routes économiques** — abus economy = jeu cassé. Impact : intégrité financière.
2. **ARIA sur ActionDrawer/AlertDrawer** — lecteurs d'écran complètement aveuglés.
3. **Images next/image** — LCP (Largest Contentful Paint) dégradé sur lobby et match rooms.
4. **ISR manquante** — lobby rechargé à chaque visiteur = coût DB élevé en période de pointe CDM.
5. **Scroll lock modales** — UX dégradée sur iOS (scroll arrière-plan pendant la modale).

---

## ANNEXE C — SCHÉMA BASE DE DONNÉES (Vue d'ensemble)

**92 migrations** (0001 → 0092) — évolution rigoureuse depuis `0001_init.sql`.
**39 tables actives** dans `src/types/database.ts`.
**27 RPCs publiques** + 5 fonctions trigger.
**9 tables Realtime** avec REPLICA IDENTITY FULL.

```
auth.users ─── profiles (balance, rank, xp, trust_score, login_streak, season_points)
                ├── bets (paris VAR, status, chosen_option, parimutuel)
                ├── pronos (score exact / buteur, points_earned)
                ├── user_badges → badges
                ├── push_subscriptions + match_subscriptions
                ├── user_shop_inventory → shop_items
                ├── user_boosters_inventory → boosters_catalog
                ├── booster_highlights (effets visuels actifs)
                ├── user_daily_recaps (résumés quotidiens)
                ├── friend_requests (sociale)
                ├── push_logs (audit notifications)
                └── squad_members → squads (game_mode, invite_code)
                                      ├── league_seasons
                                      │     ├── league_fixtures (round-robin)
                                      │     └── league_standings (W/D/L/Pts)
                                      └── squad_messages

competitions → matches (status, start_time, odds, alert_cooldown)
                ├── market_events (type, status open/closed/resolved)
                │     └── bets
                ├── match_statistics
                ├── match_timeline_events
                ├── match_presence (joueurs actifs en salle live)
                └── lineups → players → teams

seasons (label, starts_at, ends_at, is_current)
season_archives (snapshot classement saison terminée)
```

**Tables nouvelles depuis V3 (migrations 0078–0092) :**
`match_presence`, `seasons`, `season_archives`, `user_daily_recaps`, `shop_items`, `user_shop_inventory`, `boosters_catalog`, `user_boosters_inventory`, `booster_highlights`, `push_logs`, `friend_requests`
