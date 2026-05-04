# Audit production — migration données statiques → TheSportsDB Premium

**Périmètre d’analyse :** dossier `src/` (composants, routes App Router, lib, types), avec recoupement sur `supabase/seed.sql`, **`supabase/migrations/*.sql` (22 fichiers, état repo)** et `next.config.ts` pour la chaîne données / images.  
**Objectif :** préparer la refonte (tampon Supabase + ingestion) sans implémenter le front à ce stade.

**Mise à jour (réponse audit / migrations) :** la première rédaction ne détaillait pas chaque migration déjà jouée. La **section 2.0** ci-dessous inventorie le référentiel SQL versionné ; le script **§2.1** reste une **cible conceptuelle** à réconcilier par `ALTER` / nouvelles tables et **non** un état vierge ignoré de l’historique.

---

## 1. Dette technique et TypeScript (front-end)

### 1.1 Fichiers contenant de la donnée sportive ou de démo « en dur »

Les chemins ci-dessous listent du contenu **non issu** d’une source unique dynamique (API tamponnée), ou des **constantes métier** calées sur des entités réelles.

| Chemin                                  | Nature du contenu en dur                                                                                                                                                                                                   |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/page.tsx`                      | **PhoneMockup** : noms d’équipes abrégés `PSG` / `OL`, score `1 — 0`, minute `47'`, libellés « EN DIRECT », cotes `×2.00` / `×1.80`, points `50` / `+100` / `+200` — pure démo marketing (hors DB).                        |
| `src/components/match/ActionDrawer.tsx` | **`MVP_TEAMS`** : IDs TheSportsDB (`133714`, `133664`, `133604`, `133738`) + noms (`Paris Saint-Germain`, `Bayern Munich`, `Arsenal`, `Atletico Madrid`) pour l’import roster modérateur.                                  |
| `src/lib/services/thesportsdb.ts`       | **URL de base** `https://www.thesportsdb.com/api/v1/json/...` ; **clé par défaut** littérale `"123"` si `THESPORTSDB_API_KEY` absente ; types **`TsdbEvent`** / **`TsdbPlayer`** calés sur un sous-ensemble de champs API. |
| `src/lib/sports/sportsProvider.ts`      | Pas de noms d’équipes : **mock probabiliste** pour la résolution d’événements (`SUCCESS` / `FAILURE` / `WAIT`) — dette « pas de vérité terrain » pour la prod.                                                             |

**Hors `src/` mais critique pour la « donnée statique » actuelle :**

| Chemin              | Nature                                                                                                                                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/seed.sql` | **INSERT** massifs : noms de clubs (L1, UCL), statuts (`upcoming`, `second_half`, `finished`), scores, couleurs hex, logos **émojis** (`🔴🔵`), **lineups** (noms de joueurs PSG / Lorient, positions). Source principale de vérité **démo** aujourd’hui. |

**Fichiers qui consomment la DB mais ne hardcodent pas d’entités sportives** (à mettre à jour **indirectement** quand le schéma `matches` / jointures évoluera) :  
`src/components/lobby/MatchCard.tsx`, `src/components/match/Scoreboard.tsx`, `src/components/match/LiveRoom.tsx`, `src/components/match/LineupsTab.tsx`, `src/components/match/ModeratorDrawer.tsx`, `src/app/(app)/lobby/page.tsx`, `src/app/(app)/match/[id]/page.tsx`, `src/app/(app)/profile/page.tsx`, `src/components/profile/ProfileClient.tsx`, `src/app/admin/resolve/page.tsx`, `src/app/api/admin/finish-match/route.ts`, `src/app/actions/syncData.ts`.

### 1.2 Types / interfaces TypeScript à faire évoluer

| Fichier / symbole                                             | Rôle actuel                                                                                                                                                                             | Impact refonte                                                                                                                                                           |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/types/database.ts` — `MatchRow`, tables `matches`        | Champs dénormalisés : `team_home`, `team_away`, `home_team_logo`, `away_team_logo`, `home_team_color`, `away_team_color`, `thesportsdb_event_id`, `MatchStatus`, scores, `match_minute` | Passage à un modèle **relationnel** (`competition_id`, `home_team_id`, `away_team_id`, etc.) ou vues / RPC qui **projettent** encore des alias pour limiter le churn UI. |
| `src/types/database.ts` — `PlayerRow`, table `players`        | `thesportsdb_id`, `team_thesportsdb_id`, `team_name`, `player_name`, `position` (G/D/M/A)                                                                                               | Aligner sur `team_id` FK, positions TSDB, `cutout_url`, etc.                                                                                                             |
| `src/lib/matches.ts`                                          | Réexport `MatchRow`, `MatchStatus`, tri lobby                                                                                                                                           | Inchangé si `MatchRow` reste stable ; sinon adapter imports / champs optionnels.                                                                                         |
| `src/lib/services/thesportsdb.ts` — `TsdbEvent`, `TsdbPlayer` | Couche API brute                                                                                                                                                                        | Étendre pour Premium (couleurs, cutouts, fanart, strStatus détaillé…) ou centraliser dans `src/types/thesportsdb.ts`.                                                    |
| `src/components/profile/ProfileClient.tsx`                    | Types inline pour paris (`teamHome`, `teamAway`, etc.)                                                                                                                                  | Enrichir ou dériver depuis requêtes jointes `matches` + `teams`.                                                                                                         |
| `src/app/actions/syncData.ts`                                 | Map `TsdbEvent` → colonnes `matches`                                                                                                                                                    | Réécrire vers upsert **tampon** (`matches` + `teams` + `competitions`) et rate limiting.                                                                                 |

**Note :** il n’existe pas d’interface nommée `Prediction` dans le dépôt ; les paris sont modélisés via `BetRow`, `LongTermBetRow`, `MarketEventRow`.

### 1.3 Interfaces TypeScript cibles (mapping TheSportsDB → domaine app)

Proposition de **couche domaine** stable pour l’UI, décorrélée des noms de champs API :

```typescript
/** Compétition / ligue — ex. idLeague → id, strLeague → name, strBadge → badgeUrl */
export interface Competition {
  id: string;
  name: string;
  badgeUrl: string | null;
  /** Optionnel : garde-fou sync */
  thesportsdbLeagueId: string;
}

/**
 * Équipe — mapping indicatif :
 * strTeam / strTeamShort → name / shortName
 * strTeamBadge → logoUrl
 * strColour1 / strColour2 / strColour3 → primaryColor / secondaryColor (tertiaire optionnelle)
 */
export interface Team {
  id: string;
  competitionId: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  thesportsdbTeamId: string;
}

/**
 * Joueur — mapping indicatif :
 * strPlayer → name
 * strPosition → position (normaliser vers G/D/M/A si besoin métier)
 * strCutout → cutoutUrl
 * strThumb / strRender (Premium) → thumbUrl / renderUrl optionnels
 */
export interface Player {
  id: string;
  teamId: string;
  name: string;
  position: string | null;
  cutoutUrl: string | null;
  thesportsdbPlayerId: string;
}

/**
 * Match — mapping indicatif :
 * idEvent → thesportsdbEventId (souvent conservé en texte côté tampon)
 * dateEvent + strTime → date (timestamptz)
 * strStatus + intTime (live) → status + minute côté app
 * intHomeScore / intAwayScore → scoreHome / scoreAway
 * idHomeTeam / idAwayTeam (si disponibles) ou résolution par noms → homeTeamId / awayTeamId
 */
export interface Match {
  id: string;
  competitionId: string;
  homeTeamId: string;
  awayTeamId: string;
  date: string; // ISO
  status: import("@/types/database").MatchStatus; // ou enum dédié aligné TSDB + règles produit
  scoreHome: number;
  scoreAway: number;
  matchMinute: number | null;
  thesportsdbEventId: string | null;
}
```

Pour la **compatibilité progressive** avec l’UI actuelle, une **vue SQL** ou un type `MatchLobbyRow` peut exposer `team_home_name`, `team_away_name`, `home_team_logo`, etc., calculés par jointure sur `teams`, jusqu’à refonte complète des composants.

---

## 2. Architecture Supabase (base de données et sécurité)

### 2.0 Migrations déjà présentes dans le repo (à prendre comme vérité terrain)

Les fichiers sous `supabase/migrations/` décrivent le schéma **réellement évolutif** appliqué sur vos environnements (dans l’ordre numérique) :

| Fichier                         | Rôle principal (rappel)                                                                                                                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `0001_init.sql`                 | `profiles`, `matches` (début : `team_home` / `team_away`, statuts `upcoming`/`live`/`finished`), `rooms`, `room_members`, `market_events`, `bets`, trigger profil.                                                       |
| `0002_alert_signals.sql`        | `alert_signals`, colonne `alert_cooldown_until` sur `matches`.                                                                                                                                                           |
| `0003_place_bet_rpc.sql`        | RPC `place_bet`, contraintes paris.                                                                                                                                                                                      |
| `0004_realtime_matches.sql`     | Realtime sur `matches`.                                                                                                                                                                                                  |
| `0005_fix_realtime.sql`         | Realtime / replica identity sur `market_events`.                                                                                                                                                                         |
| `0006_resolve_event.sql`        | `resolve_event`, contraintes `bets`, replica identity `bets`.                                                                                                                                                            |
| `0007_new_alert_types.sql`      | Types d’alertes / marchés étendus.                                                                                                                                                                                       |
| `0008_karma_waze.sql`           | Karma / signaux (PRD Waze).                                                                                                                                                                                              |
| `0009_profile_extras.sql`       | Champs profil (trust, refill, onboarding, etc.).                                                                                                                                                                         |
| `0010_livescore.sql`            | **`home_score` / `away_score` / `match_minute`** sur `matches` ; table **`lineups`** + RLS (`authenticated` SELECT, `service_role` écriture).                                                                            |
| `0011_place_bet_v2.sql`         | Évolution RPC / paris.                                                                                                                                                                                                   |
| `0012_match_timeline.sql`       | **`match_timeline_events`** (FK → `matches`), Realtime.                                                                                                                                                                  |
| `0013_profiles_realtime.sql`    | Realtime profils.                                                                                                                                                                                                        |
| `0014_team_colors.sql`          | **`home_team_color` / `away_team_color` / `home_team_logo` / `away_team_logo`** sur `matches`.                                                                                                                           |
| `0015_match_states.sql`         | Statuts **granulaires** (`first_half`, `half_time`, …) — remplace l’ancien `live`.                                                                                                                                       |
| `0016_timeline_own_goal.sql`    | `is_own_goal` sur la timeline.                                                                                                                                                                                           |
| `0017_long_term_bets.sql`       | **`long_term_bets`** (FK → `matches`), RPC `place_long_term_bet`.                                                                                                                                                        |
| `0018_rls_lineups.sql`          | RLS lineups affinée (toujours **authenticated** en lecture).                                                                                                                                                             |
| `0019_players_table.sql`        | Table **`players`** (effectifs TSDB : `thesportsdb_id`, `team_name`, …) ; **`thesportsdb_event_id`** UNIQUE sur `matches` ; RLS **`players`** : SELECT `authenticated` uniquement (pas `anon`), écriture `service_role`. |
| `0020_timeline_info_events.sql` | Type d’événement `info` sur la timeline.                                                                                                                                                                                 |
| `0021_score_and_resolve.sql`    | **`increment_match_score`**, **`resolve_long_term_bets`** — lisent/écrivent **`matches`**, `match_timeline_events`, `profiles`, `long_term_bets`.                                                                        |
| `0022_badges.sql`               | `badges`, `user_badges`.                                                                                                                                                                                                 |

**Conséquences pour la refonte « competitions / teams / matches relationnels » :**

1. **`public.matches` existe déjà** avec colonnes métier (scores, minute, couleurs, logos texte, `thesportsdb_event_id`, `alert_cooldown_until`, etc.) et est la **racine de FK** pour `rooms`, `lineups`, `market_events`, `match_timeline_events`, `long_term_bets`, `alert_signals`, etc. Le bloc `CREATE TABLE public.matches` du §2.1 ne peut **pas** être exécuté tel quel sur une base déjà migrée : il faut des **`ALTER TABLE`** (nouvelles colonnes FK), des **vues**, ou une **table tampon** + migration d’IDs puis bascule.
2. **`public.players` existe déjà** (`0019`) avec un autre modèle (pas de `team_id` UUID). Toute évolution vers `team_id` + `cutout_url` = **migration de données** + ajustement des policies (aujourd’hui pas de lecture `anon` sur `players`).
3. **Fonctions `SECURITY DEFINER`** (`0021`, `0006`, RPC paris) supposent les **noms de colonnes actuels** de `matches` (`home_score`, `team_home`, …). Tout renommage (`score_home` vs `home_score`) impose de **mettre à jour ces fonctions** dans la même migration.
4. **RLS actuelle** n’est pas homogène : par ex. `lineups` / `players` = plutôt **`authenticated`** ; l’audit §2.2 proposait `anon` + `authenticated` pour les nouvelles tables tampon — à **aligner** sur la politique produit (landing publique vs tout derrière login).

### 2.1 Schéma relationnel proposé (SQL de création — cible à fusionner avec l’existant)

> **Important :** ce script décrit une **cible** `competitions` / `teams` / `players` / `matches` **normalisés**. Il **entre en conflit** avec les tables `matches` et `players` déjà créées par les migrations listées en **§2.0**. En production, le livrable attendu est une **nouvelle migration numérotée** qui : ajoute `competitions` + `teams`, étend `players` et/ou `matches`, recâble les FK ou vues, et adapte les fonctions RPC concernées — pas un `CREATE TABLE` isolé.

Les `id` applicatifs sont en **UUID** (cohérent avec le reste du projet). Les identifiants TheSportsDB restent en **texte** (`thesportsdb_*`) pour éviter les collisions et refléter l’API. Ajustement possible : `bigint` si vous normalisez numériquement côté import.

```sql
-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- COMPETITIONS
-- ---------------------------------------------------------------------------
CREATE TABLE public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  badge_url text,
  thesportsdb_league_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT competitions_tsdb_league_unique UNIQUE (thesportsdb_league_id)
);

CREATE INDEX competitions_name_idx ON public.competitions (name);

-- ---------------------------------------------------------------------------
-- TEAMS
-- ---------------------------------------------------------------------------
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions (id) ON DELETE RESTRICT,
  name text NOT NULL,
  short_name text,
  logo_url text,
  color_primary text,
  color_secondary text,
  thesportsdb_team_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teams_tsdb_team_unique UNIQUE (thesportsdb_team_id)
);

CREATE INDEX teams_competition_id_idx ON public.teams (competition_id);

-- ---------------------------------------------------------------------------
-- PLAYERS
-- ---------------------------------------------------------------------------
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  name text NOT NULL,
  position text,
  cutout_url text,
  thesportsdb_player_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT players_tsdb_player_unique UNIQUE (thesportsdb_player_id)
);

CREATE INDEX players_team_id_idx ON public.players (team_id);

-- ---------------------------------------------------------------------------
-- MATCHES (tampon calendrier / live)
-- ---------------------------------------------------------------------------
-- Adapter le CHECK status aux valeurs déjà utilisées par l'app :
-- 'upcoming', 'first_half', 'half_time', 'second_half', 'paused', 'finished'
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions (id) ON DELETE RESTRICT,
  home_team_id uuid NOT NULL REFERENCES public.teams (id) ON DELETE RESTRICT,
  away_team_id uuid NOT NULL REFERENCES public.teams (id) ON DELETE RESTRICT,
  date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'upcoming'
    CHECK (status IN (
      'upcoming', 'first_half', 'half_time', 'second_half', 'paused', 'finished'
    )),
  score_home integer NOT NULL DEFAULT 0,
  score_away integer NOT NULL DEFAULT 0,
  match_minute integer,
  thesportsdb_event_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT matches_different_teams_ck CHECK (home_team_id <> away_team_id),
  CONSTRAINT matches_tsdb_event_unique UNIQUE (thesportsdb_event_id)
);

CREATE INDEX matches_competition_date_idx ON public.matches (competition_id, date);
CREATE INDEX matches_status_date_idx ON public.matches (status, date);

-- Trigger updated_at (optionnel, même pattern que d'autres tables métier)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

CREATE TRIGGER competitions_updated_at BEFORE UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER players_updated_at BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER matches_updated_at BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

**Migration depuis le schéma actuel :** la table `public.matches` existe déjà avec une autre forme. En production, prévoir une **migration nommée** (nouvelle table `matches_v2` + bascule, ou renommage en étapes) pour ne pas casser les FK existantes (`rooms`, `market_events`, `lineups`, etc.). L’audit ne prescrit pas ici l’ordre de coupure ; il impose de **cartographier toutes les FK** vers l’ancienne `matches.id` avant toute suppression.

### 2.2 RLS — lecture seule pour `anon` et `authenticated`

Principe : **aucune** politique `INSERT` / `UPDATE` / `DELETE` pour les rôles clients ; seul `service_role` (Edge Functions, scripts serveur avec clé admin) contourne RLS.

```sql
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Lecture pour tout le monde (y compris non connecté), si le produit l'exige.
-- Si vous voulez réservé aux seuls utilisateurs authentifiés, remplacer TO anon, authenticated
-- par TO authenticated uniquement.

CREATE POLICY competitions_select_public
  ON public.competitions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY teams_select_public
  ON public.teams FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY players_select_public
  ON public.players FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY matches_select_public
  ON public.matches FOR SELECT
  TO anon, authenticated
  USING (true);

-- Aucune politique INSERT/UPDATE/DELETE => refus implicite pour anon/authenticated.
-- GRANT : au minimum SELECT pour le rôle client PostgREST.

GRANT SELECT ON public.competitions TO anon, authenticated;
GRANT SELECT ON public.teams TO anon, authenticated;
GRANT SELECT ON public.players TO anon, authenticated;
GRANT SELECT ON public.matches TO anon, authenticated;

-- Le service_role bypass RLS par défaut — réserver les credentials au backend sécurisé.
```

**Realtime :** si `matches` (ou une vue) reste souscrit côté `LiveRoom`, prévoir `REPLICA IDENTITY FULL` et publication Realtime comme pour le schéma actuel, après validation des performances.

---

## 3. Stratégie d’ingestion TheSportsDB (backend)

### 3.1 Contrainte 100 requêtes / minute

| Mécanisme                   | Description                                                                                                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Limiteur central**        | Un seul composant (Edge Function « orchestrateur » ou route API interne) consomme le quota ; **pas** d’appels TSDB depuis le client ou depuis N workers non coordonnés. |
| **Token bucket / compteur** | Table `ingestion_rate` ou Redis externe ; sleep / backoff si proche du plafond.                                                                                         |
| **Batch par ligue**         | Préférer `eventsnextleague.php` / `eventspastleague.php` **par `idLeague`** plutôt que N× `lookupevent.php` quand un listing suffit.                                    |
| **Persistance = cache**     | Une fois ingéré, **ne pas** rappeler l’API pour le même event tant que `updated_at` / etag métier est frais.                                                            |
| **File d’attente**          | Jobs `teams` / `players` / `matches` séquentiels avec délai minimal \(600 ms\) entre appels si besoin pour rester \< 100/min en crête.                                  |

### 3.2 Data froide (cron hebdomadaire)

**Objectif :** effectifs, cutouts, couleurs, badges ligue, métadonnées stables.

| Étape                    | Route TheSportsDB (v1 JSON, alignée sur `lib/services/thesportsdb.ts`)                  | Résultat tampon                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Sync ligues suivies      | `search_all_leagues.php` ou liste figée d’`idLeague` + `lookupleague.php?id={idLeague}` | `competitions` (`strLeague`, `strBadge`)                                        |
| Sync équipes de la ligue | `lookup_all_teams.php?id={idLeague}`                                                    | `teams` (`strTeam`, `strTeamShort`, `strTeamBadge`, `strColour1`, `strColour2`) |
| Sync effectif            | `lookup_all_players.php?id={idTeam}` (déjà utilisé dans le code via `getTeamRoster`)    | `players` (`strPlayer`, `strPosition`, `strCutout`, …)                          |

**Fréquence :** hebdomadaire + **manuel** modérateur (déjà présent via `syncTeamRoster` / `ActionDrawer`) pour rattrapage avant matchs à enjeux.

### 3.3 Data chaude (cron quotidien ou horaire)

**Objectif :** calendrier, statuts live / finished, scores, minute.

| Étape                            | Route TheSportsDB                                       | Résultat tampon                                                           |
| -------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| Prochains matchs par compétition | `eventsnextleague.php?id={idLeague}`                    | Upsert `matches` futurs (`dateEvent`, `strTime`, `idEvent`, équipes)      |
| Matchs récents / terminés        | `eventspastleague.php?id={idLeague}`                    | Mise à jour scores + statut                                               |
| Détail live ponctuel             | `lookupevent.php?id={idEvent}` (déjà `getEventDetails`) | Affinage `strStatus`, `intHomeScore`, `intAwayScore`, badges si manquants |

**Fréquence suggérée :**

- **Horaire** en période de compétition pour les ligues « live » ;
- **Quotidien** pour ligues basse activité.  
  Les transitions **granulaires** (`first_half`, `half_time`, …) peuvent rester **pilotées modération / logique interne** si l’API ne distingue pas finement ; mapper `strStatus` TSDB → `MatchStatus` (comme dans `syncData.mapStatus`) en documentant les valeurs réelles observées en Premium.

### 3.4 Edge Functions Supabase vs Route Handlers Next.js

| Option                                                      | Avantages                                                              | Inconvénients                                        |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| **Edge Functions**                                          | Cron natif Supabase, proche de la DB, secret API TSDB hors bundle Next | Autre runtime, monitoring à brancher                 |
| **API Routes + cron externe** (Vercel Cron, GitHub Actions) | Même stack que l’existant (`syncData`, `createAdminClient`)            | Garder secrets et rate limit côté serveur uniquement |

**Recommandation d’architecture :** une **Edge Function planifiée** « ingest-league » + **service_role** pour upsert ; le front continue de **lire uniquement** Supabase. Les Server Actions actuelles (`syncMatchData`) peuvent être **réduites** à des triggers admin ou désactivées une fois l’ingestion automatique fiable.

---

## 4. Impact UI/UX (Next.js) — images distantes

### 4.1 État actuel

- Fichier de config : **`next.config.ts`** (TypeScript), actuellement **sans** bloc `images`.
- `src/components/match/Scoreboard.tsx` utilise **`<img>`** avec `logo` si URL `http*` ; pas `next/image` pour les crests distants — donc pas de `remotePatterns` requis aujourd’hui, mais **pas d’optimisation** Next non plus.

### 4.2 Passage à `next/image` + TheSportsDB

Les assets TSDB passent souvent par **`www.thesportsdb.com`** et/ou le CDN **`r2.thesportsdb.com`** (chemins `/images/...`). Il faut **autoriser explicitement** ces hôtes.

**Faut-il modifier `next.config.ts` ?** **Oui**, dès que vous utilisez `<Image src={url} />` avec ces domaines.

### 4.3 Exemple de configuration (à coller dans `next.config.ts` après implémentation)

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.thesportsdb.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "r2.thesportsdb.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
```

**Variante** (anciennes configs) : `images.domains` est déprécié au profit de `remotePatterns` — rester sur `remotePatterns`.

**Bonnes pratiques UX :**

- `sizes` + largeurs fixes pour le mobile-first ;
- `placeholder="blur"` seulement si vous générez un `blurDataURL` ou utilisez un poster local ;
- prévoir un **fallback** crest (initiales / silouhette) si URL TSDB vide, comme aujourd’hui avec couleur de fond.

---

## 5. Synthèse des risques et ordre de travail suggéré

1. **Schéma `matches`** : migration sensible (nombreuses FK applicatives — voir **§2.0** : `0010`–`0021` ancrées sur `matches.id`). Adapter **`increment_match_score`** et **`resolve_long_term_bets`** dans la même bascule si les colonnes changent de nom.
2. **`src/types/database.ts`** : régénérer ou maintenir à la main en sync avec les **nouvelles** migrations (après `0022_*`).
3. **Seed** : remplacer `seed.sql` démo par script d’import TSDB ou seed minimal + ingestion.
4. **Vérification terrain** : remplacer `sportsProvider.ts` par logique s’appuyant sur TSDB ou sur champs tampon enrichis.
5. **Images** : `next.config.ts` + choix `<Image>` vs `<img>` (CSP, LCP).

---

_Document généré pour préparation production — aucune implémentation front déclenchée par ce livrable._
