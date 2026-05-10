# PATCH BRIEF — Founder IDs pour Phase 3 du sprint cleanup-rbac

> Document complémentaire au `BRIEF_CLEANUP_RBAC_SPRINT.md`. À fournir à Claude Code en même temps que le brief principal.

---

## Founder user IDs

Le founder a deux comptes à promouvoir en `'founder'` :

```
e65b9789-0500-4f77-bb0f-c7388c827e02
4031482a-7f06-4039-8df9-9a1c41269d09
```

## Mise à jour Phase 3.1 — Migration et seed

Lors de la création de la migration `0106_add_role_column.sql`, la colonne `role` reste avec `DEFAULT 'user'` (pas de hardcoding du founder dans la migration).

Le seed sera fait via le script `supabase/scripts/seed_founders.sql` (note : pluriel) qui devra contenir le SQL ci-dessous, **prêt à être exécuté manuellement par le founder via Supabase SQL Editor APRÈS l'application de la migration 0106**.

Contenu attendu du fichier `supabase/scripts/seed_founders.sql` :

```sql
-- À exécuter manuellement dans Supabase SQL Editor APRÈS la migration 0106
-- Promeut les deux comptes founder en role='founder'
-- Encapsulé en transaction pour rollback possible

BEGIN;

-- 1. Pré-conditions
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM profiles
  WHERE id IN (
    'e65b9789-0500-4f77-bb0f-c7388c827e02',
    '4031482a-7f06-4039-8df9-9a1c41269d09'
  );
  IF v_count != 2 THEN
    RAISE EXCEPTION 'Expected 2 profiles, found %. Aborting seed.', v_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
  ) THEN
    RAISE EXCEPTION 'Column profiles.role does not exist. Run migration 0106 first.';
  END IF;
END $$;

-- 2. Snapshot avant
SELECT id, username, role AS role_before, trust_score
FROM profiles
WHERE id IN (
  'e65b9789-0500-4f77-bb0f-c7388c827e02',
  '4031482a-7f06-4039-8df9-9a1c41269d09'
);

-- 3. Update
UPDATE profiles
SET role = 'founder'
WHERE id IN (
  'e65b9789-0500-4f77-bb0f-c7388c827e02',
  '4031482a-7f06-4039-8df9-9a1c41269d09'
);

-- 4. Vérif post-update
SELECT id, username, role AS role_after FROM profiles
WHERE id IN (
  'e65b9789-0500-4f77-bb0f-c7388c827e02',
  '4031482a-7f06-4039-8df9-9a1c41269d09'
);

-- 5. Garde-fou : vérifier qu'on n'a pas accidentellement créé d'autres founders
SELECT count(*) AS founder_count FROM profiles WHERE role = 'founder';
-- Doit retourner exactement 2

-- 6. Décommenter selon résultat
-- COMMIT;
-- ROLLBACK;
```

## Mise à jour Phase 3.9 — Tests manuels

Adapter la checklist `docs/RBAC_MANUAL_TESTS.md` avec ces deux IDs :

```markdown
### Setup préalable

- [ ] User founder 1 (id: e65b9789-0500-4f77-bb0f-c7388c827e02) a `role = 'founder'` (vérifier en DB)
- [ ] User founder 2 (id: 4031482a-7f06-4039-8df9-9a1c41269d09) a `role = 'founder'` (vérifier en DB)
- [ ] Aucun autre user n'a `role = 'founder'` (SELECT count(\*) FROM profiles WHERE role='founder' = 2)
- [ ] User test "moderator" a `role = 'moderator'` (créer/promouvoir un compte test si besoin)
- [ ] User test "user" a `role = 'user'` (default)

### Test 1 : Accès /admin

- [ ] Founder 1 accède à /admin/resolve → OK
- [ ] Founder 2 accède à /admin/resolve → OK
- [ ] Moderator accède à /admin/resolve → OK
- [ ] User normal accède à /admin/resolve → redirect /lobby
- [ ] Anonyme accède à /admin/resolve → redirect /login

(reste de la checklist inchangé)
```

## Note sur la sécurité

Ces UUIDs ne sont pas des secrets en soi (ce sont des IDs publics côté Supabase, qui apparaissent dans les responses API quand un user interagit avec l'app). Mais on évite quand même de les laisser dans le code source versionné — d'où le passage par un script `supabase/scripts/seed_founders.sql` qui peut être ajouté au `.gitignore` si le founder le souhaite.

Recommandation : **NE PAS** ajouter le script au `.gitignore`. Le commit dans le repo permet de tracer l'historique de qui est founder, et c'est utile pour l'audit. Les UUIDs ne sont pas sensibles.
