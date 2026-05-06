# 📖 BIBLE TECHNIQUE — VAR TIME (Le Sifflet) — V2

> Audit CTO • 2026-05-06 • Base : commit `9c7c335` • 64 migrations Supabase • 42 composants client

---

## PILIER 1 — INGESTION DES DONNÉES & API (Le Moteur)

### 1.1 Le Client API-Football

**Fichier :** `src/lib/api-football-client.ts`

```
Base URL : https://v3.football.api-sports.io
Auth     : Header x-apisports-key = $API_FOOTBALL_KEY
Cache    : "no-store" (jamais de cache Next.js)
Season   : $API_FOOTBALL_SEASON (défaut 2025)
```

Toutes les requêtes passent par `fetchApiFootball<T>(endpoint, params)` — un seul point d'entrée, pas de retry automatique.

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

| Job           | URL                           | Fréquence                  | Statut   |
| ------------- | ----------------------------- | -------------------------- | -------- |
| Match Monitor | `GET /api/cron/match-monitor` | Toutes les minutes         | ✅ Actif |
| Sync Odds     | `GET /api/cron/sync-odds`     | Lundi 6h UTC (`0 6 * * 1`) | ✅ Actif |

> ⚠️ `vercel.json` contient encore `sync-odds` en tant que cron Vercel — peut entrer en conflit (double déclenchement). À nettoyer ou à laisser comme fallback (inoffensif si la clé CRON_SECRET est identique).

**Jobs à créer sur cron-job.org :**

- Voir Sprint A tâche A4 ci-dessous

---

### 1.4 Cycle du Match-Monitor (~1 tick / minute)

```
0. close_expired_market_events RPC  → ferme fenêtres VAR > 90s
1. Fixture Batch                    → scores/status/minute (lots de 20 matchs)
2. syncMatchEvents                  → TOUS les matchs LIVE (délai 200ms inter-match)
3. syncMatchStatistics              → heartbeat toutes les 5 min
4. syncMatchLineups                 → backfill unique si has_lineups=false et < 45 min
5. syncApiFootballMatch (FT)        → sync complète si status=FT/AET/PEN
```

---

### 1.5 Transition de Statut NS → LIVE → FT

Mécanisme **100% poll-based**, aucun webhook. La transition se fait via `mapApiFootballFixtureStatusShort()` (`api-football-sync.ts:186`) :

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

**Override scoreboard :** Si `home_score > 0` ET API dit `upcoming` → forcé `first_half`.

**Flux FT complet :** API renvoie `FT` → `syncApiFootballMatch()` → résolution pronos → sync classements ligue (fire-and-forget).

---

### 1.6 Détection Automatique des Marchés VAR

Fichier : `src/lib/sports/api-football-market-bridge.ts`

| Marché          | Trigger d'ouverture                                               | Trigger de résolution                                        |
| --------------- | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| `var_goal`      | Mot-clé VAR : "possible/review/check/offside/await/pending"       | "confirmed/awarded/stands" OU "cancelled/disallowed/no goal" |
| `penalty_check` | "possible penalty/penalty check/penalty+review" OU type="penalty" | "confirmed/awarded" OU "cancelled/not awarded/no penalty"    |

**Effet Domino :** Si `penalty_check` → OUI → ouvre automatiquement `penalty_outcome` (`src/lib/resolve-event.ts:5`).

---

### 1.7 Gaps Identifiés — Pilier 1

| Criticité    | Gap                                                              | Impact                                             |
| ------------ | ---------------------------------------------------------------- | -------------------------------------------------- |
| 🟠 IMPORTANT | Pas de retry/backoff sur `fetchApiFootball`                      | Un timeout réseau = données manquantes sans alerte |
| 🟡 MOYEN     | `vercel.json` contient encore `sync-odds` (doublon cron-job.org) | Double déclenchement potentiel                     |
| 🟡 MOYEN     | Pas de webhook API-Football                                      | Latence 1 min max entre un événement réel et l'app |
| 🟡 MOYEN     | Fixture ID ambigu si 2 matchs home/away même jour                | `syncApiFootballMatch` abandonne la sync           |

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

| #   | Trigger                | Fichier                             | Condition                                  | Payload                                |
| --- | ---------------------- | ----------------------------------- | ------------------------------------------ | -------------------------------------- |
| 1   | **VAR Market Opening** | `/api/alert/route.ts:161`           | ≥ 2 signaux distincts en 30s               | `"VAR Time 🟨" + type du marché`       |
| 2   | **Squad VAR Siren**    | `/api/squads/var-alert/route.ts:82` | Manuel par l'utilisateur (cooldown 15 min) | `"🚨 Sirène VAR — {user} t'appelle !"` |
| 3   | **Prono Nudge**        | `/api/squads/nudge/route.ts:106`    | Squad leader (cooldown 30 min/squad)       | `"VAR Time — Pronos en attente 🎯"`    |

---

### 2.3 Triggers Manquants ❌ — À Implémenter

| #   | Trigger manquant                                    | Où l'ajouter                                               | Priorité     |
| --- | --------------------------------------------------- | ---------------------------------------------------------- | ------------ |
| 4   | **Résolution VAR** (gagnants/perdants notifiés)     | `/api/admin/resolve-event/route.ts` après `resolveEvent()` | 🔴 CRITIQUE  |
| 5   | **Fin de match** (score final)                      | `/api/admin/finish-match/route.ts` après update status     | 🔴 CRITIQUE  |
| 6   | **Résultats Pronos** (après `resolve_match_pronos`) | `/api/admin/finish-match/route.ts`                         | 🟠 IMPORTANT |
| 7   | **Nouveau membre dans une ligue**                   | `/api/squads/join/route.ts`                                | 🟡 MOYEN     |
| 8   | **Badge débloqué**                                  | `src/app/actions/badges.ts` après insert                   | 🟡 MOYEN     |

**Conséquence directe :** Un utilisateur qui parie sur une VAR ne reçoit **jamais de notification de résultat** s'il a quitté l'app. C'est le frein à la rétention le plus critique.

---

## PILIER 3 — RADIOGRAPHIE DES MÉCANIQUES DE JEU (Les Règles Métier)

### 3.1 Résolution des Paris VAR — Flux Complet

**Fonction PostgreSQL :** `resolve_event_parimutuel()` (migration `0045`)
**Appelée par :** `src/lib/resolve-event.ts` → `/api/admin/resolve-event` ou `/api/verify-event`

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

> **Note :** Le timing du pari n'entre pas dans le calcul du reward final — seul le montant misé compte. Le timing influence la cote affichée via `get_event_odds` RPC mais pas la redistribution.

---

### 3.2 Classement Hybride des Ligues

**Route :** `GET /api/squads/[squadId]?period=week|month|general`

```
Source 1 : pronos.points_earned > 0  (filtré par start_time si period ≠ general)
Source 2 : bets.potential_reward - bets.amount_staked  (si status = 'won')
           filtré par placed_at si period ≠ general

Tri : xp_période DESC, username ASC
pot_commun = SUM de tous les xp_période des membres
```

> Le champ `xp` du leaderboard est une **métrique calculée sur la période** (≠ `profiles.xp` global cumulatif). Intentionnel mais absent de l'interface — source de confusion.

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

### 3.4 Onboarding

- **Fichier :** `src/components/onboarding/OnboardingTour.tsx`
- **Garde :** `localStorage.hasCompletedOnboarding` — affiché une seule fois
- **Monté dans :** `src/app/(app)/lobby/page.tsx`
- **Étape 1 :** "FAIS TES PRONOS" + overlay black/80
- **Étape 2 :** "REJOINS LES LIGUES AVEC TES POTES"
- **Étape 3 :** "ACTIVE TES NOTIFS !" → appelle `trySubscribePush()`

---

### 3.5 Badges & XP — Système de Récompenses

**6 badges définis** (migration `0022_badges.sql`). Vérifiés dans `src/app/actions/badges.ts`.

| Badge             | Critère                           | Statut                            |
| ----------------- | --------------------------------- | --------------------------------- |
| Oeil de Faucon    | 3 VAR gagnés consécutifs          | ✅ Implémenté                     |
| Nostradamus       | Score exact trouvé                | ✅ Implémenté                     |
| Pierluigi Collina | trust_score ≥ MODERATOR_THRESHOLD | ✅ Implémenté                     |
| Le Chat Noir      | 5 VAR perdus sur même match       | ✅ Implémenté                     |
| Fidèle au Poste   | 3 jours de connexion consécutifs  | ❌ **Case vide — non implémenté** |
| Goleador          | Buteur correct trouvé             | ✅ Implémenté                     |

**Où `checkAndUnlockBadges()` est appelé :**

- `/api/admin/resolve-event` (après résolution VAR) ✅
- `src/app/(app)/profile/page.tsx` (chargement profil) ✅
- ❌ **Absent après `resolve_match_pronos`** — badges Nostradamus/Goleador non vérifiés en temps réel

**Notification Realtime :** `BadgeUnlockListener.tsx` écoute `user_badges` via Supabase Realtime → toast immédiat ✅ (mais pas de push si app fermée).

---

## PILIER 4 — DETTE TECHNIQUE & NETTOYAGE (La Santé du Code)

### 4.1 Fichiers Orphelins à Supprimer

| Fichier(s)                                                                         | Nature                                              | Action       |
| ---------------------------------------------------------------------------------- | --------------------------------------------------- | ------------ |
| `test-squad-route.js` × 9 (`route` à `route9`)                                     | Scripts de test manuels abandonnés                  | 🗑️ Supprimer |
| `test-pronos-admin.js`, `test-query.js`, `test-squad-members.js`, `test-squads.js` | Idem                                                | 🗑️ Supprimer |
| `fix-ts.js`                                                                        | Utilitaire one-shot hardcodé                        | 🗑️ Supprimer |
| `test-supabase.ts`                                                                 | Test de connexion racine                            | 🗑️ Supprimer |
| `scripts/test_*.ts` (×8)                                                           | Scripts de debug non référencés dans `package.json` | 🗑️ Supprimer |

**Total : ~22 fichiers de debug/test à purger.**

---

### 4.2 Risques N+1 — Requêtes Supabase

**Page Profil (`src/app/(app)/profile/page.tsx`) :**

```
✅ Promise.all([profiles, bets, pronos, badges, user_badges])  ← 5 requêtes parallèles
❌ await teams...          ← Séquentiel si favorite_team_id (dépend du profil)
❌ await market_events...  ← Séquentiel (dépend des IDs de bets)
❌ await matches...        ← Séquentiel (dépend des IDs d'events)
```

Fix : inclure `teams` dans le `Promise.all` (le profil revient avec `favorite_team_id`).

**Route Squad (`/api/squads/[squadId]/route.ts`) :**

```
⚠️ squad_members_for_my_squads() → Renvoie TOUS les squads de l'user puis filtre côté JS
   Fix : créer RPC squad_members_for_squad(squad_id) ciblée
⚠️ bigWins → matchIds → matches : 2 requêtes séquentielles (acceptable mais optimisable)
```

---

### 4.3 Server vs Client Components

- 42 composants `"use client"` — split bien calibré globalement
- Toutes les pages `/(app)/` sont des Server Components ✅
- `src/components/layout/TopBar.tsx` — vérifier si elle peut passer en Server Component

---

### 4.4 i18n — Implémentation Fantôme

```
Locales configurées : ["fr", "en", "es", "de", "it"]
Fichiers existants  : messages/fr.json (5 clés Nav), messages/en.json (5 clés Nav)
Fichiers manquants  : es.json, de.json, it.json
Couverture          : ~2% (BottomNav uniquement)
Strings hardcodées  : ~100% du reste (toasts, labels, titres, boutons)
```

---

### 4.5 Database Types (`src/types/database.ts`)

| Problème                                       | Impact                                         |
| ---------------------------------------------- | ---------------------------------------------- |
| Table `friend_requests` **absente**            | `AmisContent.tsx` utilise `any` en conséquence |
| `Relationships: []` vide sur toutes les tables | Joins typés Supabase impossibles               |
| Badge `login_streak_3` — case vide dans switch | Badge jamais débloqué                          |

---

### 4.6 Autres Points de Vigilance

- `src/components/profile/AmisContent.tsx` : utilise `any` — violation CLAUDE.md
- `src/services/sportsdb-sync.ts` : résidu TheSportsDB, encore importé dans `/api/admin/sync-live` mais stratégie API-Football active
- `vercel.json` : doublon `sync-odds` (aussi sur cron-job.org) — à clarifier

---

## PILIER 5 — PLAN DES PROCHAINS SPRINTS

### 🔴 Sprint A — "Remettre le cœur à battre" (Criticité maximale)

Bugs silencieux qui cassent les boucles de rétention.

| Tâche | Description                                                           | Fichier(s)                                                |
| ----- | --------------------------------------------------------------------- | --------------------------------------------------------- |
| A1    | Push : résolution VAR (gagnants/perdants notifiés)                    | `/api/admin/resolve-event/route.ts`                       |
| A2    | Push : fin de match + résultats pronos                                | `/api/admin/finish-match/route.ts`                        |
| A3    | `checkAndUnlockBadges` après résolution pronos                        | `/api/admin/finish-match/route.ts`                        |
| A4    | Nouveau cron `sync-apifootball-fixtures` (quotidien) sur cron-job.org | Route déjà prête : `/api/admin/sync-apifootball-fixtures` |

### 🟠 Sprint B — "Soigner la Dette" (Fiabilité)

| Tâche | Description                                                      | Fichier(s)                                  |
| ----- | ---------------------------------------------------------------- | ------------------------------------------- |
| B1    | Supprimer 13 fichiers `test-*.js` racine + `fix-ts.js`           | Racine du projet                            |
| B2    | Implémenter badge `login_streak_3` (stocker last_login + streak) | `src/app/actions/badges.ts` + migration     |
| B3    | Typer `friend_requests` dans `database.ts` + supprimer les `any` | `src/types/database.ts` + `AmisContent.tsx` |
| B4    | Push : nouveau membre dans une ligue                             | `/api/squads/join/route.ts`                 |

### 🟡 Sprint C — "Polir & Optimiser" (Qualité Long Terme)

| Tâche | Description                                                            | Fichier(s)                             |
| ----- | ---------------------------------------------------------------------- | -------------------------------------- |
| C1    | Optimiser requête `favoriteTeam` sur page profil (N+1)                 | `src/app/(app)/profile/page.tsx:126`   |
| C2    | Trancher i18n : réduire à `["fr"]` ou extraire toutes les strings      | `src/lib/i18n/locale.ts` + `messages/` |
| C3    | Retry/backoff sur `fetchApiFootball` (3 tentatives, délai exponentiel) | `src/lib/api-football-client.ts`       |
| C4    | RPC `squad_members_for_squad(squad_id)` pour éviter l'over-fetch       | Nouvelle migration SQL                 |

---

## ANNEXE — INVENTAIRE DES ROUTES API

| Route                                  | Méthode  | Auth               | Rôle                                  |
| -------------------------------------- | -------- | ------------------ | ------------------------------------- |
| `/api/cron/match-monitor`              | GET      | Bearer CRON_SECRET | Sync live principale (~1 min)         |
| `/api/cron/sync-odds`                  | GET      | Bearer CRON_SECRET | Odds hebdomadaires                    |
| `/api/alert`                           | POST     | User (trust ≥ 50)  | Signal VAR → marché si seuil          |
| `/api/bet`                             | POST     | User               | Place un pari VAR (RPC atomique)      |
| `/api/verify-event`                    | POST     | User               | Vérifie VAR > 6 min via API-Football  |
| `/api/admin/resolve-event`             | POST     | Modérateur         | Force OUI/NON sur un événement        |
| `/api/admin/finish-match`              | POST     | Modérateur         | Termine match + résout paris + pronos |
| `/api/admin/sync-apifootball-fixtures` | GET      | Modérateur         | Import matchs par date                |
| `/api/admin/sync-apifootball-round`    | GET      | Modérateur         | Import par journée de championnat     |
| `/api/admin/sync-live`                 | GET      | Modérateur/Cron    | Sync ad-hoc matchs actifs             |
| `/api/squads`                          | GET/POST | User               | Liste/Création ligues                 |
| `/api/squads/[id]`                     | GET      | Membre             | Détail ligue + classement hybride     |
| `/api/squads/join`                     | POST     | User               | Rejoindre via invite_code             |
| `/api/squads/var-alert`                | POST     | User               | Sirène VAR → push squad members       |
| `/api/squads/nudge`                    | POST     | User               | Rappel pronos → push squad members    |
| `/api/match-subscription`              | POST     | User               | Subscribe/mute un match               |

---

## ANNEXE — AUDIT UX/UI & GAME DESIGN

### 1. Cohérence Visuelle

**✅ Cohérent :**

- Fond dark : `zinc-900` / `zinc-800` uniforme
- Accent primaire : `green-500` (CTAs) + `yellow-400` (whistle/alerte)
- Radius : `rounded-2xl` / `rounded-3xl` sur les cartes

**⚠️ À corriger :**

- **Hauteurs de boutons incohérentes :** `h-10` (MatchNotificationBell), `h-12` (drawers), `h-14` (onboarding) — manque un token `.btn-md` / `.btn-lg`
- **Tailles textes secondaires :** `text-[10px]`, `text-xs`, `text-sm` coexistent sans hiérarchie dans VotingModal
- **Contraste :** `text-zinc-500` sur `bg-zinc-900` ≈ ratio 4:1 (limite WCAG AA) — surveiller sur labels timing/cotes

### 2. Friction Utilisateur

- ❌ Après confirmation d'un pari VAR : pas de feedback "ton timing a été pris en compte"
- ❌ VotingModal se ferme brutalement sur résolution — l'utilisateur peut rater le résultat
- ❌ Wizard de création ligue : état perdu si navigation hors du wizard (état local uniquement)
- ❌ Date Slider Pronos : pas de dot/badge indiquant "j'ai déjà pronostiqué ce jour"

### 3. Game Design & Économie

- 🔴 **Leaderboard non transparent :** Un seul score affiché — impossible de savoir si les points viennent de pronos ou de VAR. La dualité des mécaniques est invisible.
- ❌ Aucune animation différenciée selon l'urgence de la VAR (88' = même UX que 10')
- ✅ `animate-ping` sur le scoreboard live — bien
- ✅ Timer bar rouge en fin de fenêtre — bien

### 4. Top 5 Correctifs UX/UI Urgents

1. **Push "VAR Résolue"** — Sans notification de résultat, la boucle émotionnelle est brisée. Retention -50%.
2. **Séparation Pronos / VAR dans le Leaderboard** — Ajouter 2 sous-scores `🎯 Pronos` + `⚡ VAR` par joueur.
3. **Dot sur les dates du Date Slider** — Indicateur visuel du nombre de pronos déjà saisis par date.
4. **Overlay post-pari VAR** — 2 secondes : "⚡ Pari enregistré • Cote : x1.8" avant fermeture progressive.
5. **Hauteur de bouton unifiée** — Définir `btn-primary { @apply h-12 ... }` global et éliminer les valeurs ad-hoc.
