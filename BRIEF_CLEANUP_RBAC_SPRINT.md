# BRIEF CLAUDE CODE — Sprint Cleanup & RBAC

> Brief consolidé en **3 phases séquentielles**. Chaque phase doit être complètement terminée et committée avant de passer à la suivante. Stop & ask au founder si un cas non prévu surgit.
>
> **Date** : 2026-05-10
> **Branche cible** : créer `cleanup-rbac-sprint` depuis `stage`
> **Pas de pression temps** : qualité > vitesse. Si une phase prend 3x plus longtemps que prévu, c'est OK.

---

## Contexte projet

VAR TIME, PWA mobile-first de paris VAR communautaires sur le foot. Stack Next.js 16 / React 19 / Supabase / TypeScript. Référence : voir `docs/AUDIT_TRACKING_ADMIN.md` pour la cartographie complète du codebase (produit lors du précédent audit).

**Décisions prises par le founder** suite à l'audit :

1. La feature **PolyMarket / `long_term_bets`** est **OBSOLÈTE**. À supprimer entièrement (table, RPCs, composant, références UI).
2. Le système d'accès admin via **`trust_score >= 150`** est **inadéquat**. À remplacer par un vrai système de rôles. Le `trust_score` reste pour son usage Waze (karma communautaire), mais ne contrôle plus l'accès admin.
3. Les **boosters** (`double_xp`, `cote_plus`, `safety_net`, `vision`) sont achetables mais leur application end-to-end n'a **jamais été testée**. À auditer en lecture seule, sans patcher.

---

## Règles de conduite générales (toutes phases)

1. **Travailler sur une branche dédiée** : `cleanup-rbac-sprint` créée depuis `stage`. Ne jamais commit directement sur `stage` ou `main`.
2. **Un commit par phase, pas un commit géant.** Les phases sont indépendantes.
3. **Stop & ask** au founder si :
   - Une phase touche un fichier qui semble non listé dans le scope
   - Une suppression risque de casser une feature non documentée
   - Le résultat d'un test contredit ce que le founder a affirmé
4. **Tests obligatoires** : si des tests automatisés existent (`npm test`, `vitest run`, `pytest`), ils doivent passer entre chaque phase. Si certains tests échouent à cause des changements (ex : tests sur PolyMarket), supprimer/adapter ces tests dans la même phase.
5. **Pas de refactor opportuniste hors-scope.** Si tu vois du code moche pendant le sprint, l'ajouter à un fichier `docs/CLEANUP_BACKLOG.md` plutôt que de le refactorer dans cette session.
6. **Migrations Supabase** : numéro suivant dispo (probablement `0105+`). Toujours `IF EXISTS` / `IF NOT EXISTS` pour idempotence.
7. **Documentation** : chaque phase produit une mise à jour ou création de doc dans `docs/`.

---

# PHASE 1 — Suppression PolyMarket + nettoyage legacy

**Objectif** : retirer toute la feature PolyMarket (paris payants avant-match) du codebase, et profiter de l'occasion pour nettoyer la dette technique connexe identifiée dans l'audit.

**Estimation** : 2-4h.

**Risque** : faible. C'est de la suppression sur du code documenté comme inutilisé.

## 1.1 Backup avant suppression

Avant tout DROP, exporter en CSV les données existantes au cas où :

```sql
-- À exécuter manuellement via Supabase SQL Editor AVANT la migration
COPY (SELECT * FROM long_term_bets) TO '/tmp/long_term_bets_backup_2026_05.csv' WITH CSV HEADER;
```

⚠️ **Cette étape est manuelle, à demander au founder.** Documenter dans le commit message : "Backup réalisé le [date] par [founder]".

Si Claude Code n'a pas les droits SQL Editor, **demander au founder de l'exécuter avant de lancer la phase**, et attendre confirmation.

## 1.2 Migration de suppression DB

Créer `supabase/migrations/0105_drop_polymarket_and_legacy.sql` :

```sql
-- Drop des RPCs liées à long_term_bets
DROP FUNCTION IF EXISTS place_long_term_bet(uuid, text, text, integer, numeric);
DROP FUNCTION IF EXISTS resolve_long_term_bets(uuid);

-- Drop de la table long_term_bets
DROP TABLE IF EXISTS long_term_bets CASCADE;

-- Drop de la RPC legacy place_prono (remplacée par place_match_prono depuis 0050)
-- À ne faire QUE si grep -r "place_prono(" src/ ne retourne aucun appel actif
DROP FUNCTION IF EXISTS place_prono(uuid, text, text);

-- Nettoyage type 'scorer' orphelin sur pronos (remplacé par 'scorer_allocation')
-- Vérifier d'abord qu'aucun row n'utilise ce type :
-- SELECT count(*) FROM pronos WHERE prono_type = 'scorer';
-- Si 0 rows : on peut retirer du CHECK

ALTER TABLE pronos DROP CONSTRAINT IF EXISTS pronos_prono_type_check;
ALTER TABLE pronos ADD CONSTRAINT pronos_prono_type_check
  CHECK (prono_type IN ('exact_score', 'scorer_allocation'));

-- Nettoyage migrations injury_sub : 0100 et 0104 ont fait double emploi
-- Vérifier que injury_sub a bien disparu des CHECK et de TypeScript types
-- (pas d'action SQL ici, juste vérif manuelle)
```

**Étape de vérif avant migration** :

```bash
# Compter les rows sur la table avant DROP
# Si > 0, demander confirmation au founder
SELECT COUNT(*) FROM long_term_bets;

# Vérifier qu'aucun appel actif à place_prono
grep -r "place_prono\b" src/ supabase/

# Vérifier rows scorer orphelins
SELECT COUNT(*) FROM pronos WHERE prono_type = 'scorer';
```

Si l'une de ces vérifs retourne du contenu inattendu → **STOP & ASK FOUNDER**.

## 1.3 Suppression code TypeScript / React

Fichiers à supprimer :

- `src/components/match/PolymarketTab.tsx` — composant principal
- Toute autre référence (chercher avec `grep -r "PolymarketTab\|long_term_bet\|place_long_term_bet\|resolve_long_term_bets" src/`)

Fichiers à modifier (probablement) :

- `src/components/match/LiveRoom.tsx` — retirer l'import et la tab "PolyMarket"
- `src/types/database.ts` — retirer les types `long_term_bets` et `place_long_term_bet`
- Régénérer les types Supabase si nécessaire : `npx supabase gen types typescript --local > src/types/database.ts`

Tests à supprimer ou adapter :

- Toute référence dans `src/lib/__tests__/` ou autres dossiers de tests

## 1.4 Vérifications de non-régression

```bash
# Build doit passer
npm run build

# Tests doivent passer
npm test

# Pas de référence résiduelle
grep -r "PolymarketTab\|long_term_bets\|place_long_term_bet" src/ supabase/
# (doit retourner uniquement les migrations historiques dans supabase/migrations/)
```

## 1.5 Documentation

Mettre à jour `docs/AUDIT_TRACKING_ADMIN.md` :

- Section 2 : retirer le bloc "Type : Paris longs termes sur résultat de match (PolyMarket tab)"
- Section 3 : retirer le bloc "Table : `long_term_bets`"
- Section 8 — Risques : retirer R2 (validation `potential_reward`) puisque la feature est supprimée
- Section 9 : retirer questions 2, 5, 10 (résolues par cette suppression)

Créer `docs/CHANGELOG_CLEANUP_SPRINT.md` qui documente toutes les suppressions et migrations.

## 1.6 Commit Phase 1

Message de commit :

```
chore(cleanup): remove PolyMarket feature and legacy artifacts

- Drop long_term_bets table and related RPCs
- Remove PolymarketTab component and references
- Drop legacy place_prono RPC (replaced by place_match_prono in 0050)
- Clean orphan 'scorer' type from pronos CHECK constraint
- Update docs/AUDIT_TRACKING_ADMIN.md to reflect changes

Migration: 0105_drop_polymarket_and_legacy.sql
Backup: long_term_bets data exported before drop

Refs: docs/AUDIT_TRACKING_ADMIN.md questions 2, 5, 10
```

**Stop ici. Demander au founder de reviewer le diff de Phase 1 avant de lancer Phase 2.**

---

# PHASE 2 — Audit boosters (lecture seule)

**Objectif** : déterminer factuellement, pour chacun des 4 boosters, si l'effet est réellement appliqué end-to-end. Pas de patch dans cette phase, uniquement un rapport.

**Estimation** : 2-3h.

**Règle absolue** : **AUCUNE modification de code**. Lecture, tests E2E manuels via SQL et requêtes API, rapport markdown.

## 2.1 Audit du code des 4 boosters

Pour chaque booster (`double_xp`, `cote_plus`, `safety_net`, `vision`), produire dans `docs/BOOSTERS_AUDIT.md` :

### Pour chaque booster, répondre à ces questions :

```markdown
## Booster : [slug]

### Effet attendu (selon `boosters_catalog.effect_value` et UI)

- Décrire ce que le user pense acheter

### Trace dans le code

**Achat** :

- Fichier `/api/boosters/purchase/route.ts` : appelle RPC `purchase_booster`
- RPC `purchase_booster` : décrit ce qu'elle fait (INSERT user_boosters_inventory ? UPDATE ?)
- Migration définissant la RPC : `0XXX_xxxx.sql`

**Application** :

- Comment le user "applique" le booster avant un pari/prono ? (UI : composant, prop, state)
- Quel champ DB est mis à jour ? (`bets.applied_booster_id` ? `pronos.applied_booster_id` ?)
- Endpoint qui consomme l'application : nom de la route

**Résolution** :

- RPC qui résout le pari/prono : `place_bet`, `resolve_event_parimutuel`, `resolve_match_pronos`
- Cette RPC consulte-t-elle `applied_booster_id` ? (oui/non, citer la migration et la ligne)
- Si oui : que fait-elle de cette info ? Modifie-t-elle le reward ? L'XP ? La cote ?
- Si non : **L'EFFET N'EST PAS APPLIQUÉ.**

### Statut final

- ✅ FONCTIONNEL : achat → application → résolution avec effet vérifiable
- ⚠️ PARTIEL : achat OK, application OK, mais effet absent ou incomplet à la résolution
- ❌ ABSENT : achat OK, mais aucune trace d'application/effet dans le code de résolution
- ❓ INCERTAIN : code complexe, résultat ambigu — demander au founder
```

## 2.2 Test E2E SQL (sans modification)

Pour chaque booster, exécuter une simulation read-only :

```sql
-- 1. Lister un user récent qui a acheté ce booster
SELECT user_id, booster_id, acquired_at, consumed_at, consumed_on_event_id, consumed_on_prono_id
FROM user_boosters_inventory ubi
JOIN boosters_catalog bc ON bc.id = ubi.booster_id
WHERE bc.slug = '[slug]'
  AND consumed_at IS NOT NULL
ORDER BY acquired_at DESC
LIMIT 5;

-- 2. Pour chaque consommation, retrouver le pari/prono associé
-- Et vérifier si le reward a été modifié (vs un pari sans booster du même type)

-- 3. Comparer le solde avant/après pour un user identifié
-- (utiliser les timestamps de purchased_at et resolved_at)
```

Si **aucun row consommé** sur un booster : noter "JAMAIS UTILISÉ EN PROD" dans le rapport — ne pas conclure trop vite à un bug.

## 2.3 Rapport final

Le fichier `docs/BOOSTERS_AUDIT.md` doit contenir :

1. Section "Méthode d'audit"
2. Section par booster (template ci-dessus)
3. Section "Synthèse" : tableau récap

| Booster   | Achat | Application | Effet à la résolution | Statut  | Action recommandée    |
| --------- | ----- | ----------- | --------------------- | ------- | --------------------- |
| double_xp | ✅    | ✅          | ❌                    | PARTIEL | Patch RPC `resolve_*` |
| cote_plus | ...   | ...         | ...                   | ...     | ...                   |

4. Section "Recommandations pour le founder" : que faire pour chaque booster (patch, suppression, redesign)

## 2.4 Commit Phase 2

Message de commit :

```
docs(audit): boosters end-to-end audit report

Lecture seule du code et de la DB pour les 4 boosters.
Aucune modification de code. Rapport dans docs/BOOSTERS_AUDIT.md.

Synthèse :
- double_xp : [statut]
- cote_plus : [statut]
- safety_net : [statut]
- vision : [statut]

Refs: docs/AUDIT_TRACKING_ADMIN.md question 9
```

**Stop ici. Demander au founder de lire le rapport et de décider de la suite (patches dédiés ou suppression de boosters cassés).**

---

# PHASE 3 — Système de rôles + Audit log + Sécurisation routes admin

**Objectif** : remplacer le proxy `trust_score >= 150` par un vrai système de rôles (`user | moderator | founder`). Mettre en place un audit log pour toutes les actions admin. Protéger les routes `/admin/*` au niveau middleware.

**Estimation** : 4-8h.

**Risque** : moyen-élevé. Touche aux RLS, au middleware, à 7 routes admin. Tester soigneusement.

## 3.1 Migration : ajout colonne `role`

Créer `supabase/migrations/0106_add_role_column.sql` :

```sql
-- Création de l'enum
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'moderator', 'founder');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ajout colonne role sur profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'user';

-- Index pour les lookups admin (rare mais utile)
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles(role)
  WHERE role != 'user';
```

⚠️ **Le seed du founder est volontairement séparé**, dans une migration ou un script à part qui sera appelé par le founder lui-même avec son user_id.

Créer un fichier exemple `supabase/scripts/seed_founder.sql` (à exécuter manuellement) :

```sql
-- À exécuter manuellement avec le user_id du fondateur
-- UPDATE profiles SET role = 'founder' WHERE id = '<FOUNDER_USER_ID>';
```

⚠️ **Demander au founder son user_id avant d'exécuter.**

## 3.2 Helper SQL pour les checks de rôle

Créer dans la même migration ou `0107_role_helpers.sql` :

```sql
-- Helper : retourne le rôle courant
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION current_user_role() TO authenticated;

-- Helper : check si admin (moderator ou founder)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role IN ('moderator', 'founder') FROM profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
```

## 3.3 Migration : table `audit_log`

Créer `supabase/migrations/0108_audit_log.sql` :

```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  actor_role user_role NOT NULL,
  action_type text NOT NULL,
  -- ex: 'resolve_event', 'finish_match', 'ban_user', 'edit_profile', 'reset_balance'
  target_resource_type text,
  -- ex: 'market_event', 'match', 'profile', 'squad'
  target_resource_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}',
  -- properties libres : ex {"event_result": "OUI", "reason": "..."}
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_actor ON audit_log(actor_user_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action_type, created_at DESC);
CREATE INDEX idx_audit_log_target ON audit_log(target_resource_type, target_resource_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent lire le log
CREATE POLICY audit_log_select_admin ON audit_log
  FOR SELECT TO authenticated
  USING (is_admin());

-- Personne ne peut INSERT/UPDATE via RLS — uniquement via service_role
-- (les routes admin utiliseront le adminClient pour log)
```

## 3.4 Helper TypeScript pour le logging audit

Créer `src/lib/audit.ts` :

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";
import type { Database } from "@/types/database";

export type AuditActionType =
  | "resolve_event"
  | "force_finish_match"
  | "sync_matches"
  | "admin_match_state_update"
  | "import_assets"
  | "resolve_league_round"
  | "generate_outreach"
  // futurs :
  | "ban_user"
  | "unban_user"
  | "reset_balance"
  | "edit_profile_admin";

interface AuditLogParams {
  actorUserId: string;
  actorRole: "user" | "moderator" | "founder";
  actionType: AuditActionType;
  targetResourceType?: string;
  targetResourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAdminAction(params: AuditLogParams): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("audit_log").insert({
      actor_user_id: params.actorUserId,
      actor_role: params.actorRole,
      action_type: params.actionType,
      target_resource_type: params.targetResourceType ?? null,
      target_resource_id: params.targetResourceId ?? null,
      metadata: params.metadata ?? {},
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
    });
    if (error) {
      // On ne fail pas l'action utilisateur si le log échoue, mais on alerte
      log.error("audit_log insert failed", { error, params });
    }
  } catch (err) {
    log.error("audit_log unexpected error", { err, params });
  }
}
```

## 3.5 Refactor des routes admin existantes

Pour les **7 routes admin** identifiées dans l'audit (section 6) :

- `src/app/api/admin/resolve-event/route.ts`
- `src/app/api/admin/finish-match/route.ts`
- `src/app/api/admin/sync-matches/route.ts`
- `src/app/api/admin/match-state/route.ts`
- `src/app/api/admin/import-assets/route.ts`
- `src/app/api/admin/resolve-league-round/route.ts`
- `src/app/api/admin/generate-outreach/route.ts`

Pour chacune :

1. **Remplacer le check `trust_score >= 150`** par `role IN ('moderator', 'founder')` :

```ts
// AVANT (à remplacer)
const { data: profile } = await supabase
  .from("profiles")
  .select("trust_score")
  .eq("id", user.id)
  .single();

if (!profile || profile.trust_score < MODERATOR_THRESHOLD) {
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

// APRÈS
const { data: profile } = await supabase
  .from("profiles")
  .select("role")
  .eq("id", user.id)
  .single();

if (!profile || !["moderator", "founder"].includes(profile.role)) {
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}
```

2. **Ajouter un appel `logAdminAction`** APRÈS chaque action réussie :

```ts
// Après le succès de la RPC ou de l'action
await logAdminAction({
  actorUserId: user.id,
  actorRole: profile.role,
  actionType: "resolve_event",
  targetResourceType: "market_event",
  targetResourceId: eventId,
  metadata: { result, match_id: matchId },
  ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0],
  userAgent: req.headers.get("user-agent") ?? undefined,
});
```

3. **Supprimer la dépendance à `MODERATOR_THRESHOLD`** dans le fichier (l'import de `permissions.ts` peut rester si la constante est utilisée ailleurs — chercher avec grep).

## 3.6 Middleware Next.js : protection `/admin/*`

Modifier `src/middleware.ts` pour :

1. Ajouter `/admin` à la liste des routes protégées (pas seulement par auth, mais par rôle)
2. Faire un lookup rapide du rôle (avec cache pour pas frapper la DB à chaque requête)

```ts
// Pseudo-code à adapter au middleware existant
import { createServerClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_ROUTES = ["/admin"];
const PROTECTED_ROUTES = [
  "/lobby",
  "/match",
  "/squads",
  "/ligues",
  "/profile",
  "/leaderboard",
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // ... auth standard existante (à conserver)

  // Si route admin : check rôle
  if (ADMIN_ROUTES.some((r) => path.startsWith(r))) {
    const supabase = createServerClient(/* ... */);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["moderator", "founder"].includes(profile.role)) {
      return NextResponse.redirect(new URL("/lobby", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/lobby/:path*",
    "/match/:path*",
    "/squads/:path*",
    "/ligues/:path*",
    "/profile/:path*",
    "/leaderboard/:path*",
    "/admin/:path*",
  ],
};
```

⚠️ **Vérifier la perf** : un SELECT sur `profiles` à chaque navigation `/admin/*` est OK pour le founder seul, mais à terme avec plusieurs modérateurs, envisager de stocker le rôle dans un cookie signé après login (hors scope de cette phase, juste à noter dans `docs/CLEANUP_BACKLOG.md`).

## 3.7 Mise à jour `permissions.ts`

Modifier `src/lib/constants/permissions.ts` :

```ts
// Garder MODERATOR_THRESHOLD UNIQUEMENT si encore utilisé pour autre chose
// que l'accès admin (ex: privilèges UI mineurs basés sur trust_score)
// Sinon, supprimer la constante.

// Ajouter :
export const ADMIN_ROLES = ["moderator", "founder"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isAdminRole(role: string | null | undefined): boolean {
  return (
    role !== null &&
    role !== undefined &&
    (ADMIN_ROLES as readonly string[]).includes(role)
  );
}
```

## 3.8 Documentation

Créer `docs/RBAC.md` qui documente :

- Les 3 rôles (`user`, `moderator`, `founder`) et leurs permissions
- Comment promouvoir un user à `moderator` (script SQL manuel pour l'instant)
- Comment fonctionne le middleware
- Comment fonctionne `audit_log` (schéma, accès, requêtes utiles)
- Liste des `action_type` connus
- Différence entre `trust_score` (karma communautaire Waze) et `role` (accès admin)

Mettre à jour `docs/AUDIT_TRACKING_ADMIN.md` :

- Section 6 : remplacer la description par un pointeur vers `docs/RBAC.md`
- Section 4 : ajouter "Audit log : implémenté via table `audit_log` (voir docs/RBAC.md)"
- Section 8 : retirer R1 (trust_score manipulable) et R3 (middleware non protégé) et R8 (résolution sans audit log)

## 3.9 Tests manuels obligatoires avant commit

Le founder devra exécuter ces scénarios — préparer un checklist `docs/RBAC_MANUAL_TESTS.md` :

```markdown
## Tests manuels Phase 3

### Setup préalable

- [ ] User founder a `role = 'founder'` (vérifier en DB)
- [ ] User test "moderator" a `role = 'moderator'` (créer si besoin)
- [ ] User test "user" a `role = 'user'` (default)

### Test 1 : Accès /admin

- [ ] Founder accède à `/admin/resolve` → OK
- [ ] Moderator accède à `/admin/resolve` → OK
- [ ] User normal accède à `/admin/resolve` → redirect /lobby
- [ ] Anonyme accède à `/admin/resolve` → redirect /login

### Test 2 : Action admin avec audit log

- [ ] Founder résout un event → vérifier que `audit_log` contient une row avec `action_type='resolve_event'` et son user_id
- [ ] Moderator force-finish un match → vérifier audit_log
- [ ] User normal POST /api/admin/resolve-event → 403
- [ ] User normal POST /api/admin/finish-match → 403

### Test 3 : Lecture audit_log

- [ ] Founder peut SELECT sur audit_log → OK
- [ ] User normal peut SELECT sur audit_log → 0 rows (RLS)

### Test 4 : Régression trust_score

- [ ] Un user avec trust_score >= 150 mais role='user' ne peut PLUS accéder à /admin (vérifier qu'aucun ancien check trust_score n'est resté)
```

## 3.10 Commit Phase 3

Message :

```
feat(rbac): replace trust_score admin check with explicit role system

- Add user_role enum and role column on profiles
- Add SQL helpers current_user_role() and is_admin()
- Add audit_log table for admin action tracking
- Refactor 7 admin routes to use role check instead of trust_score
- Add audit logging to all admin actions
- Protect /admin/* routes at middleware level
- trust_score is now used solely for Waze karma (community feedback)

BREAKING CHANGES:
- Trust_score >= 150 no longer grants admin access
- Founder must seed their role manually via supabase/scripts/seed_founder.sql

Migrations: 0106, 0107, 0108
Docs: docs/RBAC.md (new), docs/AUDIT_TRACKING_ADMIN.md (updated)

Refs: docs/AUDIT_TRACKING_ADMIN.md question 1
```

**Stop ici. Demander au founder de :**

1. **Exécuter manuellement le seed de son role**
2. **Exécuter la checklist `docs/RBAC_MANUAL_TESTS.md`**
3. **Reviewer le diff**

Avant tout merge sur `stage`.

---

# Synthèse finale du sprint

À la fin des 3 phases, créer `docs/SPRINT_CLEANUP_RBAC_SUMMARY.md` qui liste :

1. ✅ Ce qui a été fait (par phase)
2. 📋 Décisions du founder à prendre suite à l'audit boosters (Phase 2)
3. 🔧 Backlog ajouté à `docs/CLEANUP_BACKLOG.md`
4. ⚠️ Risques résiduels identifiés en cours de sprint
5. 📊 Stats : nombre de fichiers modifiés, lignes ajoutées/supprimées, migrations créées

---

# Critères d'acceptation globale

Le sprint est validé si :

- [x] Branche `cleanup-rbac-sprint` mergeable sans conflit sur `stage`
- [x] `npm run build` passe
- [x] `npm test` passe (en ayant supprimé/adapté les tests PolyMarket)
- [x] Les 3 phases ont chacune un commit séparé avec message conforme aux templates ci-dessus
- [x] Tous les checks de rôle utilisent `role IN (...)`, plus aucun usage de `MODERATOR_THRESHOLD` pour l'accès admin
- [x] `audit_log` est rempli après une action admin réussie (test manuel)
- [x] Le founder a validé chaque phase via review du diff
- [x] Documents mis à jour : `RBAC.md` (nouveau), `BOOSTERS_AUDIT.md` (nouveau), `AUDIT_TRACKING_ADMIN.md` (mis à jour), `CLEANUP_BACKLOG.md` (mis à jour)

---

# Ne PAS faire dans ce sprint

- ❌ Implémenter PostHog (sprint séparé)
- ❌ Créer le back-office `/admin` UI (sprint séparé)
- ❌ Patcher les boosters trouvés cassés en Phase 2 (sprint séparé après décision founder)
- ❌ Refactorer le système de notifications, le streak, ou autre feature non listée
- ❌ Mettre `role` à autre chose que `'user'` par défaut (le founder seed son rôle lui-même)
- ❌ Supprimer le système `trust_score` — il garde son usage Waze
- ❌ Optimiser le middleware pour la perf (cache cookie de role) — à faire plus tard
- ❌ Faire des PR : laisser les commits sur la branche, le founder décide quand merger
