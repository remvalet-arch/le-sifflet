# Système de Rôles (RBAC) — VAR TIME

## Les 3 rôles

| Rôle        | Valeur DB | Accès                                       |
| ----------- | --------- | ------------------------------------------- |
| `user`      | défaut    | App standard — aucun accès admin            |
| `moderator` | manuel    | Routes `/admin/*`, toutes les actions admin |
| `founder`   | manuel    | Même que moderator — rôle de référence      |

**Important** : le `trust_score` reste inchangé pour l'usage communautaire Waze (badge 🛡️, karma, ActionDrawer modérateur). Il ne contrôle plus l'accès admin.

---

## Migrations

| Migration                  | Contenu                                                                           |
| -------------------------- | --------------------------------------------------------------------------------- |
| `0106_add_role_column.sql` | Enum `user_role`, colonne `role` sur `profiles` (DEFAULT `'user'`), index partiel |
| `0107_role_helpers.sql`    | Fonctions SQL `current_user_role()` et `is_admin()` (SECURITY DEFINER)            |
| `0108_audit_log.sql`       | Table `audit_log` avec RLS (lecture admins uniquement, INSERT via service_role)   |

---

## Promouvoir un utilisateur

Exécuter dans le SQL Editor Supabase (voir `supabase/scripts/seed_founder.sql`) :

```sql
-- Promouvoir en founder
UPDATE public.profiles SET role = 'founder' WHERE id = '<USER_ID>';

-- Promouvoir en moderator
UPDATE public.profiles SET role = 'moderator' WHERE id = '<USER_ID>';

-- Rétrograder
UPDATE public.profiles SET role = 'user' WHERE id = '<USER_ID>';

-- Vérifier
SELECT id, username, role FROM public.profiles WHERE role != 'user';
```

---

## Middleware (`src/middleware.ts`)

Les routes `/admin/*` sont protégées au niveau middleware :

1. Si non authentifié → redirect `/`
2. Si `role` n'est pas `moderator` ou `founder` → redirect `/lobby`

Cela s'ajoute aux routes déjà protégées (`/lobby`, `/match`, `/profile`, etc.).

**Note backlog** : pour la performance avec plusieurs modérateurs, envisager de stocker le rôle dans un cookie signé après login plutôt qu'un SELECT DB à chaque navigation admin.

---

## Helper TypeScript (`src/lib/constants/permissions.ts`)

```ts
import { isAdminRole } from "@/lib/constants/permissions";

// Dans une route admin :
const { data: profile } = await supabase
  .from("profiles")
  .select("role")
  .eq("id", user.id)
  .single();

if (!profile || !isAdminRole(profile.role)) {
  return errorResponse("Accès réservé aux administrateurs", 403);
}
```

---

## Audit Log (`audit_log`)

### Schéma

| Colonne                | Type        | Description                             |
| ---------------------- | ----------- | --------------------------------------- |
| `id`                   | uuid        | PK                                      |
| `actor_user_id`        | uuid        | User qui a agi                          |
| `actor_role`           | user_role   | Rôle au moment de l'action              |
| `action_type`          | text        | Type d'action (voir liste ci-dessous)   |
| `target_resource_type` | text        | Ex: `'market_event'`, `'match'`         |
| `target_resource_id`   | uuid        | ID de la ressource cible                |
| `metadata`             | jsonb       | Données libres (résultat, raison, etc.) |
| `ip_address`           | text        | IP du demandeur                         |
| `user_agent`           | text        | Browser/client                          |
| `created_at`           | timestamptz | Horodatage                              |

### `action_type` connus

| Valeur                       | Route source                                 |
| ---------------------------- | -------------------------------------------- |
| `resolve_event`              | `POST /api/admin/resolve-event`              |
| `force_finish_match`         | `POST /api/admin/finish-match`               |
| `sync_matches`               | `POST /api/admin/sync-matches`               |
| `admin_match_state_update`   | `POST /api/match-state`                      |
| `admin_timeline_event`       | `POST /api/timeline-event`                   |
| `import_assets`              | `POST /api/admin/import-assets`              |
| `resolve_league_round`       | `POST /api/admin/resolve-league-round`       |
| `generate_outreach`          | `POST /api/admin/generate-outreach`          |
| `sync_live`                  | `POST /api/admin/sync-live`                  |
| `sync_apifootball_round`     | `POST /api/admin/sync-apifootball-round`     |
| `sync_apifootball_fixtures`  | `POST /api/admin/sync-apifootball-fixtures`  |
| `sync_past_lineups`          | `POST /api/admin/sync-past-lineups`          |
| `force_resolve_past_matches` | `POST /api/admin/force-resolve-past-matches` |
| `map_apifootball_teams`      | `POST /api/admin/map-apifootball-teams`      |
| `sync_player_odds`           | `POST /api/admin/sync-player-odds`           |
| `trigger_initial_sync`       | `POST /api/admin/trigger-initial-sync`       |
| `sync_data`                  | server action `syncData.ts`                  |
| `ban_user`                   | (futur)                                      |
| `unban_user`                 | (futur)                                      |
| `reset_balance`              | (futur)                                      |
| `edit_profile_admin`         | (futur)                                      |

### Requêtes utiles

```sql
-- Dernières actions admin
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 50;

-- Actions d'un acteur spécifique
SELECT * FROM audit_log WHERE actor_user_id = '<USER_ID>' ORDER BY created_at DESC;

-- Toutes les résolutions d'événements VAR
SELECT * FROM audit_log WHERE action_type = 'resolve_event' ORDER BY created_at DESC;

-- Actions sur un match spécifique
SELECT * FROM audit_log WHERE target_resource_id = '<MATCH_ID>';
```

---

## Différence trust_score vs role

| Concept               | trust_score                         | role                                |
| --------------------- | ----------------------------------- | ----------------------------------- |
| Usage                 | Karma communautaire Waze            | Accès admin                         |
| Source                | Algorithme (votes, qualité signaux) | Attribution manuelle par le founder |
| Seuil admin           | ~~>= 150~~ (supprimé)               | `moderator` ou `founder`            |
| Badge 🛡️              | Oui (trust_score >= 150)            | Non                                 |
| Accès `/admin/*`      | Non                                 | Oui                                 |
| Modifiable par l'user | Indirectement                       | Non                                 |
