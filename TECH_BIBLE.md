# 📖 BIBLE TECHNIQUE — VAR TIME (Le Sifflet) — V3

> Audit CTO • 2026-05-07 • Base : sprints 1–8 + A–K complétés • 77 migrations Supabase • ~60 composants client

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

L'app n'utilise **pas** les crons Vercel (option payante). Les jobs sont gérés via **cron-job.org**.

| Job               | URL                                                 | Fréquence              | Statut     |
| ----------------- | --------------------------------------------------- | ---------------------- | ---------- |
| Match Monitor     | `GET /api/cron/match-monitor`                       | Toutes les minutes     | ✅ Actif   |
| Sync Odds         | `GET /api/cron/sync-odds`                           | Lundi 6h UTC           | ✅ Actif   |
| Sync Fixtures     | `GET /api/admin/sync-apifootball-fixtures?date=J+1` | Quotidien 6h UTC       | ✅ À créer |
| Prono Reminders   | `GET /api/cron/prono-reminders`                     | H-1 avant chaque match | ✅ Actif   |
| Reset Monthly Pts | `GET /api/cron/reset-monthly-points`                | 1er du mois minuit     | ✅ Actif   |

> ⚠️ `vercel.json` contient encore `sync-odds` en tant que cron Vercel — peut entrer en conflit (double déclenchement). Conserver comme fallback uniquement si `CRON_SECRET` est identique.

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

| Criticité | Gap                                                              | Impact                                             |
| --------- | ---------------------------------------------------------------- | -------------------------------------------------- |
| 🟡 MOYEN  | `vercel.json` contient encore `sync-odds` (doublon cron-job.org) | Double déclenchement potentiel                     |
| 🟡 MOYEN  | Pas de webhook API-Football                                      | Latence 1 min max entre un événement réel et l'app |
| 🟡 MOYEN  | Fixture ID ambigu si 2 matchs home/away même jour                | `syncApiFootballMatch` abandonne la sync           |
| 🟢 RÉSOLU | Pas de retry/backoff sur `fetchApiFootball`                      | Sprint C5 ✅                                       |

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

| #   | Trigger                | Fichier                             | Condition                                  |
| --- | ---------------------- | ----------------------------------- | ------------------------------------------ |
| 1   | **VAR Market Opening** | `/api/alert/route.ts`               | ≥ 2 signaux distincts en 30s               |
| 2   | **Squad VAR Siren**    | `/api/squads/var-alert/route.ts`    | Manuel par l'utilisateur (cooldown 15 min) |
| 3   | **Prono Nudge**        | `/api/squads/nudge/route.ts`        | Squad leader (cooldown 30 min/squad)       |
| 4   | **VAR Résolue**        | `/api/admin/resolve-event/route.ts` | Après `resolveEvent()` — sprint A1 ✅      |
| 5   | **Fin de match**       | `/api/admin/finish-match/route.ts`  | Après résolution pronos — sprint A2 ✅     |
| 6   | **Nouveau membre**     | `/api/squads/join/route.ts`         | Sprint B4 ✅                               |
| 7   | **Rappel prono**       | `/api/cron/prono-reminders`         | Sprint H3 ✅                               |
| 8   | **Fin de saison 1v1**  | Cron resolve-league-round           | Sprint I3 ✅                               |

### 2.3 Triggers Manquants ❌

| #   | Trigger manquant                | Priorité  |
| --- | ------------------------------- | --------- |
| 9   | **Badge débloqué** (app fermée) | 🟡 MOYEN  |
| 10  | **Rappel streak quotidien**     | 🟢 FAIBLE |

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

**Grades (fonction `profile_rank_from_xp()`) :**

| Seuil XP      | Grade               |
| ------------- | ------------------- |
| 0 – 499       | Arbitre de District |
| 500 – 1 999   | Sifflet de Bronze   |
| 2 000 – 4 999 | Sifflet d'Argent    |
| ≥ 5 000       | Boss de la VAR      |

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

### 3.6 Économie des Sifflets

- **Solde initial :** 1 000 pts (trigger profile creation)
- **Refill :** +500 pts si solde < 500 pts, max 1×/24h (route `/api/claim-daily-refill`)
- **Streak quotidien :** +50 pts × min(streak, 7) via `/api/claim-daily-streak` (sprint H1 ✅)
- **Règle Apple :** Aucun achat possible — Sifflets 100% gagnés in-game

---

## PILIER 4 — ARCHITECTURE DES COMPOSANTS (La Structure)

### 4.1 Hiérarchie des Routes

```
/                       → Landing page (Server Component)
/login                  → Google OAuth (Client Component)
/auth/callback          → PKCE exchange (Route Handler)
/(app)/                 → Layout protégé : TopBar + BottomNav + auth guard
  lobby/                → Server Component + Suspense skeleton
  match/[id]/           → Server Component + LiveRoom (Client)
  pronos/               → Server Component + PronosticsHubClient (Client)
  profile/              → Server Component + ProfileClient (Client)
  profile/[id]/         → Profil public — même structure
  ligues/               → Server Component + LiguesPageClient (Client)
  squads/[id]/          → SquadDetailClient (Client, très lourd)
  leaderboard/          → Server Component, revalidate=300
  settings/             → Server Component
  rules/ laws/          → Server Components statiques
/admin/resolve          → Admin UI (protégé trust_score ≥ 150)
```

### 4.2 Composants Critiques — Taille & Responsabilités

| Composant                 | Lignes | État      | Problème principal                                   |
| ------------------------- | ------ | --------- | ---------------------------------------------------- |
| `PronosticsHubClient.tsx` | 1 360  | ⚠️ Lourd  | Trop grand — mix score picker + scorer + date filter |
| `SquadDetailClient.tsx`   | 855    | ⚠️ Lourd  | Trop grand — leaderboard + chat + 1v1 + standings    |
| `ActionDrawer.tsx`        | 800    | ⚠️ Lourd  | Alertes VAR + drawer — logique mélangée              |
| `VotingModal.tsx`         | 659    | ⚠️ Medium | 3 setIntervals, ARIA ids définis mais non utilisés   |
| `LiveRoom.tsx`            | 493    | ✅ OK     | Bien structuré, cleanup correct                      |
| `ProfileClient.tsx`       | ~420   | ✅ OK     | Glow Up Sprint ✅ + historique groupé par match ✅   |

### 4.3 Patterns de Données — Bon vs Mauvais

**✅ Bons patterns en production :**

- `Promise.all()` pour les fetches parallèles sur toutes les pages critiques (sprint E ✅)
- `revalidate` sur leaderboard (300s) et pronos (60s) (sprint E5 ✅)
- `Map<string, Row>` pour dédupliquer les jointures sans N+1
- `REPLICA IDENTITY FULL` sur les tables Realtime

**⚠️ Patterns à corriger :**

- `window.dispatchEvent(new CustomEvent("sifflet:..."))` dans `LiveRoom` ↔ `BottomNav` — couplage lâche non typé
- Polling toutes les 5s dans `SquadDetailClient` sans backoff
- `createClient()` non mémoïsé dans certains useEffect

### 4.4 État des Subscriptions Realtime

| Table             | Composant         | REPLICA IDENTITY | Statut        |
| ----------------- | ----------------- | ---------------- | ------------- |
| `matches`         | LiveRoom          | FULL             | ✅            |
| `market_events`   | LiveRoom          | FULL             | ✅            |
| `bets`            | LiveRoom/TopBar   | FULL             | ✅            |
| `profiles`        | TopBar            | FULL             | ✅            |
| `friend_requests` | AmisContent       | ?                | ⚠️ À vérifier |
| `squad_messages`  | SquadDetailClient | ?                | ⚠️ À vérifier |

**Manque :** Aucun indicateur de connexion Realtime ("En ligne / Reconnexion...") visible pour l'utilisateur.

---

## PILIER 5 — DETTE TECHNIQUE & NETTOYAGE (La Santé du Code)

### 5.1 Fichiers Orphelins — État Post-Sprint B1

Tous les fichiers de debug racine supprimés (sprint B1 ✅) :

- `test-squad-route*.js` (×9), `test-*.js`, `fix-ts.js`, `test-supabase.ts`
- `scripts/test_*.ts` (×8)

**Fichiers encore présents à surveiller :**

- `src/services/sportsdb-sync.ts` — résidu TheSportsDB, encore importé dans `/api/admin/sync-live`
- `messages/es.json`, `messages/de.json`, `messages/it.json` — manquants (couverture i18n ~2%)

---

### 5.2 Risques de Sécurité

| Risque                                     | Sévérité | État          |
| ------------------------------------------ | -------- | ------------- |
| Pas de rate limiting sur `/api/bet`        | 🟠       | ❌ Non traité |
| Pas de rate limiting sur `/api/alert`      | 🟠       | ❌ Non traité |
| Admin routes sans vérification explicite   | 🟡       | Relies on RLS |
| Pas de validation structurée (no zod)      | 🟡       | ❌ Non traité |
| `console.log` en production (routes admin) | 🟢       | ❌ Non traité |
| Supabase RLS non auditées publiquement     | 🟠       | À vérifier    |

---

### 5.3 Type Safety

| Fichier                                  | Problème                                           | Sprint           |
| ---------------------------------------- | -------------------------------------------------- | ---------------- |
| `src/components/profile/AmisContent.tsx` | `any` restants sur friend_requests                 | B3 ✅ / Vérifier |
| `src/app/(app)/match/[id]/page.tsx`      | `// @ts-ignore` sur join relationship              | En cours         |
| `src/types/database.ts`                  | `Relationships: []` vide (joins typés impossibles) | Structurel       |

---

### 5.4 Constants & Magic Numbers

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

### 5.5 i18n — Implémentation Fantôme

```
Locales configurées : ["fr", "en", "es", "de", "it"]
Fichiers existants  : messages/fr.json (5 clés), messages/en.json (5 clés)
Fichiers manquants  : es.json, de.json, it.json
Couverture          : ~2% (BottomNav + TopBar uniquement)
Strings hardcodées  : ~100% (toasts, labels, boutons, erreurs)
Hook actuel         : useLocale() — client uniquement, incompatible SSR
```

---

### 5.6 Accessibilité (WCAG 2.1 AA)

| Problème                                          | Composant           | Impact         |
| ------------------------------------------------- | ------------------- | -------------- |
| ARIA `titleId`/`descId` définis mais non utilisés | `VotingModal.tsx`   | Moyen          |
| Boutons icône sans aria-label                     | Plusieurs           | Faible         |
| `text-zinc-500` sur `bg-zinc-900` ≈ ratio 4:1     | Labels partout      | Limite WCAG AA |
| Pas de focus trap documenté sur les modales       | Modales             | Moyen          |
| Tap targets < 48px sur certains états             | VotingModal ✅ F7   | Résolu         |
| Inputs score < 16px font-size (zoom iOS)          | PronosticsHub ✅ F7 | Résolu         |

---

### 5.7 Console & Logging

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

### 🔴 Sprint L — "Bétonner avant le lancement" (Robustesse)

Issues qui peuvent faire crasher ou exposer l'app en production.

| Tâche | Description                                                            | Fichier(s)                       |
| ----- | ---------------------------------------------------------------------- | -------------------------------- |
| L1    | Ajouter `src/app/error.tsx` — error boundary global App Router         | Nouveau fichier                  |
| L2    | Ajouter `src/app/(app)/error.tsx` — error boundary du groupe protégé   | Nouveau fichier                  |
| L3    | Rate limiting sur `/api/bet` (max 10 req/min/user via headers)         | `/api/bet/route.ts` + middleware |
| L4    | Rate limiting sur `/api/alert` (max 5 req/min/user)                    | `/api/alert/route.ts`            |
| L5    | Indicateur connexion Realtime ("🔴 Reconnexion..." si channel dropped) | `LiveRoom.tsx`                   |
| L6    | Créer `src/lib/logger.ts` + remplacer `console.log` dans routes prod   | Routes admin + cron              |

### 🟠 Sprint M — "Refactor Architecture" (Maintenabilité)

Composants trop gros qui ralentissent les développements futurs.

| Tâche | Description                                                                          | Fichier(s)                                   |
| ----- | ------------------------------------------------------------------------------------ | -------------------------------------------- |
| M1    | Extraire `ScorerAllocationEditor` de `PronosticsHubClient` (~300L)                   | Nouveau `src/components/pronos/`             |
| M2    | Extraire `MatchFilterBar` + `DateSlider` de `PronosticsHubClient`                    | Nouveau `src/components/pronos/`             |
| M3    | Remplacer `window.dispatchEvent("sifflet:...")` par Context React                    | `LiveRoom.tsx` ↔ `BottomNav.tsx`             |
| M4    | Extraire les constantes magic numbers dans `src/lib/constants/`                      | Voir tableau 5.4                             |
| M5    | Fixer ARIA `titleId`/`descId` dans `VotingModal.tsx`                                 | `src/components/match/VotingModal.tsx`       |
| M6    | Extraire `SquadLeaderboard`, `SquadChat`, `SquadChampionship` de `SquadDetailClient` | Nouveaux composants `src/components/ligues/` |

### 🟡 Sprint N — "Pages Manquantes" (Complétude Produit)

| Tâche | Description                                                       | Fichier(s)                     |
| ----- | ----------------------------------------------------------------- | ------------------------------ |
| N1    | Créer `/rules` — page Règles du Jeu (statique)                    | `src/app/(app)/rules/page.tsx` |
| N2    | Créer `/laws` — page Lois IFAB (statique)                         | `src/app/(app)/laws/page.tsx`  |
| N3    | Créer `/cgu`, `/mentions-legales` — obligatoires pour les stores  | `src/app/` (pages publiques)   |
| N4    | Fixer les liens `#` du footer landing page                        | `src/app/page.tsx`             |
| N5    | Dot "pronos saisis" sur DateSlider (sprint C2 — vérifier si fait) | `PronosticsHubClient.tsx`      |

---

## ANNEXE A — INVENTAIRE DES ROUTES API

| Route                                  | Méthode  | Auth               | Rôle                                  |
| -------------------------------------- | -------- | ------------------ | ------------------------------------- |
| `/api/cron/match-monitor`              | GET      | Bearer CRON_SECRET | Sync live principale (~1 min)         |
| `/api/cron/sync-odds`                  | GET      | Bearer CRON_SECRET | Odds hebdomadaires                    |
| `/api/cron/prono-reminders`            | GET      | Bearer CRON_SECRET | Push H-1 avant matchs                 |
| `/api/cron/reset-monthly-points`       | GET      | Bearer CRON_SECRET | Reset monthly_points_earned           |
| `/api/alert`                           | POST     | User (trust ≥ 50)  | Signal VAR → marché si seuil          |
| `/api/bet`                             | POST     | User               | Place un pari VAR (RPC atomique)      |
| `/api/verify-event`                    | POST     | User               | Vérifie VAR > 6 min via API-Football  |
| `/api/claim-daily-streak`              | POST     | User               | Récompense streak quotidienne         |
| `/api/profile`                         | PATCH    | User               | Mise à jour profil (username, avatar) |
| `/api/admin/resolve-event`             | POST     | Modérateur         | Force OUI/NON sur un événement        |
| `/api/admin/finish-match`              | POST     | Modérateur         | Termine match + résout paris + pronos |
| `/api/admin/sync-apifootball-fixtures` | GET      | Modérateur         | Import matchs par date                |
| `/api/admin/sync-apifootball-round`    | GET      | Modérateur         | Import par journée de championnat     |
| `/api/admin/sync-live`                 | GET      | Modérateur/Cron    | Sync ad-hoc matchs actifs             |
| `/api/admin/resolve-league-round`      | POST     | Modérateur         | Résolution hebdo 1v1                  |
| `/api/admin/health`                    | GET      | Modérateur         | Status dernier tick monitor           |
| `/api/squads`                          | GET/POST | User               | Liste/Création ligues                 |
| `/api/squads/[id]`                     | GET      | Membre             | Détail ligue + classement hybride     |
| `/api/squads/[id]/start-season`        | POST     | Owner              | Lance championnat 1v1                 |
| `/api/squads/join`                     | POST     | User               | Rejoindre via invite_code             |
| `/api/squads/leave`                    | POST     | User               | Quitter une ligue                     |
| `/api/squads/var-alert`                | POST     | User               | Sirène VAR → push squad members       |
| `/api/squads/nudge`                    | POST     | User               | Rappel pronos → push squad members    |
| `/api/match-subscription`              | POST     | User               | Subscribe/mute un match               |

---

## ANNEXE B — AUDIT UX/UI

### 1. Design System — État

**✅ Cohérent :**

- Fond dark : `zinc-900` / `zinc-800` / `zinc-950` uniforme
- Accent primaire : `green-500` (CTAs) + `yellow-400` (alerte)
- Radius : `rounded-2xl` dominant, `rounded-3xl` sur les cartes hero
- Glow accents sur les éléments de gamification (ProfileHeader ✅)
- Pill tabs horizontaux dans ProfileClient ✅

**⚠️ Incohérences restantes :**

- Hauteurs de boutons hétérogènes : `h-10` / `h-11` / `h-12` / `h-14` — pas de token `.btn-primary`
- `text-[10px]`, `text-xs`, `text-sm` coexistent sans système de type scale clair
- Contraste `text-zinc-500` sur `bg-zinc-900` ≈ ratio 4:1 (limite WCAG AA)

### 2. Expérience Mobile

**✅ Bien :**

- Safe areas (`env(safe-area-inset-*)`) sur TopBar et layout
- `max-w-md` centré en desktop avec drawer corrigé (sprint Drawer ✅)
- Historique profil groupé par match (sprint Historique ✅)
- Glow Up Profile : hero card, pill tabs, stats cinématiques (sprint Glow Up ✅)

**⚠️ Points d'attention :**

- VotingModal : pas de détection hors-ligne (silence si network down mid-bet)
- Reconnexion Realtime : aucun indicateur utilisateur
- No error boundaries : un crash JS = page blanche sans message

### 3. Gamification — État

| Feature                                 | Statut        |
| --------------------------------------- | ------------- |
| Streak quotidien visible + claim        | ✅            |
| XP bar dans ProfileHeader               | ✅            |
| Badges avec progress + critères         | ✅            |
| Leaderboard hybride pronos/VAR          | ✅            |
| Historique groupé par match             | ✅            |
| Récap post-match                        | ✅            |
| Dot "pronos saisis" sur DateSlider      | ⚠️ À vérifier |
| Overlay post-pari VAR                   | ✅ Sprint C3  |
| Séparation sous-scores ligue pronos/VAR | ✅ Sprint C1  |

### 4. Top 5 Correctifs UX Restants

1. **Error boundaries** — App crash = page blanche. Impact : 100% des erreurs inattendues.
2. **Indicateur Realtime** — L'utilisateur ne sait pas si sa session live est active.
3. **Rate limiting** — Un bug client peut envoyer des centaines de paris. Impact financier.
4. **Footer légal** — CGU / Mentions légales = blocage App Store.
5. **Refactor PronosticsHubClient** — 1 360 lignes = temps de render + maintenance dégradés.

---

## ANNEXE C — SCHÉMA BASE DE DONNÉES (Vue d'ensemble)

```
auth.users ─── profiles (balance, rank, xp, trust_score, login_streak)
                ├── bets (paris VAR, status, chosen_option, parimutuel)
                ├── pronos (score exact / buteur, points_earned)
                ├── user_badges → badges
                ├── push_subscriptions
                ├── match_subscriptions
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
                └── lineups → players → teams
```

**77 migrations** — évolution rigoureuse depuis `0001_init.sql`.
